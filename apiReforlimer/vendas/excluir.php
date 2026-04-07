<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$id = @$_GET['id'];
$user = @$_GET['user'];

$query = $pdo->query("SELECT * from usuarios where id = '$user' ");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$nivel = $res[0]['nivel'];

if($nivel == 'Administrador'){
	
//DEVOLVER OS PRODUTOS AO ESTOQUE
$query = $pdo->query("SELECT * from itens_venda where id_venda = '$id' ");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
for($i=0; $i < @count($res); $i++){
	foreach ($res[$i] as $key => $value){}
	$id_prod =  $res[$i]['produto'];
	$quant_prod =  $res[$i]['quantidade'];

$query2 = $pdo->query("SELECT * from produtos where id = '$id_prod' ");
$res2 = $query2->fetchAll(PDO::FETCH_ASSOC);
$estoque = $res2[0]['estoque'];
$novo_estoque = $estoque + $quant_prod;
$query = $pdo->query("UPDATE produtos set estoque = '$novo_estoque' where id = '$id_prod' ");

}


//EXCLUIR DAS CONTAS A RECEBER CASO EXISTA
$pdo->query("DELETE FROM contas_receber where id_venda = '$id'");

//EXCLUIR DAS MOVIMENTAÇÕES CASO EXISTA
$pdo->query("DELETE FROM movimentacoes where id_mov = '$id' and plano_conta = 'Venda'");

$pdo->query("UPDATE vendas set status = 'Cancelada', usuario = '$user' where id = '$id'");

}else{
	$result = json_encode(array('mensagem'=>'Você não tem permissão para cancelar esta venda!', 'sucesso'=>false));
echo $result;
}


?>