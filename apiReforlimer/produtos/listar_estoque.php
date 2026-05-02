<?php 

include_once('../conexao.php');

// nível mínimo de estoque para considerar "estoque baixo"
// (pode ajustar este valor se quiser outro limite)
$nivel_minimo_estoque = 3;

$postjson = json_decode(file_get_contents('php://input'), true);

$limite = (isset($_GET['limite'])) ? intval($_GET['limite']) : 5; 
$pagina = (isset($_GET['pagina'])) ? intval($_GET['pagina']) : 1; 

if ($limite <= 0) $limite = 5;
if ($pagina <= 0) $pagina = 1;

$inicio = ($limite * $pagina) - $limite; 

$query = $pdo->prepare("SELECT p.id, p.codigo, p.nome, p.descricao, p.estoque, p.valor_compra, p.valor_venda, p.fornecedor, p.foto, p.ativo, p.lucro, COALESCE(c.nome, 'Sem Categoria') AS categoria_nome
                        FROM produtos p
                        LEFT JOIN cat_produtos c ON c.id = p.categoria
                        WHERE p.estoque < :nivelMinimo
                        ORDER BY p.ativo DESC, p.id DESC
                        LIMIT :inicio, :limite");

$query->bindValue(':inicio', $inicio, PDO::PARAM_INT);
$query->bindValue(':limite', $limite, PDO::PARAM_INT);

$query->bindValue(':nivelMinimo', $nivel_minimo_estoque);

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
    $result = json_encode(array('success'=>true, 'resultado'=>$dados, 'totalItems'=>count($dados) + ($inicio)));
}else{
    $result = json_encode(array('success'=>false, 'resultado'=>'0'));
}

echo $result;

?>