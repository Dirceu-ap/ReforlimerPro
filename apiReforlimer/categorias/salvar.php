<?php 

require_once("../conexao.php");
$pagina = 'cat_produtos';

$postjson = json_decode(file_get_contents('php://input'), true);

$id = @$postjson['id'];
$nome = @$postjson['nome'];

$data = date('Y-m-d');


//VALIDAR CAMPO
$query = $pdo->query("SELECT * from $pagina where nome = '$nome'");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$total_reg = @count($res);
$id_reg = @$res[0]['id'];
if($total_reg > 0 and $id_reg != $id){
	
	$result = json_encode(array('mensagem'=>'Categoria já Cadastrada!', 'sucesso'=>false));
	echo $result;
	exit();
}

if($id == "" || $id == "0"){
	$res = $pdo->prepare("INSERT INTO $pagina SET nome = :nome");
}else{
	$res = $pdo->prepare("UPDATE $pagina SET nome = :nome WHERE id = '$id'");
}


$res->bindValue(":nome", $nome);

@$res->execute();

$result = json_encode(array('mensagem'=>'Salvo com sucesso!', 'sucesso'=>true));

echo $result;

?>