package mixer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import recipe.Recipe;

public class RequestRecipeState1 implements MixerStateInternal {

	private static final Logger log = LoggerFactory.getLogger(RequestRecipeState1.class);

	RequestRecipeState1() {
	}

	public void selectRecipe(Mixer mixer, Recipe recipe) {
		if (recipe == null) {
			log.warn("Rezeptauswahl fehlgeschlagen: kein Rezept übergeben.");
			return;
		}
		log.info("Rezept '{}' ausgewählt.", recipe.getName());
//		mixer.setState(new MixerDispenseState(recipe));
	}

	@Override
	public String getDescription() {
		return "Rezept abfragen.";
	}

	public void shutdown(Mixer mixer) {
		ShutdownState shutdownState = new ShutdownState();
		mixer.setState(shutdownState);
		shutdownState.initiate(mixer);
	}

}
