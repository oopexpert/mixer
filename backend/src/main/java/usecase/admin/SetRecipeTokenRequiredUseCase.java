package usecase.admin;

import mixer.Mixer;

public class SetRecipeTokenRequiredUseCase {

    private final Mixer mixer;

    public SetRecipeTokenRequiredUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public void execute(boolean required) {
        mixer.setRecipeTokenRequired(required);
    }
}
