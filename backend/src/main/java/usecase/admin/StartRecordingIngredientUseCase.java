package usecase.admin;

import io.javalin.http.Context;
import mixer.Mixer;
import mixer.recording.OnOffCycle;
import mixer.recording.RecordingSession;
import mixer.recording.RecordingStep;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Schaltet den Port der aktuell aktiven Aufzeichnungszutat ein.
 * Der Admin kann diesen Endpunkt mehrfach pro Zutat aufrufen (Feinjustierung).
 * Jeder Aufruf startet einen neuen Ein/Aus-Zyklus.
 *
 * Response enthält den serverseitigen startedAt-Timestamp (Epoch ms),
 * damit die Oberfläche den Zyklus exakt nachverfolgen kann.
 */
public class StartRecordingIngredientUseCase {

    private final Mixer mixer;

    public StartRecordingIngredientUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public void execute(Context ctx) {
        RecordingSession session = mixer.getActiveRecordingSession();
        if (session == null) {
            ctx.status(409).result("Keine aktive Aufzeichnungssession vorhanden.");
            return;
        }
        try {
            mixer.startRecordingIngredient();
        } catch (UnsupportedOperationException e) {
            ctx.status(409).result("Zutat kann im aktuellen Zustand nicht gestartet werden.");
            return;
        } catch (IllegalStateException e) {
            ctx.status(400).result(e.getMessage());
            return;
        }
        RecordingStep step = session.getCurrentStep();
        OnOffCycle cycle = step.getCycles().get(step.getCycles().size() - 1);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ingredientUuid", step.getIngredientUuid());
        response.put("ingredientName", step.getIngredientName());
        response.put("portName", step.getPortName());
        response.put("startedAt", cycle.getStartedAt());
        response.put("cycleIndex", step.getCycleCount() - 1);
        response.put("originalDurationMs", step.getOriginalDurationMs());

        ctx.status(200).json(response);
    }
}
