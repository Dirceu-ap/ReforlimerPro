<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$id = @$_GET['id'];
$user = @$_GET['user'];

$query = $pdo->query("SELECT * from usuarios where id = '$user' ");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$nivel = $res[0]['nivel'];

if($nivel == 'Administrador'){
	//BUSCAR A IMAGEM PARA EXCLUIR DA PASTA
$query_con = $pdo->query("SELECT * FROM contas_receber WHERE id = '$id'");
$res_con = $query_con->fetchAll(PDO::FETCH_ASSOC);
$imagem = $res_con[0]['arquivo'];
if($imagem != 'sem-foto.jpg'){
	@unlink('../../img/contas/'.$imagem);
}

$pdo->query("DELETE from contas_receber where id = '$id'");
}else{
	$result = json_encode(array('mensagem'=>'Você não tem permissão para excluir contas pelo Aplicativo!', 'sucesso'=>false));
echo $result;
}


?>