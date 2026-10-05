package mixer.config;

import static com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.ANY;
import static com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE;

import com.fasterxml.jackson.annotation.JsonAutoDetect;

/**
 * Konfigurationselement, das festlegt, wie COM-Ports zur Laufzeit ermittelt werden.
 *
 * <p>Unterstützte Typen:
 * <ul>
 *   <li>{@code REAL} – reale Systemports (echte Hardware)</li>
 *   <li>{@code CONFIG_DERIVED} – Ports werden aus den {@code comIngredients} abgeleitet (Dummy)</li>
 *   <li>{@code FILE} – Ports werden aus einer separaten JSON-Datei gelesen (Dummy).
 *       Das Feld {@code file} muss den Pfad zur Datei enthalten.</li>
 * </ul>
 */
@JsonAutoDetect(
        fieldVisibility = ANY,
        getterVisibility = NONE,
        setterVisibility = NONE,
        isGetterVisibility = NONE
)
public class ComPortProviderConfig {

    /** Typ des Providers: {@code REAL}, {@code CONFIG_DERIVED} oder {@code FILE}. */
    private String type;

    /** Pfad zur JSON-Datei mit Port-Namen; nur relevant bei Typ {@code FILE}. */
    private String file;

    public String getType() {
        return type;
    }

    public String getFile() {
        return file;
    }
}
