package mixer.port.provider;

import java.util.List;

/**
 * Stellt eine Liste von COM-Port-Namen aus einer bestimmten Quelle bereit.
 * Implementierungen unterscheiden sich in der Quelle (Systemabfrage, Konfiguration, Datei).
 */
public interface ComPortResolver {

    /**
     * Liefert die Namen der COM-Ports aus der jeweiligen Quelle.
     */
    List<String> resolve();
}
