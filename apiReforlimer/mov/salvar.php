<?php 

require_once("../conexao.php");
$pagina = 'compras';

$postjson = json_decode(file_get_contents('php://input'), true);

$pagamento = @$postjson['pagamento'];
$lancamento = @$postjson['lancamento'];
$data = @$postjson['dataVenda'];

$subtotal = @$postjson['subtotal'];
$parcelas = @$postjson['parcelas'];
$cliente = @$postjson['cliente'];

$id_usuario = @$postjson['user'];

$subtotal = str_replace('.', '', $subtotal);
$subtotal = str_replace(',', '.', $subtotal);


if($data == date('Y-m-d') and $parcelas == '1'){
	$status = 'Concluída';
}else{
	$status = 'Pendente';
	if($cliente == ''){
	$result = json_encode(array('mensagem'=>'Selecione um Fornecedor!', 'sucesso'=>false));
echo $result;
	exit();
	}	
}


$query_con = $pdo->query("SELECT * FROM fornecedores WHERE id = '$cliente'");
$res = $query_con->fetchAll(PDO::FETCH_ASSOC);
if(@count($res) > 0){
	$nome_cli = $res[0]['nome'];
}else{
	$nome_cli = 'Diversos';
}

$total_venda = 0;
$query_con = $pdo->query("SELECT * FROM itens_compra WHERE id_compra = 0 and usuario = '$id_usuario' order by id desc");
$res = $query_con->fetchAll(PDO::FETCH_ASSOC);
$total_reg = @count($res);
if($total_reg > 0){ 
	for($i=0; $i < $total_reg; $i++){
	foreach ($res[$i] as $key => $value){	}

		$valor_total_item = $res[$i]['total'];
		$total_venda += $valor_total_item;
	}
		
}else{
	$result = json_encode(array('mensagem'=>'Não é possível fechar a compra sem itens!', 'sucesso'=>false));
echo $result;
	exit();
}


//RECUPERAR O CAIXA QUE ESTÁ ABERTO (CASO TENHA ALGUM)
$query2 = $pdo->query("SELECT * FROM caixa WHERE status = 'Aberto'");
$res2 = $query2->fetchAll(PDO::FETCH_ASSOC);
if(@count($res2) > 0){
	$caixa_aberto = $res2[0]['id'];
}else{
	$caixa_aberto = 0;
}



$query = $pdo->prepare("INSERT INTO compras set valor = '$subtotal', usuario = '$id_usuario', pagamento = :pagamento, lancamento = :lancamento, data_lanc = CurDate(), data_pgto = :data, parcelas = :parcelas, status = '$status', cliente = :cliente");



$query->bindValue(":pagamento", "$pagamento");
$query->bindValue(":lancamento", "$lancamento");
$query->bindValue(":data", "$data");
$query->bindValue(":parcelas", "$parcelas");
$query->bindValue(":cliente", "$cliente");
$query->execute();
$id_ult_registro = $pdo->lastInsertId();

$descricao_conta = 'Compra - '.$nome_cli;
if($status == 'Concluída'){
	
	$pdo->query("INSERT INTO movimentacoes set tipo = 'Saída', movimento = 'Compra', descricao = '$descricao_conta', valor = '$subtotal', usuario = '$id_usuario', data = curDate(), lancamento = '$lancamento', plano_conta = 'Compra ', documento = '$pagamento', caixa_periodo = '$caixa_aberto', id_mov = '$id_ult_registro'");
}else{
	if($parcelas > 1){
		$query = $pdo->query("UPDATE contas_pagar set cliente = '$cliente', saida = '$lancamento', documento = '$pagamento', plano_conta = 'Compra - Empresa', frequencia = 'Uma Vez', usuario_lanc = '$id_usuario', status = 'Pendente', data_recor = curDate(), id_compra = '$id_ult_registro' WHERE id_compra = '-1' and usuario_lanc = '$id_usuario'");
	}else{
		$query = $pdo->query("INSERT INTO contas_pagar set descricao = '$descricao_conta', cliente = '$cliente', saida = '$lancamento', documento = '$pagamento', plano_conta = 'Compra - Empresa', data_emissao = curDate(), vencimento = '$data', frequencia = 'Uma Vez', valor = '$subtotal', usuario_lanc = '$id_usuario', status = 'Pendente', data_recor = curDate(), id_compra = '$id_ult_registro', arquivo = 'sem-foto.jpg'");
	}
}



$query_con = $pdo->query("SELECT * FROM itens_compra WHERE id_compra = 0 and usuario = '$id_usuario' order by id desc");
$res = $query_con->fetchAll(PDO::FETCH_ASSOC);
$total_reg = @count($res);
if($total_reg > 0){ 
	for($i=0; $i < $total_reg; $i++){
	foreach ($res[$i] as $key => $value){	}

		$pdo->query("UPDATE itens_compra set id_compra = '$id_ult_registro' where id_compra = 0 and usuario = '$id_usuario'");
	}
		
}



$result = json_encode(array('mensagem'=>'Salvo com sucesso!', 'sucesso'=>true));
echo $result;

?>