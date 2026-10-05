package usecase.user;

import java.util.UUID;

import mixer.Mixer;

public class ConfirmManualIngredientUseCase {
    private final Mixer mixer;

    public ConfirmManualIngredientUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public void execute(String ingredientUuidString) {
        mixer.confirmManualIngredient(UUID.fromString(ingredientUuidString));
    }
}
