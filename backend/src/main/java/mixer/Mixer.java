package mixer;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.Optional;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import mixer.config.Configuration;
import mixer.ingredient.Ingredient;
import mixer.port.PortAdapter;
import mixer.port.com.PortIngredient;
import mixer.port.provider.ComPortProvider;
import mixer.port.provider.ComPortProviderFactory;
import mixer.recording.OnOffCycle;
import mixer.recording.RecordingSession;
import mixer.recording.RecordingStep;
import recipe.LiquidRecipeIngredient;
import recipe.Recipe;
import recipe.RecipeIngredient;

public class Mixer {

	private static final Logger log = LoggerFactory.getLogger(Mixer.class);

	private final Random rand;
	private final RecipeTokenGenerator recipeTokenGenerator;
	
	private volatile MixerStateInternal currentState;
    private Dispenser dispenser;
	private volatile Configuration configuration;
	private volatile ComPortProvider comPortProvider;
	private final Supplier<Configuration> configurationSupplier;
	private final Map<String, PortAdapter> serialPorts = new HashMap<>();
	Set<String> recipeTokens;
	/** Laufzeit-Schalter: kann per Admin-Endpunkt überschrieben werden, wird beim Config-Reload zurückgesetzt. */
	private volatile boolean recipeTokenRequired;
	private final Object manualIngredientLock = new Object();
	private volatile UUID expectedManualIngredientUuid;
	private volatile Recipe activeRecipe;
	private volatile UUID activeDispenseId;
	private volatile RecordingSession activeRecordingSession;

	// ---
	// Manual-Ingredient interne Helfer (für State-Pattern)
	//
	// Wichtig: Diese Methoden sind absichtlich package-private, damit State-Klassen die
	// Synchronisationsdetails nicht duplizieren müssen, der Kontrakt nach außen aber stabil bleibt.
	UUID getExpectedManualIngredientUuidInternal() {
		return expectedManualIngredientUuid;
	}

	void clearExpectedManualIngredientInternal() {
		expectedManualIngredientUuid = null;
	}

	void notifyManualIngredientConfirmedInternal() {
		manualIngredientLock.notifyAll();
	}

    public Mixer(Supplier<Configuration> configurationSupplier) {
		this.configurationSupplier = configurationSupplier;
		this.configuration = configurationSupplier.get();
		this.recipeTokenRequired = this.configuration.isRequireRecipeToken();
		this.comPortProvider = ComPortProviderFactory.create(this.configuration.getComPortProvider(), this.configuration.getComIngredients());
		reconcileIngredientMappingsToSystemPorts(this.configuration);
        this.setState(new InitialState());
        this.dispenser = new Dispenser(this);
        this.recipeTokens = Collections.synchronizedSet(new HashSet<>());
	    this.rand = new Random(System.currentTimeMillis());
	    this.recipeTokenGenerator = new RecipeTokenGenerator(this.rand);
    }

	/**
	 * Bequemer Konstruktor für Tests/Backwards-Compatibility.
	 */
	public Mixer(Configuration configuration) {
		this(() -> configuration);
	}

    public Configuration getConfiguration() {
		return configuration;
	}

	public boolean isRecipeTokenRequired() {
		return recipeTokenRequired;
	}

	public void setRecipeTokenRequired(boolean required) {
		this.recipeTokenRequired = required;
		this.configuration.setRequireRecipeToken(required);
		log.info("Recipe-Token-Pflicht {} (Laufzeit-Überschreibung).", required ? "aktiviert" : "deaktiviert");
	}

	/**
	 * Lädt die Configuration über den Supplier neu.
	 * 
	 * Darf nur ausgeführt werden, wenn das System nicht beschäftigt ist (keine Abfüllung/Kalibrierung).
	 * 
	 * Hinweis: Diese Methode schließt/öffnet keine COM-Ports. Änderungen an COM-Port-Setups
	 * werden i.d.R. erst nach einem Neustart/Shutdown+Start wirksam.
	 */
	public void reloadConfiguration() {
		getStateInternal().reloadConfiguration(this);
	}

