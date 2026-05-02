<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$buscarTermo = trim((string)($_GET['buscar'] ?? ''));
$buscar = '%' . $buscarTermo . '%';

$query = $pdo->prepare("SELECT cp.id, cp.nome, COALESCE(p.total_produtos, 0) AS produtos
                        FROM cat_produtos cp
                        LEFT JOIN (
                            SELECT categoria, COUNT(*) AS total_produtos
                            FROM produtos
                            GROUP BY categoria
                        ) p ON p.categoria = cp.id
                        WHERE cp.nome LIKE :buscar
                        ORDER BY cp.nome ASC");
$query->bindValue(':buscar', $buscar, PDO::PARAM_STR);

$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);
$dados = array();

for ($i=0; $i < count($res); $i++) { 
    $dados[] = array(
       'id' => $res[$i]['id'],
        'nome' => $res[$i]['nome'],
        'produtos' => $res[$i]['produtos'],
    );
}

if(count($res) > 0){
    $result = json_encode(array('success'=>true, 'itens'=>$dados));
}else{
    $result = json_encode(array('success'=>false, 'resultado'=>'0'));
}

echo $result;

?>