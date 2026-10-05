package rest;

import java.util.UUID;

import mixer.ManualIngredientState;
import mixer.Mixer;
import mixer.MixerState;
import recipe.Recipe;

public record MixerStatusResponse(String state, String message, ManualIngredient manualIngredient, ActiveRecipe activeRecipe, UUID activeDispenseId) {
  public record ManualIngredient(UUID uuid, String name, boolean hasNextAutomaticDispenseStep) {}
  public record ActiveRecipe(UUID uuid, String name) {}

    // Standard für Erfolg
    public MixerStatusResponse(MixerState state) {
    this(state.getClass().getSimpleName().replace("State", ""), state.getDescription(), manualIngredientFrom(state), null, null);
    }

  // Standard für Erfolg inkl. Mixer-Kontext
  public MixerStatusResponse(Mixer mixer) {
    this(mixer.getState(), mixer);
  }

  public MixerStatusResponse(MixerState state, Mixer mixer) {
    this(state.getClass().getSimpleName().replace("State", ""), state.getDescription(), manualIngredientFrom(state), activeRecipeFrom(mixer), mixer.getActiveDispenseId());
  }

    // Speziell für Fehler (nimmt die Nachricht der Exception)
    public MixerStatusResponse(MixerState state, String errorMessage) {
    this(state.getClass().getSimpleName().replace("State", ""), errorMessage, manualIngredientFrom(state), null, null);
    }

  public MixerStatusResponse(MixerState state, Mixer mixer, String errorMessage) {
    this(state.getClass().getSimpleName().replace("State", ""), errorMessage, manualIngredientFrom(state), activeRecipeFrom(mixer), mixer.getActiveDispenseId());
  }

  private static ManualIngredient manualIngredientFrom(MixerState state) {
    if (state instanceof ManualIngredientState mis) {
      return new ManualIngredient(
          mis.getExpectedIngredientUuid(),
          mis.getExpectedIngredientName(),
          mis.hasNextAutomaticDispenseStep());
    }
    return null;
  }

  private static ActiveRecipe activeRecipeFrom(Mixer mixer) {
    Recipe recipe = mixer.getActiveRecipe();
    if (recipe == null) {
      return null;
    }
    return new ActiveRecipe(recipe.getUuid(), recipe.getName());
  }
}