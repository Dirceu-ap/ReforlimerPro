<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$buscar = '%' .@$_GET['buscar']. '%';

$query = $pdo->prepare("SELECT * from cat_produtos where nome LIKE '$buscar' order by nome ASC");

$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);

for ($i=0; $i < count($res); $i++) { 
    foreach ($res[$i] as $key => $value) {  }

        $id = $res[$i]['id'];
$query2 = $pdo->query("SELECT * from produtos where categoria = '$id'");
$res2 = $query2->fetchAll(PDO::FETCH_ASSOC);
$total_produtos = @count($res2);

    $dados[] = array(
       'id' => $res[$i]['id'],
        'nome' => $res[$i]['nome'],
        'produtos' => $total_produtos,
    );
}

if(count($res) > 0){
    $result = json_encode(array('success'=>true, 'itens'=>$dados));
}else{
    $result = json_encode(array('success'=>false, 'resultado'=>'0'));
}

echo $result;

?>