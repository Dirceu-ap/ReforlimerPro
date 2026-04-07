<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With'); 
header('Content-Type: application/json; charset=utf-8');

include_once('../conexao.php');

// Recebe os parâmetros
$data_inicial = $_GET['data'];
$data_final = $_GET['data1'];
$lancamento = $_GET['lanc'];

// Consulta SQL
$query = "SELECT m.*, p.nome as clientes FROM movimentacoes m 
          LEFT JOIN pessoas p ON p.id = m.pessoa_id
          WHERE m.lancamento = :lanc 
          AND DATE(m.data) BETWEEN :data_inicial AND :data_final
          ORDER BY m.data DESC";

$stmt = $pdo->prepare($query);
$stmt->bindParam(':lanc', $lancamento);
$stmt->bindParam(':data_inicial', $data_inicial);
$stmt->bindParam(':data_final', $data_final);
$stmt->execute();
$movimentacoes = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Calcula o total
$total = 0;
foreach ($movimentacoes as $mov) {
    if ($mov['tipo'] == 'Entrada') {
        $total += floatval($mov['valor']);
    } else {
        $total -= floatval($mov['valor']);
    }
}

// Gera o HTML para o PDF (extrato de movimentações)
$html = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Relatório de Movimentações</title>
    <style>
        body { font-family: Arial, sans-serif; font-size:10px; line-height:1.25; }
        .header { text-align: center; margin-bottom: 8px; }
        .titulo { font-size: 14px; font-weight: bold; }
        .periodo { font-size: 10px; margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; font-size:9px; }
        th, td { border: 1px solid #ddd; padding: 3px 4px; text-align: left; }
        th { background-color: #f5f5f5; }
        .total { margin-top: 8px; text-align: right; font-weight: bold; font-size:10px; }
        .entrada { color: green; }
        .saida { color: red; }
    </style>
</head>
<body>
    <div class="header">
        <div class="titulo">Relatório de Movimentações - ' . $lancamento . '</div>
        <div class="periodo">Período: ' . date('d/m/Y', strtotime($data_inicial)) . ' até ' . date('d/m/Y', strtotime($data_final)) . '</div>
    </div>
	
    <table>
        <thead>
            <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Pessoa</th>
                <th>Valor</th>
            </tr>
        </thead>
        <tbody>';

foreach ($movimentacoes as $mov) {
    $valor_class = $mov['tipo'] == 'Entrada' ? 'entrada' : 'saida';
    $valor = number_format(floatval($mov['valor']), 2, ',', '.');
	
    $html .= '
            <tr>
                <td>' . date('d/m/Y', strtotime($mov['data'])) . '</td>
                <td>' . $mov['tipo'] . '</td>
                <td>' . $mov['descricao'] . '</td>
                <td>' . $mov['pessoa'] . '</td>
                <td class="' . $valor_class . '">R$ ' . $valor . '</td>
            </tr>';
}

$total_formatado = number_format(abs($total), 2, ',', '.');
$total_class = $total >= 0 ? 'entrada' : 'saida';

$html .= '
        </tbody>
    </table>
	
    <div class="total">
        Total: <span class="' . $total_class . '">R$ ' . $total_formatado . '</span>
    </div>
</body>
</html>';

// Carrega a biblioteca DOMPDF
require_once '../dompdf/autoload.inc.php';
use Dompdf\Dompdf;
use Dompdf\Options;

// Configura o DOMPDF
$options = new Options();
$options->set('isHtml5ParserEnabled', true);
$options->set('isPhpEnabled', true);

$dompdf = new Dompdf($options);
$dompdf->loadHtml($html);
$dompdf->setPaper('A4', 'portrait');
$dompdf->render();

// Gera o nome do arquivo
$filename = 'movimentacoes_' . date('Y-m-d_H-i-s') . '.pdf';

// Força o download
header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="' . $filename . '"');
echo $dompdf->output();
