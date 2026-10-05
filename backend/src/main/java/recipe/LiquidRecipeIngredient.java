package recipe;

import java.util.UUID;

import mixer.ingredient.Ingredient;
import mixer.ingredient.LiquidIngredient;

public final class LiquidRecipeIngredient extends RecipeIngredient<LiquidIngredient> {

	private long durationMilliseconds;

	private LiquidRecipeIngredient() {
		// Jackson
	}
	
	public LiquidRecipeIngredient(UUID ingredientUUID, long durationMilliseconds) {
		super(ingredientUUID);
		this.durationMilliseconds = durationMilliseconds;
	}

	public long getDurationMilliseconds() {
		return durationMilliseconds;
	}


	@Override
	public void setIngredient(Ingredient ingredient) {
		this.ingredient = (LiquidIngredient) ingredient;
	}
    
	@Override
	public void accept(RecipeIngredientVisitor visitor) {
		visitor.visit(this);
	}

	
}
