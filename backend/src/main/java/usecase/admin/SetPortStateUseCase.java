package usecase.admin;

import mixer.Mixer;
import io.javalin.http.Context;

public class SetPortStateUseCase {
    private final Mixer mixer;

    public SetPortStateUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public void execute(Context ctx) {
        String portName = ctx.pathParam("port");
        String state = ctx.pathParam("state");
        var portInstance = mixer.getOrOpenPort(portName);
        if (portInstance == null) {
            ctx.status(404).result("Der Port " + portName + " wurde nicht gefunden oder konnte nicht geöffnet werden.");
            return;
        }
        if ("on".equalsIgnoreCase(state)) {
            portInstance.start();
        } else if ("off".equalsIgnoreCase(state)) {
            portInstance.stop();
        } else {
            ctx.status(400).result("Ungültiger Status: " + state + ". Nutze 'on' oder 'off'.");
            return;
        }
        ctx.status(200).result("Port " + portName + " auf " + state + " gesetzt.");
    }
}
