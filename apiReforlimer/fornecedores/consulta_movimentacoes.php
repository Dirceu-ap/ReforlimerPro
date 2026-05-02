<?php

include_once('../conexao.php');

$busca = isset($_GET['busca']) ? trim($_GET['busca']) : '';
$fornecedor_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$data_ini = isset($_GET['data_ini']) ? $_GET['data_ini'] : '';
$data_fim = isset($_GET['data_fim']) ? $_GET['data_fim'] : '';

// Se um ID específico foi informado, busca movimentações detalhadas desse fornecedor
if ($fornecedor_id > 0) {
    // Buscar dados do fornecedor
    $stmt = $pdo->prepare("SELECT id, nome FROM fornecedores WHERE id = :id LIMIT 1");
    $stmt->bindValue(':id', $fornecedor_id, PDO::PARAM_INT);
    $stmt->execute();
    $forn = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$forn) {
        echo json_encode(['success' => false, 'mensagem' => 'Fornecedor não encontrado']);
        exit;
    }

    // Entradas: compras vinculadas ao fornecedor
    if ($data_ini && $data_fim) {
        $stmtC = $pdo->prepare("SELECT id, valor, data_lanc, data_pgto, status, pagamento, lancamento, local
                                 FROM compras
                                 WHERE cliente = :id AND data_lanc BETWEEN :di AND :df
                                 ORDER BY data_lanc DESC");
        $stmtC->bindValue(':di', $data_ini);
        $stmtC->bindValue(':df', $data_fim);
    } else {
        $stmtC = $pdo->prepare("SELECT id, valor, data_lanc, data_pgto, status, pagamento, lancamento, local
                                 FROM compras
                                 WHERE cliente = :id
                                 ORDER BY data_lanc DESC");
    }
    $stmtC->bindValue(':id', $fornecedor_id, PDO::PARAM_INT);
    $stmtC->execute();
    $compras_res = $stmtC->fetchAll(PDO::FETCH_ASSOC);

    $compras = [];
    $total_compras = 0.0;
    foreach ($compras_res as $row) {
        $valor = floatval($row['valor']);
        $total_compras += $valor;
        $compras[] = [
            'id'         => $row['id'],
            'tipo'       => 'entrada',
            'descricao'  => 'Compra',
            'valor'      => number_format($valor, 2, ',', '.'),
            'data'       => implode('/', array_reverse(explode('-', $row['data_lanc']))),
            'status'     => $row['status'],
            'pagamento'  => $row['pagamento'],
            'local'      => $row['local'] ?? '',
        ];
    }

    // Saídas: contas a pagar vinculadas ao fornecedor
    if ($data_ini && $data_fim) {
        $stmtP = $pdo->prepare("SELECT id, descricao, valor, vencimento, status, plano_conta, local
                                 FROM contas_pagar
                                 WHERE cliente = :id AND vencimento BETWEEN :di AND :df
                                 ORDER BY vencimento DESC");
        $stmtP->bindValue(':di', $data_ini);
        $stmtP->bindValue(':df', $data_fim);
    } else {
        $stmtP = $pdo->prepare("SELECT id, descricao, valor, vencimento, status, plano_conta, local
                                 FROM contas_pagar
                                 WHERE cliente = :id
                                 ORDER BY vencimento DESC");
    }
    $stmtP->bindValue(':id', $fornecedor_id, PDO::PARAM_INT);
    $stmtP->execute();
    $pagar_res = $stmtP->fetchAll(PDO::FETCH_ASSOC);

    $contas_pagar = [];
    $total_pagar = 0.0;
    $total_pago = 0.0;
    foreach ($pagar_res as $row) {
        $valor = floatval($row['valor']);
        $total_pagar += $valor;
        if (strtolower($row['status']) === 'paga') {
            $total_pago += $valor;
        }
        $contas_pagar[] = [
            'id'         => $row['id'],
            'tipo'       => 'saida',
            'descricao'  => $row['descricao'] ?: 'Conta a Pagar',
            'valor'      => number_format($valor, 2, ',', '.'),
            'data'       => implode('/', array_reverse(explode('-', $row['vencimento']))),
            'status'     => $row['status'],
            'plano_conta'=> $row['plano_conta'] ?? '',
            'local'      => $row['local'] ?? '',
        ];
    }

    $total_pendente = $total_pagar - $total_pago;

    $resultado = [
        'id'               => $forn['id'],
        'nome'             => $forn['nome'],
        'total_compras'    => number_format($total_compras, 2, ',', '.'),
        'total_pagar'      => number_format($total_pagar, 2, ',', '.'),
        'total_pago'       => number_format($total_pago, 2, ',', '.'),
        'total_pendente'   => number_format($total_pendente, 2, ',', '.'),
        'compras'          => $compras,
        'contas_pagar'     => $contas_pagar,
    ];

    echo json_encode(['success' => true, 'fornecedor' => $resultado]);
    exit;
}

// Busca lista de fornecedores pelo nome
if ($busca === '') {
    $stmtF = $pdo->prepare("SELECT id, nome FROM fornecedores ORDER BY nome ASC");
} else {
    $stmtF = $pdo->prepare("SELECT id, nome FROM fornecedores WHERE nome LIKE :busca ORDER BY nome ASC");
    $stmtF->bindValue(':busca', '%' . $busca . '%');
}
$stmtF->execute();
$fornecedores_res = $stmtF->fetchAll(PDO::FETCH_ASSOC);

if (count($fornecedores_res) === 0) {
    echo json_encode(['success' => false, 'resultado' => [], 'mensagem' => 'Nenhum fornecedor encontrado']);
    exit;
}

$dados = [];
foreach ($fornecedores_res as $forn) {
    $fid = $forn['id'];

    // Totais de compras
    $stmtTC = $pdo->prepare("SELECT COALESCE(SUM(valor), 0) as total FROM compras WHERE cliente = :id");
    $stmtTC->bindValue(':id', $fid, PDO::PARAM_INT);
    $stmtTC->execute();
    $tc = $stmtTC->fetch(PDO::FETCH_ASSOC);
    $total_compras = floatval($tc['total']);

    // Totais de contas a pagar
    $stmtTP = $pdo->prepare("SELECT COALESCE(SUM(valor), 0) as total FROM contas_pagar WHERE cliente = :id");
    $stmtTP->bindValue(':id', $fid, PDO::PARAM_INT);
    $stmtTP->execute();
    $tp = $stmtTP->fetch(PDO::FETCH_ASSOC);
    $total_pagar = floatval($tp['total']);

    $stmtPago = $pdo->prepare("SELECT COALESCE(SUM(valor), 0) as total FROM contas_pagar WHERE cliente = :id AND status = 'Paga'");
    $stmtPago->bindValue(':id', $fid, PDO::PARAM_INT);
    $stmtPago->execute();
    $pg = $stmtPago->fetch(PDO::FETCH_ASSOC);
    $total_pago = floatval($pg['total']);

    // Só inclui fornecedores com algum movimento
    if ($total_compras === 0.0 && $total_pagar === 0.0 && $busca === '') continue;

    $dados[] = [
        'id'             => $fid,
        'nome'           => $forn['nome'],
        'total_compras'  => number_format($total_compras, 2, ',', '.'),
        'total_pagar'    => number_format($total_pagar, 2, ',', '.'),
        'total_pago'     => number_format($total_pago, 2, ',', '.'),
        'total_pendente' => number_format($total_pagar - $total_pago, 2, ',', '.'),
    ];
}

if (count($dados) > 0) {
    echo json_encode(['success' => true, 'resultado' => $dados]);
} else {
    echo json_encode(['success' => false, 'resultado' => [], 'mensagem' => 'Nenhum fornecedor com movimentações encontrado']);
}
?>
