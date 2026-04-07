<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$id = @$_GET['id'];
$quant = @$_GET['quant'];
$funcao = @$_GET['funcao'];

$query = $pdo->query("SELECT * from itens_compra where id = '$id' ");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$produto = $res[0]['produto'];
$quantidade = $res[0]['quantidade'];

$query = $pdo->query("SELECT * from produtos where id = '$produto' ");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$estoque = $res[0]['estoque'];
$valor = $res[0]['valor_compra'];

//devolver ou remover prod no estoque
if($funcao == 'remover'){
	$novo_estoque = $estoque - $quant;
	$nova_quant = $quantidade - $quant;
	$total = $nova_quant * $valor;
}else if($funcao == 'add'){
	$novo_estoque = $estoque + $quant;
	$nova_quant = $quantidade + $quant;
	$total = $nova_quant * $valor;
}else{
	if($quant > $quantidade){
		$novo_estoque = $estoque - $quantidade;
		$novo_estoque = $novo_estoque + $quant;
		$nova_quant = $quant;
		$total = $nova_quant * $valor;
	}else{
		$novo_estoque = $quantidade - $quant;
		$novo_estoque = $estoque - $novo_estoque;
		$nova_quant = $quant;
		$total = $nova_quant * $valor;
	}
	
}

$query = $pdo->query("UPDATE produtos set estoque = '$novo_estoque' where id = '$produto' ");

$query = $pdo->query("UPDATE itens_compra SET quantidade = '$nova_quant', total = '$total' where id = '$id'");

$result = json_encode(array('mensagem'=>$nova_quant));
echo $result;

?>