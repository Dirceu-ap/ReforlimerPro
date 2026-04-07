<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$limite = (isset($_GET['limite'])) ? $_GET['limite'] : 5; 
$pagina = (isset($_GET['pagina'])) ? $_GET['pagina'] : 1; 

$inicio = ($limite * $pagina) - $limite; 

$query = $pdo->prepare("SELECT * FROM produtos where ativo = 'Sim' and estoque > 0 ORDER BY id DESC LIMIT $inicio, $limite");

$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);

for ($i=0; $i < count($res); $i++) { 
	$cat = $res[$i]['categoria'];
	$query1 = $pdo->query("SELECT * from cat_produtos where id = '$cat' ");
		$res1 = $query1->fetchAll(PDO::FETCH_ASSOC);
		if(@count($res1) > 0){
			$nome_cat = $res1[0]['nome'];
		}else{
			$nome_cat = 'Sem Categoria';
		}

    $dados[] = array(
        'id' => $res[$i]['id'],
        'codigo' => $res[$i]['codigo'],
		'nome' => $res[$i]['nome'],
		'descricao' => $res[$i]['descricao'],
		'estoque' => $res[$i]['estoque'],
		'valor_compra' => $res[$i]['valor_compra'],
		'valor_venda' => $res[$i]['valor_venda'],
		'fornecedor' => $res[$i]['fornecedor'],
		'categoria' => $nome_cat,
		'foto' => $res[$i]['foto'],
		'ativo' => $res[$i]['ativo'],
		'lucro' => $res[$i]['lucro'],
    );
}



if(count($res) > 0){
    $result = json_encode(array('success'=>true, 'resultado'=>@$dados, 'totalItems'=>@count($dados) + ($inicio)));
}else{
    $result = json_encode(array('success'=>false, 'resultado'=>'0'));
}

echo $result;

?>