	/**
	 * Interner Helfer für State-Klassen: lädt Configuration neu (ohne Port-Reconnect).
	 */
	synchronized void reloadConfigurationInternal() {
		Configuration newCfg = configurationSupplier.get();
		if (newCfg == null) {
			throw new IllegalStateException("Configuration-Supplier hat null geliefert.");
		}
		this.configuration = newCfg;
		this.recipeTokenRequired = newCfg.isRequireRecipeToken();
		this.comPortProvider = ComPortProviderFactory.create(newCfg.getComPortProvider(), newCfg.getComIngredients());
		reconcileIngredientMappingsToSystemPorts(newCfg);
	}

	/**
	 * Interner Helfer für State-Klassen: lädt Configuration neu + updated Ports passend zur neuen Config.
	 */
	synchronized void reloadConfigurationAndReconcilePortsInternal() {
		reloadConfigurationInternal();
		reconcileSerialPorts();
	}

	/**
	 * Gleicht die Ingredient-Zuordnungen in der Config transient ab:
	 * Für jeden konfigurierten COM-Port, der im System nicht vorhanden ist,
	 * wird die Ingredient-UUID auf null gesetzt (keine Zutat zugeordnet).
	 */
	private void reconcileIngredientMappingsToSystemPorts(Configuration cfg) {
		try {
			List<String> available = comPortProvider.getAvailablePortNames();
			if (available.isEmpty()) {
				log.info("Systemport-Listing lieferte leere Liste – Ingredient-Zuordnungen werden nicht abgeglichen (Dummy/kein-Hardware-Modus).");
				return;
			}
			Set<String> systemPorts = new HashSet<>(available);
			for (mixer.port.com.PortIngredient pi : cfg.getComIngredients()) {
				if (!systemPorts.contains(pi.getCom())) {
					log.info("COM-Port '{}' nicht im System vorhanden – Ingredient-Zuordnung transient entfernt.", pi.getCom());
					pi.setIngredient(null);
				}
			}
		} catch (Exception e) {
			log.warn("Fehler beim Abgleich der Ingredient-Zuordnungen mit Systemports: {}", e.getMessage());
		}
	}

	/**
	 * Sorgt dafür, dass die aktuell geöffneten Ports zur aktiven Configuration passen:
	 * - Ports, die nicht mehr konfiguriert sind, werden geschlossen und entfernt
	 * - Ports, die neu konfiguriert sind, werden erzeugt, geöffnet und registriert
	 * - Bereits vorhandene Ports bleiben erhalten
	 *
	 * Muss nur im Idle ausgeführt werden.
	 */
	private void reconcileSerialPorts() {
		Configuration cfg = this.configuration;
		List<String> available;
		try {
			available = comPortProvider.getAvailablePortNames();
		} catch (Exception e) {
			log.warn("Systemport-Listing fehlgeschlagen, überspringe COM-Port-Abgleich: {}", e.getMessage());
			return;
		}

		Set<String> desiredPorts = new HashSet<>();
		if (available.isEmpty()) {
			// Kein Systemport-Filter (Dummy-Modus): alle konfigurierten Ports verwenden
			for (PortIngredient ci : cfg.getComIngredients()) {
				desiredPorts.add(ci.getCom());
			}
		} else {
			Set<String> systemPorts = new HashSet<>(available);
			for (PortIngredient ci : cfg.getComIngredients()) {
				if (systemPorts.contains(ci.getCom())) {
					desiredPorts.add(ci.getCom());
				} else {
					log.warn("COM-Port '{}' nicht im System vorhanden – wird beim Port-Abgleich übersprungen.", ci.getCom());
				}
			}
		}

		// A) Entfernen: alles was offen/registriert ist, aber nicht mehr in Config vorkommt
		for (String existingPortName : new HashSet<>(serialPorts.keySet())) {
			if (!desiredPorts.contains(existingPortName)) {
				PortAdapter port = serialPorts.get(existingPortName);
				try {
					if (port != null && port.isOpen()) {
						port.close();
						log.info("COM-Port '{}' geschlossen – nicht mehr in Konfiguration enthalten.", port.getPortName());
					}
				} finally {
					serialPorts.remove(existingPortName);
				}
			}
		}

		// B) Hinzufügen: alles aus Config, was noch nicht registriert ist
		for (String desiredPortName : desiredPorts) {
			if (!serialPorts.containsKey(desiredPortName)) {
				PortAdapter port = comPortProvider.createPort(desiredPortName);
				if (!port.open()) {
					throw new IllegalStateException(
							"COM-Port konnte nicht geöffnet werden (Config-Reload): " + desiredPortName);
				}
				serialPorts.put(desiredPortName, port);
				log.info("Neuer COM-Port '{}' geöffnet und registriert (Konfiguration neu geladen).", port.getPortName());
			}
		}

		// C) Re-Open: USB-Geräte können nach Ab-/Anstecken intern "neu" sein, obwohl der Portname gleich bleibt.
		for (String desiredPortName : desiredPorts) {
			PortAdapter port = serialPorts.get(desiredPortName);
			if (port == null) {
				continue;
			}
			try {
				if (port.isOpen()) {
					port.close();
					log.debug("COM-Port '{}' kurz geschlossen für Force-Reopen.", port.getPortName());
				}
			} catch (Exception e) {
				log.warn("Fehler beim Schließen von COM-Port '{}' während Force-Reopen: {}", desiredPortName, e.getMessage());
			}

			if (!port.open()) {
				throw new IllegalStateException("COM-Port konnte nicht erneut geöffnet werden (Force-Reopen, Config-Reload): "
						+ desiredPortName);
			}
			log.info("COM-Port '{}' erfolgreich wiedergeöffnet (Force-Reopen).", port.getPortName());
		}
	}
    
