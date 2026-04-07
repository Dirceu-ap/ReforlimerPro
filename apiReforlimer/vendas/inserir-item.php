<?php 
require_once("../conexao.php");
$postjson = json_decode(file_get_contents('php://input'), true);

$id = @$postjson['id'];
$quant = @$postjson['quant'];
$id_usuario = @$postjson['user'];

$query = $pdo->query("SELECT * from produtos where id = '$id' ");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$estoque = $res[0]['estoque'];
$valor = $res[0]['valor_venda'];
$valor_custo = $res[0]['valor_compra'];

$total = $valor * $quant;

if($estoque < $quant){
	$result = json_encode(array('mensagem'=>'Você não tem a quantidade de produtos sufiencientes para venda!', 'sucesso'=>false));
echo $result;
	
	exit();
}


if($valor_custo <= 0){
	$result = json_encode(array('mensagem'=>'O Produto precisa ter um valor de Custo!', 'sucesso'=>false));
echo $result;
	exit();
}
//abater prod no estoque
$novo_estoque = $estoque - $quant;
$query = $pdo->query("UPDATE produtos set estoque = '$novo_estoque' where id = '$id' ");

$query = $pdo->query("INSERT INTO itens_venda set id_venda = 0, produto = '$id', valor = '$valor', quantidade = '$quant', total = '$total', usuario = '$id_usuario', valor_custo = '$valor_custo'");

$result = json_encode(array('mensagem'=>'Salvo com sucesso!', 'sucesso'=>true));
echo $result;

?>