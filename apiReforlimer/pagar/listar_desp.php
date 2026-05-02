<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$plano = isset($_GET['plano']) ? trim((string)$_GET['plano']) : '';

if($plano == ""){
    $query = $pdo->prepare("SELECT id FROM cat_despesas ORDER BY nome ASC LIMIT 1");
    $query->execute();
}else{
    $query = $pdo->prepare("SELECT id FROM cat_despesas WHERE nome = :plano LIMIT 1");
    $query->execute([':plano' => $plano]);
}

$res = $query->fetchAll(PDO::FETCH_ASSOC);
$id_cat = (count($res) > 0) ? $res[0]['id'] : 0;


$query = $pdo->prepare("SELECT * FROM despesas WHERE cat_despesa = :id_cat ORDER BY id ASC");
$query->execute([':id_cat' => $id_cat]);

$res = $query->fetchAll(PDO::FETCH_ASSOC);

for ($i=0; $i < count($res); $i++) { 
    $dados[] = array(
        'id' => $res[$i]['id'],
        'nome' => $res[$i]['nome'],
    );
}

if(count($res) > 0){
    $result = json_encode(array('success'=>true, 'resultado'=>$dados));
}else{
    $result = json_encode(array('success'=>false, 'resultado'=>'0'));
}

echo $result;

?>