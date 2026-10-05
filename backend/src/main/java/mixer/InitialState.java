package mixer;

public class InitialState implements MixerStateInternal {

	@Override
	public void start(Mixer mixer) {
		StartupState state = new StartupState();
		mixer.setState(state);
		state.initiate(mixer);
	}

	@Override
	public void reloadConfiguration(Mixer mixer) {
		// Reload soll auch COM-Ports aktualisieren, damit USB-Reconnects (z.B. COM11) ohne
		// komplettes Shutdown+Initialisieren wieder funktionieren.
		mixer.reloadConfigurationAndReconcilePortsInternal();
	}
	
	@Override
	public String getDescription() {
		return "System ist im Initialzustand und inaktiv";
	}

}
