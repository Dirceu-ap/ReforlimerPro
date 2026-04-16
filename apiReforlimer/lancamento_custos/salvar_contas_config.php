<?php

include_once('../conexao.php');
include_once('contas_config_lib.php');

try {
    lc_ensure_table($pdo);
    lc_seed_contas_iniciais($pdo);

    $postjson = json_decode(file_get_contents('php://input'), true);
    if (!is_array($postjson)) {
        $postjson = array();
    }

    $selecionadas = isset($postjson['contasSelecionadas']) && is_array($postjson['contasSelecionadas'])
        ? $postjson['contasSelecionadas']
        : array();

    $disponiveis = isset($postjson['contasDisponiveis']) && is_array($postjson['contasDisponiveis'])
        ? $postjson['contasDisponiveis']
        : array();

    lc_salvar_configuracao($pdo, $selecionadas, $disponiveis);

    $payload = lc_montar_payload($pdo);
    echo json_encode($payload);
} catch (Exception $e) {
    echo json_encode(array(
        'success' => false,
        'message' => 'Erro ao salvar configuracao de contas.',
        'error' => $e->getMessage(),
    ));
}

?>
