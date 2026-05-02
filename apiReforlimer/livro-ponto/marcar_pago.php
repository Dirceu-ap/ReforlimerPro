<?php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

require_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

if (!$postjson) {
	echo json_encode(['success' => false, 'message' => 'Sem dados enviados']);
	exit;
}

$dataInicio = isset($postjson['data_inicio']) ? trim((string)$postjson['data_inicio']) : null;
$dataFim = isset($postjson['data_fim']) ? trim((string)$postjson['data_fim']) : null;
$colaboradorId = isset($postjson['colaborador_id']) ? intval($postjson['colaborador_id']) : 0;

if (!$dataInicio || !$dataFim) {
	echo json_encode(['success' => false, 'message' => 'Período é obrigatório (data_inicio e data_fim)']);
	exit;
}

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataInicio) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataFim)) {
	echo json_encode(['success' => false, 'message' => 'Formato de data inválido']);
	exit;
}

try {
	$stmtCols = $pdo->query("SHOW COLUMNS FROM livro_ponto");
	$colsRaw = $stmtCols->fetchAll(PDO::FETCH_ASSOC);

	$colunas = [];
	foreach ($colsRaw as $col) {
		if (!empty($col['Field'])) {
			$colunas[$col['Field']] = true;
		}
	}

	$colData = isset($colunas['data']) ? 'data' : (isset($colunas['data_registro']) ? 'data_registro' : null);
	$colColaborador = isset($colunas['colaborador_id']) ? 'colaborador_id' : (isset($colunas['usuario_id']) ? 'usuario_id' : null);

	$sets = [];
	if (isset($colunas['status'])) {
		$sets[] = "status = 'Pago'";
	}
	if (isset($colunas['pago'])) {
		$sets[] = "pago = 1";
	}
	if (isset($colunas['situacao'])) {
		$sets[] = "situacao = 'Pago'";
	}
	if (isset($colunas['data_pagamento'])) {
		$sets[] = "data_pagamento = CURDATE()";
	}
	if (isset($colunas['pago_em'])) {
		$sets[] = "pago_em = NOW()";
	}

	if (!$colData) {
		echo json_encode(['success' => false, 'message' => 'Tabela livro_ponto sem coluna de data compatível']);
		exit;
	}

	if (empty($sets)) {
		echo json_encode([
			'success' => false,
			'message' => 'Tabela livro_ponto sem coluna de pagamento. Execute o script sql/livro_ponto_add_status_pagamento_2026_04_25.sql',
		]);
		exit;
	}

	$where = ["$colData >= :data_inicio", "$colData <= :data_fim"];
	$params = [
		':data_inicio' => $dataInicio,
		':data_fim' => $dataFim,
	];

	if ($colaboradorId > 0 && $colColaborador) {
		$where[] = "$colColaborador = :colaborador_id";
		$params[':colaborador_id'] = $colaboradorId;
	}

	$sql = "UPDATE livro_ponto SET " . implode(', ', $sets) . " WHERE " . implode(' AND ', $where);

	$stmt = $pdo->prepare($sql);
	foreach ($params as $k => $v) {
		if ($k === ':colaborador_id') {
			$stmt->bindValue($k, $v, PDO::PARAM_INT);
		} else {
			$stmt->bindValue($k, $v);
		}
	}

	$stmt->execute();

	echo json_encode([
		'success' => true,
		'message' => 'Lançamentos atualizados com sucesso',
		'linhas_afetadas' => $stmt->rowCount(),
	]);
} catch (Exception $e) {
	echo json_encode([
		'success' => false,
		'message' => 'Erro ao atualizar livro ponto: ' . $e->getMessage(),
	]);
}

