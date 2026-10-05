package usecase.admin;

import mixer.Mixer;

/**
 * Lädt die Konfiguration neu, ohne den Server neu zu starten.
 *
 * Darf nur ausgeführt werden, wenn das System aktuell nicht beschäftigt ist
 * (keine Abfüllung / Kalibrierung / Startvorgang).
 */
public class ReloadConfigurationUseCase {

	private final Mixer mixer;

	public ReloadConfigurationUseCase(Mixer mixer) {
		this.mixer = mixer;
	}

	public void execute() {
		mixer.reloadConfiguration();
	}
}
