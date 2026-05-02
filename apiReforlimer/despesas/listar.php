<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$limite = (isset($_GET['limite'])) ? intval($_GET['limite']) : 5; 
$pagina = (isset($_GET['pagina'])) ? intval($_GET['pagina']) : 1; 

if ($limite <= 0) $limite = 5;
if ($pagina <= 0) $pagina = 1;

$inicio = ($limite * $pagina) - $limite; 

$query = $pdo->prepare("SELECT id, nome, ativo FROM despesas ORDER BY id DESC LIMIT :inicio, :limite");

$query->bindValue(':inicio', $inicio, PDO::PARAM_INT);
$query->bindValue(':limite', $limite, PDO::PARAM_INT);

$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);
$dados = array();

for ($i=0; $i < count($res); $i++) { 
    $dados[] = array(
        'id' => $res[$i]['id'],
        'nome' => $res[$i]['nome'],
        'ativo' => isset($res[$i]['ativo']) ? $res[$i]['ativo'] : 'sim',
    );
}

if(count($res) > 0){
    $result = json_encode(array('success'=>true, 'resultado'=>$dados, 'totalItems'=>count($dados) + ($inicio)));
}else{
    $result = json_encode(array('success'=>false, 'resultado'=>'0'));
}

echo $result;

?>
