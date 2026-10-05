package mixer.config;

import static com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.ANY;
import static com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.ObjectMapper;

import mixer.ingredient.Ingredient;
import mixer.port.com.PortIngredient;
import recipe.Recipe;

@JsonAutoDetect(
	    fieldVisibility = ANY,
	    getterVisibility = NONE,
	    setterVisibility = NONE,
	    isGetterVisibility = NONE
	)
public class Configuration {

	private ComPortProviderConfig comPortProvider;

	/**
	 * Steuert, ob Benutzer einen vom Admin generierten Recipe-Token benötigen, um ein Rezept
	 * abzufüllen. Standard: {@code true}.
	 */
	private boolean requireRecipeToken = true;
	
    private List<Ingredient> ingredients;
    private List<PortIngredient> comIngredients;
    private List<Recipe> recipes;

    // transient / nicht aus JSON
    @JsonIgnore
    private Map<UUID, Ingredient> ingredientMap;
    @JsonIgnore
    private Map<UUID, PortIngredient> comIngredientMap;
    @JsonIgnore
    private Map<UUID, Recipe> recipeMap;
    @JsonIgnore
    private File sourceFile;

    public static Configuration load(File file) {
        try (InputStream is = new FileInputStream(file)) {
            Configuration cfg = load(is);
            cfg.sourceFile = file;
            return cfg;
        } catch (IOException e) {
            throw new RuntimeException("Failed to open configuration file: " + file.getPath(), e);
        }
    }

    public void save() {
        if (sourceFile == null) {
            throw new IllegalStateException("Konfiguration wurde nicht aus einer Datei geladen – kein Speicherziel bekannt.");
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.writerWithDefaultPrettyPrinter().writeValue(sourceFile, this);
        } catch (IOException e) {
            throw new RuntimeException("Failed to write configuration file: " + sourceFile.getPath(), e);
        }
    }

    public static Configuration load(InputStream inputStream) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            Configuration cfg = mapper.readValue(inputStream, Configuration.class);
            cfg.index();
            cfg.wire();
            return cfg;
        } catch (IOException e) {
            throw new RuntimeException("Failed to parse configuration from stream", e);
        }
    }
    
    private void wire() {
    	recipes.forEach(r -> r.getRecipeIngredients().forEach(i -> {
            UUID uuid = i.getIngredientUUID();
            Ingredient ing = ingredientMap.get(uuid);
            
            if (ing == null) {
                throw new IllegalStateException(
                    "RecipeIngredient referenziert unbekannte Ingredient-UUID: " + uuid +
                    " im Rezept: " + r.getName()
                );
            }

            i.setIngredient(ing);
    	}));
	}

	private void index() {
        ingredientMap = ingredients.stream()
            .collect(Collectors.toMap(
                Ingredient::getUuid,
                Function.identity()
            ));

        comIngredientMap = comIngredients.stream()
            .collect(Collectors.toMap(
                PortIngredient::getUuid,
                Function.identity()
            ));
        
        recipeMap = recipes.stream()
                .collect(Collectors.toMap(
                    Recipe::getUuid,
                    Function.identity()
                ));
    }

    public Ingredient getIngredient(UUID uuid) {
        return ingredientMap.get(uuid);
    }

    public List<Ingredient> getIngredients() {
        return ingredients;
    }

    public PortIngredient getComIngredient(UUID uuid) {
        return comIngredientMap.get(uuid);
    }

	public Recipe getRecipe(UUID uuid) {
		return recipeMap.get(uuid);
	}

	public Collection<Recipe> getRecipes() {
		return recipeMap.values();
	}

	public List<PortIngredient> getComIngredients() {
		return comIngredients;
	}

	public ComPortProviderConfig getComPortProvider() {
		return comPortProvider;
	}

	public boolean isRequireRecipeToken() {
		return requireRecipeToken;
	}

	public void setRequireRecipeToken(boolean requireRecipeToken) {
		this.requireRecipeToken = requireRecipeToken;
	}

	/**
	 * Fügt ein neues Rezept zur Konfiguration hinzu und verdrahtet seine Zutaten.
	 * Speichert noch nicht – dazu muss {@link #save()} aufgerufen werden.
	 */
	public void addRecipe(Recipe recipe) {
		// Ingredients verdrahten
		for (recipe.RecipeIngredient<?> ri : recipe.getRecipeIngredients()) {
			Ingredient ing = ingredientMap.get(ri.getIngredientUUID());
			if (ing == null) {
				throw new IllegalStateException("Unbekannte Ingredient-UUID: " + ri.getIngredientUUID());
			}
			ri.setIngredient(ing);
		}
		// Mutable list sicherstellen
		if (!(recipes instanceof java.util.ArrayList)) {
			recipes = new java.util.ArrayList<>(recipes);
		}
		recipes.add(recipe);
		recipeMap.put(recipe.getUuid(), recipe);
	}

	/**
	 * Ersetzt ein bestehendes Rezept (identifiziert via {@code replaceUuid}) durch {@code newRecipe}.
	 * Das neue Rezept übernimmt die UUID des alten (wird ignoriert falls abweichend).
	 * Speichert noch nicht – dazu muss {@link #save()} aufgerufen werden.
	 */
	public void replaceRecipe(UUID replaceUuid, Recipe newRecipe) {
		if (!recipeMap.containsKey(replaceUuid)) {
			throw new IllegalStateException("Rezept nicht gefunden: " + replaceUuid);
		}
		// Ingredients verdrahten
		for (recipe.RecipeIngredient<?> ri : newRecipe.getRecipeIngredients()) {
			Ingredient ing = ingredientMap.get(ri.getIngredientUUID());
			if (ing == null) {
				throw new IllegalStateException("Unbekannte Ingredient-UUID: " + ri.getIngredientUUID());
			}
			ri.setIngredient(ing);
		}
		// Mutable list sicherstellen
		if (!(recipes instanceof java.util.ArrayList)) {
			recipes = new java.util.ArrayList<>(recipes);
		}
		recipes.removeIf(r -> r.getUuid().equals(replaceUuid));
		recipeMap.remove(replaceUuid);
		recipes.add(newRecipe);
		recipeMap.put(newRecipe.getUuid(), newRecipe);
	}

}
