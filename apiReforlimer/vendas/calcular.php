<?php 
require_once("../conexao.php");

$postjson = json_decode(file_get_contents('php://input'), true);

$acrescimo = @$postjson['acrescimo'];
$acrescimo = str_replace(',', '.', $acrescimo);

$desconto = @$postjson['desconto'];
$desconto = str_replace(',', '.', $desconto);

$subtotal = @$postjson['subtotal'];

$subtotal = $subtotal + $acrescimo - $desconto;

$result = json_encode(array('mensagem'=>$subtotal, 'sucesso'=>true));
echo $result;

?>