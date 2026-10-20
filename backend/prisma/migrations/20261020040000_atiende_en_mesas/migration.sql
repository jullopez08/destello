-- "¿Atiendes clientes en mesas?" reemplaza al tipo de negocio (Julieth, 2026-10-19).
-- Primero se copia quién era restaurante y después se borra la columna vieja.

-- Organization
ALTER TABLE "Organization" ADD COLUMN "servesTables" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Organization" SET "servesTables" = true WHERE "businessType" = 'RESTAURANT';
ALTER TABLE "Organization" DROP COLUMN "businessType";

-- SignupRequest (inscripciones sin terminar)
ALTER TABLE "SignupRequest" ADD COLUMN "servesTables" BOOLEAN NOT NULL DEFAULT false;
UPDATE "SignupRequest" SET "servesTables" = true WHERE "businessType" = 'RESTAURANT';
ALTER TABLE "SignupRequest" DROP COLUMN "businessType";
ALTER TABLE "SignupRequest" ALTER COLUMN "servesTables" DROP DEFAULT;

DROP TYPE "BusinessType";
