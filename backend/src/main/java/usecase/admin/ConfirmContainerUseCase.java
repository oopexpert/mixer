package usecase.admin;

import mixer.Mixer;

//Bestätigt, dass die Hardware bereit für die Sauerei ist
public class ConfirmContainerUseCase {
	private final Mixer mixer;

	public ConfirmContainerUseCase(Mixer mixer) {
		this.mixer = mixer;
	}

	public void execute() {
		mixer.confirmPrimingContainer();
	}
}
