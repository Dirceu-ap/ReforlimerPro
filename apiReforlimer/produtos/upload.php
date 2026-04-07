<?php
// upload.php - recebe campo 'photo' via multipart/form-data e retorna JSON { success, filename, message }
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../api_errors.log');

$uploadDir = __DIR__ . '/photos/';
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        error_log("upload.php: falha ao criar pasta: $uploadDir");
        echo json_encode(['success' => false, 'message' => 'Falha ao criar pasta de upload']);
        exit;
    }
}

// checa se arquivo veio
if (empty($_FILES['photo'])) {
    error_log("upload.php: nenhum arquivo enviado. \$_FILES keys: " . implode(',', array_keys($_FILES)));
    echo json_encode(['success' => false, 'message' => 'Nenhum arquivo enviado']);
    exit;
}

$file = $_FILES['photo'];

if (!isset($file['error']) || is_array($file['error'])) {
    error_log("upload.php: formato inválido de \$_FILES['photo']");
    echo json_encode(['success' => false, 'message' => 'Formato inválido do upload']);
    exit;
}

if ($file['error'] !== UPLOAD_ERR_OK) {
    error_log("upload.php: upload error code: " . $file['error']);
    echo json_encode(['success' => false, 'message' => 'Upload error ' . $file['error']]);
    exit;
}

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if ($ext === '') $ext = 'jpg';
$filename = uniqid('img_') . '.' . $ext;
$dest = $uploadDir . $filename;

// move_uploaded_file (com fallback copy)
if (!move_uploaded_file($file['tmp_name'], $dest)) {
    if (!copy($file['tmp_name'], $dest)) {
        error_log("upload.php: falha ao mover arquivo tmp: {$file['tmp_name']} -> $dest");
        error_log("upload.php: is_uploaded_file=" . (is_uploaded_file($file['tmp_name']) ? '1' : '0'));
        echo json_encode(['success' => false, 'message' => 'Erro ao mover arquivo']);
        exit;
    } else {
        error_log("upload.php: move_uploaded_file falhou, mas copy() funcionou. dest: $dest");
    }
}

// sucesso
echo json_encode(['success' => true, 'filename' => $filename]);
exit;
?>