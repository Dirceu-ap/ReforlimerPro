<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$id = @$_GET['id'];

$pdo->query("DELETE from fornecedores where id = '$id'");

?>