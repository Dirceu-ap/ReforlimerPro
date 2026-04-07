<?php 
require_once("../conexao.php");
$pagina = 'contas_receber';

$postjson = json_decode(file_get_contents('php://input'), true);

$id = @$postjson['id'];
$qtd_parcelas = @$postjson['parcelas'];
$frequencia = @$postjson['frequencia'];


$query = $pdo->query("SELECT * from $pagina where id = '$id' ");
$res = $query->fetchAll(PDO::FETCH_ASSOC);


$id = $res[0]['id'];
$cp1 = $res[0]['descricao'];
$cp2 = $res[0]['cliente'];
$cp3 = $res[0]['entrada'];
$cp4 = $res[0]['documento'];
$cp5 = $res[0]['plano_conta'];
$cp6 = $res[0]['data_emissao'];
$cp7 = $res[0]['vencimento'];
$cp8 = $res[0]['frequencia'];
$cp9 = $res[0]['valor'];
$cp10 = $res[0]['usuario_lanc'];
$cp11 = $res[0]['usuario_baixa'];
$cp13 = $res[0]['status'];


$query1 = $pdo->query("SELECT * from frequencias where nome = '$frequencia' ");
$res1 = $query1->fetchAll(PDO::FETCH_ASSOC);
$dias_frequencia = $res1[0]['dias'];


for($i=1; $i <= $qtd_parcelas; $i++){

	$nova_descricao = $cp1 . ' - Parcela '.$i;
	$novo_valor = $cp9 / $qtd_parcelas;
	$dias_parcela = $i - 1;
	$dias_parcela_2 = ($i - 1) * $dias_frequencia;

	if($i == 1){
		$novo_vencimento = $cp7;
	}else{

		if($dias_frequencia == 30 || $dias_frequencia == 31){
			
			$novo_vencimento = date('Y/m/d', strtotime("+$dias_parcela month",strtotime($cp7)));

		}else if($dias_frequencia == 90){ 
			$dias_parcela = $dias_parcela * 3;
			$novo_vencimento = date('Y/m/d', strtotime("+$dias_parcela month",strtotime($cp7)));

		}else if($dias_frequencia == 180){ 

			$dias_parcela = $dias_parcela * 6;
			$novo_vencimento = date('Y/m/d', strtotime("+$dias_parcela month",strtotime($cp7)));

		}else if($dias_frequencia == 360){ 

			$dias_parcela = $dias_parcela * 12;
			$novo_vencimento = date('Y/m/d', strtotime("+$dias_parcela month",strtotime($cp7)));

		}else{
			
			$novo_vencimento = date('Y/m/d', strtotime("+$dias_parcela_2 days",strtotime($cp7)));
		}
		
	}

		
		
		$novo_valor = number_format($novo_valor, 2, ',', '.');
		$novo_valor = str_replace('.', '', $novo_valor);
		$novo_valor = str_replace(',', '.', $novo_valor);
		$resto_conta = $cp9 - $novo_valor * $qtd_parcelas;
		$resto_conta = number_format($resto_conta, 2);
		
		if($i == $qtd_parcelas){
			$novo_valor = $novo_valor + $resto_conta;
		}
		

	$pdo->query("INSERT INTO $pagina set descricao = '$nova_descricao', cliente = '$cp2', entrada = '$cp3', documento = '$cp4', plano_conta = '$cp5', data_emissao = curDate(), vencimento = '$novo_vencimento', frequencia = '$cp8', valor = '$novo_valor', usuario_lanc = '$cp10', status = 'Pendente', data_recor = curDate(), arquivo = 'sem-foto.jpg'");

}

$pdo->query("DELETE from $pagina where id = '$id'");


$result = json_encode(array('mensagem'=>'Salvo com sucesso!', 'sucesso'=>true));

echo $result;

?>