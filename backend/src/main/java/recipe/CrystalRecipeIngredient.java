package recipe;

import java.util.UUID;

import mixer.ingredient.CrystalIngredient;
import mixer.ingredient.Ingredient;

public final class CrystalRecipeIngredient extends RecipeIngredient<CrystalIngredient> {

	private int rotations;

	private CrystalRecipeIngredient() {
		// Jackson
	}
	
	public CrystalRecipeIngredient(UUID crystalIngredientUUID, int rotations) {
		super(crystalIngredientUUID);
		this.rotations = rotations;
	}

	public int getRotations() {
		return rotations;
	}

	@Override
	public void setIngredient(Ingredient ingredient) {
		this.ingredient = (CrystalIngredient) ingredient;
	}

	@Override
	public void accept(RecipeIngredientVisitor visitor) {
		visitor.visit(this);
	}


}
