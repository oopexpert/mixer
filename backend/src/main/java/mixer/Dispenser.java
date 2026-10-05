package mixer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import mixer.port.PortAdapter;
import recipe.AddonRecipeIngredient;
import recipe.CrystalRecipeIngredient;
import recipe.LiquidRecipeIngredient;
import recipe.Recipe;
import recipe.RecipeIngredient;
import recipe.RecipeIngredientVisitor;
import recipe.ViscousRecipeIngredient;

public class Dispenser implements RecipeIngredientVisitor {

	private static final Logger log = LoggerFactory.getLogger(Dispenser.class);

	private Mixer mixer; 
  /**
   * Aktueller Index im Rezept (0-basiert) während {@link #dispenseRecipe(Recipe)}.
   * Wird genutzt, um beim manuellen Schritt zu prognostizieren, ob danach noch automatische Schritte folgen.
   */
  private int currentRecipeIngredientIndex = -1;
	
    public Dispenser(Mixer mixer) {
		this.mixer = mixer;
	}

    public void dispenseRecipe(Recipe recipe) {

        log.info("Starte Rezept '{}' mit {} Zutaten.", recipe.getName(), recipe.getRecipeIngredients().size());

        int idx = 0;
        for (RecipeIngredient<?> ingredient : recipe.getRecipeIngredients()) {
			this.currentRecipeIngredientIndex = idx;
            ingredient.accept(this);
			idx++;
        }
		this.currentRecipeIngredientIndex = -1;

        log.info("Rezept '{}' vollständig abgefüllt.", recipe.getName());
    }

    @Override
    public void visit(LiquidRecipeIngredient ingredient) {

        PortAdapter port = mixer.findPortForIngredient(ingredient.getIngredient()).orElse(null);
        if (port == null) {
		  mixer.requestManualIngredient(ingredient.getIngredient(), currentRecipeIngredientIndex);
          mixer.waitForManualIngredientConfirmation();
          return;
        }

        log.debug("Flüssigzutat '{}': Pumpe einschalten ({}ms).", ingredient.getName(), ingredient.getDurationMilliseconds());

        // Relais an
        port.start();

        try {
			Thread.sleep(ingredient.getDurationMilliseconds());
		} catch (InterruptedException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

        // Relais aus
        port.stop();

        log.debug("Flüssigzutat '{}': Pumpe ausgeschaltet, Abfüllung abgeschlossen.", ingredient.getName());
    }

    @Override
    public void visit(CrystalRecipeIngredient ingredient) {

        PortAdapter port = mixer.findPortForIngredient(ingredient.getIngredient()).orElse(null);
        if (port == null) {
		  mixer.requestManualIngredient(ingredient.getIngredient(), currentRecipeIngredientIndex);
          mixer.waitForManualIngredientConfirmation();
          return;
        }

        log.debug("Kristallzutat '{}': Dosiervorgang gestartet ({} Umdrehungen).", ingredient.getName(), ingredient.getRotations());

        for (int i = 0; i < ingredient.getRotations(); i++) {
            // z. B. 360° Drehung triggern
            port.start();
            try {
				Thread.sleep(500);
			} catch (InterruptedException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
            port.stop();
            try {
				Thread.sleep(500);
			} catch (InterruptedException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
        }

        log.debug("Kristallzutat '{}': Dosiervorgang abgeschlossen.", ingredient.getName());
    }

  @Override
  public void visit(ViscousRecipeIngredient ingredient) {

    PortAdapter port = mixer.findPortForIngredient(ingredient.getIngredient()).orElse(null);
    if (port == null) {
	  mixer.requestManualIngredient(ingredient.getIngredient(), currentRecipeIngredientIndex);
      mixer.waitForManualIngredientConfirmation();
      return;
    }

    // Falls Viscous irgendwann automatisiert wird, behandeln wir es hier erstmal wie Liquid.
    log.debug("Viskose Zutat '{}': Pumpe einschalten (500ms).", ingredient.getName());
    port.start();
    try {
      Thread.sleep(500);
    } catch (InterruptedException e) {
      e.printStackTrace();
    }
    port.stop();
    log.debug("Viskose Zutat '{}': Pumpe ausgeschaltet, Abfüllung abgeschlossen.", ingredient.getName());
  }

  @Override
  public void visit(AddonRecipeIngredient ingredient) {
    // Add-ons sind typischerweise manuell und kommen am Ende.
    PortAdapter port = mixer.findPortForIngredient(ingredient.getIngredient()).orElse(null);
    if (port == null) {
	  mixer.requestManualIngredient(ingredient.getIngredient(), currentRecipeIngredientIndex);
      mixer.waitForManualIngredientConfirmation();
      return;
    }

    // Falls Add-ons irgendwann automatisiert werden, hier als kurzer Impuls.
    log.debug("Add-on-Zutat '{}': Relais-Impuls senden (200ms).", ingredient.getName());
    port.start();
    try {
      Thread.sleep(200);
    } catch (InterruptedException e) {
      e.printStackTrace();
    }
    port.stop();
    log.debug("Add-on-Zutat '{}': Impuls abgeschlossen.", ingredient.getName());
  }


}

