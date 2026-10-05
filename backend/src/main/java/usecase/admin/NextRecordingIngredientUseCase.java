package usecase.admin;

import io.javalin.http.Context;
import mixer.Mixer;
import mixer.recording.RecordingSession;
import mixer.recording.RecordingStep;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Schließt den aktuellen Aufzeichnungsschritt ab und rückt zur nächsten Zutat vor.
 * Ist der Port noch eingeschaltet, wird er automatisch gestoppt.
 *
 * Wenn dies der letzte Schritt war, ist die Session abgeschlossen (sessionComplete = true)
 * und der Mixer wechselt zurück in den Idle-State. Die Session bleibt für den
 * Speichervorgang erhalten ({@code POST /admin/recording/save}).
 */
public class NextRecordingIngredientUseCase {

    private final Mixer mixer;

    public NextRecordingIngredientUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public void execute(Context ctx) {
        RecordingSession session = mixer.getActiveRecordingSession();
        if (session == null) {
            ctx.status(409).result("Keine aktive Aufzeichnungssession vorhanden.");
            return;
        }
        // Schritt-Daten vor dem Vorwärtsschalten sichern
        RecordingStep completedStep = session.getCurrentStep();

        try {
            mixer.nextRecordingIngredient();
        } catch (UnsupportedOperationException e) {
            ctx.status(409).result("Vorwärtsschalten im aktuellen Zustand nicht erlaubt.");
            return;
        } catch (IllegalStateException e) {
            ctx.status(400).result(e.getMessage());
            return;
        }

        // Nach nextRecordingIngredient: Session ist ggf. abgeschlossen
        RecordingSession currentSession = mixer.getActiveRecordingSession();

        Map<String, Object> response = new LinkedHashMap<>();
        if (currentSession != null && currentSession.isComplete()) {
            response.put("sessionComplete", true);
            response.put("currentStepIndex", currentSession.getCurrentStepIndex());
            response.put("currentStep", null);
            response.put("completedStepSummary", completedStep != null
                    ? StartRecordingSessionUseCase.buildStepMap(completedStep) : null);
        } else if (currentSession != null) {
            RecordingStep nextStep = currentSession.getCurrentStep();
            response.put("sessionComplete", false);
            response.put("currentStepIndex", currentSession.getCurrentStepIndex());
            response.put("currentStep", nextStep != null
                    ? StartRecordingSessionUseCase.buildStepMap(nextStep) : null);
            response.put("completedStepSummary", completedStep != null
                    ? StartRecordingSessionUseCase.buildStepMap(completedStep) : null);
        } else {
            // Session wurde durch Abort gelöscht (sollte nicht vorkommen bei next)
            response.put("sessionComplete", true);
            response.put("currentStep", null);
        }

        ctx.status(200).json(response);
    }
}
