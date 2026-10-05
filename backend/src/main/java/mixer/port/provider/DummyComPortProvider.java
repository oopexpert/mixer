package mixer.port.provider;

import java.util.List;

import mixer.port.PortAdapter;
import mixer.port.dummy.DummySerialPort;

/**
 * COM-Port-Provider für Simulationsbetrieb.
 * Erzeugt immer {@link DummySerialPort}-Instanzen. Die Liste der verfügbaren Ports
 * wird von einem konfigurierbaren {@link ComPortResolver} bezogen, sodass unterschiedliche
 * Quellen (Konfiguration, Datei) ohne weitere Subklassen unterstützt werden.
 */
public class DummyComPortProvider implements ComPortProvider {

    private final ComPortResolver resolver;

    public DummyComPortProvider(ComPortResolver resolver) {
        this.resolver = resolver;
    }

    @Override
    public List<String> getAvailablePortNames() {
        return resolver.resolve();
    }

    @Override
    public PortAdapter createPort(String portName) {
        return new DummySerialPort(portName);
    }
}
