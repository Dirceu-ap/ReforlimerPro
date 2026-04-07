<?php

header('Content-Type: application/json; charset=utf-8');
include_once(__DIR__ . '/../conexao.php');

function lc_norm_text($value) {
    $text = trim((string)$value);
    if ($text === '') return '';

    $lower = strtolower($text);
    $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $lower);
    if ($normalized === false) {
        $normalized = $lower;
    }

    return preg_replace('/\s+/', ' ', trim($normalized));
}

function lc_parse_plano_conta($planoConta) {
    $raw = trim((string)$planoConta);
    if ($raw === '') {
        return array('despesa' => '', 'plano' => '', 'raw' => '');
    }

    if (preg_match('/^(.*?)\s*-\s*(.*)$/u', $raw, $m)) {
        return array(
            'despesa' => trim((string)$m[1]),
            'plano' => trim((string)$m[2]),
            'raw' => $raw,
        );
    }

    return array(
        'despesa' => $raw,
        'plano' => '',
        'raw' => $raw,
    );
}

function lc_collect_planos_from_rows($rows, &$map) {
    for ($i = 0; $i < count($rows); $i++) {
        $planoConta = trim((string)($rows[$i]['plano_conta'] ?? ''));
        if ($planoConta === '') continue;

        $parsed = lc_parse_plano_conta($planoConta);
        $despesa = trim((string)$parsed['despesa']);
        $plano = trim((string)$parsed['plano']);

        if ($despesa === '') continue;

        $key = lc_norm_text($despesa) . '|' . lc_norm_text($plano);
        if ($key === '|') continue;

        if (!isset($map[$key])) {
            $map[$key] = array(
                'nome' => $despesa,
                'plano' => $plano,
                'plano_conta' => $parsed['raw'],
            );
        }
    }
}

try {
    $postjson = json_decode(file_get_contents('php://input'), true);
    if (!is_array($postjson)) {
        $postjson = array();
    }

    $dataInicio = trim((string)($postjson['dataInicio'] ?? ''));
    $dataFim = trim((string)($postjson['dataFim'] ?? ''));

    if ($dataInicio === '' || $dataFim === '') {
        echo json_encode(array(
            'success' => false,
            'message' => 'Informe o periodo para consulta.',
        ));
        exit;
    }

    $map = array();

    $stmtPagar = $pdo->prepare("SELECT plano_conta FROM contas_pagar WHERE vencimento BETWEEN ? AND ? AND TRIM(COALESCE(plano_conta, '')) <> ''");
    $stmtPagar->execute(array($dataInicio, $dataFim));
    $rowsPagar = $stmtPagar->fetchAll(PDO::FETCH_ASSOC);
    lc_collect_planos_from_rows($rowsPagar, $map);

    $stmtReceber = $pdo->prepare("SELECT plano_conta FROM contas_receber WHERE vencimento BETWEEN ? AND ? AND TRIM(COALESCE(plano_conta, '')) <> ''");
    $stmtReceber->execute(array($dataInicio, $dataFim));
    $rowsReceber = $stmtReceber->fetchAll(PDO::FETCH_ASSOC);
    lc_collect_planos_from_rows($rowsReceber, $map);

    $stmtMov = $pdo->prepare("SELECT plano_conta FROM movimentacoes WHERE data BETWEEN ? AND ? AND TRIM(COALESCE(plano_conta, '')) <> ''");
    $stmtMov->execute(array($dataInicio, $dataFim));
    $rowsMov = $stmtMov->fetchAll(PDO::FETCH_ASSOC);
    lc_collect_planos_from_rows($rowsMov, $map);

    $resultado = array_values($map);
    usort($resultado, function ($a, $b) {
        $aPlano = lc_norm_text($a['plano'] ?? '');
        $bPlano = lc_norm_text($b['plano'] ?? '');
        $cmpPlano = strcmp($aPlano, $bPlano);
        if ($cmpPlano !== 0) return $cmpPlano;

        return strcmp(lc_norm_text($a['nome'] ?? ''), lc_norm_text($b['nome'] ?? ''));
    });

    echo json_encode(array(
        'success' => true,
        'resultado' => $resultado,
    ));
} catch (Exception $e) {
    echo json_encode(array(
        'success' => false,
        'message' => 'Erro ao listar despesas lancadas no periodo.',
        'error' => $e->getMessage(),
    ));
}

?>
