<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
require_once(__DIR__ . "/../conexao.php");

/**
 * Retorna a primeira coluna existente entre candidatos na tabela
 */
function detectColumn(PDO $pdo, string $table, array $candidates) {
    $stmt = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
    foreach ($candidates as $c) {
        $stmt->execute([$table, $c]);
        if ($stmt->fetch()) return $c;
    }
    return null;
}

/**
 * Insere apenas colunas válidas (existentes) na tabela e retorna lastInsertId
 */
function insertIfColumns(PDO $pdo, string $table, array $data) {
    $cols = [];
    $vals = [];
    $placeholders = [];
    $stmtCheck = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
    foreach ($data as $col => $val) {
        $stmtCheck->execute([$table, $col]);
        if ($stmtCheck->fetch()) {
            $cols[] = $col;
            $vals[] = $val;
            $placeholders[] = '?';
        }
    }
    if (count($cols) === 0) {
        throw new Exception("Nenhuma coluna válida encontrada para inserção em {$table}");
    }
    $sql = "INSERT INTO {$table} (" . implode(',', $cols) . ") VALUES (" . implode(',', $placeholders) . ")";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($vals);
    return $pdo->lastInsertId();
}

/**
 * Retorna DATA_TYPE de uma coluna (ex: int, varchar)
 */
