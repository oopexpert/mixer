package usecase.admin;

import io.javalin.http.Context;
import mixer.Mixer;
import mixer.recording.RecordingSession;
import mixer.recording.RecordingStep;
import recipe.Recipe;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Startet eine Aufzeichnungssession für ein bestehendes Rezept.
 * Nur erlaubt wenn der Mixer idle ist (MixerDispenseState).
 */
public class StartRecordingSessionUseCase {

    private final Mixer mixer;

    public StartRecordingSessionUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public void execute(Context ctx) {
        String recipeUuidParam = ctx.pathParam("recipeUuid");
        UUID recipeUuid;
        try {
            recipeUuid = UUID.fromString(recipeUuidParam);
        } catch (IllegalArgumentException e) {
            ctx.status(400).result("Ungültige Rezept-UUID: " + recipeUuidParam);
            return;
        }
        Recipe recipe = mixer.getRecipe(recipeUuid);
        if (recipe == null) {
            ctx.status(404).result("Rezept nicht gefunden: " + recipeUuid);
            return;
        }
        try {
            mixer.startRecording(recipeUuid);
        } catch (UnsupportedOperationException e) {
            ctx.status(409).result("Aufzeichnung kann im aktuellen Zustand nicht gestartet werden.");
            return;
        } catch (IllegalStateException e) {
            ctx.status(400).result(e.getMessage());
            return;
        }
        RecordingSession session = mixer.getActiveRecordingSession();
        ctx.status(200).json(buildSessionResponse(session));
    }

    public static Map<String, Object> buildStepMap(RecordingStep step) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ingredientUuid", step.getIngredientUuid());
        m.put("ingredientName", step.getIngredientName());
        m.put("portName", step.getPortName());
        m.put("originalDurationMs", step.getOriginalDurationMs());
        m.put("cycleCount", step.getCycleCount());
        m.put("totalDurationMs", step.getTotalDurationMs());
        m.put("portCurrentlyOn", step.isPortCurrentlyOn());
        return m;
    }

    public static Map<String, Object> buildSessionResponse(RecordingSession session) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("sessionId", session.getSessionId());
        m.put("sourceRecipeUuid", session.getSourceRecipe().getUuid());
        m.put("sourceRecipeName", session.getSourceRecipe().getName());
        m.put("totalSteps", session.getTotalSteps());
        m.put("currentStepIndex", session.getCurrentStepIndex());
        m.put("sessionComplete", session.isComplete());
        RecordingStep current = session.getCurrentStep();
        m.put("currentStep", current != null ? buildStepMap(current) : null);
        return m;
    }
}
