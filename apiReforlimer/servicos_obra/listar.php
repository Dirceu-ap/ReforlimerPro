<?php
header('Content-Type: application/json; charset=utf-8');
require_once(__DIR__ . '/../conexao.php');

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $search = isset($_GET['search']) ? trim($_GET['search']) : '';

    if ($search !== '') {
        $sql = "SELECT * FROM servicos_obra WHERE nome LIKE ? ORDER BY ativo DESC, nome";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['%' . $search . '%']);
    } else {
        $sql = "SELECT * FROM servicos_obra ORDER BY ativo DESC, nome";
        $stmt = $pdo->query($sql);
    }

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'resultado' => $rows
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'erro' => $e->getMessage()
    ]);
}

?>
