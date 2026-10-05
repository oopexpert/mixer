package usecase.user;

import mixer.Mixer;
import mixer.MixerState;

public class GetStatusUseCase {
    private final Mixer mixer;

    public GetStatusUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public MixerState execute() {
        return mixer.getState();
    }
}
