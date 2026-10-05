package mixer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer.OrderAnnotation;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;

import com.fasterxml.jackson.databind.ObjectMapper;

import app.MixerApp;
import io.javalin.Javalin;
import mixer.config.Configuration;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(OrderAnnotation.class)
public class IntegrationTest {

	private static final String TEST_CONFIG_JSON = """
			{
			  "ingredients": [
			    {
			      "uuid": "550e8400-e29b-41d4-a716-446655440000",
			      "type": "LIQUID",
			      "name": "Rotwein (trocken)"
			    },
			    {
			      "uuid": "67c3c260-20e1-4e41-949e-97641f6e2b92",
			      "type": "LIQUID",
			      "name": "Zitronenlimonade"
          },
          {
            "uuid": "11111111-2222-3333-4444-555555555555",
            "type": "CRYSTAL",
            "name": "Zucker (manuell)"
			    }
			  ],
			  "comPortProvider": {
			    "type": "CONFIG_DERIVED"
			  },
			  "comIngredients": [
			    {
			      "uuid": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
			      "com": "COM5",
			      "ingredient": "550e8400-e29b-41d4-a716-446655440000",
			      "calibration": 200
			    },
			    {
			      "uuid": "8e363606-f77e-40e1-9556-91599388f8d6",
			      "com": "COM6",
			      "ingredient": "67c3c260-20e1-4e41-949e-97641f6e2b92",
			      "calibration": 185
			    }
			  ],
			  "recipes": [
			    {
			      "uuid": "d290f1ee-6c54-4b01-90e6-d701748f0851",
			      "name": "Tinto de Verano",
			      "recipeIngredients": [
			        {
			          "type": "LIQUID",
			          "ingredientUUID": "550e8400-e29b-41d4-a716-446655440000",
			          "durationMilliseconds": 500
			        },
              {
                "type": "CRYSTAL",
                "ingredientUUID": "11111111-2222-3333-4444-555555555555",
                "rotations": 1
              },
			        {
			          "type": "LIQUID",
			          "ingredientUUID": "67c3c260-20e1-4e41-949e-97641f6e2b92",
			          "durationMilliseconds": 500
			        }
			      ]
			    },
			    {
			      "uuid": "a1b2c3d4-e5f6-4a5b-bc6d-7e8f9a0b1c2d",
			      "name": "Rotwein pur (groß)",
			      "recipeIngredients": [
			        {
			          "type": "LIQUID",
			          "ingredientUUID": "550e8400-e29b-41d4-a716-446655440000",
			          "durationMilliseconds": 800
			        }
			      ]
			    }
			  ]
			}
			""";

	private Javalin app;

	private String baseUrl;

	@AfterAll
    void tearDown() {
        if (app != null) {
            app.stop();
        }
    }

	@BeforeAll
	void setUp() {
		
	    // Wandelt den String in einen InputStream um
	    InputStream is = new ByteArrayInputStream(TEST_CONFIG_JSON.getBytes(StandardCharsets.UTF_8));
	    
	    Configuration config = Configuration.load(is);
		Mixer mixer = new Mixer(config);
	    
	    this.app = MixerApp.createApp(mixer);
      // Verwende einen freien Port (0), um Kollisionen mit lokal laufenden Instanzen zu vermeiden.
      this.app.start(0);

    this.baseUrl = "http://localhost:" + app.port();
		
	}
	
	private final ObjectMapper mapper = new ObjectMapper();
  private static final String ADMIN_TOKEN = "1234";

    @Test
    @Order(1)
    @DisplayName("1. System startet im Initialzustand")
    void testInitialStatus() throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            var request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/user/status"))
                    .GET().build();

            var response = client.send(request, HttpResponse.BodyHandlers.ofString());

            assertEquals(200, response.statusCode());
            var json = mapper.readTree(response.body());
            
