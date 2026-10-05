package usecase.admin;

import mixer.Mixer;
import mixer.ingredient.Ingredient;
import mixer.port.com.PortIngredient;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class SetPortIngredientMappingUseCase {

    public record UpdatedPortMapping(String comPort, UUID ingredientUuid, String ingredientName) {}
    public record Result(List<UpdatedPortMapping> updatedMappings) {}

    private final Mixer mixer;

    public SetPortIngredientMappingUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    /**
     * Setzt die Zuordnung einer Ingredient-UUID zu einem COM-Port.
     * Führt ggf. einen Tausch durch, falls die Zutat schon an einem anderen Port ist.
     *
     * @param comPort        Ziel-COM-Port
     * @param ingredientUuid UUID der Zutat
     * @return Result mit den geänderten Port-Zuordnungen (1 oder 2 Einträge)
     */
    public Result execute(String comPort, UUID ingredientUuid) {
        List<PortIngredient> portIngredients = mixer.getConfiguration().getComIngredients();
        PortIngredient target = portIngredients.stream()
                .filter(pi -> pi.getCom().equals(comPort))
                .findFirst()
                .orElse(null);

        if (target == null) {
            // Port noch nicht in der Konfiguration – neuen Eintrag on-demand anlegen
            target = new PortIngredient(comPort);
            portIngredients.add(target);
        }

        List<UpdatedPortMapping> changed = new ArrayList<>();

        // Finde, ob die Zutat schon an einem anderen Port ist
        PortIngredient other = portIngredients.stream()
                .filter(pi -> ingredientUuid.equals(pi.getIngredient()) && !pi.getCom().equals(comPort))
                .findFirst()
                .orElse(null);

        if (other != null) {
            // Tausch: ingredient von target und other vertauschen
            UUID displaced = target.getIngredient();
            target.setIngredient(ingredientUuid);
            other.setIngredient(displaced);
            changed.add(toMapping(target));
            changed.add(toMapping(other));
        } else {
            target.setIngredient(ingredientUuid);
            changed.add(toMapping(target));
        }

        return new Result(changed);
    }

    private UpdatedPortMapping toMapping(PortIngredient pi) {
        Ingredient ing = mixer.getConfiguration().getIngredient(pi.getIngredient());
        String name = ing != null ? ing.getName() : null;
        return new UpdatedPortMapping(pi.getCom(), pi.getIngredient(), name);
    }
}
