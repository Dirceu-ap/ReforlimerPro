<?php 

include_once('../conexao.php');

function scalar_count(PDO $pdo, string $sql): int {
    $stmt = $pdo->query($sql);
    return (int)$stmt->fetchColumn();
}

$total_pessoas = scalar_count($pdo, "SELECT COUNT(*) FROM clientes WHERE ativo = 'Sim'");

$contasaReceberPendentes = scalar_count(
    $pdo,
    "SELECT COUNT(*) FROM contas_receber WHERE vencimento = CURDATE() AND UPPER(status) = 'PENDENTE'"
);

// Considera como recebidas hoje apenas as contas com vencimento hoje
// que efetivamente foram baixadas hoje.
$contasRecebidas = scalar_count(
    $pdo,
    "SELECT COUNT(*) FROM contas_receber WHERE vencimento = CURDATE() AND UPPER(status) = 'PAGA' AND data_baixa = CURDATE()"
);

// Total base do progresso da Home: pendentes de hoje + recebidas hoje.
// Isso evita contar titulos ja pagos em outro dia como se fossem movimentacao de hoje.
$contasaReceber = $contasaReceberPendentes + $contasRecebidas;

$contasaPagarHoje = scalar_count(
    $pdo,
    "SELECT COUNT(*) FROM contas_pagar WHERE vencimento = CURDATE() AND UPPER(status) = 'PENDENTE'"
);

$contas_receber_vencidas = scalar_count(
    $pdo,
    "SELECT COUNT(*) FROM contas_receber WHERE vencimento < CURDATE() AND UPPER(status) <> 'PAGA'"
);

$contas_pagar_vencidas = scalar_count(
    $pdo,
    "SELECT COUNT(*) FROM contas_pagar WHERE vencimento < CURDATE() AND UPPER(status) <> 'PAGA'"
);

$fornCadastrados = scalar_count($pdo, "SELECT COUNT(*) FROM fornecedores WHERE ativo = 'Sim'");

$produtosCadastrados = scalar_count($pdo, "SELECT COUNT(*) FROM produtos WHERE ativo = 'Sim'");

$result = json_encode(array('success'=>true, 
    'quantidade_clientes'=>$total_pessoas,
    'contasRecebidas'=>$contasRecebidas,
    'contasaReceber'=>$contasaReceber,
    'contasaPagarHoje'=>$contasaPagarHoje,
    'contasaReceberPendentes'=>$contasaReceberPendentes,
    'contasaReceberVencidas'=>$contas_receber_vencidas,
    'contasaPagarVencidas'=>$contas_pagar_vencidas,
    'quantidade_fornecedores'=>$fornCadastrados,
    'quantidade_produtos'=>$produtosCadastrados,

    
));

echo $result;
