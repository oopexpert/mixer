package mixer.port.provider;

import java.io.File;
import java.io.IOException;
import java.util.List;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Resolver, der die COM-Port-Namen aus einer separaten JSON-Datei liest.
 * Das erwartete Format ist ein einfaches JSON-Array mit Port-Namen:
 * <pre>
 * ["COM4", "COM5", "COM6"]
 * </pre>
 */
public class FileComPortResolver implements ComPortResolver {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final String filePath;

    public FileComPortResolver(String filePath) {
        this.filePath = filePath;
    }

    @Override
    public List<String> resolve() {
        try {
            return MAPPER.readValue(new File(filePath), new TypeReference<List<String>>() {});
        } catch (IOException e) {
            throw new IllegalStateException(
                    "COM-Port-Liste konnte nicht aus Datei gelesen werden: " + filePath, e);
        }
    }
}
