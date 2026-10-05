package usecase.admin;

import mixer.Mixer;

public class GenerateRecipeTokenUsecase {

	private Mixer mixer;

	public GenerateRecipeTokenUsecase(Mixer mixer) {
		this.mixer = mixer;
	}
	
	public String generateReadableToken() {
		return this.mixer.generateReadableToken();
	}
	
}
