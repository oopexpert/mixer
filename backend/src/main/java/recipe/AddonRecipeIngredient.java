package recipe;

import java.util.UUID;

import mixer.ingredient.AddonIngredient;
import mixer.ingredient.Ingredient;

/**
 * Recipe step for add-on ingredients (garnish like lime slice, mint etc.).
 *
 * Add-ons are typically manual steps at the end of a recipe.
 */
public class AddonRecipeIngredient extends RecipeIngredient<AddonIngredient> {

	private AddonRecipeIngredient() {
		// Jackson
	}

	public AddonRecipeIngredient(UUID ingredientUUID) {
		super(ingredientUUID);
	}

	@Override
	public void setIngredient(Ingredient ingredient) {
		this.ingredient = (AddonIngredient) ingredient;
	}

	@Override
	public void accept(RecipeIngredientVisitor visitor) {
		visitor.visit(this);
	}
}
