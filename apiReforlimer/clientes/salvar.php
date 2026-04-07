<?php 

require_once("../conexao.php");
$pagina = 'clientes';

$postjson = json_decode(file_get_contents('php://input'), true);

$id = @$postjson['id'];
$nome = @$postjson['nome'];
$telefone = @$postjson['celular'];
$email = @$postjson['email'];
$endereco = @$postjson['endereco'];
$ativo = @$postjson['ativo'];
$cpf = @$postjson['cpf'];
$pessoa = @$postjson['pessoa'];
$obs = @$postjson['obs'];
$conta = @$postjson['conta'];
$agencia = @$postjson['agencia'];
$banco = @$postjson['banco'];

$data = date('Y-m-d');


//VALIDAR CAMPO
$query = $pdo->query("SELECT * from $pagina where doc = '$cpf'");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$total_reg = @count($res);
$id_reg = @$res[0]['id'];
if($total_reg > 0 and $id_reg != $id){
	
	$result = json_encode(array('mensagem'=>'CPF já Cadastrado!', 'sucesso'=>false));
	echo $result;
	exit();
}

if($id == "" || $id == "0"){
	$res = $pdo->prepare("INSERT INTO $pagina SET nome = :nome, telefone = :telefone, email = :email, endereco = :endereco, ativo = :ativo, pessoa = :pessoa, doc = :cpf, obs = :obs, data = curDate(), conta = :conta, agencia = :agencia, banco = :banco");
}else{
	$res = $pdo->prepare("UPDATE $pagina SET nome = :nome, telefone = :telefone, email = :email, endereco = :endereco, ativo = :ativo, pessoa = :pessoa, doc = :cpf, obs = :obs, data = curDate(), conta = :conta, agencia = :agencia, banco = :banco WHERE id = '$id'");
}


$res->bindValue(":nome", $nome);
$res->bindValue(":telefone", $telefone);
$res->bindValue(":email", $email);
$res->bindValue(":endereco", $endereco);
$res->bindValue(":ativo", $ativo);
$res->bindValue(":cpf", $cpf);
$res->bindValue(":obs", $obs);
$res->bindValue(":pessoa", $pessoa);
$res->bindValue(":conta", $conta);
$res->bindValue(":agencia", $agencia);
$res->bindValue(":banco", $banco);

@$res->execute();

$result = json_encode(array('mensagem'=>'Salvo com sucesso!', 'sucesso'=>true));

echo $result;

?>