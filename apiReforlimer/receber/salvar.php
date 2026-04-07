<?php 
require_once("../conexao.php");
$pagina = 'contas_receber';

$postjson = json_decode(file_get_contents('php://input'), true);

$id = @$postjson['id'];
$valor = @$postjson['valor'];
$descricao = @$postjson['descricao'];
$forn = @$postjson['forn'];
$valor = str_replace(',', '.', $valor);
$saida = @$postjson['saida'];
$doc = @$postjson['doc'];
$plano = @$postjson['plano'];
$desp = @$postjson['desp'];
$freq = @$postjson['freq'];
$emissao = @$postjson['emissao'];
$venc = @$postjson['venc'];
$foto = @$postjson['foto'];
$user = @$postjson['user'];
// novo campo de localização da conta (obra/cliente/local físico)
$local = @$postjson['local'];
$devolucao = str_replace(',', '.', @$postjson['devolucao']);
$desconto = str_replace(',', '.', @$postjson['desconto']);
$desconto_perc = str_replace(',', '.', @$postjson['desconto_perc']);
$acrescimo = str_replace(',', '.', @$postjson['acrescimo']);
$acrescimo_perc = str_replace(',', '.', @$postjson['acrescimo_perc']);
$repeticoes = intval(@$postjson['repeticoes']);
if($repeticoes < 1){
	$repeticoes = 1;
}

$plano = $desp . ' - ' .$plano;

function getExistingColumns($pdo, $table){
	try{
		$stmt = $pdo->prepare("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tbl");
		$stmt->bindValue(':tbl', $table);
		$stmt->execute();
		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
		$cols = array();
		for($i = 0; $i < count($rows); $i++){
			$col = isset($rows[$i]['COLUMN_NAME']) ? $rows[$i]['COLUMN_NAME'] : '';
			if($col !== '') $cols[$col] = true;
		}
		return $cols;
	}catch(Exception $e){
		return array();
	}
}

function getDiasFrequencia($pdo, $nomeFrequencia){
	try{
		if($nomeFrequencia == "") return 0;
		$freqNorm = mb_strtolower(trim((string)$nomeFrequencia), 'UTF-8');
		if($freqNorm == 'recorrente' || $freqNorm == 'recorrente (mensal)'){
			return 30;
		}
		$stmt = $pdo->prepare("SELECT dias FROM frequencias WHERE nome = :nome LIMIT 1");
		$stmt->bindValue(':nome', $nomeFrequencia);
		$stmt->execute();
		$row = $stmt->fetch(PDO::FETCH_ASSOC);
		if($row && isset($row['dias'])){
			return intval($row['dias']);
		}
	}catch(Exception $e){
		return 0;
	}
	return 0;
}

function calcDataRecorrencia($dataBase, $diasFrequencia, $indice){
	if($indice <= 0) return $dataBase;

	if($diasFrequencia == 30 || $diasFrequencia == 31){
		return date('Y-m-d', strtotime("+{$indice} month", strtotime($dataBase)));
	}

	if($diasFrequencia == 90){
		$meses = $indice * 3;
		return date('Y-m-d', strtotime("+{$meses} month", strtotime($dataBase)));
	}

	if($diasFrequencia == 180){
		$meses = $indice * 6;
		return date('Y-m-d', strtotime("+{$meses} month", strtotime($dataBase)));
	}

	if($diasFrequencia == 360){
		$meses = $indice * 12;
		return date('Y-m-d', strtotime("+{$meses} month", strtotime($dataBase)));
	}

	$totalDias = $indice * $diasFrequencia;
	return date('Y-m-d', strtotime("+{$totalDias} days", strtotime($dataBase)));
}

/*
if($forn == "" and $descricao == "" ){
	$result = json_encode(array('mensagem'=>'Selecione um Fornecedor ou Coloque uma descrição!', 'sucesso'=>false));
	echo $result;
	exit();
}
*/


if($id == "" || $id == "0"){
	if($foto == ""){
		$foto = 'sem-foto.jpg';
	}

	$res = $pdo->prepare("INSERT INTO $pagina set descricao = :campo1, cliente = :campo2, entrada = :campo3, documento = :campo4, plano_conta = :campo5, data_emissao = :campo6, vencimento = :campo7, frequencia = :campo8, valor = :campo9, usuario_lanc = :campo10, local = :campo11, status = 'Pendente', data_recor = curDate(), arquivo = '$foto'");
}else{

	if($foto == ""){
		$res = $pdo->prepare("UPDATE $pagina SET descricao = :campo1, cliente = :campo2, entrada = :campo3, documento = :campo4, plano_conta = :campo5, data_emissao = :campo6, vencimento = :campo7, frequencia = :campo8, valor = :campo9, usuario_lanc = :campo10, local = :campo11, status = 'Pendente', data_recor = curDate() WHERE id = '$id'");
	}else{

		//BUSCAR A IMAGEM PARA EXCLUIR DA PASTA
		$query_con = $pdo->query("SELECT * FROM contas_receber WHERE id = '$id'");
		$res_con = $query_con->fetchAll(PDO::FETCH_ASSOC);
		$imagem = $res_con[0]['arquivo'];
		if($imagem != 'sem-foto.jpg'){
			@unlink('../../img/contas/'.$imagem);
		}

		$res = $pdo->prepare("UPDATE $pagina SET descricao = :campo1, cliente = :campo2, entrada = :campo3, documento = :campo4, plano_conta = :campo5, data_emissao = :campo6, vencimento = :campo7, frequencia = :campo8, valor = :campo9, usuario_lanc = :campo10, local = :campo11, status = 'Pendente', data_recor = curDate(), arquivo = '$foto' WHERE id = '$id'");
	}
	
}

