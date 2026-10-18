-- Primeros pasos obligatorios: el negocio, una receta, una llave Bre-B y un repartidor.
ALTER TABLE "Organization" ADD COLUMN "setupCompletedAt" TIMESTAMP(3);

-- Los negocios que ya trabajan (tienen recetas) no vuelven a pasar por los primeros pasos.
UPDATE "Organization" o SET "setupCompletedAt" = NOW()
WHERE EXISTS (SELECT 1 FROM "Recipe" r WHERE r."organizationId" = o."id");
