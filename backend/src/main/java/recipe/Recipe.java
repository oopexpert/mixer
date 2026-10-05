package recipe;

import java.util.List;
import java.util.UUID;

public class Recipe {
	
	private String name;
	private List<RecipeIngredient<?>> recipeIngredients;
	private UUID uuid;

	private Recipe () {
		// Jackson
	}
	
	public Recipe(UUID uuid, String name, List<RecipeIngredient<?>> recipeIngredients) {
		this.name = name;
		this.recipeIngredients = recipeIngredients;
		this.uuid = uuid;
	}

	public String getName() {
		return name;
	}
	
	public UUID getUuid() {
		return uuid;
	}

	public List<RecipeIngredient<?>> getRecipeIngredients() {
		return recipeIngredients;
	}
	
}
