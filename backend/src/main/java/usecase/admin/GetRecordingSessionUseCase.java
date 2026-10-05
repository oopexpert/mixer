package usecase.admin;

import io.javalin.http.Context;
import mixer.Mixer;
import mixer.recording.RecordingSession;
import mixer.recording.RecordingStep;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Gibt den vollständigen Zustand der aktuellen Aufzeichnungssession zurück.
 * Kann für Polling oder Seitenneuladen verwendet werden.
 */
public class GetRecordingSessionUseCase {

    private final Mixer mixer;

    public GetRecordingSessionUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public void execute(Context ctx) {
        RecordingSession session = mixer.getActiveRecordingSession();
        if (session == null) {
            ctx.status(404).result("Keine aktive Aufzeichnungssession vorhanden.");
            return;
        }
        ctx.status(200).json(buildFullSessionResponse(session));
    }

    public static Map<String, Object> buildFullSessionResponse(RecordingSession session) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("sessionId", session.getSessionId());
        m.put("sourceRecipeUuid", session.getSourceRecipe().getUuid());
        m.put("sourceRecipeName", session.getSourceRecipe().getName());
        m.put("totalSteps", session.getTotalSteps());
        m.put("currentStepIndex", session.getCurrentStepIndex());
        m.put("sessionComplete", session.isComplete());
        m.put("currentStep", session.getCurrentStep() != null
                ? StartRecordingSessionUseCase.buildStepMap(session.getCurrentStep()) : null);

        // Alle Schritte mit ihren Zyklen
        List<Map<String, Object>> steps = session.getSteps().stream()
                .map(GetRecordingSessionUseCase::buildDetailedStepMap)
                .toList();
        m.put("steps", steps);
        return m;
    }

    private static Map<String, Object> buildDetailedStepMap(RecordingStep step) {
        Map<String, Object> m = new LinkedHashMap<>(StartRecordingSessionUseCase.buildStepMap(step));
        List<Map<String, Object>> cycles = step.getCycles().stream()
                .map(c -> {
                    Map<String, Object> cm = new LinkedHashMap<>();
                    cm.put("startedAt", c.getStartedAt());
                    cm.put("stoppedAt", c.getStoppedAt());
                    cm.put("durationMs", c.getDurationMs());
                    cm.put("running", c.isRunning());
                    return cm;
                })
                .toList();
        m.put("cycles", cycles);
        return m;
    }
}
