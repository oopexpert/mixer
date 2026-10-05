package usecase.admin;

import mixer.Mixer;
import mixer.ingredient.Ingredient;
import java.util.List;

public class ListIngredientsUseCase {

    private final Mixer mixer;

    public ListIngredientsUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public List<Ingredient> execute() {
        return mixer.getConfiguration().getIngredients();
    }
}
