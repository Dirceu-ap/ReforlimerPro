<?php
header("Content-Type: application/json");
include_once "conexao.php";

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (isset($_GET['buscar'])) {
        $buscar = $_GET['buscar'];
        $query = $pdo->prepare("SELECT * FROM despesas WHERE nome LIKE ?");
        $query->execute(["%$buscar%"]);
    } else {
        $query = $pdo->query("SELECT * FROM despesas");
    }

    $result = $query->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(["resultado" => $result]);
    exit;
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $nome = $data['nome'] ?? '';
    $categ = $data['categ'] ?? '';

    if (empty($nome) || empty($categ)) {
        echo json_encode(["sucesso" => false, "mensagem" => "Campos obrigatórios não preenchidos."]);
        exit;
    }

    $query = $pdo->prepare("INSERT INTO despesas (nome, categ) VALUES (?, ?)");
    $success = $query->execute([$nome, $categ]);

    echo json_encode(["sucesso" => $success]);
    exit;
}
?>
