<?php
header('Content-Type: application/json; charset=utf-8');
require_once(__DIR__ . '/../conexao.php');

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) {
        throw new Exception('ID inválido');
    }

    // Excluir composições e o serviço
    $pdo->beginTransaction();
    $pdo->prepare("DELETE FROM servico_obra_materiais WHERE servico_id = ?")->execute([$id]);
    $stmt = $pdo->prepare("DELETE FROM servicos_obra WHERE id = ?");
    $stmt->execute([$id]);
    $pdo->commit();

    echo json_encode(['success' => true, 'mensagem' => 'Serviço excluído']);
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'erro' => $e->getMessage()]);
}

?>
