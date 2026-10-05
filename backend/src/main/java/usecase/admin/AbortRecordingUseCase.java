package usecase.admin;

import io.javalin.http.Context;
import mixer.Mixer;
import mixer.recording.RecordingSession;

/**
 * Bricht die laufende Aufzeichnungssession ab.
 * Offene Ports werden gestoppt, die Session wird verworfen.
 */
public class AbortRecordingUseCase {

    private final Mixer mixer;

    public AbortRecordingUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public void execute(Context ctx) {
        RecordingSession session = mixer.getActiveRecordingSession();
        if (session == null) {
            ctx.status(200).result("Keine aktive Aufzeichnungssession – nichts zu tun.");
            return;
        }
        try {
            mixer.abortRecording();
        } catch (UnsupportedOperationException e) {
            ctx.status(409).result("Abbruch im aktuellen Zustand nicht möglich.");
            return;
        }
        ctx.status(200).result("Aufzeichnung abgebrochen.");
    }
}
