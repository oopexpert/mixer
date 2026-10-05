package mixer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ShutdownState implements MixerStateInternal {

	private static final Logger log = LoggerFactory.getLogger(ShutdownState.class);

	@Override
	public void initiate(Mixer mixer) {
		mixer.endActiveDispense();
		mixer.getAllSerialPorts().forEach(port -> {
			if (port.isOpen()) {
				mixer.removeSerialPort(port);
				port.close();
				log.info("COM-Port '{}' sicher geschlossen.", port.getPortName());
			}
		});
		

		// Nach Shutdown direkt in SystemOffState wechseln
		mixer.setState(new InitialState());
	}

	@Override
	public String getDescription() {
		return "Herunterfahren. COM-Ports werden geschlossen.";
	}

}
