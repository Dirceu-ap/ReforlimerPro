<?php
header('Content-Type: application/json; charset=utf-8');
require_once("../conexao.php");

$tabela = 'contas_pagar';

try {
	$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

	$postjson = json_decode(file_get_contents('php://input'), true) ?: [];

	// Campos vindos do app (NovaContaPagar)
	$id       = trim((string)($postjson['id'] ?? '0'));
	$valorRaw = (string)($postjson['valor'] ?? '0');
	$valorRaw = str_replace(',', '.', $valorRaw);
	$valor    = (float)$valorRaw;

	$descricao = trim((string)($postjson['descricao'] ?? ''));
	$forn      = trim((string)($postjson['forn'] ?? ''));
	$saida     = trim((string)($postjson['saida'] ?? ''));
	$doc       = trim((string)($postjson['doc'] ?? ''));
	$plano     = trim((string)($postjson['plano'] ?? ''));
	$desp      = trim((string)($postjson['desp'] ?? ''));
	$freq      = trim((string)($postjson['freq'] ?? ''));
	$emissao   = trim((string)($postjson['emissao'] ?? ''));
	$venc      = trim((string)($postjson['venc'] ?? ''));
	$foto      = trim((string)($postjson['foto'] ?? ''));
	$user      = trim((string)($postjson['user'] ?? ''));
	// novo campo de localização da conta (obra/fornecedor/local físico)
	$local     = trim((string)($postjson['local'] ?? ''));
	$devolucao = str_replace(',', '.', (string)($postjson['devolucao'] ?? '0'));
	$desconto  = str_replace(',', '.', (string)($postjson['desconto'] ?? '0'));
	$descontoPerc = str_replace(',', '.', (string)($postjson['desconto_perc'] ?? '0'));
	$acrescimo = str_replace(',', '.', (string)($postjson['acrescimo'] ?? '0'));
	$acrescimoPerc = str_replace(',', '.', (string)($postjson['acrescimo_perc'] ?? '0'));

	$planoCompleto = '';

	// validações básicas
	if ($valor <= 0) {
		echo json_encode([
			'sucesso'  => false,
			'mensagem' => 'Informe um valor maior que zero.',
		]);
		exit;
	}

	if ($forn === '' && $descricao === '') {
		echo json_encode([
			'sucesso'  => false,
			'mensagem' => 'Selecione um fornecedor ou informe uma descrição.',
		]);
		exit;
	}

	if ($plano === '' || $desp === '') {
		echo json_encode([
			'sucesso'  => false,
			'mensagem' => 'Selecione a Categoria/Plano e a Despesa.',
		]);
		exit;
	}

	// Garante que a despesa selecionada pertence a categoria/plano informado.
	// A comparacao usa trim/lower para reduzir falhas por espacos e caixa.
	$stmtVinculo = $pdo->prepare("SELECT d.id, TRIM(d.nome) AS desp_nome, TRIM(c.nome) AS plano_nome
		FROM despesas d
		INNER JOIN cat_despesas c ON c.id = d.cat_despesa
		WHERE LOWER(TRIM(c.nome)) = LOWER(TRIM(:plano))
		  AND LOWER(TRIM(d.nome)) = LOWER(TRIM(:desp))
		LIMIT 1");
	$stmtVinculo->bindValue(':plano', $plano);
	$stmtVinculo->bindValue(':desp', $desp);
	$stmtVinculo->execute();
	$vinculo = $stmtVinculo->fetch(PDO::FETCH_ASSOC);

	if (!$vinculo) {
		// Fallback 1: tenta localizar pela despesa e usar o plano real dela.
		$stmtFallbackDesp = $pdo->prepare("SELECT d.id, TRIM(d.nome) AS desp_nome, TRIM(c.nome) AS plano_nome
			FROM despesas d
			INNER JOIN cat_despesas c ON c.id = d.cat_despesa
			WHERE LOWER(TRIM(d.nome)) = LOWER(TRIM(:desp))
			ORDER BY d.id ASC
			LIMIT 1");
		$stmtFallbackDesp->bindValue(':desp', $desp);
		$stmtFallbackDesp->execute();
		$vinculo = $stmtFallbackDesp->fetch(PDO::FETCH_ASSOC);
	}

	if (!$vinculo) {
		// Fallback 2: tenta localizar a primeira despesa do plano informado.
		$stmtFallbackPlano = $pdo->prepare("SELECT d.id, TRIM(d.nome) AS desp_nome, TRIM(c.nome) AS plano_nome
			FROM despesas d
			INNER JOIN cat_despesas c ON c.id = d.cat_despesa
			WHERE LOWER(TRIM(c.nome)) = LOWER(TRIM(:plano))
			ORDER BY d.id ASC
			LIMIT 1");
		$stmtFallbackPlano->bindValue(':plano', $plano);
		$stmtFallbackPlano->execute();
		$vinculo = $stmtFallbackPlano->fetch(PDO::FETCH_ASSOC);
	}

	if (!$vinculo) {
		echo json_encode([
			'sucesso'  => false,
			'mensagem' => 'A despesa selecionada nao pertence a categoria/plano informado.',
		]);
		exit;
	}

	// Usa os nomes reais salvos no banco para padronizar e evitar divergencias.
	$plano = (string)($vinculo['plano_nome'] ?? $plano);
	$desp  = (string)($vinculo['desp_nome'] ?? $desp);

	// Mantem o padrao usado pelos relatorios e filtros: "DESPESA - CATEGORIA"
	$planoCompleto = trim($desp . ' - ' . $plano);

	if ($foto === '') {
		$foto = 'sem-foto.jpg';
	}

	// mapa de colunas existentes para recursos opcionais
	$cols = [];
	$stmtCols = $pdo->prepare("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?");
	$stmtCols->execute([$tabela]);
	foreach ($stmtCols->fetchAll(PDO::FETCH_ASSOC) as $r) {
		$cn = (string)($r['COLUMN_NAME'] ?? '');
		if ($cn !== '') $cols[$cn] = true;
	}
	$temIdCompra = isset($cols['id_compra']);

	// INSERT
	if ($id === '' || $id === '0') {
		$sql = "INSERT INTO {$tabela} SET 
			descricao    = :descricao,
			cliente      = :cliente,
			saida        = :saida,
			documento    = :documento,
			plano_conta  = :plano_conta,
			data_emissao = :data_emissao,
			vencimento   = :vencimento,
			frequencia   = :frequencia,
			valor        = :valor,
			usuario_lanc = :usuario_lanc,
			local        = :local,
			status       = 'Pendente',
			data_recor   = CURDATE(),
			arquivo      = :arquivo";

		if ($temIdCompra) {
			$sql .= ", id_compra = :id_compra";
		}

		$stmt = $pdo->prepare($sql);
	} else {
		// UPDATE: se veio nova foto diferente da antiga, apaga a anterior
		$stmtBusca = $pdo->prepare("SELECT arquivo FROM {$tabela} WHERE id = ?");
		$stmtBusca->execute([$id]);
		$rowAntiga = $stmtBusca->fetch(PDO::FETCH_ASSOC);
		$arquivoAntigo = $rowAntiga['arquivo'] ?? null;

		if ($arquivoAntigo && $arquivoAntigo !== 'sem-foto.jpg' && $arquivoAntigo !== $foto) {
			@unlink('../../img/contas/' . $arquivoAntigo);
		}

		$sql = "UPDATE {$tabela} SET 
			descricao    = :descricao,
			cliente      = :cliente,
			saida        = :saida,
			documento    = :documento,
			plano_conta  = :plano_conta,
			data_emissao = :data_emissao,
			vencimento   = :vencimento,
			frequencia   = :frequencia,
			valor        = :valor,
			usuario_lanc = :usuario_lanc,
			local        = :local,
			status       = 'Pendente',
			data_recor   = CURDATE(),
			arquivo      = :arquivo
			WHERE id = :id";

		$stmt = $pdo->prepare($sql);
		$stmt->bindValue(':id', $id);
	}

	// binds comuns (INSERT e UPDATE)
	$stmt->bindValue(':descricao', $descricao);
	$stmt->bindValue(':cliente', $forn);
	$stmt->bindValue(':saida', $saida);
	$stmt->bindValue(':documento', $doc);
	$stmt->bindValue(':plano_conta', $planoCompleto);
	$stmt->bindValue(':data_emissao', $emissao);
	$stmt->bindValue(':vencimento', $venc);
	$stmt->bindValue(':frequencia', $freq);
	$stmt->bindValue(':valor', $valor);
	$stmt->bindValue(':usuario_lanc', $user);
	$stmt->bindValue(':local', $local);
	$stmt->bindValue(':arquivo', $foto);

	if ($temIdCompra && strpos($sql, ':id_compra') !== false) {
		// para lançamentos manuais de contas a pagar, id_compra padrão é 0
		$stmt->bindValue(':id_compra', 0, PDO::PARAM_INT);
	}

	$stmt->execute();

	$idSalvo = ($id === '' || $id === '0') ? $pdo->lastInsertId() : $id;
	if ($idSalvo) {
		$opcionais = [
			'devolucao' => ($devolucao !== '' ? $devolucao : '0'),
			'desconto' => ($desconto !== '' ? $desconto : '0'),
			'desconto_perc' => ($descontoPerc !== '' ? $descontoPerc : '0'),
			'acrescimo' => ($acrescimo !== '' ? $acrescimo : '0'),
			'acrescimo_perc' => ($acrescimoPerc !== '' ? $acrescimoPerc : '0'),
		];

		$set = [];
		$params = [':id' => $idSalvo];
		foreach ($opcionais as $campo => $valorCampo) {
			if (isset($cols[$campo])) {
				$ph = ':' . $campo;
				$set[] = "{$campo} = {$ph}";
				$params[$ph] = $valorCampo;
			}
		}

		if (count($set) > 0) {
			$sqlOpt = "UPDATE {$tabela} SET " . implode(', ', $set) . " WHERE id = :id";
			$stmtOpt = $pdo->prepare($sqlOpt);
			foreach ($params as $k => $v) {
				$stmtOpt->bindValue($k, $v);
			}
			$stmtOpt->execute();
		}
	}

	echo json_encode([
		'sucesso'  => true,
		'mensagem' => 'Salvo com sucesso!',
	]);
} catch (Exception $e) {
	echo json_encode([
		'sucesso'  => false,
		'mensagem' => $e->getMessage(),
	]);
}

?>