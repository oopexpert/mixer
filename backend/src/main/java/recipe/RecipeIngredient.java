package recipe;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import mixer.ingredient.Ingredient;

@JsonTypeInfo(
	    use = JsonTypeInfo.Id.NAME,
	    include = JsonTypeInfo.As.PROPERTY,
	    property = "type"
	)
	@JsonSubTypes({
	    @JsonSubTypes.Type(value = LiquidRecipeIngredient.class, name = "LIQUID"),
      @JsonSubTypes.Type(value = CrystalRecipeIngredient.class, name = "CRYSTAL"),
      @JsonSubTypes.Type(value = ViscousRecipeIngredient.class, name = "VISCOUS"),
      @JsonSubTypes.Type(value = AddonRecipeIngredient.class, name = "ADDON")
	})
public abstract class RecipeIngredient<T extends Ingredient> {

    private UUID ingredientUUID;
    @JsonIgnore
    T ingredient;

    protected RecipeIngredient() {
    	// Jackson
    }
    
    protected RecipeIngredient(UUID ingredientUUID) {
        this.ingredientUUID = ingredientUUID;
    }

    
    public UUID getIngredientUUID() {
		return ingredientUUID;
	}

	public T getIngredient() {
        return ingredient;
    }
    
    @JsonIgnore
    public String getName() {
    	return this.getIngredient().getName();
    }

	public abstract void setIngredient(Ingredient ingredient);
	
	public abstract void accept(RecipeIngredientVisitor visitor);

}