    void registerSerialPort(String com, PortAdapter port) {
        serialPorts.put(com, port);
    }

	synchronized void setState(MixerStateInternal state) {
        this.currentState = state;
        log.info("State-Wechsel → {} | {}", state.getClass().getSimpleName(), state.getDescription());
    }

    Dispenser getDispenser() {
    	return dispenser;
    }


    public void confirmPrimingContainer() {
    	currentState.confirmCalibrationContainer(this);
    }
    
    public void beginDispense(String recipeToken, UUID recipeUUID) {
    		currentState.beginDispense(this, getRecipe(recipeUUID), recipeToken);
    }

	MixerStateInternal getStateInternal() {
		return this.currentState;
	}

	public MixerState getState() {
		return this.currentState;
	}

	public void priming() {
		currentState.beginPriming(this);
	}

	public void start() {
		currentState.start(this);
	}
	
	public PortAdapter getPortForIngredient(Ingredient ingredient) {

	    UUID ingredientId = ingredient.getUuid();

	    PortIngredient comIngredient = configuration.getComIngredients().stream()
	        .filter(ci -> ci.getIngredient().equals(ingredientId))
	        .findFirst()
	        .orElseThrow(() -> new IllegalStateException(
	            "Kein COM-Port für Ingredient konfiguriert: " + ingredient.getName()));

	    PortAdapter port = serialPorts.get(comIngredient.getCom());

	    if (port == null) {
	        throw new IllegalStateException(
	            "COM-Port nicht initialisiert: " + comIngredient.getCom());
	    }

	    return port;
	}

	/**
	 * Wie {@link #getPortForIngredient(Ingredient)}, wirft aber keine Exception, sondern liefert Optional.empty()
	 * wenn keine Port-Zuordnung existiert oder der Port nicht initialisiert ist.
	 */
	public Optional<PortAdapter> findPortForIngredient(Ingredient ingredient) {
		UUID ingredientId = ingredient.getUuid();
		PortIngredient comIngredient = configuration.getComIngredients().stream()
				.filter(ci -> ingredientId.equals(ci.getIngredient()))
				.findFirst()
				.orElse(null);
		if (comIngredient == null) {
			return Optional.empty();
		}
		PortAdapter port = serialPorts.get(comIngredient.getCom());
		return Optional.ofNullable(port);
	}

	void requestManualIngredient(Ingredient ingredient, int recipeIngredientIndex) {
		synchronized (manualIngredientLock) {
			expectedManualIngredientUuid = ingredient.getUuid();
			boolean hasNextAuto = hasNextAutomaticDispenseStep(recipeIngredientIndex);
			setState(new ManualIngredientState(ingredient, currentState, hasNextAuto));
		}
	}

