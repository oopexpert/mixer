package usecase.admin;

import io.javalin.http.Context;
import mixer.Mixer;
import mixer.recording.RecordingSession;
import mixer.recording.RecordingStep;
import recipe.LiquidRecipeIngredient;
import recipe.Recipe;
import recipe.RecipeIngredient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Speichert die abgeschlossene Aufzeichnungssession als neues (oder überarbeitetes) Rezept.
 *
 * Request-Body (JSON):
 * {
 *   "recipeName":        "Gin Tonic aufgezeichnet",   // Pflicht
 *   "replaceSourceRecipe": false                        // Optional; true = Quellrezept ersetzen
 * }
 *
 * Für jede aufgezeichnete LiquidRecipeIngredient-Zutat wird die gespeicherte
 * durationMilliseconds durch die kumulierte Aufzeichnungszeit (totalDurationMs) ersetzt.
 * Alle anderen Zutaten (manuelle Zugaben, Add-ons, Crystal, ...) werden unverändert
 * aus dem Quellrezept übernommen.
 */
public class SaveRecordedRecipeUseCase {

    private final Mixer mixer;

    public SaveRecordedRecipeUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public void execute(Context ctx) {
        RecordingSession session = mixer.getActiveRecordingSession();
        if (session == null) {
            ctx.status(409).result("Keine Aufzeichnungssession vorhanden.");
            return;
        }
        if (!session.isComplete()) {
            ctx.status(409).result("Aufzeichnungssession ist noch nicht abgeschlossen. Bitte alle Zutaten durchlaufen.");
            return;
        }

        Map<String, Object> body;
        try {
            body = ctx.bodyAsClass(java.util.HashMap.class);
        } catch (Exception e) {
            ctx.status(400).result("Ungültiger Request-Body. Erwartet: { recipeName, replaceSourceRecipe }");
            return;
        }

        String recipeName = body.get("recipeName") instanceof String s ? s.trim() : null;
        if (recipeName == null || recipeName.isBlank()) {
            ctx.status(400).result("'recipeName' ist erforderlich und darf nicht leer sein.");
            return;
        }

        boolean replaceSource = Boolean.TRUE.equals(body.get("replaceSourceRecipe"));

        // Recorded durations: ingredientUuid → totalDurationMs
        Map<UUID, Long> recordedDurations = new java.util.HashMap<>();
        for (RecordingStep step : session.getSteps()) {
            recordedDurations.put(step.getIngredientUuid(), step.getTotalDurationMs());
        }

        // Neue Ingredient-Liste aufbauen
        List<RecipeIngredient<?>> newIngredients = new ArrayList<>();
        for (RecipeIngredient<?> orig : session.getSourceRecipe().getRecipeIngredients()) {
            Long recordedDuration = recordedDurations.get(orig.getIngredientUUID());
            if (recordedDuration != null && orig instanceof LiquidRecipeIngredient) {
                newIngredients.add(new LiquidRecipeIngredient(orig.getIngredientUUID(), recordedDuration));
            } else {
                // Andere Typen (Manual, Crystal, Addon, Viscous) unverändert übernehmen
                newIngredients.add(orig);
            }
        }

        UUID newUuid = replaceSource ? session.getSourceRecipe().getUuid() : UUID.randomUUID();
        Recipe newRecipe = new Recipe(newUuid, recipeName, newIngredients);

        try {
            Recipe saved;
            if (replaceSource) {
                saved = mixer.replaceAndSaveRecipe(session.getSourceRecipe().getUuid(), newRecipe);
            } else {
                saved = mixer.addAndSaveRecipe(newRecipe);
            }
            mixer.clearRecordingSession();
            ctx.status(200).json(saved);
        } catch (IllegalStateException e) {
            ctx.status(500).result("Fehler beim Speichern des Rezepts: " + e.getMessage());
        }
    }
}
