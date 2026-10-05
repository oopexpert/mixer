package mixer;

public class PrimingContainerConfirmedState implements MixerStateInternal {

	public PrimingContainerConfirmedState() {
	}
	
    @Override
    public void beginPriming(Mixer mixer) {
        PrimingState primingState = new PrimingState();
		mixer.setState(primingState);
		primingState.priming(mixer);
    }

	@Override
	public String getDescription() {
		return "Kalibrierungsbehälter wurde bestätigt.";
	}
	
}
