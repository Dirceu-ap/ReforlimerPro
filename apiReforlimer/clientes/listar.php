<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$limite = (isset($_GET['limite'])) ? intval($_GET['limite']) : 1000; 
$pagina = (isset($_GET['pagina'])) ? intval($_GET['pagina']) : 1; 

if ($limite <= 0) $limite = 1000;
if ($pagina <= 0) $pagina = 1;

$inicio = ($limite * $pagina) - $limite; 

// Retorna até 1000 clientes por página por padrão, ordenados alfabeticamente pelo nome.
// Isso garante que telas como NovoOrcamento, que não usam paginação, recebam praticamente todos
// os clientes cadastrados em uma única chamada.
$query = $pdo->prepare("SELECT id, nome, telefone, email, ativo FROM clientes ORDER BY nome ASC LIMIT :inicio, :limite");

$query->bindValue(':inicio', $inicio, PDO::PARAM_INT);
$query->bindValue(':limite', $limite, PDO::PARAM_INT);

$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);

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
    $result = json_encode(array('success'=>true, 'resultado'=>$dados, 'totalItems'=>count($dados) + ($inicio)));
}else{
    $result = json_encode(array('success'=>false, 'resultado'=>'0'));
}

echo $result;

?>