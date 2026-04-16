<?php
header('Content-Type: application/json; charset=utf-8');
require_once(__DIR__ . '/../conexao.php');

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) {
        throw new Exception('ID inválido');
    }

    $stmt = $pdo->prepare("SELECT o.*, c.nome AS cliente_nome
                           FROM orcamentos_obra o
                           LEFT JOIN clientes c ON o.cliente_id = c.id
                           WHERE o.id = ? LIMIT 1");
    $stmt->execute([$id]);
    $orc = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$orc) {
        echo json_encode(['success' => false, 'mensagem' => 'Orçamento não encontrado']);
        exit;
    }

    // serviços do orçamento
    $stmtSrv = $pdo->prepare("SELECT os.*, s.nome AS servico_nome, s.unidade_base
                              FROM orcamentos_obra_servicos os
                              LEFT JOIN servicos_obra s ON os.servico_id = s.id
                              WHERE os.orcamento_obra_id = ?");
    $stmtSrv->execute([$id]);
    $servicos = $stmtSrv->fetchAll(PDO::FETCH_ASSOC);

    // materiais calculados com nome e unidade do produto
    $stmtMat = $pdo->prepare("SELECT om.*, p.nome AS produto_nome, p.unidade
                              FROM orcamentos_obra_materiais om
                              LEFT JOIN produtos p ON om.produto_id = p.id
                              WHERE om.orcamento_obra_id = ?");
    $stmtMat->execute([$id]);
    $materiais = $stmtMat->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'dados' => $orc,
        'servicos' => $servicos,
        'materiais' => $materiais,
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'erro' => $e->getMessage()]);
}

?>
