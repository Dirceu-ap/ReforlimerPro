<?php

include_once('../conexao.php');
include_once('contas_config_lib.php');

try {
    lc_ensure_table($pdo);
    lc_seed_contas_iniciais($pdo);

    $payload = lc_montar_payload($pdo);
    echo json_encode($payload);
} catch (Exception $e) {
    echo json_encode(array(
        'success' => false,
        'message' => 'Erro ao listar configuracao de contas.',
        'error' => $e->getMessage(),
    ));
}

?>
