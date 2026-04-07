<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $id = $data['id'];
    $valor = floatval($data['valor']);
    $desconto = floatval($data['desconto']);
    $data_venc = $data['data_venc'];

    $hoje = new DateTime();
    $vencimento = new DateTime($data_venc);
    $dias_atraso = $hoje > $vencimento ? $hoje->diff($vencimento)->days : 0;

    $multa = 0;
    $juros = 0;

    // Calcular multa (aplicada uma vez após o vencimento)
    if ($dias_atraso > 0) {
        $multa = $valor * 0.02; // Exemplo: 2% de multa
    }

    // Calcular juros diários (aplicado por dia de atraso)
    $juros = $dias_atraso * ($valor * 0.001); // Exemplo: 0.1% ao dia

    // Calcular subtotal
    $subtotal = $valor + $multa + $juros - $desconto;

    $response = [
        'sucesso' => true,
        'multa' => number_format($multa, 2, '.', ''),
        'juros' => number_format($juros, 2, '.', ''),
        'subtotal' => number_format($subtotal, 2, '.', ''),
    ];

    echo json_encode($response);
    exit;
}
?>