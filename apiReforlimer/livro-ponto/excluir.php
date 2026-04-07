<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

require_once('../conexao.php');

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($id <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID inválido']);
    exit;
}

try {
    $stmt = $pdo->prepare('DELETE FROM livro_ponto WHERE id = :id');
    $stmt->bindValue(':id', $id, PDO::PARAM_INT);
    $ok = $stmt->execute();

    if ($ok && $stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Lançamento excluído com sucesso']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Lançamento não encontrado']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Erro: ' . $e->getMessage()]);
}