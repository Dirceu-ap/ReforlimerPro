<?php
header('Content-Type: application/json; charset=utf-8');
require_once(__DIR__ . "/../conexao.php");

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $data1 = isset($_GET['data']) ? $_GET['data'] : null;
    $data2 = isset($_GET['data1']) ? $_GET['data1'] : null;
    $cliente = isset($_GET['cliente']) ? trim($_GET['cliente']) : null;
    $search = isset($_GET['search']) ? trim($_GET['search']) : null;

    if ($data1 && $data2) {
        $sql = "SELECT o.id, c.nome AS cliente, o.data_orcamento, o.valor_total, o.status, o.validade, o.descricao, o.local
                FROM orcamentos o
                LEFT JOIN clientes c ON o.cliente_id = c.id
                WHERE o.data_orcamento BETWEEN ? AND ?
                ORDER BY o.data_orcamento DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$data1, $data2]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        $sql = "SELECT o.id, c.nome AS cliente, o.data_orcamento, o.valor_total, o.status, o.validade, o.descricao, o.local
                FROM orcamentos o
                LEFT JOIN clientes c ON o.cliente_id = c.id
                ORDER BY o.data_orcamento DESC
                LIMIT 200";
        $stmt = $pdo->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    if (($cliente !== null && $cliente !== '') || ($search !== null && $search !== '')) {
        $term = mb_strtolower($cliente ?? $search, 'UTF-8');
        $rows = array_values(array_filter($rows, function($r) use ($term) {
            $clienteNome = mb_strtolower($r['cliente'] ?? '', 'UTF-8');
            $descricao  = mb_strtolower($r['descricao'] ?? '', 'UTF-8');
            $local      = mb_strtolower($r['local'] ?? '', 'UTF-8');
            return mb_stripos($clienteNome, $term, 0, 'UTF-8') !== false
                || mb_stripos($descricao, $term, 0, 'UTF-8') !== false
                || mb_stripos($local, $term, 0, 'UTF-8') !== false;
        }));
    }

    echo json_encode(['resultado' => $rows], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['erro' => $e->getMessage()]);
}
?>