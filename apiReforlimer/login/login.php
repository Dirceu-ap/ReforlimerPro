<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents("php://input"), true);

$email = trim((string)($postjson['email'] ?? ''));
$senha = trim((string)($postjson['senha'] ?? ''));

$stmt = $pdo->prepare("SELECT id, nome, email FROM usuarios WHERE email = :email AND senha = :senha LIMIT 1");
$stmt->bindValue(':email', $email, PDO::PARAM_STR);
$stmt->bindValue(':senha', $senha, PDO::PARAM_STR);
$stmt->execute();

$dados_buscar = $stmt->fetchAll(PDO::FETCH_ASSOC);

for ($i=0; $i < count($dados_buscar); $i++) { 
    $dados[] = array(
        'id' => intVal($dados_buscar[$i]['id']),
        'nome' => $dados_buscar[$i]['nome'],  
        'email' => $dados_buscar[$i]['email'],  
    );
}

if(@count($dados_buscar) > 0){
    $result = json_encode(array('result'=>$dados));
    echo $result;
}else{
    $result = json_encode(array('success'=>'Dados Incorretos!'));
 	echo $result;
}

?>