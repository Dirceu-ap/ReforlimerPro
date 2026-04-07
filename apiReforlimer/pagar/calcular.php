<?php 
require_once("../conexao.php");
$pagina = 'contas_pagar';

$postjson = json_decode(file_get_contents('php://input'), true);

$id = @$postjson['id'];
$valor = @$postjson['valor'];
$valor = str_replace(',', '.', $valor);

$multa = @$postjson['multa'];
$multa = str_replace(',', '.', $multa);

$juros = @$postjson['juros'];
$juros = str_replace(',', '.', $juros);

$desconto = @$postjson['desconto'];
$desconto = str_replace(',', '.', $desconto);

$subtotal = $valor + $multa + $juros - $desconto;

$result = json_encode(array('mensagem'=>$subtotal, 'sucesso'=>true));
echo $result;

?>