-- Tabela de configuracao de contas para calculo de lucro
-- Rode este script no banco caso o usuario da API nao tenha permissao de CREATE TABLE.

CREATE TABLE IF NOT EXISTS lancamentos_custos_contas_config (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(180) NOT NULL,
    selecionada TINYINT(1) NOT NULL DEFAULT 0,
    origem VARCHAR(30) NOT NULL DEFAULT 'manual',
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_lcc_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO lancamentos_custos_contas_config (nome, selecionada, origem)
VALUES
('Aluguel de imoveis', 1, 'padrao'),
('Elektro', 1, 'padrao'),
('BRK', 1, 'padrao'),
('Impostos', 1, 'padrao'),
('Guia de arrecadacao', 1, 'padrao'),
('Venda', 1, 'padrao'),
('Folha de pagamento', 1, 'padrao')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);
