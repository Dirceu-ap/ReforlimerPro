<?php
header('Content-Type: application/json; charset=utf-8');
require_once(__DIR__ . '/../conexao.php');

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) {
        throw new Exception('ID inválido');
    }

    $pdo->beginTransaction();
    $pdo->prepare("DELETE FROM orcamento_obra_materiais WHERE orcamento_obra_id = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM orcamento_obra_servicos WHERE orcamento_obra_id = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM orcamento_obra WHERE id = ?")->execute([$id]);
    $pdo->commit();

    echo json_encode(['success' => true, 'mensagem' => 'Orçamento de obra excluído']);
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'erro' => $e->getMessage()]);
}

?>

