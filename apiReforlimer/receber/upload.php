<?php
// upload de anexos de contas a receber
// recebe campo 'photo' via multipart/form-data e salva em ../img/contas/
// (C:\xampp\htdocs\apiReforlimer\img\contas)

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../receber_upload_errors.log');

$uploadDir = __DIR__ . '/../img/contas/';
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        error_log("receber/upload.php: falha ao criar pasta: $uploadDir");
        echo json_encode(['success' => false, 'message' => 'Falha ao criar pasta de upload']);
        exit;
    }
}

if (empty($_FILES['photo'])) {
    error_log("receber/upload.php: nenhum arquivo enviado. \\$_FILES keys: " . implode(',', array_keys($_FILES)));
    echo json_encode(['success' => false, 'message' => 'Nenhum arquivo enviado']);
    exit;
}

$file = $_FILES['photo'];

if (!isset($file['error']) || is_array($file['error'])) {
    error_log("receber/upload.php: formato inválido de \\$_FILES['photo']");
    echo json_encode(['success' => false, 'message' => 'Formato inválido do upload']);
    exit;
}

if ($file['error'] !== UPLOAD_ERR_OK) {
    error_log("receber/upload.php: upload error code: " . $file['error']);
    echo json_encode(['success' => false, 'message' => 'Upload error ' . $file['error']]);
    exit;
}

// mantém o nome original do arquivo, pois o app grava esse nome no banco
$filename = basename($file['name']);
$dest = $uploadDir . $filename;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    if (!copy($file['tmp_name'], $dest)) {
        error_log("receber/upload.php: falha ao mover arquivo tmp: {$file['tmp_name']} -> $dest");
        error_log("receber/upload.php: is_uploaded_file=" . (is_uploaded_file($file['tmp_name']) ? '1' : '0'));
        echo json_encode(['success' => false, 'message' => 'Erro ao mover arquivo']);
        exit;
    } else {
        error_log("receber/upload.php: move_uploaded_file falhou, mas copy() funcionou. dest: $dest");
    }
}

echo json_encode(['success' => true, 'filename' => $filename]);
exit;
?>