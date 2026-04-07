<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$plano = @$_GET['plano'];

if($plano == ""){
$query = $pdo->query("SELECT * FROM cat_despesas order by nome asc LIMIT 1");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$id_cat = $res[0]['id'];
}else{
$query = $pdo->query("SELECT * FROM cat_despesas where nome = '$plano'");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$id_cat = $res[0]['id'];	
}


$query = $pdo->prepare("SELECT * FROM despesas where cat_despesa = '$id_cat' order by id asc");
$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);

for ($i=0; $i < count($res); $i++) { 
    foreach ($res[$i] as $key => $value) {
    }

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