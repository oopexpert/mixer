package rest;

import io.javalin.http.Context;
import mixer.Mixer;

public class InStateExecution {

	public static void executeStateAction(Mixer mixer, Context ctx, Runnable action) {
	    try {
	        action.run();
	
	        // ERFOLG: Status 200
	        ctx.status(200).json(new MixerStatusResponse(mixer.getState()));
	        
	    } catch (UnsupportedOperationException e) {
	        // FEHLER: Status 400
	        // Wir nehmen den aktuellen State, aber die Nachricht der Exception
	        ctx.status(400).json(new MixerStatusResponse(mixer.getState(), e.getMessage()));
	    }
	}

}