	/**
	 * Best-Effort Prognose für das Frontend:
	 * gibt true zurück, wenn DIREKT nach diesem manuellen Schritt der nächste Rezeptschritt
	 * automatisch abgefüllt wird.
	 *
	 * Motivation: Nur dann muss der Benutzer i.d.R. den Behälter danach wieder korrekt positionieren.
	 * Wenn der nächste Schritt erneut manuell ist oder das Rezept endet, ist das Flag false.
	 */
	private boolean hasNextAutomaticDispenseStep(int recipeIngredientIndex) {
		Recipe recipe = this.activeRecipe;
		if (recipe == null) {
			return false;
		}
		var ingredients = recipe.getRecipeIngredients();
		int nextIndex = recipeIngredientIndex + 1;
		if (nextIndex < 0 || nextIndex >= ingredients.size()) {
			return false;
		}
		Ingredient nextIng = ingredients.get(nextIndex).getIngredient();
		return findPortForIngredient(nextIng).isPresent();
	}

	/**
	 * Bestätigt eine manuell hinzuzufügende Zutat.
	 * @throws IllegalArgumentException wenn eine andere UUID bestätigt wird.
	 * @throws IllegalStateException wenn aktuell keine manuelle Zutat erwartet wird.
	 */
	public void confirmManualIngredient(UUID ingredientUuid) {
		synchronized (manualIngredientLock) {
			// Delegation an den aktuellen State (State Pattern). Der State entscheidet, ob das erlaubt ist.
			currentState.confirmManualIngredient(this, ingredientUuid);
		}
	}

	void waitForManualIngredientConfirmation() {
		synchronized (manualIngredientLock) {
			while (expectedManualIngredientUuid != null) {
				try {
					manualIngredientLock.wait();
				} catch (InterruptedException e) {
					Thread.currentThread().interrupt();
					return;
				}
			}
		}
	}
	
	public List<PortAdapter> getAllSerialPorts() {
	    return new ArrayList<>(serialPorts.values());
	}

	public List<String> listSystemPortNames() {
		return comPortProvider.getAvailablePortNames();
	}

	ComPortProvider getComPortProvider() {
		return comPortProvider;
	}


	public PortAdapter get(String key) {
		return serialPorts.get(key);
	}

	/**
	 * Gibt den Port für den angegebenen Namen zurück.
	 * Ist er noch nicht geöffnet/registriert, wird er on-demand erzeugt und geöffnet.
	 * Gibt null zurück, wenn der Port nicht geöffnet werden kann.
	 */
	public synchronized PortAdapter getOrOpenPort(String portName) {
		PortAdapter existing = serialPorts.get(portName);
		if (existing != null) {
			return existing;
		}
		PortAdapter port = comPortProvider.createPort(portName);
		if (!port.open()) {
			log.warn("COM-Port '{}' konnte nicht on-demand geöffnet werden.", portName);
			return null;
		}
		serialPorts.put(portName, port);
		log.info("COM-Port '{}' on-demand geöffnet und registriert.", portName);
		return port;
	}

	public void saveConfiguration() {
		configuration.save();
	}

	public void shutdown() {
		currentState.shutdown(this);
	}

	public void skipPriming() {
		currentState.skipPriming(this);
	}

	public Recipe getRecipe(UUID uuid) {
		return configuration.getRecipe(uuid);
	}

	public Recipe getActiveRecipe() {
		return activeRecipe;
	}

	public UUID getActiveDispenseId() {
		return activeDispenseId;
	}

	synchronized void beginActiveDispense(Recipe recipe) {
		this.activeRecipe = recipe;
		this.activeDispenseId = UUID.randomUUID();
	}

	synchronized void endActiveDispense() {
		this.activeRecipe = null;
		this.activeDispenseId = null;
	}

	// --- Aufzeichnungsmodus ---

	/**
	 * Startet eine neue Aufzeichnungssession für das gegebene Rezept.
	 * Wird von {@link MixerDispenseState#startRecording(Mixer, Recipe)} aufgerufen.
	 */
	RecordingSession createRecordingSession(Recipe recipe) {
		List<RecordingStep> steps = new ArrayList<>();
		for (RecipeIngredient<?> ri : recipe.getRecipeIngredients()) {
			Ingredient ing = ri.getIngredient();
			if (ing == null) continue;
			// Nur Zutaten mit COM-Port-Zuordnung aufnehmen
			String portName = findComPortNameForIngredient(ing.getUuid()).orElse(null);
			if (portName == null) continue;
			Long originalDurationMs = (ri instanceof LiquidRecipeIngredient lri)
					? lri.getDurationMilliseconds()
					: null;
			steps.add(new RecordingStep(ing.getUuid(), ing.getName(), portName, originalDurationMs));
		}
		RecordingSession session = new RecordingSession(UUID.randomUUID(), recipe, steps);
		this.activeRecordingSession = session;
		return session;
	}

