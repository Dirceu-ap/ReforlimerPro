<?php 

include_once('../conexao.php');



$postjson = json_decode(file_get_contents('php://input'), true);

$query = $pdo->query("SELECT * from clientes where ativo = 'Sim'");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$total_pessoas = @count($res);


$query = $pdo->query("SELECT * from contas_receber where vencimento = curDate() and UPPER(status) = 'PENDENTE'");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$contasaReceberPendentes = @count($res);

// Considera como recebidas hoje apenas as contas com vencimento hoje
// que efetivamente foram baixadas hoje.
$query = $pdo->query("SELECT * from contas_receber where vencimento = curDate() and UPPER(status) = 'PAGA' and data_baixa = curDate()");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$contasRecebidas = @count($res);

// Total base do progresso da Home: pendentes de hoje + recebidas hoje.
// Isso evita contar títulos já pagos em outro dia como se fossem movimentação de hoje.
$contasaReceber = $contasaReceberPendentes + $contasRecebidas;

$query = $pdo->query("SELECT * from contas_pagar where vencimento = curDate() and status = 'Pendente'");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$contasaPagarHoje = @count($res);

$query = $pdo->query("SELECT * from contas_receber where vencimento < curDate() and status != 'Paga'");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$contas_receber_vencidas = @count($res);

$query = $pdo->query("SELECT * from contas_pagar where vencimento < curDate() and status != 'Paga'");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$contas_pagar_vencidas = @count($res);

$query = $pdo->query("SELECT * from fornecedores where ativo = 'Sim'");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$fornCadastrados = @count($res);

$query = $pdo->query("SELECT * from produtos where ativo = 'Sim'");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$produtosCadastrados = @count($res);

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
