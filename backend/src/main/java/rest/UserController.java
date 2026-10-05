package rest;

import java.util.Collection;

import io.javalin.http.Context;
import mixer.Mixer;
import recipe.Recipe;
import usecase.user.ConfirmManualIngredientUseCase;
import usecase.user.DispenseUseCase;
import usecase.user.GetStatusUseCase;
import usecase.user.WaitForIdleUseCase;

public class UserController {

	public static final String RECIPE_UUID = "uuid";
	
	private final DispenseUseCase dispenseUC;
	private final Mixer mixer;
	private final GetStatusUseCase getStatusUC;
	private final WaitForIdleUseCase waitForIdleUC;
	private final ConfirmManualIngredientUseCase confirmManualIngredientUC;

	public UserController(Mixer mixer) {
		this.mixer = mixer;
		this.dispenseUC = new DispenseUseCase(mixer);
		this.getStatusUC = new GetStatusUseCase(mixer);
		this.waitForIdleUC = new WaitForIdleUseCase(mixer);
		this.confirmManualIngredientUC = new ConfirmManualIngredientUseCase(mixer);
	}

	public Collection<Recipe> getRecipes() {
		return mixer.getConfiguration().getRecipes();
	}
	
	public void handleDispense(Context ctx) {
		java.util.List<String> tokenParams = ctx.queryParamMap().get("recipeToken");
		String recipeToken = (tokenParams != null && !tokenParams.isEmpty()) ? tokenParams.get(0) : null;
		InStateExecution.executeStateAction(this.mixer, ctx, () -> dispenseUC.execute(recipeToken, ctx.pathParam(RECIPE_UUID)));
	}

	public void handleGetStatus(Context ctx) {
		ctx.json(new rest.MixerStatusResponse(this.mixer));
	}

	public void handleWaitForIdle(Context ctx) {
		ctx.json(new rest.MixerStatusResponse(waitForIdleUC.execute(), this.mixer));
	}

	public void handleConfirmManualIngredient(Context ctx) {
		try {
			confirmManualIngredientUC.execute(ctx.pathParam("ingredientUuid"));
			ctx.status(200).json(new rest.MixerStatusResponse(mixer.getState(), this.mixer));
		} catch (IllegalArgumentException e) {
			ctx.status(400).json(new rest.MixerStatusResponse(mixer.getState(), this.mixer, e.getMessage()));
		} catch (IllegalStateException e) {
			ctx.status(400).json(new rest.MixerStatusResponse(mixer.getState(), this.mixer, e.getMessage()));
		}
	}

	/**
	 * Gibt zurück, ob der Recipe-Token-Flow für Benutzer erforderlich ist.
	 * GET /user/require-recipe-token → { "requireRecipeToken": true|false }
	 */
	public void handleRequireRecipeToken(Context ctx) {
		ctx.json(java.util.Map.of("requireRecipeToken", mixer.isRecipeTokenRequired()));
	}
	
}