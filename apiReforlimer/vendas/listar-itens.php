<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$id_usuario = isset($_GET['user']) ? trim((string)$_GET['user']) : '';
$data_atual = date('Y-m-d');


$query = $pdo->query("DELETE FROM contas_receber where id_venda = '-1' and usuario_lanc = '$id_usuario'");

$total_venda = 0;
$total_vendaF = 0;
$query_con = $pdo->query("SELECT iv.*, p.nome AS nome_produto, p.foto AS foto_produto, p.estoque AS estoque_produto
						  FROM itens_venda iv
						  LEFT JOIN produtos p ON p.id = iv.produto
						  WHERE iv.id_venda = 0 AND iv.usuario = '$id_usuario'
						  ORDER BY iv.id DESC");
$res = $query_con->fetchAll(PDO::FETCH_ASSOC);
$total_reg = count($res);
if($total_reg > 0){ 
	for($i=0; $i < $total_reg; $i++){
	foreach ($res[$i] as $key => $value){	}

		$id_venda = $res[$i]['id'];
		$quantidade = $res[$i]['quantidade'];
		$valor = $res[$i]['valor'];
		$valor_total_item = $res[$i]['total'];
		$valor_total_itemF =  number_format($valor_total_item, 2, ',', '.');

		$total_venda += $valor_total_item;
		$total_vendaF =  number_format($total_venda, 2, ',', '.');

$nome_produto = isset($res[$i]['nome_produto']) ? $res[$i]['nome_produto'] : '';
$foto_produto = isset($res[$i]['foto_produto']) ? $res[$i]['foto_produto'] : '';
$estoque_produto = isset($res[$i]['estoque_produto']) ? $res[$i]['estoque_produto'] : 0;


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