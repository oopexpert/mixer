package rest;

import java.util.List;
import java.util.stream.Collectors;

import org.jetbrains.annotations.NotNull;

import app.MixerApp.PortMapping;
import io.javalin.http.Context;
import mixer.Mixer;
import mixer.MixerState;
import mixer.ingredient.Ingredient;
import mixer.port.com.PortIngredient;
import usecase.admin.SetPortIngredientMappingUseCase.Result;
import usecase.admin.AbortRecordingUseCase;
import usecase.admin.ClaimRecipeTokenUseCase;
import usecase.admin.ConfirmContainerUseCase;
import usecase.admin.GenerateRecipeTokenUsecase;
import usecase.admin.GetRecordingSessionUseCase;
import usecase.admin.ListActiveTokensUseCase;
import usecase.admin.ListIngredientsUseCase;
import usecase.admin.ListSystemPortsUseCase;
import usecase.admin.NextRecordingIngredientUseCase;
import usecase.admin.PrimingUseCase;
import usecase.admin.PulsePortUseCase;
import usecase.admin.ReloadConfigurationUseCase;
import usecase.admin.SaveRecordedRecipeUseCase;
import usecase.admin.SetPortIngredientMappingUseCase;
import usecase.admin.SetPortStateUseCase;
import usecase.admin.SetRecipeTokenRequiredUseCase;
import usecase.admin.ShutdownUseCase;
import usecase.admin.SkipPrimingUseCase;
import usecase.admin.StartRecordingIngredientUseCase;
import usecase.admin.StartRecordingSessionUseCase;
import usecase.admin.StartSystemUseCase;
import usecase.admin.StopRecordingIngredientUseCase;
import usecase.admin.WaitForIdleUsecase;

public class AdminController {
	
	private final StartSystemUseCase startUC;
	private final ConfirmContainerUseCase confirmUC;
	private final PrimingUseCase primingUC;
	private final SkipPrimingUseCase skipUC;
	private final ShutdownUseCase shutdownUC;
	private final GenerateRecipeTokenUsecase generateRecipeTokenUsecase;
	private final WaitForIdleUsecase waitForIdleUsecase;
	private final ClaimRecipeTokenUseCase claimRecipeTokenUC;
	private final ListActiveTokensUseCase listActiveTokensUC;
	private final SetPortStateUseCase setPortStateUC;
	private final ReloadConfigurationUseCase reloadConfigurationUC;
	private final PulsePortUseCase pulsePortUC;
	private final SetRecipeTokenRequiredUseCase setRecipeTokenRequiredUC;
	private final SetPortIngredientMappingUseCase setPortIngredientMappingUC;
	private final ListIngredientsUseCase listIngredientsUC;
	private final ListSystemPortsUseCase listSystemPortsUC;
	private final StartRecordingSessionUseCase startRecordingSessionUC;
	private final StartRecordingIngredientUseCase startRecordingIngredientUC;
	private final StopRecordingIngredientUseCase stopRecordingIngredientUC;
	private final NextRecordingIngredientUseCase nextRecordingIngredientUC;
	private final GetRecordingSessionUseCase getRecordingSessionUC;
	private final SaveRecordedRecipeUseCase saveRecordedRecipeUC;
	private final AbortRecordingUseCase abortRecordingUC;
	
	private final Mixer mixer;

