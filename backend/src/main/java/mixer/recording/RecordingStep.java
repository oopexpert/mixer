package mixer.recording;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Ein Aufzeichnungsschritt für eine einzelne Zutat.
 *
 * Der Admin kann pro Schritt beliebig oft Start/Stop betätigen (Feinjustierung).
 * Die Gesamtabfüllzeit ergibt sich aus der Summe aller abgeschlossenen und
 * laufenden Zyklen: {@link #getTotalDurationMs()}.
 *
 * Die Oberfläche berechnet die Gesamtzeit als:
 *   sum( stoppedAt_i - startedAt_i ) für alle abgeschlossenen Zyklen
 *   + (currentTime - startedAt_laufend) falls ein Zyklus noch läuft
 * Alle Zeitstempel sind serverseitige Epoch-Millisekunden.
 *
 * Zum Vergleich ist die ursprüngliche Abfüllzeit aus dem Quellrezept
 * in {@link #getOriginalDurationMs()} hinterlegt (null wenn nicht verfügbar).
 */
public class RecordingStep {

    private final UUID ingredientUuid;
    private final String ingredientName;
    private final String portName;
    /** Referenzwert aus dem Quellrezept (z.B. LiquidRecipeIngredient.durationMilliseconds). Null wenn nicht anwendbar. */
    private final Long originalDurationMs;

    private final List<OnOffCycle> cycles = new ArrayList<>();
    private boolean portCurrentlyOn = false;

    public RecordingStep(UUID ingredientUuid, String ingredientName, String portName, Long originalDurationMs) {
        this.ingredientUuid = ingredientUuid;
        this.ingredientName = ingredientName;
        this.portName = portName;
        this.originalDurationMs = originalDurationMs;
    }

    /**
     * Startet einen neuen Ein/Aus-Zyklus.
     * @throws IllegalStateException wenn der Port bereits eingeschaltet ist
     */
    public OnOffCycle startCycle() {
        if (portCurrentlyOn) {
            throw new IllegalStateException("Port '" + portName + "' ist bereits eingeschaltet.");
        }
        OnOffCycle cycle = new OnOffCycle(System.currentTimeMillis());
        cycles.add(cycle);
        portCurrentlyOn = true;
        return cycle;
    }

    /**
     * Beendet den laufenden Zyklus.
     * @throws IllegalStateException wenn der Port nicht eingeschaltet ist
     */
    public OnOffCycle stopCycle() {
        if (!portCurrentlyOn) {
            throw new IllegalStateException("Port '" + portName + "' ist nicht eingeschaltet.");
        }
        OnOffCycle current = cycles.get(cycles.size() - 1);
        current.stop(System.currentTimeMillis());
        portCurrentlyOn = false;
        return current;
    }

    /**
     * Kumulierte Abfüllzeit: Summe der Dauern aller Zyklen (abgeschlossen + laufend).
     * Formel für die Oberfläche: sum(stoppedAt_i - startedAt_i) + optional(now - startedAt_laufend)
     */
    public long getTotalDurationMs() {
        return cycles.stream().mapToLong(OnOffCycle::getDurationMs).sum();
    }

    public UUID getIngredientUuid() { return ingredientUuid; }
    public String getIngredientName() { return ingredientName; }
    public String getPortName() { return portName; }
    public Long getOriginalDurationMs() { return originalDurationMs; }
    public List<OnOffCycle> getCycles() { return Collections.unmodifiableList(cycles); }
    public boolean isPortCurrentlyOn() { return portCurrentlyOn; }
    public int getCycleCount() { return cycles.size(); }
}
