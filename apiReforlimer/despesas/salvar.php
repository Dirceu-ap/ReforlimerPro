<?php
header('Content-Type: application/json; charset=utf-8');
require_once(__DIR__ . "/../conexao.php");

$raw = file_get_contents('php://input');
$postjson = json_decode($raw, true);
if (!is_array($postjson)) $postjson = $_POST ?? [];

error_log("despesas/salvar.php - payload: " . json_encode($postjson));

$table = 'despesas';
$id = isset($postjson['id']) ? intval($postjson['id']) : 0;

// detectar nome da tabela de categorias disponível
$possibleCatTables = ['catdespesa', 'cat_despesa', 'cat_despesas'];
$catTable = null;
foreach ($possibleCatTables as $t) {
    try {
        $chk = $pdo->query("SHOW TABLES LIKE " . $pdo->quote($t))->fetchAll();
        if (is_array($chk) && count($chk) > 0) { $catTable = $t; break; }
    } catch (Exception $e) { /* ignore */ }
}

// buscar colunas reais da tabela despesas
try {
    $colsStmt = $pdo->query("SHOW COLUMNS FROM `{$table}`");
    $cols = $colsStmt->fetchAll(PDO::FETCH_ASSOC);
    $tableCols = array_map(function($c){ return $c['Field']; }, $cols);
} catch (Exception $e) {
    echo json_encode(['sucesso' => false, 'mensagem' => 'Erro ao ler estrutura da tabela', 'erro' => $e->getMessage()]);
    exit();
}

// montar dados a serem gravados somente com colunas permitidas
$data = [];
foreach ($tableCols as $col) {
    if ($col === 'id') continue;
    if (array_key_exists($col, $postjson)) {
        $val = $postjson[$col];
        if ($val === '') $val = null;
        $data[$col] = $val;
    }
}

if (count($data) === 0) {
    echo json_encode(['sucesso' => false, 'mensagem' => 'Nenhum campo válido recebido para salvar', 'dados_recebidos' => $postjson]);
    exit();
}

try {
    $pdo->beginTransaction();

    if ($id && $id != 0) {
        $sets = []; $values = [];
        foreach ($data as $col => $val) { $sets[] = "`{$col}` = ?"; $values[] = $val; }
        $values[] = $id;
        $sql = "UPDATE `{$table}` SET " . implode(', ', $sets) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
    } else {
        $colsIns = array_keys($data);
        $placeholders = array_fill(0, count($colsIns), '?');
        $values = array_values($data);
        $sql = "INSERT INTO `{$table}` (`" . implode('`,`', $colsIns) . "`) VALUES (" . implode(',', $placeholders) . ")";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        $id = $pdo->lastInsertId();
    }

    // montar SELECT final com ou sem JOIN dependendo da existência da tabela de categorias
    if ($catTable !== null) {
        $selectSql = "
            SELECT d.*, COALESCE(c.nome,'') AS cat_despesa_nome
            FROM `{$table}` d
            LEFT JOIN `{$catTable}` c ON d.cat_despesa = c.id
            WHERE d.id = ?
            LIMIT 1
        ";
    } else {
        $selectSql = "
            SELECT d.*
            FROM `{$table}` d
            WHERE d.id = ?
            LIMIT 1
        ";
    }

    $stmt = $pdo->prepare($selectSql);
    $stmt->execute([$id]);
    $dados = $stmt->fetch(PDO::FETCH_ASSOC);

    $pdo->commit();

    echo json_encode([
        'sucesso' => true,
        'mensagem' => 'Salvo com sucesso',
        'dados' => $dados,
        'cat_table_used' => $catTable
    ]);
    exit();
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("despesas/salvar.php - Erro salvar: " . $e->getMessage() . " | payload: " . json_encode($postjson));
    echo json_encode(['sucesso' => false, 'mensagem' => 'Erro interno', 'erro' => $e->getMessage(), 'dados_recebidos' => $postjson]);
    exit();
}
?>