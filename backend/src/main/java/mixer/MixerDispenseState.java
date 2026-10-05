package mixer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import mixer.recording.RecordingSession;
import recipe.Recipe;

class MixerDispenseState implements MixerStateInternal {

    private static final Logger log = LoggerFactory.getLogger(MixerDispenseState.class);

    public MixerDispenseState() {
	}

	@Override
    public void beginDispense(Mixer mixer, Recipe recipe, String recipeToken) {
		Dispenser dispenser = mixer.getDispenser();
        mixer.setState(new MixerDispensingState(recipe));

        boolean tokenValid = !mixer.isRecipeTokenRequired()
                || (recipeToken != null && mixer.recipeTokens.remove(recipeToken.toLowerCase()));

      	if (tokenValid) {
	      		mixer.beginActiveDispense(recipe);

	        Thread.ofVirtual().start(() -> {
	            try {
	                dispenser.dispenseRecipe(recipe);
	                System.out.println("Mixer: Dispenser fertig.");
	                mixer.endActiveDispense();
	                mixer.setState(this);
	            } catch (Exception e) {
	            	log.error("Fehler beim Abfüllen von Rezept '{}': {}", recipe.getName(), e.getMessage(), e);
	            	mixer.endActiveDispense();
	                mixer.setState(this);
	            }
	        });

    	} else {
            mixer.setState(this);
    	}

    }

	public void shutdown(Mixer mixer) {
		ShutdownState shutdownState = new ShutdownState();
		mixer.setState(shutdownState);
		shutdownState.initiate(mixer);
	}

	@Override
	public void reloadConfiguration(Mixer mixer) {
		// Idle-State: Config + COM-Port-Mapping live aktualisieren
		mixer.reloadConfigurationAndReconcilePortsInternal();
	}

	@Override
	public void startRecording(Mixer mixer, Recipe recipe) {
		RecordingSession session = mixer.createRecordingSession(recipe);
		if (session.getTotalSteps() == 0) {
			throw new IllegalStateException(
					"Rezept '" + recipe.getName() + "' hat keine COM-Port-zugeordneten Zutaten zum Aufzeichnen.");
		}
		mixer.setState(new RecordingIngredientState(session, this));
		log.info("Aufzeichnungssession '{}' gestartet für Rezept '{}' ({} Schritte).",
				session.getSessionId(), recipe.getName(), session.getTotalSteps());
	}

	@Override
	public void abortRecording(Mixer mixer) {
		// Nach dem letzten Aufzeichnungsschritt ist der Mixer wieder hier, aber die Session
		// wartet noch auf Speichern/Verwerfen. Verwerfen ist immer erlaubt.
		RecordingSession session = mixer.getActiveRecordingSession();
		if (session != null && session.isComplete()) {
			mixer.clearRecordingSession();
			log.info("Abgeschlossene Aufzeichnungssession '{}' verworfen.", session.getSessionId());
		} else {
			throw new UnsupportedOperationException();
		}
	}

	@Override
	public String getDescription() {
		return "Mixer ist bereit für Abfüllung.";
	}

	@Override
	public void listActiveTokens(Mixer mixer) {
		// erlaubt
	}

}



