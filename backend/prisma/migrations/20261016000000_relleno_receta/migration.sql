-- Extra de un producto: un insumo (relleno comprado) o una receta propia (relleno hecho).
ALTER TABLE "ProductExtra" ALTER COLUMN "supplyId" DROP NOT NULL;
ALTER TABLE "ProductExtra" ADD COLUMN "recipeId" TEXT;
ALTER TABLE "ProductExtra" ADD CONSTRAINT "ProductExtra_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductExtra" ADD CONSTRAINT "ProductExtra_supply_or_recipe" CHECK (("supplyId" IS NULL) <> ("recipeId" IS NULL));
