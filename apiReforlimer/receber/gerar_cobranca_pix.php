<?php
header('Content-Type: application/json; charset=utf-8');

function respond($payload, $status = 200) {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function onlyDigits($value) {
    return preg_replace('/\D/', '', (string)$value);
}

function normalizeDateYmd($value) {
    $raw = trim((string)$value);
    if ($raw === '') return '';

    if (preg_match('/^\d{4}-\d{2}-\d{2}/', $raw)) {
        return substr($raw, 0, 10);
    }

    if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $raw, $m)) {
        return $m[3] . '-' . $m[2] . '-' . $m[1];
    }

    $ts = strtotime($raw);
    if ($ts === false) return '';
    return date('Y-m-d', $ts);
}

function normalizeMoney($value) {
    $raw = trim((string)$value);
    if ($raw === '') return 0.0;

    if (strpos($raw, ',') !== false && strpos($raw, '.') !== false) {
        $raw = str_replace('.', '', $raw);
        $raw = str_replace(',', '.', $raw);
    } else if (strpos($raw, ',') !== false) {
        $raw = str_replace(',', '.', $raw);
    }

    return round((float)$raw, 2);
}

function calculateDaysLate($dueDateYmd, $todayYmd = null) {
    $dueTs = strtotime((string)$dueDateYmd . ' 00:00:00');
    if ($dueTs === false) return 0;

    $todayBase = $todayYmd ? (string)$todayYmd : date('Y-m-d');
    $todayTs = strtotime($todayBase . ' 00:00:00');
    if ($todayTs === false) $todayTs = time();

    if ($todayTs <= $dueTs) return 0;

    $diff = $todayTs - $dueTs;
    return (int)floor($diff / 86400);
}

function calculateOverdueTotals($baseValue, $daysLate, $finePercent, $interestPercentDay) {
    $base = round((float)$baseValue, 2);
    $days = max(0, (int)$daysLate);
    $fine = $days > 0 ? round($base * ((float)$finePercent / 100), 2) : 0.0;
    $interest = $days > 0 ? round($base * ((float)$interestPercentDay / 100) * $days, 2) : 0.0;
    $total = round($base + $fine + $interest, 2);

    return [
        'base' => $base,
        'fine' => $fine,
        'interest' => $interest,
        'total' => $total,
        'daysLate' => $days,
    ];
}

function asaasRequest($method, $path, $apiKey, $sandbox, $body = null) {
    if (!function_exists('curl_init')) {
        throw new Exception('cURL nao disponivel no servidor PHP.');
    }

    $baseUrl = $sandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
    $url = rtrim($baseUrl, '/') . '/' . ltrim($path, '/');

    $ch = curl_init($url);
    $headers = [
        'accept: application/json',
        'content-type: application/json',
        'access_token: ' . $apiKey,
    ];

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $methodUpper = strtoupper($method);
    if ($methodUpper !== 'GET') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $methodUpper);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($response === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new Exception('Falha HTTP no PSP: ' . $err);
    }

    curl_close($ch);

    $decoded = json_decode($response, true);
    if (!is_array($decoded)) {
        throw new Exception('Resposta invalida do PSP. HTTP ' . $httpCode);
    }

    if ($httpCode < 200 || $httpCode >= 300) {
        $msg = 'Erro no PSP (HTTP ' . $httpCode . ')';
        if (!empty($decoded['errors'][0]['description'])) {
            $msg .= ': ' . $decoded['errors'][0]['description'];
        }
        throw new Exception($msg);
    }

    return $decoded;
}

