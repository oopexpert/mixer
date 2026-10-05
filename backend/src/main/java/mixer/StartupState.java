package mixer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import mixer.config.Configuration;
import mixer.port.PortAdapter;
import mixer.port.com.PortIngredient;
import mixer.port.provider.ComPortProvider;

public class StartupState implements MixerStateInternal {

    private static final Logger log = LoggerFactory.getLogger(StartupState.class);

    @Override
    public void initiate(Mixer mixer) {

        Configuration config = mixer.getConfiguration();
        ComPortProvider provider = mixer.getComPortProvider();

        try {
            java.util.List<String> availablePorts = provider.getAvailablePortNames();
            java.util.Set<String> systemPorts = new java.util.HashSet<>(availablePorts);
            boolean filterBySystem = !systemPorts.isEmpty();

            for (PortIngredient ci : config.getComIngredients()) {
                if (filterBySystem && !systemPorts.contains(ci.getCom())) {
                    log.warn("COM-Port '{}' nicht im System vorhanden – wird beim Start übersprungen.", ci.getCom());
                    continue;
                }

                // Falls der Port bereits existiert (z.B. nach Config-Reload),
                // schließen wir ihn zunächst sauber und ersetzen ihn.
                PortAdapter existing = mixer.get(ci.getCom());
                if (existing != null) {
                    try {
                        if (existing.isOpen()) {
                            existing.close();
                        }
                    } finally {
                        mixer.removeSerialPort(existing);
                    }
                }

                PortAdapter port = provider.createPort(ci.getCom());

                if (!port.open()) {
                    throw new IllegalStateException(
                        "COM-Port konnte nicht geöffnet werden: " + ci.getCom());
                }

                log.info("COM-Port '{}' erfolgreich geöffnet und registriert.", port.getPortName());
                mixer.registerSerialPort(ci.getCom(), port);
            }

            mixer.setState(new RequestPrimingContainerState());
        } catch (IllegalStateException e) {
            e.printStackTrace();
            mixer.setState(new InitialState());
        }
    }

    @Override
    public String getDescription() {
        return "Systemstart";
    }
}

