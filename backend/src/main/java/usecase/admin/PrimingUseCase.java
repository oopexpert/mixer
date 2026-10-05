package usecase.admin;

import mixer.Mixer;

public class PrimingUseCase {
    private final Mixer mixer;

    public PrimingUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public void execute() {
        // Hier wird die physische Befüllung angestoßen
        mixer.priming(); 
    }
}