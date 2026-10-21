-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "makesMeals" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SignupRequest" ADD COLUMN     "makesMeals" BOOLEAN NOT NULL DEFAULT false;

-- Los negocios que ya existían: con mesas, comida; sin mesas, postres y panes (se cambia en Configuración).
UPDATE "Organization" SET "makesMeals" = "servesTables";
