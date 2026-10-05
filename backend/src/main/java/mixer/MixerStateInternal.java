package mixer;

import java.util.UUID;

import recipe.Recipe;

interface MixerStateInternal extends MixerState {

	default void confirmCalibrationContainer(Mixer mixer) {throw new UnsupportedOperationException();}; // Benutzerbestätigung vor Befüllen

	default void beginPriming(Mixer mixer) {throw new UnsupportedOperationException();}; // Schlauch befüllen

	default void beginDispense(Mixer mixer, Recipe recipe, String recipeToken) {throw new UnsupportedOperationException();}; // Start Abfüllmodus

	/**
	 * User-Operation: Bestätigung einer manuellen Zutat.
	 * Default: nicht erlaubt, States müssen es explizit implementieren.
	 */
	default void confirmManualIngredient(Mixer mixer, UUID ingredientUuid) {throw new UnsupportedOperationException();}

	String getDescription();

	default void start(Mixer mixer) {throw new UnsupportedOperationException();}

	default void initiate(Mixer mixer) {throw new UnsupportedOperationException();}

	default void shutdown(Mixer mixer) {}

	default void skipPriming(Mixer mixer) {throw new UnsupportedOperationException();}

	default void priming(Mixer mixer) {throw new UnsupportedOperationException();};

	/**
	 * Admin-Operation: Liste aktiver Rezept-Tokens.
	 * Default: nicht erlaubt, States müssen es explizit freischalten.
	 */
	default void listActiveTokens(Mixer mixer) {throw new UnsupportedOperationException();}

	/**
	 * Lädt die aktuelle Konfiguration neu (ohne Server-Neustart).
	 * Welche States das erlauben, wird polymorph über die State-Implementierungen gesteuert.
	 */
	default void reloadConfiguration(Mixer mixer) {throw new UnsupportedOperationException();}

	// --- Aufzeichnungsmodus ---

	/** Startet eine Rezeptaufzeichnungssession. Nur im Idle-State (MixerDispenseState) erlaubt. */
	default void startRecording(Mixer mixer, recipe.Recipe recipe) {throw new UnsupportedOperationException();}

	/** Schaltet den Port der aktuellen Zutat ein und startet einen neuen Zyklus. */
	default void startRecordingIngredient(Mixer mixer) {throw new UnsupportedOperationException();}

	/** Schaltet den Port der aktuellen Zutat aus und beendet den laufenden Zyklus. */
	default void stopRecordingIngredient(Mixer mixer) {throw new UnsupportedOperationException();}

	/** Schließt den aktuellen Schritt ab und rückt zur nächsten Zutat vor. */
	default void nextRecordingIngredient(Mixer mixer) {throw new UnsupportedOperationException();}

	/** Bricht die Aufzeichnung ab, stoppt offene Ports und kehrt zum Idle-State zurück. */
	default void abortRecording(Mixer mixer) {throw new UnsupportedOperationException();}
}