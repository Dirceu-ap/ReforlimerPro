<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$id = $_GET['id'] ?? '';

$query = $pdo->prepare("SELECT * FROM colaboradores WHERE id = '$id' ORDER BY nome ASC");

$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);

for ($i = 0; $i < count($res); $i++) { 
    foreach ($res[$i] as $key => $value) {
        // apenas para percorrer o array, se necessário
    }

    $dados = array(
        'id'             => $res[$i]['id'],
        'nome'           => $res[$i]['nome'],
        'telefone'       => $res[$i]['telefone'],
        'email'          => $res[$i]['email'],
        'endereco'       => $res[$i]['endereco'],
        'ativo'          => $res[$i]['ativo'],
        'banco'          => $res[$i]['banco'],
        'conta'          => $res[$i]['conta'],
        'agencia'        => $res[$i]['agencia'],
        'pessoa'         => $res[$i]['pessoa'],
        'cpf'            => $res[$i]['doc'],
        'rg'             => isset($res[$i]['rg']) ? $res[$i]['rg'] : null,
        'pix'            => isset($res[$i]['pix']) ? $res[$i]['pix'] : null,
        'obs'            => $res[$i]['obs'],
        'funcao'         => isset($res[$i]['funcao']) ? $res[$i]['funcao'] : null,
        'salario_diario' => isset($res[$i]['salario_diario']) ? $res[$i]['salario_diario'] : null,
    );
}

if (count($res) > 0) {
    $result = json_encode(array('success' => true, 'dados' => $dados));
} else {
    $result = json_encode(array('success' => false, 'resultado' => '0'));
}

echo $result;

?>