$res->bindValue(":campo1", "$descricao");
$res->bindValue(":campo2", "$forn");
$res->bindValue(":campo3", "$saida");
$res->bindValue(":campo4", "$doc");
$res->bindValue(":campo5", "$plano");
$res->bindValue(":campo6", "$emissao");
$res->bindValue(":campo7", "$venc");
$res->bindValue(":campo8", "$freq");
$res->bindValue(":campo9", "$valor");
$res->bindValue(":campo10", "$user");
// localização ligada a esta conta (se coluna existir na tabela)
$res->bindValue(":campo11", "$local");

@$res->execute();

$id_salvo = $id;
if($id == "" || $id == "0"){
	$id_salvo = $pdo->lastInsertId();
}

$ids_recorrencia = array();
if($id_salvo != ""){
	$ids_recorrencia[] = $id_salvo;
}

if($id_salvo != ""){
	$camposOpcionais = array(
		'devolucao' => ($devolucao !== "" ? $devolucao : '0'),
		'desconto' => ($desconto !== "" ? $desconto : '0'),
		'desconto_perc' => ($desconto_perc !== "" ? $desconto_perc : '0'),
		'acrescimo' => ($acrescimo !== "" ? $acrescimo : '0'),
		'acrescimo_perc' => ($acrescimo_perc !== "" ? $acrescimo_perc : '0')
	);

	$colunasExistentes = getExistingColumns($pdo, $pagina);
	$setSql = array();
	$params = array(':id' => $id_salvo);

	foreach($camposOpcionais as $campo => $valorCampo){
		if(isset($colunasExistentes[$campo])){
			$placeholder = ':' . $campo;
			$setSql[] = "{$campo} = {$placeholder}";
			$params[$placeholder] = $valorCampo;
		}
	}

	if(count($setSql) > 0){
		$sql = "UPDATE {$pagina} SET " . implode(', ', $setSql) . " WHERE id = :id";
		$upd = $pdo->prepare($sql);
		foreach($params as $k => $v){
			$upd->bindValue($k, $v);
		}
		$upd->execute();
	}
}

// Recorrencia: somente para novo lançamento e quando houver repeticoes > 1
if(($id == "" || $id == "0") && $repeticoes > 1){
	$diasFreq = getDiasFrequencia($pdo, $freq);
	if($diasFreq <= 0){
		// fallback: quando não houver frequência cadastrada, assume mensal
		$diasFreq = 30;
	}

	if($diasFreq > 0){
		for($i = 1; $i < $repeticoes; $i++){
			$novoVenc = calcDataRecorrencia($venc, $diasFreq, $i);
			$novaDesc = $descricao;
			if($novaDesc == ""){
				$novaDesc = "Recorrencia";
			}
			$novaDesc = $novaDesc . " - Recorrencia " . ($i + 1) . "/" . $repeticoes;

			$insRec = $pdo->prepare("INSERT INTO $pagina set descricao = :descricao, cliente = :cliente, entrada = :entrada, documento = :documento, plano_conta = :plano, data_emissao = :emissao, vencimento = :vencimento, frequencia = :frequencia, valor = :valor, usuario_lanc = :usuario, local = :local, status = 'Pendente', data_recor = curDate(), arquivo = '$foto'");
			$insRec->bindValue(':descricao', $novaDesc);
			$insRec->bindValue(':cliente', $forn);
			$insRec->bindValue(':entrada', $saida);
			$insRec->bindValue(':documento', $doc);
			$insRec->bindValue(':plano', $plano);
			$insRec->bindValue(':emissao', $emissao);
			$insRec->bindValue(':vencimento', $novoVenc);
			$insRec->bindValue(':frequencia', $freq);
			$insRec->bindValue(':valor', $valor);
			$insRec->bindValue(':usuario', $user);
			$insRec->bindValue(':local', $local);
			$insRec->execute();

			$novoIdRec = $pdo->lastInsertId();
			if($novoIdRec != ""){
				$ids_recorrencia[] = $novoIdRec;
			}
		}

		if(count($ids_recorrencia) > 0){
			$camposOpcionaisRec = array(
				'devolucao' => ($devolucao !== "" ? $devolucao : '0'),
				'desconto' => ($desconto !== "" ? $desconto : '0'),
				'desconto_perc' => ($desconto_perc !== "" ? $desconto_perc : '0'),
				'acrescimo' => ($acrescimo !== "" ? $acrescimo : '0'),
				'acrescimo_perc' => ($acrescimo_perc !== "" ? $acrescimo_perc : '0')
			);

			$colunasExistentesRec = getExistingColumns($pdo, $pagina);
			$setSqlRec = array();
			foreach($camposOpcionaisRec as $campoRec => $valorRec){
				if(isset($colunasExistentesRec[$campoRec])){
					$setSqlRec[] = "{$campoRec} = :{$campoRec}";
				}
			}

			if(count($setSqlRec) > 0){
				foreach($ids_recorrencia as $idRec){
					$sqlRec = "UPDATE {$pagina} SET " . implode(', ', $setSqlRec) . " WHERE id = :id";
					$updRec = $pdo->prepare($sqlRec);
					$updRec->bindValue(':id', $idRec);
					foreach($camposOpcionaisRec as $campoRec => $valorRec){
						if(isset($colunasExistentesRec[$campoRec])){
							$updRec->bindValue(':' . $campoRec, $valorRec);
						}
					}
					$updRec->execute();
				}
			}
		}
	}
}

$result = json_encode(array('mensagem'=>'Salvo com sucesso!', 'sucesso'=>true));

echo $result;

?>