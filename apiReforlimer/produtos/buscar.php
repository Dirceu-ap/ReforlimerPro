<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$limite = (isset($_GET['limite'])) ? intval($_GET['limite']) : 5; 
$pagina = (isset($_GET['pagina'])) ? intval($_GET['pagina']) : 1; 

if ($limite <= 0) $limite = 5;
if ($pagina <= 0) $pagina = 1;

$inicio = ($limite * $pagina) - $limite; 

$query = $pdo->prepare("SELECT p.id, p.codigo, p.nome, p.descricao, p.estoque, p.valor_compra, p.valor_venda, p.fornecedor, p.foto, p.ativo, p.lucro, COALESCE(c.nome, 'Sem Categoria') AS categoria_nome
                        FROM produtos p
                        LEFT JOIN cat_produtos c ON c.id = p.categoria
                        ORDER BY p.ativo DESC, p.id DESC
                        LIMIT :inicio, :limite");

$query->bindValue(':inicio', $inicio, PDO::PARAM_INT);
$query->bindValue(':limite', $limite, PDO::PARAM_INT);

$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);

$dados = []; // Inicializar array vazio

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
    $result = json_encode(array(
        'success' => true, 
        'resultado' => $dados, 
        'totalItems' => count($dados) + $inicio
    ));
}else{
    // Retornar array vazio ao invés de string "0"
    $result = json_encode(array(
        'success' => false, 
        'resultado' => [], // Array vazio ao invés de "0"
        'mensagem' => 'Nenhum produto encontrado'
    ));
}

echo $result;

?>