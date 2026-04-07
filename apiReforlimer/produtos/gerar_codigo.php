<?php
require_once("../conexao.php");
$pagina = 'produtos';

header('Content-Type: application/json; charset=utf-8');

try {
    $query = $pdo->query("SELECT MAX(CAST(codigo AS UNSIGNED)) AS max_codigo FROM $pagina");
    $res = $query->fetchAll(PDO::FETCH_ASSOC);

    $max = 0;
    if (count($res) > 0 && isset($res[0]['max_codigo']) && $res[0]['max_codigo'] !== null) {
        $max = (int)$res[0]['max_codigo'];
    }

    $novo = $max + 1;

    echo json_encode([
        'success' => true,
        'codigo'  => (string)$novo,
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success'  => false,
        'mensagem' => 'Erro ao gerar código automático',
    ]);
}