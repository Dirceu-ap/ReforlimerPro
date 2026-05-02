<?php 

include_once('../conexao.php');

// mesmo limite de estoque baixo usado em listar_estoque.php
$nivel_minimo_estoque = 3;

$postjson = json_decode(file_get_contents('php://input'), true);

$buscarTermo = trim((string)($_GET['buscar'] ?? ''));
$buscar = '%' . $buscarTermo . '%';

$query = $pdo->prepare("SELECT p.id, p.codigo, p.nome, p.descricao, p.estoque, p.valor_compra, p.valor_venda, p.fornecedor, p.foto, p.ativo, p.lucro, COALESCE(c.nome, 'Sem Categoria') AS categoria_nome
                        FROM produtos p
                        LEFT JOIN cat_produtos c ON c.id = p.categoria
                        WHERE p.estoque < :nivelMinimo
                          AND (p.nome LIKE :buscar OR p.codigo LIKE :buscar)
                        ORDER BY p.id DESC");

$query->bindValue(':nivelMinimo', $nivel_minimo_estoque);
$query->bindValue(':buscar', $buscar, PDO::PARAM_STR);

$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);
$dados = array();

for ($i=0; $i < count($res); $i++) { 
    $dados[] = array(
        'id' => $res[$i]['id'],
        'codigo' => $res[$i]['codigo'],
        'nome' => $res[$i]['nome'],
        'descricao' => $res[$i]['descricao'],
        'estoque' => $res[$i]['estoque'],
        'valor_compra' => $res[$i]['valor_compra'],
        'valor_venda' => $res[$i]['valor_venda'],
        'fornecedor' => $res[$i]['fornecedor'],
        'categoria' => $res[$i]['categoria_nome'],
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