<?php
header('Content-Type: application/json; charset=utf-8');
require_once(__DIR__ . "/../conexao.php");

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $id = $_GET['id'] ?? null;
    if (!$id) {
        echo json_encode(['sucesso' => false, 'mensagem' => 'ID ausente']);
        exit;
    }

    // opcional: buscar referência de conta e remover link
    $stmt = $pdo->prepare("SELECT conta_pagar_id, conta_receber_id FROM orcamentos WHERE id=?");
    $stmt->execute([$id]);
    $ref = $stmt->fetch(PDO::FETCH_ASSOC);

    $pdo->beginTransaction();
    $pdo->prepare("DELETE FROM orcamento_produtos WHERE orcamento_id=?")->execute([$id]);
    $pdo->prepare("DELETE FROM orcamentos WHERE id=?")->execute([$id]);

    // opcional: não excluir contas automaticamente — se quiser, descomente
    // if (!empty($ref['conta_pagar_id'])) { $pdo->prepare("DELETE FROM contas_pagar WHERE id=?")->execute([$ref['conta_pagar_id']]); }
    // if (!empty($ref['conta_receber_id'])) { $pdo->prepare("DELETE FROM contas_receber WHERE id=?")->execute([$ref['conta_receber_id']]); }

    $pdo->commit();
    echo json_encode(['sucesso' => true, 'mensagem' => 'Excluído']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['sucesso' => false, 'mensagem' => $e->getMessage()]);
}
?>