try {
    $config = require __DIR__ . '/pix_psp_config.php';

    $apiKey = trim((string)($config['apiKey'] ?? ''));
    if ($apiKey === '' || $apiKey === 'INFORME_SUA_API_KEY_AQUI') {
        respond([
            'success' => false,
            'message' => 'PSP nao configurado. Defina ASAAS_API_KEY ou apiKey em receber/pix_psp_config.php',
            'code' => 'PSP_NOT_CONFIGURED',
        ], 400);
    }

    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input)) {
        $input = $_POST;
    }

    $idConta = trim((string)($input['idConta'] ?? ''));
    $valor = normalizeMoney($input['valor'] ?? '0');
    $vencimento = normalizeDateYmd($input['vencimento'] ?? '');
    $pagadorNome = trim((string)($input['pagadorNome'] ?? 'Consumidor Final'));
    $pagadorDoc = onlyDigits($input['pagadorDocumento'] ?? '');
    $descricao = trim((string)($input['descricao'] ?? 'Cobranca PIX'));

    if ($idConta === '') {
        respond(['success' => false, 'message' => 'idConta obrigatorio.'], 400);
    }
    if ($valor <= 0) {
        respond(['success' => false, 'message' => 'valor invalido.'], 400);
    }
    if ($vencimento === '') {
        respond(['success' => false, 'message' => 'vencimento invalido. Use YYYY-MM-DD ou DD/MM/YYYY.'], 400);
    }

    $sandbox = (bool)($config['sandbox'] ?? true);
    $multaPercent = (float)($config['multaPercent'] ?? 2.0);
    $jurosPercentDia = (float)($config['jurosPercentDia'] ?? 0.0334);

    $customerId = trim((string)($config['defaultCustomerId'] ?? ''));
    $externalReference = 'RECEBER_' . $idConta;

    $totals = calculateOverdueTotals(
        $valor,
        calculateDaysLate($vencimento),
        $multaPercent,
        $jurosPercentDia
    );
    $valorAtualizado = (float)$totals['total'];

    if ($customerId === '') {
        $customerBody = [
            'name' => $pagadorNome !== '' ? $pagadorNome : 'Consumidor Final',
            'externalReference' => 'REFORLIMER_PAGADOR_' . $idConta,
            'notificationDisabled' => false,
        ];

        if (strlen($pagadorDoc) === 11 || strlen($pagadorDoc) === 14) {
            $customerBody['cpfCnpj'] = $pagadorDoc;
        }

        $customer = asaasRequest('POST', '/customers', $apiKey, $sandbox, $customerBody);
        $customerId = (string)($customer['id'] ?? '');
    }

    if ($customerId === '') {
        throw new Exception('Nao foi possivel obter customer no PSP.');
    }

    $payment = null;
    $paymentId = '';

    $list = asaasRequest('GET', '/payments?externalReference=' . urlencode($externalReference) . '&limit=20', $apiKey, $sandbox);
    $items = is_array($list['data'] ?? null) ? $list['data'] : [];
    $validStatuses = ['PENDING', 'OVERDUE'];

    foreach ($items as $item) {
        if (!is_array($item)) continue;
        if ((string)($item['billingType'] ?? '') !== 'PIX') continue;
        if (!in_array((string)($item['status'] ?? ''), $validStatuses, true)) continue;
        $payment = $item;
        $paymentId = (string)($item['id'] ?? '');
        break;
    }

    $paymentBody = [
        'customer' => $customerId,
        'billingType' => 'PIX',
        'value' => $valorAtualizado,
        'dueDate' => $vencimento,
        'description' => $descricao,
        'externalReference' => $externalReference,
        'fine' => [
            'value' => $multaPercent,
            'type' => 'PERCENTAGE',
        ],
        'interest' => [
            'value' => $jurosPercentDia,
        ],
    ];

    if ($paymentId !== '') {
        $currentValue = round((float)($payment['value'] ?? 0), 2);
        if ($currentValue !== $valorAtualizado) {
            asaasRequest('PUT', '/payments/' . $paymentId, $apiKey, $sandbox, [
                'value' => $valorAtualizado,
                'dueDate' => $vencimento,
                'description' => $descricao,
                'externalReference' => $externalReference,
                'fine' => [
                    'value' => $multaPercent,
                    'type' => 'PERCENTAGE',
                ],
                'interest' => [
                    'value' => $jurosPercentDia,
                ],
            ]);
        }

        $payment = asaasRequest('GET', '/payments/' . $paymentId, $apiKey, $sandbox);
    } else {
        $payment = asaasRequest('POST', '/payments', $apiKey, $sandbox, $paymentBody);
        $paymentId = (string)($payment['id'] ?? '');
    }

    if ($paymentId === '') {
        throw new Exception('PSP nao retornou id da cobranca.');
    }

    $qr = asaasRequest('GET', '/payments/' . $paymentId . '/pixQrCode', $apiKey, $sandbox);

    $payload = [
        'success' => true,
        'provider' => 'asaas',
        'sandbox' => $sandbox,
        'charge' => [
            'id' => $paymentId,
            'txid' => (string)($payment['externalReference'] ?? ('RECEBER_' . $idConta)),
            'status' => (string)($payment['status'] ?? ''),
            'vencimento' => $vencimento,
        ],
        'pix' => [
            'valorOriginal' => $valor,
            'valor' => (float)($payment['value'] ?? $valorAtualizado),
            'diasAtraso' => (int)$totals['daysLate'],
            'multaPercent' => $multaPercent,
            'multaValor' => (float)$totals['fine'],
            'jurosPercentDia' => $jurosPercentDia,
            'jurosValor' => (float)$totals['interest'],
            'copiaECola' => (string)($qr['payload'] ?? ''),
            'qrCodeImage' => (string)($qr['encodedImage'] ?? ''),
            'expirationDate' => (string)($qr['expirationDate'] ?? ''),
        ],
    ];

    respond($payload, 200);
} catch (Exception $e) {
    respond([
        'success' => false,
        'message' => $e->getMessage(),
    ], 500);
}
