package usecase.admin;

import io.javalin.http.Context;
import mixer.Mixer;

/**
 * Admin UseCase zum Kalibrieren: Port für n Millisekunden einschalten (mindestens 500ms),
 * danach sicher wieder ausschalten.
 *
 * Berücksichtigt "wait-for-idle": bevor geschaltet wird, wird (blockierend) auf Idle gewartet.
 */
public class PulsePortUseCase {

	public static final long MIN_DURATION_MILLIS = 500;

	private final Mixer mixer;

	public PulsePortUseCase(Mixer mixer) {
		this.mixer = mixer;
	}

	public void execute(Context ctx) {
		String portName = ctx.pathParam("port");

		Long durationMs = parseDurationMsOrNull(ctx.queryParam("durationMs"));
		long effectiveDurationMs = Math.max(durationMs == null ? MIN_DURATION_MILLIS : durationMs, MIN_DURATION_MILLIS);

		var portInstance = mixer.getOrOpenPort(portName);
		if (portInstance == null) {
			ctx.status(404).result("Der Port " + portName + " wurde nicht gefunden oder konnte nicht geöffnet werden.");
			return;
		}
		if (!portInstance.isOpen()) {
			ctx.status(400).result("Port " + portName + " ist nicht geöffnet.");
			return;
		}
		// Synchronisation macht das Frontend über /user/wait-for-idle.
		// Dieser Endpoint blockt NICHT auf idle, sondern lehnt ab, wenn das System gerade beschäftigt ist.
		if (mixer.isBusy()) {
			ctx.status(409).result("Mixer ist beschäftigt. Bitte zuerst /user/wait-for-idle verwenden und dann erneut versuchen.");
			return;
		}

		long started = System.currentTimeMillis();
		try {
			portInstance.start();
			try {
				Thread.sleep(effectiveDurationMs);
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
				// wir versuchen im finally trotzdem auszuschalten
			}
		} finally {
			try {
				portInstance.stop();
			} catch (Exception ignored) {
				// Best effort: wir wollen hier keine Exception nach außen werfen
			}
		}

		long actual = Math.max(0, System.currentTimeMillis() - started);
		ctx.json(java.util.Map.of(
				"port", portName,
				"requestedDurationMs", durationMs,
				"effectiveDurationMs", effectiveDurationMs,
				"actualDurationMs", actual
		));
	}

	private static Long parseDurationMsOrNull(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		try {
			return Long.parseLong(raw.trim());
		} catch (NumberFormatException e) {
			return null;
		}
	}
}
