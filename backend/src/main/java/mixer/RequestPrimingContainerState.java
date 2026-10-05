package mixer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

class RequestPrimingContainerState implements MixerStateInternal {

	private static final Logger log = LoggerFactory.getLogger(RequestPrimingContainerState.class);

	public RequestPrimingContainerState() {
	}
	
    @Override
    public void confirmCalibrationContainer(Mixer mixer) {
    	mixer.setState(new PrimingContainerConfirmedState());
    }

    @Override
    public void skipPriming(Mixer mixer) {
    	log.info("Schlauchbefüllung (Priming) wird auf Benutzeranfrage übersprungen.");
    	mixer.setState(new MixerDispenseState());
    }

  @Override
  public void reloadConfiguration(Mixer mixer) {
    // Erlaubt: in diesem Zustand wartet das System nur auf Benutzeraktion.
    // Ein Reload (inkl. Port-Reconcile) ist hier hilfreich, z.B. nach USB-Reconnect.
    mixer.reloadConfigurationAndReconcilePortsInternal();
  }

	@Override
	public String getDescription() {
		return "Kalibrierung gestartet. Bitte Behälter unterstellen oder überspringen.";
	}

}