-- Adiciona coluna de status de pagamento no livro_ponto
-- Execute este script uma unica vez no banco da aplicacao.

ALTER TABLE livro_ponto
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Pendente';

-- Opcional: padroniza registros ja existentes sem valor (se houver)
UPDATE livro_ponto
SET status = 'Pendente'
WHERE status IS NULL OR TRIM(status) = '';
