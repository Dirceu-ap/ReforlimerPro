<?php
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
    // Em ambiente local, tenta as portas mais comuns de MySQL/XAMPP.
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

$pdoOptions = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
    PDO::ATTR_PERSISTENT => true,
    PDO::ATTR_TIMEOUT => 5,
];

foreach ($passwordCandidates as $password) {
    foreach ($portCandidates as $port) {
        try {
            $pdo = new PDO(
                "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4",
                $username,
                $password,
                $pdoOptions
            );

            // Ajustes de sessao para reduzir latencia em consultas de leitura.
            $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdo->exec("SET SESSION sql_mode = REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', '')");
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
?>