<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$id_usuario = @$_GET['user'];
$data_atual = date('Y-m-d');


$query = $pdo->query("DELETE FROM contas_pagar where id_compra = '-1' and usuario_lanc = '$id_usuario'");

$total_venda = 0;
$total_vendaF = 0;
$query_con = $pdo->query("SELECT * FROM itens_compra WHERE id_compra = 0 and usuario = '$id_usuario' order by id desc");
$res = $query_con->fetchAll(PDO::FETCH_ASSOC);
$total_reg = @count($res);
if($total_reg > 0){ 
	for($i=0; $i < $total_reg; $i++){
	foreach ($res[$i] as $key => $value){	}

		$id_venda = $res[$i]['id'];
		$id_item = $res[$i]['produto'];
		$quantidade = $res[$i]['quantidade'];
		$valor = $res[$i]['valor'];
		$valor_total_item = $res[$i]['total'];
		$valor_total_itemF =  number_format($valor_total_item, 2, ',', '.');

		$total_venda += $valor_total_item;
		$total_vendaF =  number_format($total_venda, 2, ',', '.');

$query2 = $pdo->query("SELECT * FROM produtos where id = '$id_item'");
$res2 = $query2->fetchAll(PDO::FETCH_ASSOC);
$valor_produto = $res2[0]['valor_venda'];
$nome_produto = $res2[0]['nome'];
$foto_produto = $res2[0]['foto'];
$estoque_produto = $res2[0]['estoque'];

    $dados[] = array(
        'id' => $res[$i]['id'],        
		'nome' => $nome_produto,		
		'estoque' => $estoque_produto,		
		'valor' => $valor_total_itemF,
		'quantidade' => $quantidade,
		'foto' => $foto_produto,
		
    );
}

}



if(count($res) > 0){
    $result = json_encode(array('success'=>true, 'resultado'=>@$dados, 'total_venda'=>@$total_vendaF, 'totalItems'=>@count($dados)));
}else{
    $result = json_encode(array('success'=>false, 'resultado'=>'0'));
}

echo $result;

?>