<?php
include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true) ?? [];

// helper número
function toDecimal($val) {
    if ($val === null || $val === '' || !isset($val)) return 0;
    $s = trim((string)$val);
    if ($s === '') return 0;
    $s = preg_replace('/[^\d\.,-]/', '', $s);
    if (strpos($s, ',') !== false && strpos($s, '.') !== false) {
        $s = str_replace('.', '', $s);
        $s = str_replace(',', '.', $s);
    } elseif (strpos($s, ',') !== false) {
        $s = str_replace(',', '.', $s);
    }
    $n = floatval($s);
    return is_finite($n) ? $n : 0;
}

// campos do app
$cliente   = $postjson['cliente'] ?? null;
$usuario   = $postjson['usuario'] ?? ($postjson['user'] ?? null);
$dataHoje  = date('Y-m-d');

$subtotal  = toDecimal($postjson['subtotal'] ?? $postjson['total'] ?? $postjson['valor_total'] ?? $postjson['valor'] ?? 0);
$desconto  = toDecimal($postjson['desconto'] ?? 0);
$acrescimo = toDecimal($postjson['acrescimo'] ?? 0);
$valor     = toDecimal($postjson['valor'] ?? $postjson['total'] ?? $postjson['valor_total'] ?? $subtotal);

$tipo_pgto = $postjson['tipo_pgto']
    ?? ($postjson['pagamento'] ?? ($postjson['pagamento_tipo'] ?? 'Dinheiro'));

$parcelas  = intval($postjson['parcelas'] ?? 1) ?: 1;
$post_itens = $postjson['itens'] ?? null;

$entrada_bruta   = $postjson['entrada'] ?? ($postjson['recebido'] ?? ($postjson['totalReceb'] ?? null));
$entrada         = $entrada_bruta !== null ? toDecimal($entrada_bruta) : null;

$documento       = $postjson['documento'] ?? null;
$plano_conta     = $postjson['plano_conta'] ?? 'Venda';

// datas
$data_emissao    = $postjson['data_emissao'] ?? ($postjson['dataVenda'] ?? $dataHoje);
$vencimento      = $postjson['vencimento'] ?? ($postjson['data_venc'] ?? null);

error_log("Salvando venda - Cliente: $cliente, Usuario: $usuario, Valor: $valor");

if (empty($cliente) || empty($usuario) || $valor <= 0) {
    echo json_encode(['sucesso' => false, 'mensagem' => 'Dados incompletos.']);
    exit;
}

