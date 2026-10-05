package mixer;

import java.util.UUID;

import mixer.ingredient.Ingredient;

/**
 * State, in dem der Benutzer eine Zutat manuell hinzufügen muss.
 */
public class ManualIngredientState implements MixerStateInternal {

    private final UUID expectedIngredientUuid;
    private final String expectedIngredientName;
    private final MixerStateInternal resumeState;
    /**
     * true wenn nach der Bestätigung dieser manuellen Zutat voraussichtlich noch mindestens
     * ein automatischer Abfüllschritt folgt (d.h. mindestens ein verbleibender Rezeptschritt
     * kann über einen konfigurieren COM-Port automatisch abgefüllt werden).
     */
    private final boolean hasNextAutomaticDispenseStep;

    public ManualIngredientState(Ingredient expectedIngredient, MixerStateInternal resumeState, boolean hasNextAutomaticDispenseStep) {
        this.expectedIngredientUuid = expectedIngredient.getUuid();
        this.expectedIngredientName = expectedIngredient.getName();
        this.resumeState = resumeState;
        this.hasNextAutomaticDispenseStep = hasNextAutomaticDispenseStep;
    }

    /**
     * Backwards-Compatibility:
     * Wenn der Aufrufer keine Info berechnet, nehmen wir konservativ "false" an.
     */
    public ManualIngredientState(Ingredient expectedIngredient, MixerStateInternal resumeState) {
        this(expectedIngredient, resumeState, false);
    }

    public UUID getExpectedIngredientUuid() {
        return expectedIngredientUuid;
    }

    public String getExpectedIngredientName() {
        return expectedIngredientName;
    }

    public MixerStateInternal getResumeState() {
        return resumeState;
    }

    public boolean hasNextAutomaticDispenseStep() {
        return hasNextAutomaticDispenseStep;
    }

  @Override
  public void confirmManualIngredient(Mixer mixer, UUID ingredientUuid) {
    // Diese Methode wird von Mixer.confirmManualIngredient(...) innerhalb des Mixer-Locks aufgerufen.
    UUID expected = mixer.getExpectedManualIngredientUuidInternal();
    if (expected == null) {
      throw new IllegalStateException("Aktuell wird keine manuelle Zutat erwartet.");
    }
    if (!expected.equals(ingredientUuid)) {
      throw new IllegalArgumentException("Falsche Zutat bestätigt. Erwartet: " + expected);
    }

    mixer.clearExpectedManualIngredientInternal();
    mixer.setState(resumeState);
    mixer.notifyManualIngredientConfirmedInternal();
  }

    @Override
    public String getDescription() {
        return "Bitte Zutat manuell hinzufügen: " + expectedIngredientName + " (" + expectedIngredientUuid + ")";
    }
}
