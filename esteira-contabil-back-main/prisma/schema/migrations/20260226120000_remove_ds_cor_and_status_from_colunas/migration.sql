-- Convert STATUS rows: js_valores from array to object (each option -> ds_cor)
UPDATE sis_colunas_personalizadas
SET js_valores = (
  SELECT jsonb_object_agg(elem, ds_cor)
  FROM jsonb_array_elements_text(js_valores) AS elem
)
WHERE ds_tipo = 'STATUS'
  AND js_valores IS NOT NULL
  AND jsonb_typeof(js_valores) = 'array';

-- Any remaining STATUS with null or non-array js_valores: set empty object and use ds_cor for a single placeholder key
UPDATE sis_colunas_personalizadas
SET js_valores = jsonb_build_object('Opção', ds_cor)
WHERE ds_tipo = 'STATUS' AND (js_valores IS NULL OR jsonb_typeof(js_valores) != 'array');

-- Now set ds_tipo to OPCAO for all STATUS
UPDATE sis_colunas_personalizadas SET ds_tipo = 'OPCAO' WHERE ds_tipo = 'STATUS';

-- Drop column ds_cor
ALTER TABLE "sis_colunas_personalizadas" DROP COLUMN IF EXISTS "ds_cor";

-- Replace enum TipoColunas: remove STATUS (PostgreSQL requires new type + swap)
CREATE TYPE "TipoColunas_new" AS ENUM ('DATA', 'TEXTO', 'OPCAO');

ALTER TABLE "sis_colunas_personalizadas"
  ALTER COLUMN "ds_tipo" TYPE "TipoColunas_new"
  USING (ds_tipo::text::"TipoColunas_new");

DROP TYPE "TipoColunas";

ALTER TYPE "TipoColunas_new" RENAME TO "TipoColunas";
