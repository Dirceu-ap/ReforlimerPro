<?php
require_once("../conexao.php");

$postjson = json_decode(file_get_contents('php://input'), true);

$nome = $postjson['nome'];
$email = $postjson['email'];
$senha = $postjson['senha'];
$nivel = $postjson['nivel'];

// Verifica se os campos obrigatórios estão preenchidos
if (empty($nome) || empty($email) || empty($senha)) {
    echo json_encode(['sucesso' => false, 'mensagem' => 'Preencha todos os campos obrigatórios.']);
    exit;
}

// Verifica se o email já está cadastrado
$query = $pdo->prepare("SELECT * FROM usuarios WHERE email = :email");
$query->bindValue(":email", $email);
$query->execute();

if ($query->rowCount() > 0) {
    echo json_encode(['sucesso' => false, 'mensagem' => 'Email já cadastrado.']);
    exit;
}

// Insere o novo usuário no banco de dados
$query = $pdo->prepare("INSERT INTO usuarios (nome, email, senha, nivel) VALUES (:nome, :email, :senha, :nivel)");
$query->bindValue(":nome", $nome);
$query->bindValue(":email", $email);
$query->bindValue(":senha", $senha);
$query->bindValue(":nivel", $nivel);

if ($query->execute()) {
    echo json_encode(['sucesso' => true, 'mensagem' => 'Usuário cadastrado com sucesso.']);
} else {
    echo json_encode(['sucesso' => false, 'mensagem' => 'Erro ao cadastrar usuário.']);
}
?>