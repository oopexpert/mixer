package mixer.recording;

/**
 * Repräsentiert einen einzelnen Ein/Aus-Zyklus während der Aufzeichnung.
 * Ein Schritt kann aus mehreren Zyklen bestehen, wenn der Admin feinjustiert.
 */
public class OnOffCycle {

    private final long startedAt;  // Epoch-Millisekunden (Serverzeit)
    private Long stoppedAt;        // null = läuft noch

    public OnOffCycle(long startedAt) {
        this.startedAt = startedAt;
    }

    /**
     * Beendet diesen Zyklus. Darf nur einmal aufgerufen werden.
     */
    public void stop(long stoppedAt) {
        if (this.stoppedAt != null) {
            throw new IllegalStateException("Zyklus wurde bereits gestoppt.");
        }
        this.stoppedAt = stoppedAt;
    }

    public boolean isRunning() {
        return stoppedAt == null;
    }

    /**
     * Dauer dieses Zyklus in Millisekunden.
     * Für einen noch laufenden Zyklus wird die bisherige Laufzeit zurückgegeben.
     */
    public long getDurationMs() {
        return (stoppedAt != null ? stoppedAt : System.currentTimeMillis()) - startedAt;
    }

    public long getStartedAt() {
        return startedAt;
    }

    public Long getStoppedAt() {
        return stoppedAt;
    }
}