try {
    $pdo->beginTransaction();

    // --- vendas ---
    $cols_vendas = $pdo->query("SHOW COLUMNS FROM vendas")->fetchAll(PDO::FETCH_COLUMN);

    $candidates_pag = ['pagamento','tipo_pgto','plano_conta','forma_pgto'];
    $col_pagamento = null;
    foreach ($candidates_pag as $c) {
        if (in_array($c, $cols_vendas)) { $col_pagamento = $c; break; }
    }

    $map = [
        'cliente'   => $cliente,
        'usuario'   => $usuario,
        'data_lanc' => $dataHoje,
        'subtotal'  => number_format($subtotal, 2, '.', ''),
        'desconto'  => number_format($desconto, 2, '.', ''),
        'acrescimo' => number_format($acrescimo, 2, '.', ''),
        'valor'     => number_format($valor, 2, '.', ''),
        'parcelas'  => $parcelas,
        'data_pgto' => $dataHoje,
        'lancamento'=> 'Caixa',
        'status'    => 'Concluída'
    ];

    $optional_vendas = [
        'entrada'      => $entrada,
        'documento'    => $documento,
        'plano_conta'  => $plano_conta,
        'data_emissao' => $data_emissao,
        'vencimento'   => $vencimento
    ];
    foreach ($optional_vendas as $col => $val) {
        if (in_array($col, $cols_vendas) && $val !== null && $val !== '') {
            $map[$col] = $val;
        }
    }

    $insertCols   = [];
    $insertParams = [];
    foreach ($map as $col => $val) {
        if (in_array($col, $cols_vendas)) {
            $insertCols[]   = $col;
            $insertParams[] = ':' . $col;
        }
    }
    if ($col_pagamento && in_array($col_pagamento, $cols_vendas) && !in_array($col_pagamento, $insertCols)) {
        $insertCols[]   = $col_pagamento;
        $insertParams[] = ':pagamento';
    }

    $sql = "INSERT INTO vendas (" . implode(', ', $insertCols) . ") VALUES (" . implode(', ', $insertParams) . ")";
    $q = $pdo->prepare($sql);

    foreach ($map as $col => $val) {
        if (in_array($col, $cols_vendas)) {
            $q->bindValue(':' . $col, $val);
        }
    }
    if ($col_pagamento && in_array($col_pagamento, $cols_vendas)) {
        $q->bindValue(':pagamento', $tipo_pgto);
    }

    $q->execute();
    $id_venda = $pdo->lastInsertId();
    error_log("Venda inserida com ID: $id_venda (usando col_pagamento: " . ($col_pagamento ?? 'NENHUMA') . ")");

    if (empty($documento)) {
        $documento = "Venda #$id_venda";
    }

    // --- itens_venda ---
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $candidates_tables = ['itens_vendas','itens_venda','item_vendas','vendas_itens','itens','itens_venda_tmp'];
    $itens_table = null;
    foreach ($candidates_tables as $t) {
        if (in_array($t, $tables)) { $itens_table = $t; break; }
    }
    error_log("Tabela itens detectada: " . ($itens_table ?? 'NENHUMA'));

    $itens_db = [];
    $cols_itens = [];
    $colVendaItens = null;
    if ($itens_table) {
        $cols_itens = $pdo->query("SHOW COLUMNS FROM `$itens_table`")->fetchAll(PDO::FETCH_COLUMN);

        // aqui sabemos que o certo é id_venda
        if (in_array('id_venda', $cols_itens)) {
            $colVendaItens = 'id_venda';
        } elseif (in_array('venda', $cols_itens)) {
            $colVendaItens = 'venda';
        }

        $where  = [];
        $params = [];
        if ($colVendaItens) {
            $where[] = "$colVendaItens = 0";
        }
        if (in_array('cliente', $cols_itens)) {
            $where[] = "cliente = :cliente";
            $params[':cliente'] = $cliente;
        }
        if (in_array('usuario', $cols_itens) && !isset($params[':cliente'])) {
            $where[] = "usuario = :usuario";
            $params[':usuario'] = $usuario;
        }

        if (count($where) > 0) {
            $sql_items = "SELECT * FROM `$itens_table` WHERE " . implode(' AND ', $where);
            $stmt = $pdo->prepare($sql_items);
            foreach ($params as $k => $v) $stmt->bindValue($k, $v);
            $stmt->execute();
            $itens_db = $stmt->fetchAll(PDO::FETCH_ASSOC);
            error_log("Itens encontrados na tabela ($itens_table): " . count($itens_db));
        } else {
            error_log("Tabela $itens_table existe mas sem colunas para filtrar (venda/cliente/usuario).");
        }
    }

    if (count($itens_db) === 0 && !empty($post_itens) && is_array($post_itens)) {
        $itens_db = $post_itens;
        error_log("Usando itens enviados pelo app: " . count($itens_db));
    }

    if (count($itens_db) === 0) {
        throw new Exception("Não é possível fechar a venda sem itens!");
    }

    foreach ($itens_db as $item) {
        $produto = $item['produto'] ?? $item['id_produto'] ?? $item['id'] ?? null;
        $quantidade = isset($item['quantidade']) ? intval($item['quantidade']) : (isset($item['qtd']) ? intval($item['qtd']) : 1);
        $valor_item = $item['valor'] ?? $item['subtotal'] ?? $item['preco'] ?? 0;

        if ($itens_table && $colVendaItens) {
            if (isset($item['id'])) {
                $stmtUpd = $pdo->prepare("UPDATE `$itens_table` SET `$colVendaItens` = ? WHERE id = ?");
                $stmtUpd->execute([$id_venda, $item['id']]);
            } else {
                $insertColsI   = [];
                $insertPlaceI  = [];
                $bindsI        = [];
                if (in_array('produto', $cols_itens))    { $insertColsI[]='produto';   $insertPlaceI[]=':produto';   $bindsI[':produto']=$produto; }
                if (in_array('quantidade', $cols_itens)) { $insertColsI[]='quantidade';$insertPlaceI[]=':quantidade';$bindsI[':quantidade']=$quantidade; }
                if (in_array('valor', $cols_itens))      { $insertColsI[]='valor';     $insertPlaceI[]=':valor';     $bindsI[':valor']=$valor_item; }
                $insertColsI[] = $colVendaItens;         $insertPlaceI[]=':venda';     $bindsI[':venda']=$id_venda;
                if (in_array('cliente', $cols_itens))    { $insertColsI[]='cliente';   $insertPlaceI[]=':cliente';   $bindsI[':cliente']=$cliente; }

                $sqlI = "INSERT INTO `$itens_table` (" . implode(', ', $insertColsI) . ") VALUES (" . implode(', ', $insertPlaceI) . ")";
                $qi = $pdo->prepare($sqlI);
                foreach ($bindsI as $k => $v) $qi->bindValue($k, $v);
                $qi->execute();
            }
        }

        if ($produto) {
            $pdo->prepare("UPDATE produtos SET estoque = estoque - :q WHERE id = :p")
                ->execute([':q' => $quantidade, ':p' => $produto]);
        }
    }

    // --- contas_receber ---
    $cols_cr = $pdo->query("SHOW COLUMNS FROM contas_receber")->fetchAll(PDO::FETCH_COLUMN);
    // colunas reais que você informou
    $colVencCR  = 'vencimento'; // existe no seu banco
    $colVendaCR = 'id_venda';   // existe no seu banco
    $colUserCR  = in_array('usuario_lanc', $cols_cr) ? 'usuario_lanc' : (in_array('usuario', $cols_cr) ? 'usuario' : null);

    $valor_parcela = $valor / max(1, $parcelas);
    $baseVenc = $vencimento ?: $dataHoje;

    for ($i = 1; $i <= $parcelas; $i++) {
        if ($tipo_pgto == 'Dinheiro' && $parcelas == 1) {
            $data_parcela = $baseVenc;
            $pago = 'Sim';
            $statusCr = 'Concluída';
        } else {
            // parcelas mensais a partir da data escolhida
            $data_parcela = date('Y-m-d', strtotime($baseVenc . ' +'.($i-1).' month'));
            $pago = 'Não';
            $statusCr = 'Pendente';
        }

        $descricao = "Venda #$id_venda" . ($parcelas > 1 ? " - Parcela $i/$parcelas" : "");
        $obs       = "Venda #$id_venda - " . $tipo_pgto;

        $cols_ins = [];
        $vals_ins = [];
        $binds    = [];

        if (in_array('descricao', $cols_cr))  { $cols_ins[]='descricao';  $vals_ins[]=':descricao';  $binds[':descricao']=$descricao; }
        if (in_array('cliente', $cols_cr))    { $cols_ins[]='cliente';    $vals_ins[]=':cliente';    $binds[':cliente']=$cliente; }
        if (in_array('valor', $cols_cr))      { $cols_ins[]='valor';      $vals_ins[]=':valor';      $binds[':valor']=number_format($valor_parcela,2,'.',''); }
        if (in_array('data_lanc', $cols_cr))  { $cols_ins[]='data_lanc';  $vals_ins[]=':data_lanc';  $binds[':data_lanc']=$dataHoje; }
        if (in_array($colVencCR, $cols_cr))   { $cols_ins[]=$colVencCR;   $vals_ins[]=':vencimento'; $binds[':vencimento']=$data_parcela; }
        if (in_array('data_emissao', $cols_cr)){ $cols_ins[]='data_emissao'; $vals_ins[]=':data_emissao'; $binds[':data_emissao']=$data_emissao; }
        if ($colUserCR)                       { $cols_ins[]=$colUserCR;   $vals_ins[]=':usuario';    $binds[':usuario']=$usuario; }
        if (in_array('frequencia', $cols_cr)) { $cols_ins[]='frequencia'; $vals_ins[]=':frequencia'; $binds[':frequencia']='Uma Vez'; }
        if (in_array('obs', $cols_cr))        { $cols_ins[]='obs';        $vals_ins[]=':obs';        $binds[':obs']=$obs; }
        if (in_array('arquivo', $cols_cr))    { $cols_ins[]='arquivo';    $vals_ins[]=':arquivo';    $binds[':arquivo']=''; }
        if (in_array('pago', $cols_cr))       { $cols_ins[]='pago';       $vals_ins[]=':pago';       $binds[':pago']=$pago; }
        if (in_array('status', $cols_cr))     { $cols_ins[]='status';     $vals_ins[]=':status';     $binds[':status']=$statusCr; }
        if (in_array($colVendaCR, $cols_cr))  { $cols_ins[]=$colVendaCR;  $vals_ins[]=':venda';      $binds[':venda']=$id_venda; }
        if (in_array('entrada', $cols_cr) && $entrada !== null)   { $cols_ins[]='entrada';   $vals_ins[]=':entrada';   $binds[':entrada']=$entrada; }
        if (in_array('documento', $cols_cr) && $documento !== null){ $cols_ins[]='documento';$vals_ins[]=':documento'; $binds[':documento']=$documento; }
        if (in_array('plano_conta', $cols_cr) && $plano_conta !== null){ $cols_ins[]='plano_conta';$vals_ins[]=':plano_conta';$binds[':plano_conta']=$plano_conta; }

        $sql_cr = "INSERT INTO contas_receber (" . implode(', ', $cols_ins) . ") VALUES (" . implode(', ', $vals_ins) . ")";
        $stmt_cr = $pdo->prepare($sql_cr);
        foreach ($binds as $k => $v) $stmt_cr->bindValue($k, $v);
        $stmt_cr->execute();
    }

    $pdo->commit();
    echo json_encode(['sucesso'=>true,'mensagem'=>'Venda realizada com sucesso!','id_venda'=>$id_venda]);

} catch (Exception $e) {
    $pdo->rollBack();
    error_log("Erro ao processar venda: " . $e->getMessage());
    echo json_encode(['sucesso'=>false,'mensagem'=>$e->getMessage()]);
}