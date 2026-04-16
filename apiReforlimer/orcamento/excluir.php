<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

require_once('../conexao.php');

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($id <= 0) {
    echo json_encode(['sucesso' => false, 'mensagem' => 'ID inválido']);
    exit;
}

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->beginTransaction();

    // Exclui produtos vinculados ao orçamento (ajuste o nome da tabela se necessário)
    $stmtItens = $pdo->prepare('DELETE FROM orcamento_produtos WHERE orcamento_id = :id');
    $stmtItens->bindValue(':id', $id, PDO::PARAM_INT);
    $stmtItens->execute();

    // Exclui o orçamento principal
    $stmt = $pdo->prepare('DELETE FROM orcamentos WHERE id = :id');
    $stmt->bindValue(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        $pdo->commit();
        echo json_encode([
            'sucesso'  => true,
            'mensagem' => 'Orçamento excluído com sucesso'
        ]);
    } else {
        $pdo->rollBack();
        echo json_encode([
            'sucesso'  => false,
            'mensagem' => 'Orçamento não encontrado'
        ]);
    }
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode([
        'sucesso'  => false,
        'mensagem' => 'Erro: ' . $e->getMessage()
    ]);
}