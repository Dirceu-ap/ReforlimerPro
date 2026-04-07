<?php
header('Content-Type: application/json; charset=utf-8');
require_once(__DIR__ . "/../conexao.php");
$pagina = 'contas_pagar';

$raw = file_get_contents('php://input');
$postjson = json_decode($raw, true);
if (!is_array($postjson)) $postjson = $_POST;

$id = isset($postjson['id']) ? intval($postjson['id']) : 0;
$valor = isset($postjson['valor']) ? floatval(str_replace(',', '.', $postjson['valor'])) : 0.0;
$valor_desconto = isset($postjson['desconto']) ? floatval(str_replace(',', '.', $postjson['desconto'])) : 0.0;
$valor_juros = isset($postjson['juros']) ? floatval(str_replace(',', '.', $postjson['juros'])) : 0.0;
$valor_multa = isset($postjson['multa']) ? floatval(str_replace(',', '.', $postjson['multa'])) : 0.0;
$valor_devolucao = isset($postjson['devolucao']) ? floatval(str_replace(',', '.', $postjson['devolucao'])) : 0.0;
$valor_acrescimo = isset($postjson['acrescimo']) ? floatval(str_replace(',', '.', $postjson['acrescimo'])) : 0.0;
$valor_desconto_perc = isset($postjson['desconto_perc']) ? floatval(str_replace(',', '.', $postjson['desconto_perc'])) : 0.0;
$valor_acrescimo_perc = isset($postjson['acrescimo_perc']) ? floatval(str_replace(',', '.', $postjson['acrescimo_perc'])) : 0.0;
$subtotal = isset($postjson['subtotal']) ? floatval(str_replace(',', '.', $postjson['subtotal'])) : 0.0;
$saida = isset($postjson['saida']) ? $postjson['saida'] : '';
$id_usuario = isset($postjson['user']) ? $postjson['user'] : '';

function hasColumn($pdo, $table, $column) {
    try {
        $stmt = $pdo->prepare("SHOW COLUMNS FROM {$table} LIKE :col");
        $stmt->bindValue(':col', $column);
        $stmt->execute();
        return (bool)$stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return false;
    }
}

$temColunaAcrescimo = hasColumn($pdo, $pagina, 'acrescimo');

