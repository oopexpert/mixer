package usecase.admin;

import io.javalin.http.Context;
import mixer.Mixer;
import mixer.recording.OnOffCycle;
import mixer.recording.RecordingSession;
import mixer.recording.RecordingStep;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Schaltet den Port der aktuell aktiven Aufzeichnungszutat aus.
 *
 * Response enthält:
 * - startedAt / stoppedAt des soeben beendeten Zyklus (serverseitige Epoch ms)
 * - cycleDurationMs: Dauer dieses Zyklus
 * - totalDurationMs: Kumulierte Gesamtzeit aller Zyklen dieser Zutat
 * - originalDurationMs: Referenzwert aus dem Quellrezept (zum Vergleich)
 *
 * Die Oberfläche kann die Gesamtzeit unabhängig berechnen als:
 *   sum( stoppedAt_i - startedAt_i ) über alle Zyklen der Zutat.
 */
public class StopRecordingIngredientUseCase {

    private final Mixer mixer;

    public StopRecordingIngredientUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public void execute(Context ctx) {
        RecordingSession session = mixer.getActiveRecordingSession();
        if (session == null) {
            ctx.status(409).result("Keine aktive Aufzeichnungssession vorhanden.");
            return;
        }
        RecordingStep step = session.getCurrentStep();
        if (step == null) {
            ctx.status(409).result("Kein aktiver Aufzeichnungsschritt vorhanden.");
            return;
        }
        try {
            mixer.stopRecordingIngredient();
        } catch (UnsupportedOperationException e) {
            ctx.status(409).result("Zutat kann im aktuellen Zustand nicht gestoppt werden.");
            return;
        } catch (IllegalStateException e) {
            ctx.status(400).result(e.getMessage());
            return;
        }
        // Letzter abgeschlossener Zyklus
        OnOffCycle cycle = step.getCycles().get(step.getCycles().size() - 1);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ingredientUuid", step.getIngredientUuid());
        response.put("ingredientName", step.getIngredientName());
        response.put("portName", step.getPortName());
        response.put("cycleIndex", step.getCycles().size() - 1);
        response.put("startedAt", cycle.getStartedAt());
        response.put("stoppedAt", cycle.getStoppedAt());
        response.put("cycleDurationMs", cycle.getDurationMs());
        response.put("totalDurationMs", step.getTotalDurationMs());
        response.put("originalDurationMs", step.getOriginalDurationMs());

        ctx.status(200).json(response);
    }
}
