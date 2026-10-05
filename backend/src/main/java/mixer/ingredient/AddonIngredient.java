package mixer.ingredient;

import java.util.UUID;

/**
 * Represents an add-on ingredient (e.g. garnish like lime slice, orange slice, mint).
 */
public class AddonIngredient extends Ingredient {

	private AddonIngredient() {
		// Jackson
	}

	public AddonIngredient(UUID uuid, String name) {
		super(uuid, name);
	}
}
