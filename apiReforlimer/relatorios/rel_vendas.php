<?php 

require_once("../conexao.php"); 
@session_start();

$dataInicial = $_POST['dataInicial'];
$dataFinal = $_POST['dataFinal'];


$html = file_get_contents($url."rel/rel_vendas_html.php?dataInicial=$dataInicial&dataFinal=$dataFinal");
echo $html;


?>