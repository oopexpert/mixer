package mixer.ingredient;

import java.util.UUID;

/**
 * Represents a viscous ingredient (e.g. syrups).
 */
public class ViscousIngredient extends Ingredient {

	private ViscousIngredient() {
		// Jackson
	}

	public ViscousIngredient(UUID uuid, String name) {
		super(uuid, name);
	}
}
