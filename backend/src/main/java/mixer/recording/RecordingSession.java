package mixer.recording;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import recipe.Recipe;

/**
 * Hält den Zustand einer laufenden oder abgeschlossenen Aufzeichnungssession.
 *
 * Eine Session enthält genau die COM-Port-zugeordneten Zutaten des Quellrezepts
 * als geordnete Liste von {@link RecordingStep}-Objekten.
 * Schritte für Zutaten ohne COM-Port (manuelle Zutaten, Add-ons) sind nicht enthalten.
 */
public class RecordingSession {

    private final UUID sessionId;
    private final Recipe sourceRecipe;
    private final List<RecordingStep> steps;
    private int currentStepIndex = 0;
    private boolean complete = false;

    public RecordingSession(UUID sessionId, Recipe sourceRecipe, List<RecordingStep> steps) {
        this.sessionId = sessionId;
        this.sourceRecipe = sourceRecipe;
        this.steps = steps;
    }

    /**
     * Gibt den aktuell aktiven Schritt zurück, oder null wenn die Session abgeschlossen ist
     * oder keine Schritte vorhanden sind.
     */
    public RecordingStep getCurrentStep() {
        if (complete || currentStepIndex >= steps.size()) return null;
        return steps.get(currentStepIndex);
    }

    /**
     * Rückt zur nächsten Zutat vor.
     * @return den neuen aktuellen Schritt, oder null wenn alle Schritte abgearbeitet sind
     */
    public RecordingStep advance() {
        currentStepIndex++;
        if (currentStepIndex >= steps.size()) {
            complete = true;
            return null;
        }
        return steps.get(currentStepIndex);
    }

    public UUID getSessionId() { return sessionId; }
    public Recipe getSourceRecipe() { return sourceRecipe; }
    public List<RecordingStep> getSteps() { return Collections.unmodifiableList(steps); }
    public int getCurrentStepIndex() { return currentStepIndex; }
    public boolean isComplete() { return complete; }
    public int getTotalSteps() { return steps.size(); }
}
