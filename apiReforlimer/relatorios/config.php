<?php
/*
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('America/Sao_Paulo');
*/

// Configuração de banco com suporte a variáveis de ambiente.
$host = trim((string)(getenv('DB_HOST') ?: getenv('MYSQL_HOST') ?: 'localhost'));
$dbname = trim((string)(getenv('DB_NAME') ?: getenv('MYSQL_DATABASE') ?: 'reforlimer'));
$username = trim((string)(getenv('DB_USER') ?: getenv('MYSQL_USER') ?: 'root'));
$passwordEnvRaw = getenv('DB_PASS');
if ($passwordEnvRaw === false || $passwordEnvRaw === '') {
	$passwordEnvRaw = getenv('MYSQL_PASSWORD');
}
$portEnvRaw = trim((string)(getenv('DB_PORT') ?: getenv('MYSQL_PORT') ?: ''));

$portWasExplicitlySet = ($portEnvRaw !== '' && ctype_digit($portEnvRaw));
$portCandidates = [];

if ($portWasExplicitlySet) {
	$portCandidates[] = (int)$portEnvRaw;
} else {
	$isLocalHost = in_array(strtolower($host), ['localhost', '127.0.0.1', '::1'], true);
	$portCandidates = $isLocalHost ? [3306, 3307] : [3306];
}

$passwordCandidates = [];
if ($passwordEnvRaw !== false && $passwordEnvRaw !== '') {
	$passwordCandidates[] = (string)$passwordEnvRaw;
} else {
	// Compatibilidade com ambientes legados e XAMPP local (root sem senha).
	$passwordCandidates = ['Dirceuap', ''];
}

$pdo = null;
$lastError = null;

foreach ($passwordCandidates as $password) {
	foreach ($portCandidates as $port) {
		try {
			$pdo = new PDO(
				"mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4",
				$username,
				$password,
				[
					PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
					PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
					PDO::ATTR_EMULATE_PREPARES => false,
				]
			);
			break 2;
		} catch (PDOException $e) {
			$lastError = $e;
		}
	}
}

if (!$pdo) {
	http_response_code(500);
	echo json_encode([
		'success' => false,
		'message' => 'Erro de conexao com o banco de dados: ' . ($lastError ? $lastError->getMessage() : 'Falha desconhecida.'),
		'hint' => $portWasExplicitlySet
			? 'Verifique DB_HOST/DB_PORT e se o servico MySQL esta ativo.'
			: 'Verifique se o servico MySQL esta ativo nas portas 3306/3307 ou configure DB_PORT.',
	]);
	exit();
}

//$valor_multa = 2;
//$valo7_juros_dia = 0.15;
//$valor_carencia = 0;
?>