<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

require_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

if (!$postjson) {
    echo json_encode(['success' => false, 'message' => 'Sem dados enviados']);
    exit;
}

// Aceita colaborador_id (usado no app) ou usuario_id (compatibilidade)
$colaborador_id = isset($postjson['colaborador_id']) ? intval($postjson['colaborador_id']) : null;
if (!$colaborador_id && isset($postjson['usuario_id'])) {
    $colaborador_id = intval($postjson['usuario_id']);
}

$data          = isset($postjson['data']) ? $postjson['data'] : null; // formato yyyy-MM-dd
$entrada       = isset($postjson['entrada']) ? $postjson['entrada'] : null; // HH:MM
$saida         = isset($postjson['saida']) ? $postjson['saida'] : null; // HH:MM
$total_horas   = isset($postjson['total_horas']) ? $postjson['total_horas'] : null; // ex: 8h 00min
$almoco_saida  = isset($postjson['almoco_saida']) ? $postjson['almoco_saida'] : null; // HH:MM ou null
$almoco_retorno= isset($postjson['almoco_retorno']) ? $postjson['almoco_retorno'] : null; // HH:MM ou null
$observacao    = isset($postjson['observacao']) ? $postjson['observacao'] : null;
$local         = isset($postjson['local']) ? $postjson['local'] : null;

if (!$colaborador_id || !$data || !$entrada) {
    echo json_encode(['success' => false, 'message' => 'Campos obrigatórios ausentes']);
    exit;
}

try {
    // ATENÇÃO: garanta que a tabela tenha estas colunas na tabela livro_ponto:
    // id, colaborador_id, data, entrada, saida, total_horas,
    // almoco_saida, almoco_retorno, observacao, local, created_at

    $sql = "INSERT INTO livro_ponto 
                (colaborador_id, data, entrada, saida, total_horas, almoco_saida, almoco_retorno, observacao, local, created_at)
            VALUES 
                (:colaborador_id, :data, :entrada, :saida, :total_horas, :almoco_saida, :almoco_retorno, :observacao, :local, NOW())";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':colaborador_id', $colaborador_id, PDO::PARAM_INT);
    $stmt->bindValue(':data', $data);
    $stmt->bindValue(':entrada', $entrada);
    $stmt->bindValue(':saida', $saida);
    $stmt->bindValue(':total_horas', $total_horas);
    $stmt->bindValue(':almoco_saida', $almoco_saida);
    $stmt->bindValue(':almoco_retorno', $almoco_retorno);
    $stmt->bindValue(':observacao', $observacao);
    $stmt->bindValue(':local', $local);

    $ok = $stmt->execute();

    if ($ok) {
        echo json_encode([
            'success' => true,
            'id'      => $pdo->lastInsertId(),
            'message' => 'Lançamento gravado com sucesso',
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Falha ao gravar']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Erro: ' . $e->getMessage()]);
}

