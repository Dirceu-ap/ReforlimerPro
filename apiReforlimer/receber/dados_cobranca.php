<?php
header('Content-Type: application/json; charset=utf-8');
require_once('../conexao.php');

function pickFirstNonEmpty($row, $keys, $default = '') {
    foreach ($keys as $k) {
        if (isset($row[$k])) {
            $v = trim((string)$row[$k]);
            if ($v !== '') return $v;
        }
    }
    return $default;
}

$beneficiario = [
    'nome' => 'Reforlimer',
    'documento' => 'CNPJ: 30.768.359/0001-74',
    'endereco' => 'Avenida Laranjeiras, n 701',
    'pixChave' => '30768359000174',
    'cidade' => 'Limeira',
];

try {
    // Beneficiario fixo conforme solicitado: fornecedor id 14.
    // Mantem CNPJ/chave PIX fixos para cobranca.
    $fornecedor = null;

    try {
        $stmtF = $pdo->prepare("SELECT * FROM fornecedores WHERE id = :id LIMIT 1");
        $stmtF->bindValue(':id', 14, PDO::PARAM_INT);
        $stmtF->execute();
        $fornecedor = $stmtF->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        // Fallback para bases com tabela no singular.
        $stmtF = $pdo->prepare("SELECT * FROM fornecedor WHERE id = :id LIMIT 1");
        $stmtF->bindValue(':id', 14, PDO::PARAM_INT);
        $stmtF->execute();
        $fornecedor = $stmtF->fetch(PDO::FETCH_ASSOC);
    }

    if ($fornecedor) {
        $nomeF = pickFirstNonEmpty($fornecedor, ['nome', 'razao_social', 'fantasia', 'fornecedor']);
        $enderecoF = pickFirstNonEmpty($fornecedor, ['endereco', 'logradouro', 'rua']);
        $numeroF = pickFirstNonEmpty($fornecedor, ['numero', 'n']);

        if ($nomeF !== '') {
            $beneficiario['nome'] = $nomeF;
        }

        if ($enderecoF !== '') {
            $beneficiario['endereco'] = $enderecoF . ($numeroF !== '' ? ', ' . $numeroF : '');
        }

    }

    // CNPJ e chave PIX fixos conforme regra de negocio informada.
    $beneficiario['documento'] = 'CNPJ: 30.768.359/0001-74';
    $beneficiario['pixChave'] = '30768359000174';

    // Cidade fixa conforme solicitado.
    $beneficiario['cidade'] = 'Limeira';

    echo json_encode([
        'success' => true,
        'beneficiario' => $beneficiario,
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'beneficiario' => $beneficiario,
    ]);
}