            assertEquals("Initial", json.get("state").asText());
            assertTrue(json.get("message").asText().contains("inaktiv"));
        }
    }

    @Test
    @Order(2)
    @DisplayName("2. Systemstart -> Initialisierung -> Warten auf Behälter")
    void testStartAction() throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            var request = HttpRequest.newBuilder()
                      .uri(URI.create(baseUrl + "/admin/start?adminToken=" + ADMIN_TOKEN))
                    .POST(HttpRequest.BodyPublishers.noBody()).build();

            var response = client.send(request, HttpResponse.BodyHandlers.ofString());

            assertEquals(200, response.statusCode());
            var json = mapper.readTree(response.body());
            
            // Da die Initialisierung synchron läuft, landen wir direkt hier:
            assertEquals("RequestPrimingContainer", json.get("state").asText());
            System.out.println("Hardware initialisiert. Aktueller State: " + json.get("state").asText());
        }
    }

    @Test
    @Order(3)
    @DisplayName("3. Fehlerfall: Start im falschen Zustand")
    void testStartActionForbidden() throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            // Wir sind bereits in 'RequestPrimingContainer', ein erneutes 'start' sollte knallen
            var request = HttpRequest.newBuilder()
                      .uri(URI.create(baseUrl + "/admin/start?adminToken=" + ADMIN_TOKEN))
                    .POST(HttpRequest.BodyPublishers.noBody()).build();

            var response = client.send(request, HttpResponse.BodyHandlers.ofString());

            // HTTP 400 durch deinen StateActionHandler
            assertEquals(400, response.statusCode());
            
            var json = mapper.readTree(response.body());
            // Wichtig: Der Body verrät dem Frontend, wo wir WIRKLICH stehen
            assertEquals("RequestPrimingContainer", json.get("state").asText());
            System.out.println("Korrekt abgelehnt. Meldung: " + json.get("message").asText());
        }
    } 
    
    @Test
    @Order(4)
    @DisplayName("4. Behälter bestätigen -> Wechsel zu PrimingContainerConfirmed")
    void testConfirmContainer() throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            var request = HttpRequest.newBuilder()
                      .uri(URI.create(baseUrl + "/admin/confirm-container?adminToken=" + ADMIN_TOKEN))
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();

            var response = client.send(request, HttpResponse.BodyHandlers.ofString());

            // Wir erwarten Erfolg
            assertEquals(200, response.statusCode());
            
            var json = mapper.readTree(response.body());
            
            // Hier prüfen wir den Folgezustand. 
            // Ich nenne ihn hier mal beispielhaft 'PrimingContainerConfirmed' – 
            // passe den String bitte an deinen tatsächlichen Klassennamen an.
            assertEquals("PrimingContainerConfirmed", json.get("state").asText());
            System.out.println("Behälter bestätigt. System ist bereit zum Spülen.");
        }
    }
    
    @Test
    @Order(5)
    @DisplayName("5. Priming ausführen -> Wechsel in User-Bereitschaft")
    void testPrimeAction() throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            var request = HttpRequest.newBuilder()
                      .uri(URI.create(baseUrl + "/admin/prime?adminToken=" + ADMIN_TOKEN))
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();

            var response = client.send(request, HttpResponse.BodyHandlers.ofString());

            assertEquals(200, response.statusCode());
            
            var json = mapper.readTree(response.body());
            
            // Erwarteter Zustand nach dem Spülen
            assertEquals("MixerDispense", json.get("state").asText());
            System.out.println("Priming abgeschlossen. System ist im Zustand: " + json.get("state").asText());
        }
    }

    @Test
    @Order(6)
    @DisplayName("6. Rezept-Token erhalten")
    void testRetreiveRecipeToken() throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            var request = HttpRequest.newBuilder()
                      .uri(URI.create(baseUrl + "/admin/claim-recipe-token?adminToken=" + ADMIN_TOKEN))
                    .GET()
                    .build();

            var response = client.send(request, HttpResponse.BodyHandlers.ofString());

            // 1. Prüfen, ob der Request erfolgreich war
            assertEquals(200, response.statusCode());
            
            var json = mapper.readTree(response.body());
            
            this.recipeToken = json.get("recipeToken").asText();
            
            System.out.println("Rezept-Token ist " + this.recipeToken);
        }
    }

    private String recipeToken;
      private CompletableFuture<HttpResponse<String>> waitForIdleResponseFuture;
        private CompletableFuture<HttpResponse<String>> waitForIdleAfterConfirmResponseFuture;
    
    @Test
    @Order(7)
    @DisplayName("7. Mischvorgang ausführen")
    void testDispenseAndReturnToReady() throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            var request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/user/dispense/" + "d290f1ee-6c54-4b01-90e6-d701748f0851" + "?recipeToken=" + this.recipeToken))
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();

            var response = client.send(request, HttpResponse.BodyHandlers.ofString());

            // 1. Prüfen, ob der Request erfolgreich war
            assertEquals(200, response.statusCode());
            
            var json = mapper.readTree(response.body());
            
              // 2. Prüfen, ob wir im Misch-Thread sind (Dispensing) oder direkt eine manuelle Zutat ansteht.
              // Mit dem Test-Setup ist eine manuelle Zutat im Rezept enthalten.
              assertTrue(
                  json.get("state").asText().equals("MixerDispensing") || json.get("state").asText().equals("ManualIngredient"),
                  "Dispense sollte Dispensing oder ManualIngredient liefern. War: " + json.get("state").asText());

            this.waitForIdleResponseFuture = client.sendAsync(
                    HttpRequest.newBuilder()
                            .uri(URI.create(baseUrl + "/user/wait-for-idle"))
                            .GET()
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            
            System.out.println("Mischvorgang in Arbeit.");
        }
    }

  @Test
  @Order(8)
  @DisplayName("8. Manuelle Zutat erforderlich -> falsche und dann korrekte Bestätigung")
  void testManualIngredientConfirmation() throws Exception {
    try (var client = HttpClient.newHttpClient()) {
      assertTrue(waitForIdleResponseFuture != null, "wait-for-idle Future muss gestartet worden sein");
      var waitForManualIngredientResponse = waitForIdleResponseFuture.get(10, TimeUnit.SECONDS);
      assertEquals(200, waitForManualIngredientResponse.statusCode());
      var waitJson = mapper.readTree(waitForManualIngredientResponse.body());
      assertEquals("ManualIngredient", waitJson.get("state").asText());
      assertTrue(waitJson.hasNonNull("manualIngredient"), "wait-for-idle muss manualIngredient liefern");
      assertTrue(waitJson.hasNonNull("activeRecipe"), "wait-for-idle muss activeRecipe im ManualIngredient liefern");
      assertEquals("d290f1ee-6c54-4b01-90e6-d701748f0851", waitJson.get("activeRecipe").get("uuid").asText());
      assertEquals("Tinto de Verano", waitJson.get("activeRecipe").get("name").asText());
      String manualUuid = waitJson.get("manualIngredient").get("uuid").asText();
      assertEquals("Zucker (manuell)", waitJson.get("manualIngredient").get("name").asText());

      var statusResp = client.send(
          HttpRequest.newBuilder().uri(URI.create(baseUrl + "/user/status")).GET().build(),
          HttpResponse.BodyHandlers.ofString());
      assertEquals(200, statusResp.statusCode());
      var statusJson = mapper.readTree(statusResp.body());
      assertEquals("ManualIngredient", statusJson.get("state").asText());
      assertTrue(statusJson.hasNonNull("manualIngredient"), "status muss manualIngredient im ManualIngredientState setzen");
      assertTrue(statusJson.hasNonNull("activeRecipe"), "status muss activeRecipe im ManualIngredient liefern");
      assertEquals("d290f1ee-6c54-4b01-90e6-d701748f0851", statusJson.get("activeRecipe").get("uuid").asText());
      assertEquals("Tinto de Verano", statusJson.get("activeRecipe").get("name").asText());
      assertEquals(manualUuid, statusJson.get("manualIngredient").get("uuid").asText());
      assertEquals("Zucker (manuell)", statusJson.get("manualIngredient").get("name").asText());

      // 1) Falsche UUID bestätigen -> 400
      var wrongConfirm = client.send(
          HttpRequest.newBuilder()
              .uri(URI.create(baseUrl + "/user/confirm-manual-ingredient/00000000-0000-0000-0000-000000000000"))
              .POST(HttpRequest.BodyPublishers.noBody())
              .build(),
          HttpResponse.BodyHandlers.ofString());
      assertEquals(400, wrongConfirm.statusCode());
      var wrongJson = mapper.readTree(wrongConfirm.body());
      assertEquals("ManualIngredient", wrongJson.get("state").asText());

      // 2) Richtige UUID bestätigen -> 200
      var okConfirm = client.send(
          HttpRequest.newBuilder()
              .uri(URI.create(baseUrl + "/user/confirm-manual-ingredient/" + manualUuid))
              .POST(HttpRequest.BodyPublishers.noBody())
              .build(),
          HttpResponse.BodyHandlers.ofString());
      assertEquals(200, okConfirm.statusCode());

      this.waitForIdleAfterConfirmResponseFuture = client.sendAsync(
          HttpRequest.newBuilder()
              .uri(URI.create(baseUrl + "/user/wait-for-idle"))
              .GET()
              .build(),
          HttpResponse.BodyHandlers.ofString());

      System.out.println("Manuelle Zutat wurde bestätigt: " + manualUuid);
    }
  }

      @Test
      @Order(9)
      @DisplayName("9. Warten auf Ende des Mischvorgangs (Wait-for-Idle)")
    void testWaitForIdle() throws Exception {
        System.out.print("Warte auf Abschluss der Abfüllung...");
        assertTrue(waitForIdleAfterConfirmResponseFuture != null, "zweites wait-for-idle Future muss nach der Bestätigung vorhanden sein");
        var response = waitForIdleAfterConfirmResponseFuture.get(10, TimeUnit.SECONDS);
        var json = mapper.readTree(response.body());

        assertEquals(200, response.statusCode());
        assertEquals("MixerDispense", json.get("state").asText(), "Der zweite wait-for-idle Aufruf darf erst nach Abschluss wieder MixerDispense melden.");
    }
    
    
      @Test
      @Order(10)
      @DisplayName("10. System Shutdown -> Zurück zum InitialState")
    void testShutdown() throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            var request = HttpRequest.newBuilder()
                      .uri(URI.create(baseUrl + "/admin/shutdown?adminToken=" + ADMIN_TOKEN))
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();

            var response = client.send(request, HttpResponse.BodyHandlers.ofString());

            assertEquals(200, response.statusCode());
            
            var json = mapper.readTree(response.body());
            
            // Prüfung: Sind wir wieder ganz am Anfang?
            assertEquals("Initial", json.get("state").asText());
            System.out.println("Shutdown erfolgreich. Hardware-Ports wurden sicher geschlossen.");
        }
    }
    
      @Test
      @Order(11)
      @DisplayName("11. Fast-Track: Start -> Skip Prime (ohne Container) -> Shutdown")
    void testFastTrackWorkflow() throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            
            // 1. Start auslösen
              var respStart = client.send(HttpRequest.newBuilder()
                      .uri(URI.create(baseUrl + "/admin/start?adminToken=" + ADMIN_TOKEN))
                    .POST(HttpRequest.BodyPublishers.noBody()).build(), 
                    HttpResponse.BodyHandlers.ofString());
            assertEquals("RequestPrimingContainer", mapper.readTree(respStart.body()).get("state").asText());

            // 2. Direkt Skip Prime aufrufen (Container-Bestätigung wird übersprungen)
              var respSkip = client.send(HttpRequest.newBuilder()
                      .uri(URI.create(baseUrl + "/admin/skip-prime?adminToken=" + ADMIN_TOKEN))
                    .POST(HttpRequest.BodyPublishers.noBody()).build(), 
                    HttpResponse.BodyHandlers.ofString());
            
            assertEquals(200, respSkip.statusCode());
            assertEquals("MixerDispense", mapper.readTree(respSkip.body()).get("state").asText());
            System.out.println("Fast-Track: Priming übersprungen, System direkt in RequestRecipe.");

            // 3. Shutdown
              var respShutdown = client.send(HttpRequest.newBuilder()
                      .uri(URI.create(baseUrl + "/admin/shutdown?adminToken=" + ADMIN_TOKEN))
                    .POST(HttpRequest.BodyPublishers.noBody()).build(), 
                    HttpResponse.BodyHandlers.ofString());
            
            assertEquals("Initial", mapper.readTree(respShutdown.body()).get("state").asText());
        }
    }    
}
