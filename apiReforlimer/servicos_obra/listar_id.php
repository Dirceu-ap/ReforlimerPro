<?php
header('Content-Type: application/json; charset=utf-8');
require_once(__DIR__ . '/../conexao.php');

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) {
        throw new Exception('ID inválido');
    }

    $stmt = $pdo->prepare("SELECT * FROM servicos_obra WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        echo json_encode(['success' => false, 'mensagem' => 'Serviço não encontrado']);
        exit;
    }

    // também buscar composição de materiais do serviço
    // não selecionamos p.unidade aqui para evitar erro em bases antigas
    $stmt2 = $pdo->prepare("SELECT som.*, p.nome AS produto_nome, p.valor_venda
                            FROM servico_obra_materiais som
                            LEFT JOIN produtos p ON som.produto_id = p.id
                            WHERE som.servico_id = ?");
    $stmt2->execute([$id]);
    $materiais = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'dados' => $row,
        'materiais' => $materiais,
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'erro' => $e->getMessage()]);
}

?>
