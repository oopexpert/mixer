package mixer.ingredient;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(
	    use = JsonTypeInfo.Id.NAME,
	    include = JsonTypeInfo.As.PROPERTY,
	    property = "type"
	)
	@JsonSubTypes({
	    @JsonSubTypes.Type(value = LiquidIngredient.class, name = "LIQUID"),
	    @JsonSubTypes.Type(value = CrystalIngredient.class, name = "CRYSTAL"),
	    @JsonSubTypes.Type(value = ViscousIngredient.class, name = "VISCOUS"),
	    @JsonSubTypes.Type(value = AddonIngredient.class, name = "ADDON")
	})
public abstract class Ingredient {

	private String name;
	private UUID uuid;
	
	protected Ingredient() {
        // Jackson
    }

    public Ingredient(UUID uuid, String name) {
    	this.uuid = uuid;
        this.name = name;
    }

    public String getName() {
        return name;
    }

	public UUID getUuid() {
		return uuid;
	}

}

