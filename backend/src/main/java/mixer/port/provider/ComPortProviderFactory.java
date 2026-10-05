package mixer.port.provider;

import java.util.List;

import mixer.config.ComPortProviderConfig;
import mixer.port.com.PortIngredient;

/**
 * Erzeugt den passenden {@link ComPortProvider} anhand der Konfiguration.
 */
public class ComPortProviderFactory {

    private ComPortProviderFactory() {}

    /**
     * Erzeugt einen {@link ComPortProvider} entsprechend dem konfigurierten Typ.
     *
     * <ul>
     *   <li>{@code REAL} – echte Systemports, echte Hardware-Implementierung</li>
     *   <li>{@code CONFIG_DERIVED} – Ports aus {@code comIngredients}, Dummy-Implementierung</li>
     *   <li>{@code FILE} – Ports aus einer separaten JSON-Datei, Dummy-Implementierung</li>
     * </ul>
     *
     * @param config        die Provider-Konfiguration aus der Anwendungskonfiguration
     * @param comIngredients die Ingredient-Port-Zuordnungen (benötigt für {@code CONFIG_DERIVED})
     */
    public static ComPortProvider create(ComPortProviderConfig config, List<PortIngredient> comIngredients) {
        if (config == null) {
            throw new IllegalStateException(
                    "comPortProvider ist nicht konfiguriert. Bitte 'comPortProvider' in der Konfigurationsdatei ergänzen.");
        }
        String type = config.getType();
        if (type == null) {
            throw new IllegalStateException("comPortProvider.type darf nicht leer sein.");
        }
        switch (type) {
            case "REAL":
                return new RealComPortProvider();
            case "CONFIG_DERIVED":
                return new DummyComPortProvider(new ConfigComPortResolver(comIngredients));
            case "FILE":
                String file = config.getFile();
                if (file == null || file.isBlank()) {
                    throw new IllegalStateException(
                            "comPortProvider.file muss bei Typ FILE angegeben werden.");
                }
                return new DummyComPortProvider(new FileComPortResolver(file));
            default:
                throw new IllegalStateException(
                        "Unbekannter comPortProvider-Typ: '" + type + "'. Erlaubt: REAL, CONFIG_DERIVED, FILE");
        }
    }
}
