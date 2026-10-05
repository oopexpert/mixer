package usecase.admin;

import mixer.Mixer;

//Überspringt das Priming, falls Schläuche noch voll sind (Dank Rückschlagventil!)
public class SkipPrimingUseCase {
	private final Mixer mixer;

	public SkipPrimingUseCase(Mixer mixer) {
		this.mixer = mixer;
	}

	public void execute() {
		mixer.skipPriming();
	}
}
