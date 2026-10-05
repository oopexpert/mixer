package mixer.port.provider;

import java.util.List;
import java.util.stream.Collectors;

import mixer.port.com.PortIngredient;

/**
 * Resolver, der die COM-Port-Namen aus den in der Konfiguration hinterlegten
 * {@code comIngredients}-Einträgen ableitet.
 * Geeignet für den Simulationsbetrieb ohne separate Port-Datei.
 */
public class ConfigComPortResolver implements ComPortResolver {

    private final List<PortIngredient> comIngredients;

    public ConfigComPortResolver(List<PortIngredient> comIngredients) {
        this.comIngredients = comIngredients;
    }

    @Override
    public List<String> resolve() {
        return comIngredients.stream()
                .map(PortIngredient::getCom)
                .collect(Collectors.toList());
    }
}
