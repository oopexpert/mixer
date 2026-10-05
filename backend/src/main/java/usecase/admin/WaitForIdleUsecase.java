package usecase.admin;

import mixer.Mixer;
import mixer.MixerState;

public class WaitForIdleUsecase {

	private Mixer mixer;

	public WaitForIdleUsecase(Mixer mixer) {
		this.mixer = mixer;
	}
	
	public MixerState waitForIdle() {
		return mixer.waitForIdle();
	}

}
