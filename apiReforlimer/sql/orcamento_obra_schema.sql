-- Tabelas para orçamento de obras (construção civil)

-- Serviços de obra (ex: alvenaria, reboco, contrapiso)
CREATE TABLE IF NOT EXISTS servicos_obra (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT NULL,
  -- unidade base do serviço (normalmente m2, mas pode ser m, unidade, etc.)
  unidade_base VARCHAR(20) NOT NULL DEFAULT 'm2',
  -- custo de mão de obra por unidade (opcional)
  custo_mao_obra DECIMAL(15,2) NULL DEFAULT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Composição de materiais por serviço
-- Cada linha diz quanto de um produto é consumido para 1 unidade do serviço (ex: 0.05 saco de cimento por m2 de reboco)
CREATE TABLE IF NOT EXISTS servico_obra_materiais (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  servico_id INT UNSIGNED NOT NULL,
  produto_id INT UNSIGNED NOT NULL,
  -- quantidade consumida por 1 unidade do serviço (ex: por m2)
  consumo_por_unidade DECIMAL(15,4) NOT NULL DEFAULT 0,
  observacao VARCHAR(255) NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_servico_obra_materiais_servico
    FOREIGN KEY (servico_id) REFERENCES servicos_obra(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_servico_obra_materiais_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orçamentos específicos de obra (pode coexistir com tabela orcamentos existente)
CREATE TABLE IF NOT EXISTS orcamentos_obra (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT(11) NOT NULL,
  descricao VARCHAR(255) NULL,
  tipo_obra VARCHAR(100) NULL,
  -- local/obra (ex: endereço ou identificação da obra)
  local VARCHAR(150) NULL,
  -- área principal da obra (m2)
  area_principal DECIMAL(15,2) NOT NULL DEFAULT 0,
  -- campo extra caso precise dividir por ambiente (não obrigatório)
  observacoes TEXT NULL,
  data_orcamento DATE NOT NULL,
  validade VARCHAR(50) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pendente',
  valor_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  usuario VARCHAR(100) NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orcamentos_obra_cliente (cliente_id),
  CONSTRAINT fk_orcamentos_obra_cliente
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Itens (serviços) de um orçamento de obra
CREATE TABLE IF NOT EXISTS orcamentos_obra_servicos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  orcamento_obra_id INT UNSIGNED NOT NULL,
  servico_id INT UNSIGNED NOT NULL,
  -- metragem ou quantidade do serviço (normalmente m2)
  quantidade DECIMAL(15,2) NOT NULL DEFAULT 0,
  -- valor de mão de obra por unidade aplicado neste orçamento (pode copiar do serviço ou ser personalizado)
  valor_unitario_mao_obra DECIMAL(15,2) NOT NULL DEFAULT 0,
  subtotal_mao_obra DECIMAL(15,2) NOT NULL DEFAULT 0,
  -- produtividade específica deste orçamento (horas por unidade). Se nula, usar a do serviço base
  produtividade_horas_unidade DECIMAL(15,4) NULL DEFAULT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orcamentos_obra_servicos_orcamento
    FOREIGN KEY (orcamento_obra_id) REFERENCES orcamentos_obra(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_orcamentos_obra_servicos_servico
    FOREIGN KEY (servico_id) REFERENCES servicos_obra(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Itens de materiais calculados para um orçamento de obra
-- Esta tabela guarda o "explodido" da composição: quanto de cada material será usado no orçamento
CREATE TABLE IF NOT EXISTS orcamentos_obra_materiais (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  orcamento_obra_id INT UNSIGNED NOT NULL,
  produto_id INT UNSIGNED NOT NULL,
  -- quantidade total calculada de material para o orçamento
  quantidade_total DECIMAL(15,4) NOT NULL DEFAULT 0,
  unidade VARCHAR(20) NULL,
  valor_unitario DECIMAL(15,4) NOT NULL DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orcamentos_obra_materiais_orcamento
    FOREIGN KEY (orcamento_obra_id) REFERENCES orcamentos_obra(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_orcamentos_obra_materiais_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Campos opcionais para a tabela produtos, voltados para construção civil
-- ATENÇÃO: execute estes ALTER TABLE apenas se ainda não existirem as colunas
-- unidade: UN, M2, M, KG, etc.
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS unidade VARCHAR(20) NULL AFTER descricao,
  ADD COLUMN IF NOT EXISTS rendimento_por_unidade_m2 DECIMAL(15,4) NULL DEFAULT NULL AFTER unidade;

-- Campos opcionais para composição de custo com colaborador e BDI no orçamento de obra
ALTER TABLE orcamentos_obra
  ADD COLUMN IF NOT EXISTS mostrar_custo_colaborador_relatorio TINYINT(1) NOT NULL DEFAULT 0 AFTER valor_total,
  ADD COLUMN IF NOT EXISTS custo_colaborador_dia DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER mostrar_custo_colaborador_relatorio,
  ADD COLUMN IF NOT EXISTS incluir_materiais_totais TINYINT(1) NOT NULL DEFAULT 1 AFTER custo_colaborador_dia,
  ADD COLUMN IF NOT EXISTS bdi_impostos_percentual DECIMAL(8,4) NOT NULL DEFAULT 0 AFTER incluir_materiais_totais,
  ADD COLUMN IF NOT EXISTS bdi_taxa_adm_percentual DECIMAL(8,4) NOT NULL DEFAULT 0 AFTER bdi_impostos_percentual,
  ADD COLUMN IF NOT EXISTS bdi_lucro_percentual DECIMAL(8,4) NOT NULL DEFAULT 0 AFTER bdi_taxa_adm_percentual,
  ADD COLUMN IF NOT EXISTS bdi_total_percentual DECIMAL(8,4) NOT NULL DEFAULT 0 AFTER bdi_lucro_percentual,
  ADD COLUMN IF NOT EXISTS valor_bdi DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER bdi_total_percentual,
  ADD COLUMN IF NOT EXISTS valor_total_com_bdi DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER valor_bdi;

-- Exemplo de uso:
-- Para 1 saco de cimento de 50kg que rende 3m2 de reboco, gravar rendimento_por_unidade_m2 = 3;
-- No cálculo, a fórmula sugerida é: quantidade_total_de_unidades = area_m2 / rendimento_por_unidade_m2;
