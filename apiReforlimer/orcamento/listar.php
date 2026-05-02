<?php
header('Content-Type: application/json; charset=utf-8');
require_once(__DIR__ . "/../conexao.php");

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $data1 = isset($_GET['data']) ? trim((string)$_GET['data']) : '';
    $data2 = isset($_GET['data1']) ? trim((string)$_GET['data1']) : '';
    $cliente = isset($_GET['cliente']) ? trim((string)$_GET['cliente']) : '';
    $search = isset($_GET['search']) ? trim((string)$_GET['search']) : '';

    $termRaw = $cliente !== '' ? $cliente : $search;
    $hasPeriodo = ($data1 !== '' && $data2 !== '');

    $sql = "SELECT o.id, c.nome AS cliente, o.data_orcamento, o.valor_total, o.status, o.validade, o.descricao, o.local
            FROM orcamentos o
            LEFT JOIN clientes c ON o.cliente_id = c.id";

    $where = [];
    $params = [];

    if ($hasPeriodo) {
        $where[] = "o.data_orcamento BETWEEN :data1 AND :data2";
        $params[':data1'] = $data1;
        $params[':data2'] = $data2;
    }

    if ($termRaw !== '') {
        $where[] = "(LOWER(COALESCE(c.nome, '')) LIKE :term OR LOWER(COALESCE(o.descricao, '')) LIKE :term OR LOWER(COALESCE(o.local, '')) LIKE :term)";
        $params[':term'] = '%' . mb_strtolower($termRaw, 'UTF-8') . '%';
    }

    if (count($where) > 0) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sql .= ' ORDER BY o.data_orcamento DESC';
    if (!$hasPeriodo) {
        $sql .= ' LIMIT 200';
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['resultado' => $rows], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['erro' => $e->getMessage()]);
}
?>