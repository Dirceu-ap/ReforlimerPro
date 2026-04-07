<?php
require_once("../conexao.php");
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../api_errors.log');

$raw = file_get_contents('php://input');
$postjson = json_decode($raw, true);

$id = isset($postjson['id']) ? trim($postjson['id']) : "";
$nome = isset($postjson['nome']) ? trim($postjson['nome']) : "";
$descricao = isset($postjson['descricao']) ? trim($postjson['descricao']) : "";
$unidade = isset($postjson['unidade']) ? trim($postjson['unidade']) : "";
$rendimento_m2 = isset($postjson['rendimento_por_unidade_m2']) ? trim($postjson['rendimento_por_unidade_m2']) : "";
$lucro = isset($postjson['lucro']) ? trim($postjson['lucro']) : "";
$codigo = isset($postjson['codigo']) ? trim($postjson['codigo']) : "";
$valor_venda = isset($postjson['valor_venda']) ? trim($postjson['valor_venda']) : "";
$valor_custo = isset($postjson['valor_custo']) ? trim($postjson['valor_custo']) : "";
$valor_venda = str_replace(',', '.', $valor_venda);
$valor_custo = str_replace(',', '.', $valor_custo);

// normalizar rendimento por m2
if ($rendimento_m2 !== "") {
    $rendimento_m2 = str_replace(',', '.', $rendimento_m2);
} else {
    $rendimento_m2 = null;
}
$ativo = isset($postjson['ativo']) ? trim($postjson['ativo']) : "";
$cat = isset($postjson['cat']) ? trim($postjson['cat']) : "";
$foto = isset($postjson['foto']) ? $postjson['foto'] : "";

$pagina = 'produtos';

// se cat vazio, pega primeira categoria existente
if ($cat === "") {
    $query = $pdo->query("SELECT id FROM cat_produtos ORDER BY id ASC LIMIT 1");
    $res = $query->fetchAll(PDO::FETCH_ASSOC);
    $cat = isset($res[0]['id']) ? $res[0]['id'] : "";
}

// helper para extrair somente o filename de um valor que pode conter newline ou prefixo
function extractFilename($raw) {
    $raw = (string)$raw;
    if ($raw === "") return "";
    $parts = preg_split("/\r\n|\n|\r/", $raw);
    $last = trim(end($parts));
    return $last === "" ? "" : basename($last);
}

try {
    // Validações de unicidade (nome e codigo) - considere usar unique index no DB também
    $stmt = $pdo->prepare("SELECT id FROM $pagina WHERE nome = :nome LIMIT 1");
    $stmt->execute([':nome' => $nome]);
    $res = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($res && isset($res['id']) && $res['id'] != $id) {
        echo json_encode(['mensagem' => 'Nome já Cadastrado!', 'sucesso' => false]);
        exit();
    }

    $stmt = $pdo->prepare("SELECT id FROM $pagina WHERE codigo = :codigo LIMIT 1");
    $stmt->execute([':codigo' => $codigo]);
    $res = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($res && isset($res['id']) && $res['id'] != $id) {
        echo json_encode(['mensagem' => 'Código já Cadastrado!', 'sucesso' => false]);
        exit();
    }

    // montar valor final que será salvo no campo foto no formato "<cat>\n<FILENAME>"
    $fotoDb = "";
    if ($foto !== "" && $foto !== null) {
        // se cliente já enviou "CAT\nFILENAME", extraimos apenas o filename e construimos novamente para garantir consistência
        $onlyName = extractFilename($foto);
        if ($onlyName !== "") {
            $fotoDb = (string)$onlyName;
        }
    }

    if ($id === "" || $id === "0") {
        // Inserção
        if ($fotoDb === "") {
            $fotoDb = 'sem-foto.jpg';
        }

        $sql = "INSERT INTO $pagina 
            (nome, codigo, descricao, unidade, rendimento_por_unidade_m2, lucro, valor_venda, valor_compra, categoria, ativo, foto)
            VALUES (:nome, :codigo, :descricao, :unidade, :rendimento_por_unidade_m2, :lucro, :valor_venda, :valor_compra, :categoria, :ativo, :foto)";
        $res = $pdo->prepare($sql);
        $res->bindValue(":foto", $fotoDb);
    } else {
        // Atualização
        if ($fotoDb === "") {
            // sem alteração de foto
            $sql = "UPDATE $pagina SET nome = :nome, codigo = :codigo, descricao = :descricao, unidade = :unidade, rendimento_por_unidade_m2 = :rendimento_por_unidade_m2, lucro = :lucro, valor_venda = :valor_venda, valor_compra = :valor_compra, categoria = :categoria, ativo = :ativo WHERE id = :id";
            $res = $pdo->prepare($sql);
            $res->bindValue(":id", $id);
        } else {
            // excluir imagem antiga (se existir e não for sem-foto.jpg)
            $q = $pdo->prepare("SELECT foto FROM $pagina WHERE id = :id LIMIT 1");
            $q->execute([':id' => $id]);
            $r = $q->fetch(PDO::FETCH_ASSOC);
            if ($r && !empty($r['foto'])) {
                $old = extractFilename($r['foto']);
                if ($old !== "" && $old !== 'sem-foto.jpg') {
                    $photoDir = realpath(__DIR__ . '/photos') ?: (__DIR__ . '/photos');
                    $full = rtrim($photoDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $old;
                    if (file_exists($full)) {
                        @unlink($full);
                    }
                }
            }

            $sql = "UPDATE $pagina SET nome = :nome, codigo = :codigo, descricao = :descricao, unidade = :unidade, rendimento_por_unidade_m2 = :rendimento_por_unidade_m2, lucro = :lucro, valor_venda = :valor_venda, valor_compra = :valor_compra, categoria = :categoria, ativo = :ativo, foto = :foto WHERE id = :id";
            $res = $pdo->prepare($sql);
            $res->bindValue(":foto", $fotoDb);
            $res->bindValue(":id", $id);
        }
    }

    // bind comuns
    $res->bindValue(":nome", $nome);
    $res->bindValue(":codigo", $codigo);
    $res->bindValue(":descricao", $descricao);
    $res->bindValue(":unidade", $unidade);
    if ($rendimento_m2 !== null && $rendimento_m2 !== '') {
        $res->bindValue(":rendimento_por_unidade_m2", $rendimento_m2);
    } else {
        $res->bindValue(":rendimento_por_unidade_m2", null, PDO::PARAM_NULL);
    }
    $res->bindValue(":lucro", $lucro);
    $res->bindValue(":valor_venda", $valor_venda);
    $res->bindValue(":valor_compra", $valor_custo);
    $res->bindValue(":categoria", $cat);
    $res->bindValue(":ativo", $ativo);

    $ok = $res->execute();

    if ($ok) {
        echo json_encode(['mensagem' => 'Salvo com sucesso!', 'sucesso' => true]);
    } else {
        echo json_encode(['mensagem' => 'Falha ao salvar', 'sucesso' => false]);
    }
} catch (PDOException $e) {
    error_log("salvar.php PDOException: " . $e->getMessage());
    echo json_encode(['mensagem' => 'Erro interno', 'sucesso' => false, 'error' => $e->getMessage()]);
}
?>