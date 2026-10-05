package mixer.ingredient;

import java.util.UUID;

public class CrystalIngredient extends Ingredient {

	private CrystalIngredient() {
        // Jackson
    }
	
    public CrystalIngredient(UUID uuid, String name) {
        super(uuid, name);
    }

}
