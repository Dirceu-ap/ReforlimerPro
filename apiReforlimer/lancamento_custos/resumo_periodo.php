<?php

header('Content-Type: application/json; charset=utf-8');
include_once(__DIR__ . '/../conexao.php');

function lc_normalize_text($value) {
    $text = trim((string)$value);
    if ($text === '') return '';

    $lower = strtolower($text);
    $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $lower);
    if ($normalized === false) {
        $normalized = $lower;
    }

    return preg_replace('/\s+/', ' ', trim($normalized));
}

function lc_status_pendente($status) {
    $value = strtoupper(trim((string)$status));
    return strpos($value, 'PENDENTE') === 0;
}

function lc_format_currency_number($value) {
    return (float)str_replace(',', '.', (string)$value);
}

function lc_build_plano_matches($filtros) {
    $matches = array();

    for ($i = 0; $i < count($filtros); $i++) {
        $planoNome = trim((string)($filtros[$i]['planoNome'] ?? ''));
        $despesaId = trim((string)($filtros[$i]['despesaId'] ?? ''));
        $despesaNome = trim((string)($filtros[$i]['despesaNome'] ?? ''));

        if ($planoNome === '' || $despesaId === '') {
            continue;
        }

        $planoConta = trim($despesaId . ' - ' . $planoNome);
        $key = lc_normalize_text($planoConta);
        if ($key === '') continue;

        if (!isset($matches[$key])) {
            $matches[$key] = array(
                'plano_conta' => $planoConta,
                'filtro_label' => trim($planoNome . ' / ' . ($despesaNome !== '' ? $despesaNome : $despesaId)),
            );
        }
    }

    return array_values($matches);
}

function lc_buscar_movimentos($pdo, $tabela, $dataInicio, $dataFim, $matches) {
    if (count($matches) === 0) {
        return array();
    }

    $planoContas = array();
    for ($i = 0; $i < count($matches); $i++) {
        $planoContas[] = $matches[$i]['plano_conta'];
    }

    $placeholders = implode(', ', array_fill(0, count($planoContas), '?'));
    $sql = "SELECT id, descricao, valor, status, vencimento, plano_conta FROM {$tabela} WHERE vencimento BETWEEN ? AND ? AND TRIM(plano_conta) IN ({$placeholders}) ORDER BY vencimento ASC, id ASC";
    $stmt = $pdo->prepare($sql);

    $params = array_merge(array($dataInicio, $dataFim), $planoContas);
    $stmt->execute($params);

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

try {
    $postjson = json_decode(file_get_contents('php://input'), true);
    if (!is_array($postjson)) {
        $postjson = array();
    }

    $dataInicio = trim((string)($postjson['dataInicio'] ?? ''));
    $dataFim = trim((string)($postjson['dataFim'] ?? ''));
    $filtros = isset($postjson['filtros']) && is_array($postjson['filtros'])
        ? $postjson['filtros']
        : array();

    if ($dataInicio === '' || $dataFim === '') {
        echo json_encode(array(
            'success' => false,
            'message' => 'Informe o periodo para consulta.',
        ));
        exit;
    }

    if (count($filtros) === 0) {
        echo json_encode(array(
            'success' => false,
            'message' => 'Selecione ao menos uma despesa.',
        ));
        exit;
    }

    $matches = lc_build_plano_matches($filtros);
    if (count($matches) === 0) {
        echo json_encode(array(
            'success' => false,
            'message' => 'Nao foi possivel montar os filtros do plano de contas.',
        ));
        exit;
    }

    $movimentosPagar = lc_buscar_movimentos($pdo, 'contas_pagar', $dataInicio, $dataFim, $matches);
    $movimentosReceber = lc_buscar_movimentos($pdo, 'contas_receber', $dataInicio, $dataFim, $matches);

    $mapLabel = array();
    for ($i = 0; $i < count($matches); $i++) {
        $mapLabel[lc_normalize_text($matches[$i]['plano_conta'])] = $matches[$i]['filtro_label'];
    }

    $aPagar = 0;
    $pago = 0;
    $aReceber = 0;
    $recebido = 0;
    $itens = array();

    for ($i = 0; $i < count($movimentosPagar); $i++) {
        $row = $movimentosPagar[$i];
        $valor = lc_format_currency_number($row['valor'] ?? 0);
        $pendente = lc_status_pendente($row['status'] ?? '');

        if ($pendente) {
            $aPagar += $valor;
            $statusLabel = 'A pagar';
        } else {
            $pago += $valor;
            $statusLabel = 'Pago';
        }

        $itens[] = array(
            'id' => 'pagar-' . ($row['id'] ?? $i),
            'fonte' => 'pagar',
            'descricao' => trim((string)($row['descricao'] ?? 'Conta a pagar')),
            'valor' => $valor,
            'vencimento' => trim((string)($row['vencimento'] ?? '')),
            'statusLabel' => $statusLabel,
            'planoConta' => trim((string)($row['plano_conta'] ?? '')),
            'filtroLabel' => $mapLabel[lc_normalize_text($row['plano_conta'] ?? '')] ?? trim((string)($row['plano_conta'] ?? '')),
        );
    }

    for ($i = 0; $i < count($movimentosReceber); $i++) {
        $row = $movimentosReceber[$i];
        $valor = lc_format_currency_number($row['valor'] ?? 0);
        $pendente = lc_status_pendente($row['status'] ?? '');

        if ($pendente) {
            $aReceber += $valor;
            $statusLabel = 'A receber';
        } else {
            $recebido += $valor;
            $statusLabel = 'Recebido';
        }

        $itens[] = array(
            'id' => 'receber-' . ($row['id'] ?? $i),
            'fonte' => 'receber',
            'descricao' => trim((string)($row['descricao'] ?? 'Conta a receber')),
            'valor' => $valor,
            'vencimento' => trim((string)($row['vencimento'] ?? '')),
            'statusLabel' => $statusLabel,
            'planoConta' => trim((string)($row['plano_conta'] ?? '')),
            'filtroLabel' => $mapLabel[lc_normalize_text($row['plano_conta'] ?? '')] ?? trim((string)($row['plano_conta'] ?? '')),
        );
    }

    usort($itens, function ($a, $b) {
        return strcmp((string)$b['vencimento'], (string)$a['vencimento']);
    });

    echo json_encode(array(
        'success' => true,
        'aPagar' => $aPagar,
        'pago' => $pago,
        'aReceber' => $aReceber,
        'recebido' => $recebido,
        'resultadoProjetado' => ($recebido + $aReceber) - ($pago + $aPagar),
        'itens' => $itens,
    ));
} catch (Exception $e) {
    echo json_encode(array(
        'success' => false,
        'message' => 'Erro ao buscar resumo do periodo.',
        'error' => $e->getMessage(),
    ));
}

?>
