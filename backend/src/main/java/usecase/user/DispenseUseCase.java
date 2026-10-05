package usecase.user;

import java.util.UUID;

import mixer.Mixer;

public class DispenseUseCase {
    private final Mixer mixer;

    public DispenseUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public void execute(String recipeToken, String recipeUUIDString) {
        mixer.beginDispense(recipeToken, UUID.fromString(recipeUUIDString));
    }
}