<?php 

include_once('../conexao.php');

// mesmo limite de estoque baixo usado em listar_estoque.php
$nivel_minimo_estoque = 3;

$postjson = json_decode(file_get_contents('php://input'), true);

$buscar = '%' .@$_GET['buscar']. '%';

$query = $pdo->prepare("SELECT * from produtos where estoque < '$nivel_minimo_estoque' and (nome LIKE '$buscar' or codigo LIKE '$buscar') order by id desc");

$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);

for ($i=0; $i < count($res); $i++) { 
    foreach ($res[$i] as $key => $value) {  }

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
    $result = json_encode(array('success'=>true, 'itens'=>$dados));
}else{
    $result = json_encode(array('success'=>false, 'resultado'=>'0'));
}

echo $result;

?>