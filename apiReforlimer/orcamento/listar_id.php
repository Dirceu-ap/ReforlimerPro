<?php
header('Content-Type: application/json; charset=utf-8');
require_once(__DIR__ . "/../conexao.php");

$id = $_GET['id'] ?? null;
if (!$id) {
    echo json_encode(['erro' => 'ID ausente']);
    exit;
}

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Orçamento com dados do cliente
    $stmt = $pdo->prepare("
        SELECT o.*,
               c.nome      AS cliente,
               c.email,
               c.telefone,
               c.endereco  AS cliente_endereco
        FROM orcamentos o
        LEFT JOIN clientes c ON o.cliente_id = c.id
        WHERE o.id = ?
        LIMIT 1
    ");
    $stmt->execute([$id]);
    $dados = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$dados) {
        echo json_encode(['mensagem' => 'Orçamento não encontrado']);
        exit;
    }

    // Produtos do orçamento
    $stmt2 = $pdo->prepare("
        SELECT op.*, p.nome, p.descricao, p.valor_venda, p.valor_compra
        FROM orcamento_produtos op
        LEFT JOIN produtos p ON op.produto_id = p.id
        WHERE op.orcamento_id = ?
    ");
    $stmt2->execute([$id]);
    $produtos = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['dados' => $dados, 'produtos' => $produtos], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['erro' => $e->getMessage()]);
}
?>