	/** Schaltet den Port der aktuellen Zutat ein (delegiert an State). */
	public void startRecordingIngredient() {
		currentState.startRecordingIngredient(this);
	}

	/** Schaltet den Port der aktuellen Zutat aus (delegiert an State). */
	public void stopRecordingIngredient() {
		currentState.stopRecordingIngredient(this);
	}

	/** Rückt zur nächsten Zutat vor (delegiert an State). */
	public void nextRecordingIngredient() {
		currentState.nextRecordingIngredient(this);
	}

	/** Startet eine Aufzeichnungssession für das Rezept mit der gegebenen UUID. */
	public void startRecording(UUID recipeUuid) {
		currentState.startRecording(this, getRecipe(recipeUuid));
	}

	/** Bricht die laufende Aufzeichnung ab. */
	public void abortRecording() {
		currentState.abortRecording(this);
	}

	public RecordingSession getActiveRecordingSession() {
		return activeRecordingSession;
	}

	public void clearRecordingSession() {
		this.activeRecordingSession = null;
	}

	/**
	 * Gibt den konfigurierten COM-Port-Namen für eine Ingredient-UUID zurück.
	 */
	public Optional<String> findComPortNameForIngredient(UUID ingredientUuid) {
		return configuration.getComIngredients().stream()
				.filter(ci -> ingredientUuid.equals(ci.getIngredient()))
				.map(PortIngredient::getCom)
				.findFirst();
	}

	/**
	 * Fügt ein neues Rezept zur laufenden Konfiguration hinzu und speichert die Konfigurationsdatei.
	 */
	public Recipe addAndSaveRecipe(Recipe recipe) {
		configuration.addRecipe(recipe);
		configuration.save();
		return recipe;
	}

	/**
	 * Ersetzt ein bestehendes Rezept in der laufenden Konfiguration und speichert.
	 */
	public Recipe replaceAndSaveRecipe(UUID replaceUuid, Recipe recipe) {
		configuration.replaceRecipe(replaceUuid, recipe);
		configuration.save();
		return recipe;
	}

	public boolean addRecipeToken(String token) {
		return this.recipeTokens.add(token);
	}
	
	public String generateReadableToken() {
		String token;
		do {
			token = recipeTokenGenerator.generate();
		} while (!addRecipeToken(token));
		return token;
	}

	public MixerState waitForIdle(){
		// Wir warten maximal 30 Sekunden (HTTP Timeout beachten!)
		long timeoutMillis = 30_000;
		long waitedMillis = 0;

		// Solange wir im Arbeitsmodus sind, schlafen wir kurz
		while (isSystemBusy(getState()) && waitedMillis < timeoutMillis) {
		    try {
				Thread.sleep(500);
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
				break;
			} // 500ms warten
		    waitedMillis += 500;
		}
		return getState();
	}
    
    private static boolean isSystemBusy(MixerState state) {
        Class<?> stateClass = state.getClass();
        return stateClass.equals(MixerDispensingState.class) || 
        		stateClass.equals(StartupState.class) || 
				stateClass.equals(PrimingState.class);
    }

  public boolean isBusy() {
	return isSystemBusy(getState());
  }

	public Set<String> getRecipeTokens() {
		return new HashSet<>(recipeTokens);
	}

	/**
	 * Admin-UseCase Hook: State-guarded access to active recipe tokens.
	 *
	 * In manchen States (z.B. "Kalibrierung/Behälter untersetzen") soll das Frontend
	 * diese Liste nicht pollen dürfen.
	 */
	public Set<String> listActiveTokens() {
		getStateInternal().listActiveTokens(this);
		return getRecipeTokens();
	}

	public Ingredient getIngredientForPort(String portName) {
		return configuration.getComIngredients().stream().filter(p -> p.getCom().equals(portName)).findAny().map(pi -> configuration.getIngredient(pi.getIngredient())).orElse(null);
	}

	void removeSerialPort(PortAdapter port) {
		this.serialPorts.remove(port.getPortName());
	}
    
}
