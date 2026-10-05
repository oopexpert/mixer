package app;

import java.io.File;

import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;
import mixer.Mixer;
import mixer.config.Configuration;
import rest.AdminController;
import rest.UserController;

public class MixerApp {

    public static void main(String[] args) {
        // Configuration wird lazy als Supplier übergeben, damit sie im laufenden Betrieb
    	// (per Admin-Endpunkt) neu geladen werden kann.
        File configFile = new File("configuration.json");
		Mixer mixer = new Mixer(() -> Configuration.load(configFile));
        createApp(mixer).start("0.0.0.0", 8080);        
    }

    private static final String ADMIN_SECRET = "1234";
    
    public record PortMapping(String portName, String ingredientName, java.util.UUID ingredientUuid) {}
    
    public static Javalin createApp(Mixer mixer) {
    	
    	Javalin app = Javalin.create(config -> {
    		
            config.bundledPlugins.enableCors(cors -> cors.addRule(c -> c.anyHost()));
            
            config.staticFiles.add("/static", Location.CLASSPATH);
            
            config.routes.before("/admin/*", ctx -> {
        		
                String providedToken = ctx.queryParam("adminToken");
                
                if (!ADMIN_SECRET.equals(providedToken)) {
                    ctx.status(401).result("Unauthorized: Admin-Passwort ungültig.");
                }
                
            });
            
	        AdminController adminController = new AdminController(mixer);
	        UserController userController = new UserController(mixer);
	
	        // Admin Sektion
	        
	    	config.routes.get("/admin/login-check", ctx -> ctx.status(200).result("OK"));
			config.routes.get("/admin/claim-recipe-token", adminController::handleClaimRecipeToken);
			config.routes.get("/admin/list-active-tokens", adminController::handleListActiveTokens);
	        config.routes.get("/admin/com-ports", adminController::listActivePorts);
	        config.routes.get("/admin/ingredients", adminController::handleListIngredients);
	        config.routes.get("/admin/system-com-ports", adminController::handleListSystemPorts);
	        config.routes.post("/admin/start", adminController::handleStart);
	        config.routes.post("/admin/confirm-container", adminController::handleConfirmContainer);
	        config.routes.post("/admin/prime", adminController::handlePrime);
	        config.routes.post("/admin/skip-prime", adminController::handleSkipPrime);
	        config.routes.post("/admin/shutdown", adminController::handleShutdown);
              config.routes.post("/admin/reload-configuration", adminController::handleReloadConfiguration);
          // Wichtig: spezifische Route muss vor der generischen {state}-Route registriert werden,
          // sonst wird "pulse" als {state} interpretiert.
          config.routes.post("/admin/com-ports/{port}/pulse", adminController::handlePulsePort);
          config.routes.post("/admin/com-ports/{port}/{state}", adminController::handleSetPortState);
          config.routes.post("/admin/set-recipe-token-required", adminController::handleSetRecipeTokenRequired);
          config.routes.post("/admin/map-port-ingredient", adminController::handleSetPortIngredientMapping);
          config.routes.post("/admin/save-configuration", adminController::handleSaveConfiguration);
	        
	        // User Sektion
                config.routes.get("/user/status", userController::handleGetStatus);
                config.routes.get("/user/wait-for-idle", userController::handleWaitForIdle);
                config.routes.get("/user/recipes", ctx -> ctx.json(userController.getRecipes()));
                config.routes.get("/user/require-recipe-token", userController::handleRequireRecipeToken);
                config.routes.post("/user/dispense/{" + UserController.RECIPE_UUID + "}", userController::handleDispense);
                config.routes.post("/user/confirm-manual-ingredient/{ingredientUuid}", userController::handleConfirmManualIngredient);

	        // Aufzeichnungsmodus
	        config.routes.post("/admin/recording/start/{recipeUuid}", adminController::handleStartRecording);
	        config.routes.post("/admin/recording/ingredient/start", adminController::handleStartRecordingIngredient);
	        config.routes.post("/admin/recording/ingredient/stop", adminController::handleStopRecordingIngredient);
	        config.routes.post("/admin/recording/ingredient/next", adminController::handleNextRecordingIngredient);
	        config.routes.get("/admin/recording/session", adminController::handleGetRecordingSession);
	        config.routes.post("/admin/recording/save", adminController::handleSaveRecordedRecipe);
	        config.routes.post("/admin/recording/abort", adminController::handleAbortRecording);
        });
    	

        return app;
    }

}