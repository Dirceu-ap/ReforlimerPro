<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

include_once('../conexao.php');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(['success' => false, 'message' => 'Sem dados enviados']);
    exit;
}

// Tanto usuario_id quanto colaborador_id são aceitos
$usuario_id = isset($input['usuario_id']) ? intval($input['usuario_id']) : null;
$colaborador_id = isset($input['colaborador_id']) ? intval($input['colaborador_id']) : null;

if (!$usuario_id && $colaborador_id) {
    $usuario_id = $colaborador_id;
}

$data          = isset($input['data']) ? $input['data'] : null;
$entrada       = isset($input['entrada']) ? $input['entrada'] : null;
$saida         = isset($input['saida']) ? $input['saida'] : null;
$total_horas   = isset($input['total_horas']) ? $input['total_horas'] : null;
$almoco_saida  = isset($input['almoco_saida']) ? $input['almoco_saida'] : null;
$almoco_retorno= isset($input['almoco_retorno']) ? $input['almoco_retorno'] : null;
$observacao    = isset($input['observacao']) ? $input['observacao'] : null;
$local         = isset($input['local']) ? $input['local'] : null;

if (!$usuario_id || !$data || !$entrada || !$saida || !$total_horas) {
    echo json_encode(['success' => false, 'message' => 'Campos obrigatórios ausentes']);
    exit;
}

if ($almoco_saida === '')   $almoco_saida = null;
if ($almoco_retorno === '') $almoco_retorno = null;
if ($observacao === '')     $observacao = null;

try {
    $sql = "INSERT INTO livro_ponto (
    usuario_id,
    data_registro,
    entrada,
    saida,
    total_horas,
    almoco_saida,
    almoco_retorno,
    observacao,
    local,
    created_at
) VALUES (
    :usuario_id,
    :data,
    :entrada,
    :saida,
    :total_horas,
    :almoco_saida,
    :almoco_retorno,
    :observacao,
    :local,
    NOW()
)";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':usuario_id', $usuario_id, PDO::PARAM_INT);
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
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Falha ao gravar']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Erro: ' . $e->getMessage()]);
}