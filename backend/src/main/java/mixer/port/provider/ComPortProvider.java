package mixer.port.provider;

import java.util.List;

import mixer.port.PortAdapter;

/**
 * Abstrahiert die Ermittlung verfügbarer COM-Ports sowie die Erzeugung von Port-Adaptern.
 * Konkrete Implementierungen bestimmen, ob echte Systemports oder simulierte Ports
 * verwendet werden.
 */
public interface ComPortProvider {

    /**
     * Liefert die Namen der COM-Ports, die als verfügbar gelten sollen.
     * Eine leere Liste signalisiert, dass kein System-Filterung stattfindet.
     */
    List<String> getAvailablePortNames();

    /**
     * Erzeugt einen {@link PortAdapter} für den angegebenen Port-Namen.
     */
    PortAdapter createPort(String portName);
}
