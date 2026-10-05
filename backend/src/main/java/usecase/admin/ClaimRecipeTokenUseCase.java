package usecase.admin;

import mixer.Mixer;

public class ClaimRecipeTokenUseCase {
    private final Mixer mixer;

    public ClaimRecipeTokenUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public String execute() {
        return mixer.generateReadableToken();
    }
}
