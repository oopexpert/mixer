package mixer.port.provider;

import java.util.List;

import mixer.port.PortAdapter;
import mixer.port.com.JSerialCommPort;

/**
 * COM-Port-Provider für reale Hardware.
 * Ermittelt verfügbare Ports über das Betriebssystem und erzeugt echte {@link JSerialCommPort}-Instanzen.
 */
public class RealComPortProvider implements ComPortProvider {

    @Override
    public List<String> getAvailablePortNames() {
        return JSerialCommPort.listAvailablePorts();
    }

    @Override
    public PortAdapter createPort(String portName) {
        return new JSerialCommPort(portName);
    }
}
