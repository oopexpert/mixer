package mixer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import mixer.ingredient.Ingredient;
import mixer.port.PortAdapter;
import mixer.port.com.PortIngredient;

public class PrimingState implements MixerStateInternal {

	private static final Logger log = LoggerFactory.getLogger(PrimingState.class);

	public PrimingState() {
	}

	@Override
	public void priming(Mixer mixer) {
        mixer.getConfiguration().getComIngredients().forEach(ci -> priming(mixer, ci));
        log.info("Schlauchbefüllung (Priming) aller konfigurierten Ports abgeschlossen.");
		try {
			Thread.sleep(2000l);
		} catch (InterruptedException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
        mixer.setState(new MixerDispenseState());
	}

	private void priming(Mixer mixer, PortIngredient ci) {
		Ingredient ingredient = mixer.getConfiguration().getIngredient(ci.getIngredient());
		PortAdapter port = mixer.getPortForIngredient(ingredient);
		
		try {
		    port.start();
			Thread.sleep(ci.getCalibration());
		    port.stop();
		} catch (InterruptedException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	@Override
	public String getDescription() {
		return "Schläuche werden nach Konfiguration befüllt.";
	}


}