	public AdminController(Mixer mixer) {
		this.mixer = mixer;
		this.startUC = new StartSystemUseCase(mixer);
		this.confirmUC = new ConfirmContainerUseCase(mixer);
		this.primingUC = new PrimingUseCase(mixer);
		this.skipUC = new SkipPrimingUseCase(mixer);
		this.shutdownUC = new ShutdownUseCase(mixer);
		this.generateRecipeTokenUsecase = new GenerateRecipeTokenUsecase(mixer);
		this.waitForIdleUsecase = new WaitForIdleUsecase(mixer);
		this.claimRecipeTokenUC = new ClaimRecipeTokenUseCase(mixer);
		this.listActiveTokensUC = new ListActiveTokensUseCase(mixer);
		this.setPortStateUC = new SetPortStateUseCase(mixer);
		this.reloadConfigurationUC = new ReloadConfigurationUseCase(mixer);
		this.pulsePortUC = new PulsePortUseCase(mixer);
		this.setRecipeTokenRequiredUC = new SetRecipeTokenRequiredUseCase(mixer);
		this.setPortIngredientMappingUC = new SetPortIngredientMappingUseCase(mixer);
		this.listIngredientsUC = new ListIngredientsUseCase(mixer);
		this.listSystemPortsUC = new ListSystemPortsUseCase(mixer);
		this.startRecordingSessionUC = new StartRecordingSessionUseCase(mixer);
		this.startRecordingIngredientUC = new StartRecordingIngredientUseCase(mixer);
		this.stopRecordingIngredientUC = new StopRecordingIngredientUseCase(mixer);
		this.nextRecordingIngredientUC = new NextRecordingIngredientUseCase(mixer);
		this.getRecordingSessionUC = new GetRecordingSessionUseCase(mixer);
		this.saveRecordedRecipeUC = new SaveRecordedRecipeUseCase(mixer);
		this.abortRecordingUC = new AbortRecordingUseCase(mixer);
	}

	public void handleStart(Context ctx) {
		InStateExecution.executeStateAction(this.mixer, ctx, startUC::execute);
	}

	public void handleConfirmContainer(Context ctx) {
		InStateExecution.executeStateAction(this.mixer, ctx, confirmUC::execute);
	}

	public void handlePrime(Context ctx) {
		InStateExecution.executeStateAction(this.mixer, ctx, primingUC::execute);
	}

	public void handleSkipPrime(Context ctx) {
		InStateExecution.executeStateAction(this.mixer, ctx, skipUC::execute);
	}

	public void handleShutdown(Context ctx) {
		InStateExecution.executeStateAction(this.mixer, ctx, shutdownUC::execute);
	}

	public void handleReloadConfiguration(Context ctx) {
		InStateExecution.executeStateAction(this.mixer, ctx, reloadConfigurationUC::execute);
	}
	
	public String handleGenerateRecipeToken(Context ctx) {
		return generateRecipeTokenUsecase.generateReadableToken();
	}

	public MixerState handleWaitForIdle() {
		return this.waitForIdleUsecase.waitForIdle();
	}
	
	public void listActivePorts(@NotNull Context ctx) {
		List<String> systemPorts;
		try {
			systemPorts = mixer.listSystemPortNames();
		} catch (Exception e) {
			ctx.status(500).json(java.util.Map.of("error", "Systemport-Listing fehlgeschlagen: " + e.getMessage()));
			return;
		}
		// Schnellzugriff: COM-Port-Name → PortIngredient aus der aktuellen Konfiguration
		java.util.Map<String, PortIngredient> configuredPorts =
			mixer.getConfiguration().getComIngredients().stream()
				.collect(java.util.stream.Collectors.toMap(
					PortIngredient::getCom,
					pi -> pi,
					(a, b) -> a
				));
		List<PortMapping> mappings = systemPorts.stream()
		    .map(portName -> {
		        PortIngredient pi = configuredPorts.get(portName);
		        Ingredient ing = (pi != null && pi.getIngredient() != null)
		            ? mixer.getConfiguration().getIngredient(pi.getIngredient())
		            : null;
		        return new PortMapping(
		            portName,
		            ing != null ? ing.getName() : null,
		            ing != null ? ing.getUuid() : null
		        );
		    })
		    .collect(Collectors.toList());
		ctx.json(mappings);
	}

	public void handleClaimRecipeToken(Context ctx) {
		ctx.json(java.util.Map.of("recipeToken", claimRecipeTokenUC.execute()));
	}

	public void handleListActiveTokens(Context ctx) {
		try {
			ctx.json(listActiveTokensUC.execute());
		} catch (UnsupportedOperationException e) {
			// State-basierte Sperre (z.B. Kalibrierung/Behälter untersetzen)
			ctx.status(400).json(new MixerStatusResponse(mixer.getState(), "Operation in aktuellem Status nicht erlaubt."));
		}
	}

