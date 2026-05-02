<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$limite = (isset($_GET['limite'])) ? intval($_GET['limite']) : 50; 
$pagina = (isset($_GET['pagina'])) ? intval($_GET['pagina']) : 1; 

if ($limite <= 0) $limite = 50;
if ($pagina <= 0) $pagina = 1;

$inicio = ($limite * $pagina) - $limite; 

$query = $pdo->prepare("SELECT id, nome, telefone, email, ativo, funcao, salario_diario FROM colaboradores ORDER BY ativo DESC, id DESC LIMIT :inicio, :limite");

$query->bindValue(':inicio', $inicio, PDO::PARAM_INT);
$query->bindValue(':limite', $limite, PDO::PARAM_INT);

$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);

$dados = array();

for ($i = 0; $i < count($res); $i++) { 
    $dados[] = array(
        'id'             => $res[$i]['id'],
        'nome'           => $res[$i]['nome'],
        'telefone'       => isset($res[$i]['telefone']) ? $res[$i]['telefone'] : null,
        'email'          => isset($res[$i]['email']) ? $res[$i]['email'] : null,
        'ativo'          => isset($res[$i]['ativo']) ? $res[$i]['ativo'] : null,
        'funcao'         => isset($res[$i]['funcao']) ? $res[$i]['funcao'] : null,
        'salario_diario' => isset($res[$i]['salario_diario']) ? $res[$i]['salario_diario'] : null,
    );
}

if (count($res) > 0) {
    $result = json_encode(array(
        'success'    => true,
        'resultado'  => $dados,
        'totalItems' => count($dados) + $inicio,
    ));
} else {
    $result = json_encode(array(
        'success'   => false,
        'resultado' => '0',
    ));
}

echo $result;

?>