if ($id <= 0) {
    echo json_encode(['mensagem' => 'ID inválido', 'sucesso' => false]);
    exit();
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT * FROM {$pagina} WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    $res = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$res) {
        $pdo->rollBack();
        echo json_encode(['mensagem' => 'Conta não encontrada!', 'sucesso' => false]);
        exit();
    }

    $cp1 = $res['descricao'];
    $cp2 = $res['cliente'];
    $cp3 = $res['saida'];
    $cp4 = $res['documento'];
    $cp5 = $res['plano_conta'];
    $cp7 = $res['vencimento'];
    $cp8 = $res['frequencia'];
    $cp9 = floatval($res['valor']);
    $data_rec = $res['data_recor'];
    $id_compra = $res['id_compra'];
    // campo de localidade (se existir na tabela)
    $local = isset($res['local']) ? $res['local'] : '';

    $stmt2 = $pdo->prepare("SELECT nome FROM fornecedores WHERE id = ? LIMIT 1");
    $stmt2->execute([$cp2]);
    $f = $stmt2->fetch(PDO::FETCH_ASSOC);
    $nome_fornecedor = $f ? $f['nome'] : '';
    $descricao_conta = $nome_fornecedor ? ($cp1 . ' - ' . $nome_fornecedor) : $cp1;

    $stmt2 = $pdo->query("SELECT id FROM caixa WHERE status = 'Aberto' LIMIT 1");
    $cx = $stmt2->fetch(PDO::FETCH_ASSOC);
    $caixa_aberto = $cx ? $cx['id'] : 0;

    $is_full = round($valor, 2) >= round($cp9, 2);

    if ($is_full) {
        $juros_total = floatval($valor_juros);
        if (!$temColunaAcrescimo) {
            $juros_total += floatval($valor_acrescimo);
        }
        $stmtUpd = $pdo->prepare("UPDATE {$pagina} SET saida = ?, usuario_baixa = ?, status = 'Paga', juros = ?, multa = ?, desconto = ?, subtotal = ?, data_baixa = curDate() WHERE id = ?");
        $stmtUpd->execute([$saida, $id_usuario, $juros_total, $valor_multa, $valor_desconto, $subtotal, $id]);

        // criar próxima conta se houver recorrência (mantido)
        $stmtFreq = $pdo->prepare("SELECT dias FROM frequencias WHERE nome = ? LIMIT 1");
        $stmtFreq->execute([$cp8]);
        $rFreq = $stmtFreq->fetch(PDO::FETCH_ASSOC);
        $dias_frequencia = $rFreq ? intval($rFreq['dias']) : 0;
        if ($dias_frequencia) {
            // calcula nova data (mantido)
            if ($dias_frequencia == 30 || $dias_frequencia == 31) {
                $data_recor = date('Y/m/d', strtotime("+1 month", strtotime($data_rec)));
                $nova_data_vencimento = date('Y/m/d', strtotime("+1 month", strtotime($cp7)));
            } else if ($dias_frequencia == 90) {
                $data_recor = date('Y/m/d', strtotime("+3 month", strtotime($data_rec)));
                $nova_data_vencimento = date('Y/m/d', strtotime("+3 month", strtotime($cp7)));
            } else if ($dias_frequencia == 180) {
                $data_recor = date('Y/m/d', strtotime("+6 month", strtotime($data_rec)));
                $nova_data_vencimento = date('Y/m/d', strtotime("+6 month", strtotime($cp7)));
            } else if ($dias_frequencia == 360) {
                $data_recor = date('Y/m/d', strtotime("+1 year", strtotime($data_rec)));
                $nova_data_vencimento = date('Y/m/d', strtotime("+1 year", strtotime($cp7)));
            } else {
                $data_recor = date('Y/m/d', strtotime("+{$dias_frequencia} days", strtotime(date('Y-m-d'))));
                $nova_data_vencimento = date('Y/m/d', strtotime("+{$dias_frequencia} days", strtotime($cp7)));
            }
            $ins = $pdo->prepare("INSERT INTO {$pagina} (descricao, cliente, saida, documento, plano_conta, data_emissao, vencimento, frequencia, valor, usuario_lanc, status, data_recor, arquivo) VALUES (?, ?, ?, ?, ?, curDate(), ?, ?, ?, ?, 'Pendente', ?, ?)");
            $ins->execute([$cp1, $cp2, $cp3, $cp4, $cp5, $nova_data_vencimento, $cp8, $cp9, $id_usuario, $data_recor, 'sem-foto.jpg']);
            $updRec = $pdo->prepare("UPDATE {$pagina} SET data_recor = '' WHERE id = ?");
            $updRec->execute([$id]);
        }
    } else {
        $stmt3 = $pdo->prepare("SELECT valor FROM valor_parcial WHERE id_conta = ?");
        $stmt3->execute([$id]);
        $rows = $stmt3->fetchAll(PDO::FETCH_ASSOC);
        $total_resid = 0;
        foreach ($rows as $r) $total_resid += floatval($r['valor']);

        $insPar = $pdo->prepare("INSERT INTO valor_parcial (id_conta, tipo, valor, data, usuario) VALUES (?, 'Pagar', ?, curDate(), ?)");
        $insPar->execute([$id, $subtotal, $id_usuario]);

        $novo_valor = $cp9 - floatval($subtotal);
        if ($novo_valor < 0) $novo_valor = 0;

        $juros_total = floatval($valor_juros);
        if (!$temColunaAcrescimo) {
            $juros_total += floatval($valor_acrescimo);
        }
        $stmtUpd = $pdo->prepare("UPDATE {$pagina} SET saida = ?, usuario_baixa = ?, status = 'Pendente', juros = ?, multa = ?, desconto = ?, valor = ?, subtotal = ?, data_baixa = curDate() WHERE id = ?");
        $stmtUpd->execute([$saida, $id_usuario, $juros_total, $valor_multa, $valor_desconto, $novo_valor, $subtotal, $id]);
    }

    $camposOpcionais = [
        'devolucao' => $valor_devolucao,
        'desconto_perc' => $valor_desconto_perc,
        'acrescimo' => $valor_acrescimo,
        'acrescimo_perc' => $valor_acrescimo_perc,
    ];

    foreach ($camposOpcionais as $campo => $valorCampo) {
        if (hasColumn($pdo, $pagina, $campo)) {
            $stmtOpt = $pdo->prepare("UPDATE {$pagina} SET {$campo} = :valor WHERE id = :id");
            $stmtOpt->bindValue(':valor', $valorCampo);
            $stmtOpt->bindValue(':id', $id);
            $stmtOpt->execute();
        }
    }

    $insMov = $pdo->prepare("INSERT INTO movimentacoes (tipo, movimento, descricao, valor, usuario, data, lancamento, plano_conta, documento, caixa_periodo, id_mov, local) VALUES ('Saída', 'Conta à Pagar', ?, ?, ?, curDate(), ?, ?, ?, ?, ?, ?)");
    $insMov->execute([$descricao_conta, $subtotal, $id_usuario, $saida, $cp5, $cp4, $caixa_aberto, $id_compra, $local]);

    if ($id_compra) {
        $stmt4 = $pdo->prepare("SELECT status FROM {$pagina} WHERE id_compra = ?");
        $stmt4->execute([$id_compra]);
        $resAll = $stmt4->fetchAll(PDO::FETCH_ASSOC);
        $paga = 'Sim';
        foreach ($resAll as $itemRow) {
            if ($itemRow['status'] == 'Pendente') { $paga = 'Não'; break; }
        }
        if ($paga == 'Sim') {
            $updCompra = $pdo->prepare("UPDATE compras SET status = 'Concluída' WHERE id = ?");
            $updCompra->execute([$id_compra]);
        }
    }

    $pdo->commit();

    $stmtFin = $pdo->prepare("SELECT * FROM {$pagina} WHERE id = ?");
    $stmtFin->execute([$id]);
    $contaAtual = $stmtFin->fetch(PDO::FETCH_ASSOC);

    echo json_encode(['mensagem' => 'Salvo com sucesso!', 'sucesso' => true, 'conta' => $contaAtual]);
    exit();
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("Erro baixa contas_pagar: " . $e->getMessage());
    echo json_encode(['mensagem' => 'Erro interno no servidor', 'sucesso' => false, 'erro' => $e->getMessage()]);
    exit();
}
?>