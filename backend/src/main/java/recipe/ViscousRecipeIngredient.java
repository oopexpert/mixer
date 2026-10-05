package recipe;

import java.util.UUID;

import mixer.ingredient.Ingredient;
import mixer.ingredient.ViscousIngredient;

/**
 * Recipe step for viscous ingredients (e.g. syrups).
 *
 * Note: At the moment a viscous ingredient without a COM port mapping will be treated
 * as a manual step by the dispenser/state machine.
 */
public class ViscousRecipeIngredient extends RecipeIngredient<ViscousIngredient> {

	private ViscousRecipeIngredient() {
		// Jackson
	}

	public ViscousRecipeIngredient(UUID ingredientUUID) {
		super(ingredientUUID);
	}

	@Override
	public void setIngredient(Ingredient ingredient) {
		this.ingredient = (ViscousIngredient) ingredient;
	}

	@Override
	public void accept(RecipeIngredientVisitor visitor) {
		visitor.visit(this);
	}
}
