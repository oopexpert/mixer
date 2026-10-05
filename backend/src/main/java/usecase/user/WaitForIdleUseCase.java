package usecase.user;

import mixer.Mixer;
import mixer.MixerState;

public class WaitForIdleUseCase {
    private final Mixer mixer;

    public WaitForIdleUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public MixerState execute() {
        return mixer.waitForIdle();
    }
}
