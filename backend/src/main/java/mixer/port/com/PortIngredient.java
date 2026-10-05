package mixer.port.com;

import java.util.UUID;

public class PortIngredient {

    private UUID uuid;
    private String com;
    private UUID ingredient;
    private long calibration; // ms oder s – deine Entscheidung

    public PortIngredient() {}

    public PortIngredient(String com) {
        this.uuid = UUID.randomUUID();
        this.com = com;
    }

    public UUID getUuid() {
        return uuid;
    }

    public String getCom() {
        return com;
    }

    public UUID getIngredient() {
        return ingredient;
    }

    public long getCalibration() {
        return calibration;
    }

    public void setCom(String com) {
        this.com = com;
    }

    public void setIngredient(UUID ingredient) {
        this.ingredient = ingredient;
    }
}
