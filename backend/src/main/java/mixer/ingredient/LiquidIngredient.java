package mixer.ingredient;

import java.util.UUID;

public class LiquidIngredient extends Ingredient {

	private LiquidIngredient() {
        // Jackson
    }
	
    public LiquidIngredient(UUID uuid, String name) {
        super(uuid, name);
    }

}