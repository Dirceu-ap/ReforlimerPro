<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$buscarTermo = trim((string)($_GET['buscar'] ?? ''));
$buscar = '%' . $buscarTermo . '%';

$query = $pdo->prepare("SELECT id, nome, telefone, email, ativo FROM fornecedores WHERE nome LIKE :buscar OR email LIKE :buscar ORDER BY nome ASC");
$query->bindValue(':buscar', $buscar, PDO::PARAM_STR);

$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);
$dados = array();

for ($i=0; $i < count($res); $i++) { 
    $dados[] = array(
        'id' => $res[$i]['id'],
        'nome' => $res[$i]['nome'],
        'telefone' => $res[$i]['telefone'],
        'email' => $res[$i]['email'],
        'ativo' => $res[$i]['ativo'],
    );
}

if(count($res) > 0){
    $result = json_encode(array('success'=>true, 'itens'=>$dados));
}else{
    $result = json_encode(array('success'=>false, 'resultado'=>'0'));
}

echo $result;

?>