<?php
header('Content-Type: application/json; charset=utf-8');
require_once('../conexao.php');

$cfg = require __DIR__ . '/beneficiarios_config.php';

function pickFirstNonEmpty($row, $keys, $default = '') {
    foreach ($keys as $k) {
        if (isset($row[$k])) {
            $v = trim((string)$row[$k]);
            if ($v !== '') return $v;
        }
    }
    return $default;
}

function normalizeBeneficiary($raw, $fallbackId = 'default') {
    $src = is_array($raw) ? $raw : [];
    return [
        'id' => trim((string)($src['id'] ?? $fallbackId)),
        'nome' => trim((string)($src['nome'] ?? 'Reforlimer')),
        'documento' => trim((string)($src['documento'] ?? 'CNPJ: INFORMAR')),
        'endereco' => trim((string)($src['endereco'] ?? 'Avenida Laranjeiras, n 701')),
        'pixChave' => trim((string)($src['pixChave'] ?? 'INFORMAR_CHAVE_PIX')),
        'cidade' => trim((string)($src['cidade'] ?? 'Limeira')),
        'usePsp' => isset($src['usePsp']) ? (bool)$src['usePsp'] : true,
    ];
}

function normalizeRule($rule, $index = 0) {
    $src = is_array($rule) ? $rule : [];
    $criteria = is_array($src['criteria'] ?? null) ? $src['criteria'] : [];
    $beneficiary = normalizeBeneficiary($src['beneficiary'] ?? [], 'rule_' . ($index + 1));
    $pix = is_array($src['pix'] ?? null) ? $src['pix'] : [];
    if (array_key_exists('usePsp', $pix)) {
        $beneficiary['usePsp'] = (bool)$pix['usePsp'];
    } 

    $pixConfig = [
        'usePsp' => isset($pix['usePsp']) ? (bool)$pix['usePsp'] : $beneficiary['usePsp'],
        'multaPercent' => isset($pix['multaPercent']) ? (float)$pix['multaPercent'] : null,
        'jurosPercentDia' => isset($pix['jurosPercentDia']) ? (float)$pix['jurosPercentDia'] : null,
    ];

    $toArray = function ($v) {
        if (is_array($v)) return array_values(array_filter(array_map('strval', $v), function ($x) {
            return trim($x) !== '';
        }));
        $s = trim((string)$v);
        return $s === '' ? [] : [$s];
    };

    return [
        'id' => trim((string)($src['id'] ?? ('rule_' . ($index + 1)))),
        'enabled' => isset($src['enabled']) ? (bool)$src['enabled'] : true,
        'criteria' => [
            'localContains' => $toArray($criteria['localContains'] ?? []),
            'planContains' => $toArray($criteria['planContains'] ?? []),
            'descriptionContains' => $toArray($criteria['descriptionContains'] ?? []),
            'requirePlanAndDescription' => isset($criteria['requirePlanAndDescription']) ? (bool)$criteria['requirePlanAndDescription'] : false,
        ],
        'beneficiary' => $beneficiary,
        'pix' => $pixConfig,
    ];
}

$beneficiario = normalizeBeneficiary($cfg['default'] ?? [], 'default');
$regras = [];
$pdfDiagnostics = isset($cfg['pdfDiagnostics']) ? (bool)$cfg['pdfDiagnostics'] : false;

$rawRules = is_array($cfg['rules'] ?? null) ? $cfg['rules'] : [];
foreach ($rawRules as $idx => $r) {
    $regras[] = normalizeRule($r, $idx);
}

try {
    $overrideDefaultFromSupplier14 = isset($cfg['overrideDefaultFromSupplier14'])
        ? (bool)$cfg['overrideDefaultFromSupplier14']
        : false;

    if ($overrideDefaultFromSupplier14) {
        // Opcional: complementa nome/endereco do beneficiario padrao com fornecedor id 14.
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
    }

    echo json_encode([
        'success' => true,
        'beneficiario' => $beneficiario,
        'regrasBeneficiario' => $regras,
        'pdfDiagnostics' => $pdfDiagnostics,
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'beneficiario' => $beneficiario,
        'regrasBeneficiario' => $regras,
        'pdfDiagnostics' => $pdfDiagnostics,
    ]);
}
