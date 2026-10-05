package usecase.admin;

import mixer.Mixer;

//Fährt das System sicher runter
public class ShutdownUseCase {
	private final Mixer mixer;

	public ShutdownUseCase(Mixer mixer) {
		this.mixer = mixer;
	}

	public void execute() {
		mixer.shutdown();
	}
}
