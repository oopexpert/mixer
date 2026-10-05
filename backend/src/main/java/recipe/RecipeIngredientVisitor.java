package recipe;

public interface RecipeIngredientVisitor {

    void visit(LiquidRecipeIngredient ingredient);

    void visit(CrystalRecipeIngredient ingredient);

    void visit(ViscousRecipeIngredient ingredient);

    void visit(AddonRecipeIngredient ingredient);
}

