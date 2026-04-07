<?php
header('Content-Type: application/json; charset=utf-8');
require_once(__DIR__ . '/../conexao.php');

function normalizarNumero($valor)
{
    if ($valor === null) return null;
    $str = trim((string)$valor);
    if ($str === '') return null;
    $str = str_replace(',', '.', $str);
    return $str;
}

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $json = file_get_contents('php://input');
    $post = json_decode($json, true);

    if (!is_array($post)) {
        throw new Exception('JSON inválido');
    }

    $id = isset($post['id']) && $post['id'] !== '' ? (int)$post['id'] : 0;
    $nome = isset($post['nome']) ? trim($post['nome']) : '';
    $descricao = isset($post['descricao']) ? trim($post['descricao']) : '';
    $unidade_base = isset($post['unidade_base']) ? trim($post['unidade_base']) : 'm2';

    // produtividade em horas por unidade (aceita vírgula ou ponto)
    $produtividade_horas_unidade = normalizarNumero($post['produtividade_horas_unidade'] ?? null);

    // custo de mão de obra (aceita vírgula ou ponto)
    $custoStr = normalizarNumero($post['custo_mao_obra'] ?? null);
    $custo_mao_obra = $custoStr !== null ? (float)$custoStr : 0;

    $ativo = isset($post['ativo']) ? (int)$post['ativo'] : 1;
    $materiais = isset($post['materiais']) && is_array($post['materiais']) ? $post['materiais'] : [];

    if ($nome === '') {
        throw new Exception('Nome do serviço é obrigatório');
    }

    $pdo->beginTransaction();

    if ($id <= 0) {
        // INSERT simples incluindo produtividade_horas_unidade
        $stmt = $pdo->prepare(
            'INSERT INTO servicos_obra (nome, descricao, unidade_base, produtividade_horas_unidade, custo_mao_obra, ativo)
             VALUES (?,?,?,?,?,?)'
        );
        $stmt->execute([
            $nome,
            $descricao,
            $unidade_base,
            $produtividade_horas_unidade,
            $custo_mao_obra,
            $ativo,
        ]);
        $id = (int)$pdo->lastInsertId();
    } else {
        // UPDATE simples incluindo produtividade_horas_unidade
        $stmt = $pdo->prepare(
            'UPDATE servicos_obra
               SET nome = ?, descricao = ?, unidade_base = ?, produtividade_horas_unidade = ?, custo_mao_obra = ?, ativo = ?
             WHERE id = ?'
        );
        $stmt->execute([
            $nome,
            $descricao,
            $unidade_base,
            $produtividade_horas_unidade,
            $custo_mao_obra,
            $ativo,
            $id,
        ]);

        // Limpa composição antiga para recriar
        $pdo->prepare('DELETE FROM servico_obra_materiais WHERE servico_id = ?')->execute([$id]);
    }

    // Salvar composição de materiais (se enviada)
    if (!empty($materiais)) {
        $sqlMat = 'INSERT INTO servico_obra_materiais (servico_id, produto_id, consumo_por_unidade, observacao) VALUES (?,?,?,?)';
        $stmtMat = $pdo->prepare($sqlMat);
        foreach ($materiais as $m) {
            $produtoId = isset($m['produto_id']) ? (int)$m['produto_id'] : 0;
            $consumoStr = normalizarNumero($m['consumo_por_unidade'] ?? null);
            $consumo = $consumoStr !== null ? (float)$consumoStr : 0;
            $obs = isset($m['observacao']) ? trim($m['observacao']) : '';
            if ($produtoId > 0 && $consumo > 0) {
                $stmtMat->execute([$id, $produtoId, $consumo, $obs]);
            }
        }
    }

    $pdo->commit();

    // DEBUG: conferir o que foi recebido e o que ficou gravado no banco
    $debugDbProd = null;
    try {
        $stmtCheck = $pdo->prepare('SELECT produtividade_horas_unidade FROM servicos_obra WHERE id = ?');
        $stmtCheck->execute([$id]);
        $rowCheck = $stmtCheck->fetch(PDO::FETCH_ASSOC);
        if ($rowCheck) {
            $debugDbProd = $rowCheck['produtividade_horas_unidade'];
        }
    } catch (Exception $eCheck) {
        $debugDbProd = 'erro_debug: ' . $eCheck->getMessage();
    }

    echo json_encode([
        'success' => true,
        'mensagem' => 'Serviço salvo com sucesso',
        'id' => $id,
        'debug' => [
            'input_produtividade' => $post['produtividade_horas_unidade'] ?? null,
            'normalizado' => $produtividade_horas_unidade,
            'db_produtividade' => $debugDbProd,
        ],
    ]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'erro' => $e->getMessage(),
    ]);
}

?>
