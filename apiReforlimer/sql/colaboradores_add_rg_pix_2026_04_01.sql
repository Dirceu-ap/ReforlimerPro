-- Migracao: novos campos de documento e pagamento em colaboradores
-- Data: 2026-04-01
-- Objetivo:
-- 1) adicionar campo RG
-- 2) adicionar campo Pix

START TRANSACTION;

-- Compatibilidade ampla: adiciona coluna somente se ela ainda nao existir.
-- Funciona mesmo em versoes sem "ADD COLUMN IF NOT EXISTS".
SET @db_name = DATABASE();

-- rg
SET @exists_col = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'colaboradores'
    AND COLUMN_NAME = 'rg'
);
SET @sql = IF(
  @exists_col = 0,
  'ALTER TABLE colaboradores ADD COLUMN rg VARCHAR(30) NULL DEFAULT NULL',
  'SELECT "coluna rg ja existe"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- pix
SET @exists_col = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'colaboradores'
    AND COLUMN_NAME = 'pix'
);
SET @sql = IF(
  @exists_col = 0,
  'ALTER TABLE colaboradores ADD COLUMN pix VARCHAR(120) NULL DEFAULT NULL',
  'SELECT "coluna pix ja existe"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

COMMIT;