	public void handleSetPortState(Context ctx) {
		setPortStateUC.execute(ctx);
	}

	/**
	 * Admin-Kalibrier-Endpunkt: Schaltet einen Port für eine Dauer (ms) ein und danach wieder aus.
	 * - Dauer ist optional; wenn nicht angegeben oder ungültig -> 500ms.
	 * - Mindestdauer: 500ms.
	 * - Berücksichtigt den wait-for-idle Mechanismus: wartet vor dem Schalten, bis das System idle ist.
	 */
	public void handlePulsePort(Context ctx) {
		pulsePortUC.execute(ctx);
	}

	/**
	 * Setzt den Recipe-Token-Pflicht-Schalter zur Laufzeit.
	 * Query-Parameter {@code required=true|false} (Standard: true).
	 * Wird beim nächsten Config-Reload auf den konfigurierten Wert zurückgesetzt.
	 */
	public void handleSetRecipeTokenRequired(Context ctx) {
		String param = ctx.queryParam("required");
		boolean required = param == null || Boolean.parseBoolean(param);
		setRecipeTokenRequiredUC.execute(required);
		ctx.status(200).json(java.util.Map.of("recipeTokenRequired", required));
	}

	public void handleListIngredients(Context ctx) {
		ctx.json(listIngredientsUC.execute());
	}

	public void handleListSystemPorts(Context ctx) {
		ctx.json(listSystemPortsUC.execute());
	}

	/**
	 * Setzt die Zuordnung einer Ingredient-UUID zu einem COM-Port (nur transient, nicht persistent!).
	 * POST /admin/map-port-ingredient?comPort=COM4&ingredientUuid=...
	 * Antwort: { "updatedMappings": [ { "comPort": "COM4", "ingredientUuid": "...", "ingredientName": "..." }, ... ] }
	 */
	public void handleSetPortIngredientMapping(Context ctx) {
		String comPort = ctx.queryParam("comPort");
		String ingredientUuidStr = ctx.queryParam("ingredientUuid");
		if (comPort == null || ingredientUuidStr == null) {
			ctx.status(400).json(java.util.Map.of("error", "comPort und ingredientUuid erforderlich"));
			return;
		}
		java.util.UUID ingredientUuid;
		try {
			ingredientUuid = java.util.UUID.fromString(ingredientUuidStr);
		} catch (IllegalArgumentException e) {
			ctx.status(400).json(java.util.Map.of("error", "Ungültige UUID"));
			return;
		}
		try {
			Result result = setPortIngredientMappingUC.execute(comPort, ingredientUuid);
			ctx.status(200).json(result);
		} catch (IllegalArgumentException e) {
			ctx.status(400).json(java.util.Map.of("error", e.getMessage()));
		}
	}

	public void handleSaveConfiguration(Context ctx) {
		try {
			mixer.saveConfiguration();
			ctx.status(200).result("Konfiguration gespeichert.");
		} catch (Exception e) {
			ctx.status(500).result("Fehler beim Speichern: " + e.getMessage());
		}
	}

	// --- Aufzeichnungsmodus ---

	public void handleStartRecording(Context ctx) {
		startRecordingSessionUC.execute(ctx);
	}

	public void handleStartRecordingIngredient(Context ctx) {
		startRecordingIngredientUC.execute(ctx);
	}

	public void handleStopRecordingIngredient(Context ctx) {
		stopRecordingIngredientUC.execute(ctx);
	}

	public void handleNextRecordingIngredient(Context ctx) {
		nextRecordingIngredientUC.execute(ctx);
	}

	public void handleGetRecordingSession(Context ctx) {
		getRecordingSessionUC.execute(ctx);
	}

	public void handleSaveRecordedRecipe(Context ctx) {
		saveRecordedRecipeUC.execute(ctx);
	}

	public void handleAbortRecording(Context ctx) {
		abortRecordingUC.execute(ctx);
	}

}