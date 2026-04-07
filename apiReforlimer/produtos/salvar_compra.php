<?php 

require_once("../conexao.php");
$pagina = 'produtos';

$postjson = json_decode(file_get_contents('php://input'), true);

$id = @$postjson['id'];
$lucro = @$postjson['lucro'];
$forn = @$postjson['forn'];
$valor_custo = @$postjson['valor_custo'];
$valor_custo = str_replace(',', '.', $valor_custo);
$alterar = @$postjson['alterarValor'];
$quantidade = @$postjson['quantidade'];
$total_compra = $valor_custo * $quantidade;
$user = @$postjson['user'];

$total_estoque = 0;
$query_con = $pdo->query("SELECT * FROM $pagina WHERE id = '$id'");
$res_con = $query_con->fetchAll(PDO::FETCH_ASSOC);
$estoque = $res_con[0]['estoque'];
$valor_venda = $res_con[0]['valor_venda'];

$query_con = $pdo->query("SELECT * FROM fornecedores WHERE id = '$forn'");
$res_con = $query_con->fetchAll(PDO::FETCH_ASSOC);
$nome_forn = $res_con[0]['nome'];

if($lucro != "" and $alterar == 'Sim'){
	$novo_vlr_venda = $valor_custo + ($valor_custo * $lucro / 100);
}else{
	$novo_vlr_venda = $valor_venda;
}


$total_estoque = $estoque + $quantidade;

$query = $pdo->prepare("UPDATE $pagina SET estoque = :estoque, valor_compra = :valor_compra, fornecedor = :fornecedor, valor_venda = :valor_venda, lucro = :lucro where id = '$id'");
$query->bindValue(":estoque", "$total_estoque");
$query->bindValue(":valor_compra", "$valor_custo");
$query->bindValue(":fornecedor", "$forn");
$query->bindValue(":valor_venda", "$novo_vlr_venda");
$query->bindValue(":lucro", "$lucro");
$query->execute();


//LANÇAR NAS CONTAS A PAGAR
$query = $pdo->prepare("INSERT INTO contas_pagar SET descricao = 'Fornecedor - $nome_forn', plano_conta = 'Compra - Empresa', data_emissao = curDate(), vencimento = curDate(), valor = :valor_compra, frequencia = 'Uma Vez', saida = 'Caixa', documento = 'Dinheiro', usuario_lanc = '$user', status = 'Pendente', arquivo = 'sem-foto.jpg'");


$query->bindValue(":valor_compra", "$total_compra");
$query->execute();

$result = json_encode(array('mensagem'=>'Salvo com sucesso!', 'sucesso'=>true));

echo $result;

?>