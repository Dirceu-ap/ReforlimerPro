<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$id = @$_GET['id'];

$query = $pdo->query("SELECT * from itens_venda where id = '$id' ");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$produto = $res[0]['produto'];
$quant = $res[0]['quantidade'];

$query = $pdo->query("SELECT * from produtos where id = '$produto' ");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$estoque = $res[0]['estoque'];


//devolver prod no estoque
$novo_estoque = $estoque + $quant;
$query = $pdo->query("UPDATE produtos set estoque = '$novo_estoque' where id = '$produto' ");

$query = $pdo->query("DELETE from itens_venda where id = '$id'");

?>