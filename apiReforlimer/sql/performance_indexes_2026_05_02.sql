-- Otimizacoes de indices para consultas frequentes do Reforlimer
-- Seguro para executar mais de uma vez (so cria se nao existir).

SET @db_name = DATABASE();

DROP PROCEDURE IF EXISTS ensure_index;
DELIMITER $$
CREATE PROCEDURE ensure_index(
    IN p_table VARCHAR(128),
    IN p_index VARCHAR(128),
    IN p_columns VARCHAR(256)
)
BEGIN
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_table_exists INT DEFAULT 0;
    DECLARE v_table_safe VARCHAR(160);
    DECLARE v_index_safe VARCHAR(160);

    SELECT COUNT(*) INTO v_table_exists
    FROM information_schema.tables
    WHERE table_schema = @db_name
      AND table_name = p_table;

    IF v_table_exists > 0 THEN
      SELECT COUNT(*) INTO v_count
      FROM information_schema.statistics
      WHERE table_schema = @db_name
        AND table_name = p_table
        AND index_name = p_index;

      IF v_count = 0 THEN
        SET v_table_safe = REPLACE(p_table, '`', '');
        SET v_index_safe = REPLACE(p_index, '`', '');
        SET @sql = CONCAT('CREATE INDEX `', v_index_safe, '` ON `', v_table_safe, '` (', p_columns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
      END IF;
    END IF;
END $$
DELIMITER ;

-- Login e usuarios
CALL ensure_index('usuarios', 'idx_usuarios_email_senha', 'email, senha');

-- Dashboard / Home
CALL ensure_index('clientes', 'idx_clientes_ativo', 'ativo');
CALL ensure_index('fornecedores', 'idx_fornecedores_ativo', 'ativo');
CALL ensure_index('produtos', 'idx_produtos_ativo', 'ativo');

CALL ensure_index('contas_receber', 'idx_receber_vencimento_status', 'vencimento, status');
CALL ensure_index('contas_receber', 'idx_receber_vencimento_data_baixa_status', 'vencimento, data_baixa, status');

CALL ensure_index('contas_pagar', 'idx_pagar_vencimento_status', 'vencimento, status');

-- Lancamentos de custos
CALL ensure_index('contas_pagar', 'idx_pagar_plano_conta_vencimento', 'plano_conta, vencimento');
CALL ensure_index('contas_receber', 'idx_receber_plano_conta_vencimento', 'plano_conta, vencimento');
CALL ensure_index('movimentacoes', 'idx_movimentacoes_plano_conta_data', 'plano_conta, data');
CALL ensure_index('movimentacoes', 'idx_movimentacoes_lancamento_data', 'lancamento, data, id');
CALL ensure_index('movimentacoes', 'idx_movimentacoes_data_id', 'data, id');

-- Listagens principais
CALL ensure_index('vendas', 'idx_vendas_data_lanc_id', 'data_lanc, id');
CALL ensure_index('compras', 'idx_compras_data_lanc_id', 'data_lanc, id');
CALL ensure_index('clientes', 'idx_clientes_nome', 'nome');
CALL ensure_index('fornecedores', 'idx_fornecedores_nome', 'nome');

DROP PROCEDURE IF EXISTS ensure_index;
