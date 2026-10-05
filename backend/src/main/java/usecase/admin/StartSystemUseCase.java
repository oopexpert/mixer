package usecase.admin;

import mixer.Mixer;

//Initialisiert die Hardware / Ports
public class StartSystemUseCase {
	private final Mixer mixer;

	public StartSystemUseCase(Mixer mixer) {
		this.mixer = mixer;
	}

	public void execute() {
		mixer.start();
	}
}