function getColumnDataType(PDO $pdo, string $table, string $column) {
    $stmt = $pdo->prepare("
      SELECT DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    ");
    $stmt->execute([$table, $column]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row['DATA_TYPE'] ?? null;
}

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $json = file_get_contents('php://input');
    $dados = json_decode($json, true);

    // Log simples para depuração de geração de contas a pagar/receber
    try {
        $logDir = __DIR__ . '/../logs';
        if (!is_dir($logDir)) @mkdir($logDir, 0755, true);
        @file_put_contents(
            $logDir . '/salvar_orcamento_debug.log',
            date('Y-m-d H:i:s') . ' - payload: ' . $json . PHP_EOL,
            FILE_APPEND
        );
    } catch (Exception $e) {
        // não interromper fluxo por causa de log
    }

    if (empty($dados['cliente_id'])) {
        throw new Exception("cliente_id ausente");
    }

    // Mapear campos com defaults
    $id = $dados['id'] ?? '0';
    $cliente_id = $dados['cliente_id'];
    $cliente_nome = $dados['cliente_nome'] ?? '';
    $data_orcamento = $dados['data_orcamento'] ?? date('Y-m-d');
    $validade = $dados['validade'] ?? '';
    $status = $dados['status'] ?? 'Pendente';
    $descricao = $dados['descricao'] ?? '';
    $local = $dados['local'] ?? '';
    $observacoes = $dados['observacoes'] ?? '';
    $valor_total = isset($dados['valor_total']) ? (float)$dados['valor_total'] : 0;
    $produtos = $dados['produtos'] ?? [];
    $conta_tipo = $dados['conta_tipo'] ?? 'nenhum';
    $vencimento_conta = $dados['vencimento_conta'] ?? null;
    $gerar_conta_pagar = !empty($dados['gerar_conta_pagar']);
    $gerar_conta_receber = !empty($dados['gerar_conta_receber']);
    $usuario = $dados['usuario'] ?? '';
    $documento = $dados['documento'] ?? '';
    $plano_conta = $dados['plano_conta'] ?? '';
    $frequencia = $dados['frequencia'] ?? '';
    $juros = isset($dados['juros']) ? (float)$dados['juros'] : 0;
    $multa = isset($dados['multa']) ? (float)$dados['multa'] : 0;
    $desconto = isset($dados['desconto']) ? (float)$dados['desconto'] : 0;
    $arquivo = $dados['arquivo'] ?? '';

    $pdo->beginTransaction();

    // verificar se a tabela orcamentos possui alguma coluna de "local"
    $colLocalOrcamento = detectColumn($pdo, 'orcamentos', ['local']);

    // variáveis para possíveis contas já vinculadas (quando editando)
    $existingContaPagarId = null;
    $existingContaReceberId = null;

    if ($id === '0' || $id === 0) {
        // INSERT: se existir uma coluna de local em orcamentos, inclui; caso contrário, ignora
        if ($colLocalOrcamento) {
            $sql = "INSERT INTO orcamentos (cliente_id, data_orcamento, validade, status, descricao, observacoes, valor_total, usuario, data_cadastro, {$colLocalOrcamento})
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $cliente_id,
                $data_orcamento,
                $validade,
                $status,
                $descricao,
                $observacoes,
                $valor_total,
                $usuario,
                $local,
            ]);
        } else {
            $sql = "INSERT INTO orcamentos (cliente_id, data_orcamento, validade, status, descricao, observacoes, valor_total, usuario, data_cadastro)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $cliente_id,
                $data_orcamento,
                $validade,
                $status,
                $descricao,
                $observacoes,
                $valor_total,
                $usuario,
            ]);
        }
        $orcamento_id = $pdo->lastInsertId();
    } else {
        // antes de modificar, obter ids de contas vinculadas (se existirem)
        $stmtGet = $pdo->prepare("SELECT conta_pagar_id, conta_receber_id FROM orcamentos WHERE id = ?");
        $stmtGet->execute([$id]);
        $row = $stmtGet->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $existingContaPagarId = $row['conta_pagar_id'] ? $row['conta_pagar_id'] : null;
            $existingContaReceberId = $row['conta_receber_id'] ? $row['conta_receber_id'] : null;
        }

                // UPDATE: idem, só atualiza coluna de local se existir
                if ($colLocalOrcamento) {
                        $sql = "UPDATE orcamentos SET cliente_id=?, data_orcamento=?, validade=?, status=?, descricao=?, observacoes=?, valor_total=?, {$colLocalOrcamento}=? WHERE id=?";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([
                            $cliente_id,
                            $data_orcamento,
                            $validade,
                            $status,
                            $descricao,
                            $observacoes,
                            $valor_total,
                            $local,
                            $id,
                        ]);
                } else {
                        $sql = "UPDATE orcamentos SET cliente_id=?, data_orcamento=?, validade=?, status=?, descricao=?, observacoes=?, valor_total=? WHERE id=?";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([
                            $cliente_id,
                            $data_orcamento,
                            $validade,
                            $status,
                            $descricao,
                            $observacoes,
                            $valor_total,
                            $id,
                        ]);
                }
        $orcamento_id = $id;

        // remover produtos antigos do orçamento
        $pdo->prepare("DELETE FROM orcamento_produtos WHERE orcamento_id=?")->execute([$orcamento_id]);

        // não limpar as colunas conta_pagar_id/conta_receber_id aqui:
        // mantemos o vínculo para que possamos atualizar as contas existentes ao editar.
    }

    // Inserir produtos do orçamento
    $sqlProd = "INSERT INTO orcamento_produtos (orcamento_id, produto_id, quantidade, valor_unitario, subtotal) VALUES (?, ?, ?, ?, ?)";
    $stmtProd = $pdo->prepare($sqlProd);
    foreach ($produtos as $prod) {
        $produtoId = $prod['produto_id'];
        $quant = isset($prod['quantidade']) ? (int)$prod['quantidade'] : 1;
        $valorUnit = isset($prod['valor_unitario']) ? (float)$prod['valor_unitario'] : 0;
        $subtotal = isset($prod['subtotal']) ? (float)$prod['subtotal'] : ($quant * $valorUnit);
        $stmtProd->execute([$orcamento_id, $produtoId, $quant, $valorUnit, $subtotal]);
    }

    $conta_id = null;

    // Normaliza status/conta_tipo para logs/uso futuro (se precisar)
    $statusNorm = mb_strtolower(trim((string)$status), 'UTF-8');
    $contaTipoNorm = mb_strtolower(trim((string)$conta_tipo), 'UTF-8');

    // Se o tipo veio como "pagar_e_receber", garante que os dois flags fiquem verdadeiros
    if ($contaTipoNorm === 'pagar_e_receber') {
        $gerar_conta_pagar = true;
        $gerar_conta_receber = true;
    }

    // Geração de contas: segue explicitamente os flags enviados pelo app
    // (gerar_conta_pagar / gerar_conta_receber) e exige vencimento definido.
    // Isso garante que marcar a opção na tela sempre gera o lançamento.

    // CONTAS A PAGAR
    if ($gerar_conta_pagar && !empty($vencimento_conta)) {
            $descricaoConta = "Orçamento #{$orcamento_id}" . ($descricao ? " - {$descricao}" : "");
            $colCliente = detectColumn($pdo, 'contas_pagar', ['cliente_id', 'id_cliente', 'cliente']);
            $dadosConta = [
                'descricao'    => $descricaoConta,
                'saida'        => 'Orcamento',
                'documento'    => $documento,
                'plano_conta'  => 'Orcamento',
                'data_emissao' => $data_orcamento,
                'vencimento'   => $vencimento_conta,
                'frequencia'   => $frequencia,
                'valor'        => $valor_total,
                'usuario_lanc' => $usuario,
                'usuario_baixa'=> '',
                'status'       => 'Pendente',
                'data_recor'   => null,
                'juros'        => $juros,
                'multa'        => $multa,
                'desconto'     => $desconto,
                'subtotal'     => $valor_total,
                'data_baixa'   => null,
                'id_compra'    => 0,
                'arquivo'      => $arquivo,
                // se existir coluna 'local' em contas_pagar, propaga o local do orçamento
                'local'        => $local,
            ];

            if ($colCliente === 'cliente') $dadosConta['cliente'] = $cliente_id;
            elseif ($colCliente !== null) $dadosConta[$colCliente] = $cliente_id;

            // se já existe conta_pagar vinculada ao orçamento, atualizar; caso contrário inserir
            if (!empty($existingContaPagarId)) {
                // atualizar apenas colunas existentes e fornecidas
                $stmtCheck = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contas_pagar' AND COLUMN_NAME = ?");
                $cols = [];
                $vals = [];
                foreach ($dadosConta as $col => $val) {
                    $stmtCheck->execute([$col]);
                    if ($stmtCheck->fetch()) {
                        $cols[] = $col;
                        $vals[] = $val;
                    }
                }
                if (count($cols) > 0) {
                    $sets = implode(", ", array_map(function($c){ return "{$c} = ?"; }, $cols));
                    $sqlUpd = "UPDATE contas_pagar SET {$sets} WHERE id = ?";
                    $vals[] = $existingContaPagarId;
                    $pdo->prepare($sqlUpd)->execute($vals);
                }
                $conta_id = $existingContaPagarId;
                // garantir referência no orcamento (se necessário)
                $stmtRef = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orcamentos' AND COLUMN_NAME = 'conta_pagar_id'");
                $stmtRef->execute();
                if ($stmtRef->fetch()) $pdo->prepare("UPDATE orcamentos SET conta_pagar_id=? WHERE id=?")->execute([$conta_id, $orcamento_id]);
            } else {
                $conta_id = insertIfColumns($pdo, 'contas_pagar', $dadosConta);
                $stmt = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orcamentos' AND COLUMN_NAME = 'conta_pagar_id'");
                $stmt->execute();
                if ($stmt->fetch()) $pdo->prepare("UPDATE orcamentos SET conta_pagar_id=? WHERE id=?")->execute([$conta_id, $orcamento_id]);
            }
        }

    // CONTAS A RECEBER
    if ($gerar_conta_receber && !empty($vencimento_conta)) {
            $descricaoConta = "Orçamento #{$orcamento_id}" . ($descricao ? " - {$descricao}" : "");
            $colCliente = detectColumn($pdo, 'contas_receber', ['cliente_id', 'id_cliente', 'cliente']);
            $dadosConta = [
                'descricao'    => $descricaoConta,
                'entrada'      => "Orçamento {$orcamento_id}",
                'documento'    => $documento,
                'plano_conta'  => 'orcamento',
                'data_emissao' => $data_orcamento,
                'vencimento'   => $vencimento_conta,
                'frequencia'   => $frequencia,
                'valor'        => $valor_total,
                'usuario_lanc' => $usuario,
                'usuario_baixa'=> '',
                'status'       => 'Pendente',
                'data_recor'   => null,
                'juros'        => $juros,
                'multa'        => $multa,
                'desconto'     => $desconto,
                'subtotal'     => $valor_total,
                'data_baixa'   => null,
                'id_venda'     => 0,
                'arquivo'      => $arquivo,
                // se existir coluna 'local' em contas_receber, propaga o local do orçamento
                'local'        => $local,
            ];

            if ($colCliente === 'cliente') $dadosConta['cliente'] = $cliente_id;
            elseif ($colCliente !== null) $dadosConta[$colCliente] = $cliente_id;

            // se já existe conta_receber vinculada ao orçamento, atualizar; caso contrário inserir
            if (!empty($existingContaReceberId)) {
                $stmtCheck = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contas_receber' AND COLUMN_NAME = ?");
                $cols = [];
                $vals = [];
                foreach ($dadosConta as $col => $val) {
                    $stmtCheck->execute([$col]);
                    if ($stmtCheck->fetch()) {
                        $cols[] = $col;
                        $vals[] = $val;
                    }
                }
                if (count($cols) > 0) {
                    $sets = implode(", ", array_map(function($c){ return "{$c} = ?"; }, $cols));
                    $sqlUpd = "UPDATE contas_receber SET {$sets} WHERE id = ?";
                    $vals[] = $existingContaReceberId;
                    $pdo->prepare($sqlUpd)->execute($vals);
                }
                $conta_id = $existingContaReceberId;
                $stmtRef = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orcamentos' AND COLUMN_NAME = 'conta_receber_id'");
                $stmtRef->execute();
                if ($stmtRef->fetch()) $pdo->prepare("UPDATE orcamentos SET conta_receber_id=? WHERE id=?")->execute([$conta_id, $orcamento_id]);
            } else {
                $conta_id = insertIfColumns($pdo, 'contas_receber', $dadosConta);
                $stmt = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orcamentos' AND COLUMN_NAME = 'conta_receber_id'");
                $stmt->execute();
                if ($stmt->fetch()) $pdo->prepare("UPDATE orcamentos SET conta_receber_id=? WHERE id=?")->execute([$conta_id, $orcamento_id]);
            }
        }

    $pdo->commit();

    echo json_encode([
        'sucesso' => true,
        'mensagem' => 'Orçamento salvo com sucesso',
        'orcamento_id' => $orcamento_id,
        'conta_id' => $conta_id
    ]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();

    $logDir = __DIR__ . '/../logs';
    if (!is_dir($logDir)) @mkdir($logDir, 0755, true);
    @file_put_contents($logDir . '/salvar_orcamento_error.log', date('Y-m-d H:i:s') . " - " . $e->getMessage() . PHP_EOL, FILE_APPEND);

    http_response_code(500);
    echo json_encode(['sucesso' => false, 'mensagem' => $e->getMessage()]);
}
?>