<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$id = @$_GET['id'];

$query = $pdo->query("SELECT * from produtos where categoria = '$id'");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$total_reg = @count($res);

if($total_reg == 0){
$pdo->query("DELETE from cat_produtos where id = '$id'");
echo 'Excluído com Sucesso';
}else{
	
	$result = json_encode(array('mensagem'=>'Esta categoria possui produtos associadas a ela, primeiro exclua estes produtos e depois exclua a categoria!', 'sucesso'=>false));
	echo $result;
}

?>