-- Migracao: novos campos financeiros em contas_receber
-- Data: 2026-03-09
-- Objetivo:
-- 1) suportar devolucao na baixa
-- 2) suportar desconto e acrescimo em percentual
-- 3) suportar acrescimo em valor

START TRANSACTION;

-- Compatibilidade ampla: adiciona coluna somente se ela ainda nao existir.
-- Funciona mesmo em versoes sem "ADD COLUMN IF NOT EXISTS".
SET @db_name = DATABASE();

-- devolucao
SET @exists_col = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'contas_receber'
    AND COLUMN_NAME = 'devolucao'
);
SET @sql = IF(
  @exists_col = 0,
  'ALTER TABLE contas_receber ADD COLUMN devolucao DECIMAL(10,2) NOT NULL DEFAULT 0.00',
  'SELECT "coluna devolucao ja existe"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- desconto_perc
SET @exists_col = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'contas_receber'
    AND COLUMN_NAME = 'desconto_perc'
);
SET @sql = IF(
  @exists_col = 0,
  'ALTER TABLE contas_receber ADD COLUMN desconto_perc DECIMAL(10,2) NOT NULL DEFAULT 0.00',
  'SELECT "coluna desconto_perc ja existe"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- acrescimo
SET @exists_col = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'contas_receber'
    AND COLUMN_NAME = 'acrescimo'
);
SET @sql = IF(
  @exists_col = 0,
  'ALTER TABLE contas_receber ADD COLUMN acrescimo DECIMAL(10,2) NOT NULL DEFAULT 0.00',
  'SELECT "coluna acrescimo ja existe"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- acrescimo_perc
SET @exists_col = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'contas_receber'
    AND COLUMN_NAME = 'acrescimo_perc'
);
SET @sql = IF(
  @exists_col = 0,
  'ALTER TABLE contas_receber ADD COLUMN acrescimo_perc DECIMAL(10,2) NOT NULL DEFAULT 0.00',
  'SELECT "coluna acrescimo_perc ja existe"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Normalizacao de dados antigos (se houver NULL em bases legadas)
UPDATE contas_receber
SET
  devolucao = COALESCE(devolucao, 0.00),
  desconto_perc = COALESCE(desconto_perc, 0.00),
  acrescimo = COALESCE(acrescimo, 0.00),
  acrescimo_perc = COALESCE(acrescimo_perc, 0.00);

COMMIT;
