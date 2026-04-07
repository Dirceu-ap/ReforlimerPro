<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$id = @$_GET['id'];

$query = $pdo->prepare("SELECT * from produtos where id = '$id'");

$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);

for ($i=0; $i < count($res); $i++) { 
    foreach ($res[$i] as $key => $value) {
    }

    $cat = $res[$i]['categoria'];
    $query1 = $pdo->query("SELECT * from cat_produtos where id = '$cat' ");
        $res1 = $query1->fetchAll(PDO::FETCH_ASSOC);
        if(@count($res1) > 0){
            $nome_cat = $res1[0]['nome'];
        }else{
            $nome_cat = 'Sem Categoria';
        }

    $dados = array(
        'id' => $res[$i]['id'],
        'codigo' => $res[$i]['codigo'],
        'nome' => $res[$i]['nome'],
        'descricao' => $res[$i]['descricao'],
        'estoque' => $res[$i]['estoque'],
        'valor_compra' => $res[$i]['valor_compra'],
        'valor_venda' => $res[$i]['valor_venda'],
        'fornecedor' => $res[$i]['fornecedor'],
        'categoria' => $cat,
        // campos adicionais usados na tela de edição
        'unidade' => isset($res[$i]['unidade']) ? $res[$i]['unidade'] : null,
        'rendimento_por_unidade_m2' => isset($res[$i]['rendimento_por_unidade_m2']) ? $res[$i]['rendimento_por_unidade_m2'] : null,
        'ativo' => $res[$i]['ativo'],
        'lucro' => $res[$i]['lucro'],
        'foto' => $res[$i]['foto'],
        'nomeFoto' => $res[$i]['foto'],
    );

      
}

if(count($res) > 0){
    $result = json_encode(array('success'=>true, 'dados'=>$dados));
}else{
    $result = json_encode(array('success'=>false, 'resultado'=>'0'));
}

echo $result;

?>