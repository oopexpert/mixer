package mixer;

import recipe.Recipe;

public class MixerDispensingState implements MixerStateInternal {

	private Recipe recipe;

	public MixerDispensingState(Recipe recipe) {
		this.recipe = recipe;
	}

	@Override
	public String getDescription() {
		return "Abfüllen wird gestartet mit Rezept: " + recipe.getName();
	}

}
