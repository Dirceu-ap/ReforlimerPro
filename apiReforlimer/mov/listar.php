<?php

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$quantidade = 13;

$data = $_GET['data'] ?? '';
$data1 = $_GET['data1'] ?? '';
$busca = $_GET['lanc'] ?? '';
$cliente = $_GET['cliente'] ?? '';
$includeSemLanc = isset($_GET['include_sem_lanc']) ? trim((string)$_GET['include_sem_lanc']) : '';
$incluirSemLanc = ($includeSemLanc === '1' || strtolower($includeSemLanc) === 'true' || strtolower($includeSemLanc) === 'sim');

$lancLimpo = trim((string)$busca);
$filtrarPorLanc = ($lancLimpo !== '' && strtolower($lancLimpo) !== 'all' && strtolower($lancLimpo) !== 'todos');

function buildLancamentoWhere(bool $filtrarPorLanc, bool $incluirSemLanc): string {
    if (!$filtrarPorLanc) {
        return '1=1';
    }

    if ($incluirSemLanc) {
        return "(lancamento = :lanc OR COALESCE(lancamento, '') = '')";
    }

    return 'lancamento = :lanc';
}

function bindLancamentoParams(PDOStatement $stmt, bool $filtrarPorLanc, string $lancLimpo): void {
    if ($filtrarPorLanc) {
        $stmt->bindValue(':lanc', $lancLimpo);
    }
}

if ($cliente != '') {
    $query = $pdo->prepare("SELECT id, 'receber' as tipo, cliente, valor, vencimento, status, descricao 
                            FROM contas_receber 
                            WHERE cliente LIKE :cliente");
    $query->bindValue(':cliente', "%$cliente%");
    $query->execute();
    $receber = $query->fetchAll(PDO::FETCH_ASSOC);

    $query2 = $pdo->prepare("SELECT id, 'pagar' as tipo, fornecedor as cliente, valor, vencimento, status, descricao 
                             FROM contas_pagar 
                             WHERE fornecedor LIKE :cliente");
    $query2->bindValue(':cliente', "%$cliente%");
    $query2->execute();
    $pagar = $query2->fetchAll(PDO::FETCH_ASSOC);

    $resultado = array_merge($receber, $pagar);

    echo json_encode(['resultado' => $resultado]);
    exit;
}

// Saldo geral
$total_saldo_geral = 0;
$total_saldo_geralF = 0;
$classe_saldo_geral = '#0d6327';
$whereLancamento = buildLancamentoWhere($filtrarPorLanc, $incluirSemLanc);
$sqlSaldo = "
    SELECT
        COALESCE(SUM(CASE WHEN tipo = 'Entrada' THEN valor ELSE -valor END), 0) AS saldo_geral,
        COUNT(*) AS total_linhas
    FROM movimentacoes
    WHERE {$whereLancamento}
";
$query_t = $pdo->prepare($sqlSaldo);
bindLancamentoParams($query_t, $filtrarPorLanc, $lancLimpo);
$query_t->execute();
$saldoRow = $query_t->fetch(PDO::FETCH_ASSOC);

$totalLinhasSaldo = (int)($saldoRow['total_linhas'] ?? 0);
$total_saldo_geral = (float)($saldoRow['saldo_geral'] ?? 0);
if($totalLinhasSaldo > 0){
    if($total_saldo_geral < 0){
        $classe_saldo_geral = '#ab3824';
    }
    $total_saldo_geralF = number_format($total_saldo_geral, 2, ',', '.');
}

// Consulta principal filtrando por data e tipo de lançamento
$query = $pdo->prepare("SELECT id, tipo, movimento, descricao, valor, usuario, data, lancamento, plano_conta, documento, local FROM movimentacoes WHERE (data BETWEEN :data AND :data1) AND {$whereLancamento} ORDER BY data ASC, id ASC");
$query->bindValue(':data', $data);
$query->bindValue(':data1', $data1);
bindLancamentoParams($query, $filtrarPorLanc, $lancLimpo);
$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);

$dados = [];
$total_saldo = 0;

$usuariosMap = [];
if (count($res) > 0) {
    $idsUsuarios = [];
    for ($i = 0; $i < count($res); $i++) {
        $uid = isset($res[$i]['usuario']) ? (string)$res[$i]['usuario'] : '';
        if ($uid !== '') {
            $idsUsuarios[$uid] = true;
        }
    }

    if (count($idsUsuarios) > 0) {
        $ids = array_keys($idsUsuarios);
        $idsSql = implode(',', array_map('intval', $ids));
        $queryUsuarios = $pdo->query("SELECT id, nome FROM usuarios WHERE id IN ($idsSql)");
        $resUsuarios = $queryUsuarios->fetchAll(PDO::FETCH_ASSOC);
        for ($u = 0; $u < count($resUsuarios); $u++) {
            $usuariosMap[(string)$resUsuarios[$u]['id']] = $resUsuarios[$u]['nome'];
        }
    }
}

for ($i = 0; $i < count($res); $i++) {
    $item = $res[$i];
    $id = $item['id'];
    $tipo = $item['tipo'];
    $movimento = $item['movimento'];
    $descricao = $item['descricao'];
    $valor = $item['valor'];
    $usuario = $item['usuario'];
    $data_mov = $item['data'];
    $lancamento = $item['lancamento'];
    $plano_conta = $item['plano_conta'];
    $documento = $item['documento'];
    $local = isset($item['local']) ? $item['local'] : '';

    // Saldo do período em ordem cronológica (equivale ao acumulado da consulta principal)
    $total_saldo_periodo = $total_saldo;

    // Atualiza saldo total
    if($tipo == 'Entrada'){
        $classe = '#0d6327';
        $total_saldo += $valor;
        $total_saldo_periodo += $valor;
        $classe_linha = '';
    }else{
        $classe = '#ab3824';
        $classe_linha = '#ab3824';
        $total_saldo -= $valor;
        $total_saldo_periodo -= $valor;
    }

    $classe_saldo = $total_saldo < 0 ? '#0d6327' : '#ab3824';
    $classe_saldo_periodo = $total_saldo_periodo < 0 ? '#ab3824' : '#0d6327';

    // Busca nome do usuário sem consulta por linha
    $nome_usu = isset($usuariosMap[(string)$usuario]) ? $usuariosMap[(string)$usuario] : "";

    // Formatação dos campos
    $data_formatada = implode('/', array_reverse(explode('-', $data_mov)));
    $valor_formatado = number_format($valor, 2, ',', '.');
    $total_saldoF = number_format($total_saldo, 2, ',', '.');
    $total_saldo_periodoF = number_format($total_saldo_periodo, 2, ',', '.');

    // Nome do cliente/fornecedor (opcional)
    $fornecedor_cliente = "";
    if (strpos($descricao, ' - ') !== false) {
        $fornecedor_cliente = explode(' - ', $descricao)[0];
    } else {
        $fornecedor_cliente = $descricao;
    }

    $dados[] = array(
        'id' => $id,
        'data' => $data_formatada,
        'classe' => $classe_linha,
        'movimento' => $movimento,
        'descricao' => $descricao,
        'local' => $local,
        'usuario' => $nome_usu,
        'documento' => $documento,
        'plano_conta' => $plano_conta,
        'valor' => $valor_formatado,
        'saldo_geral' => $total_saldo_geralF,
        'classe_saldo' => $classe_saldo_geral,
        'classe_valor' => $classe,
        'saldo_periodo' => $total_saldo_periodoF,
        'classe_periodo' => $classe_saldo_periodo,
    );
}

if(count($res) > 0){
    $result = json_encode(array(
        'success'=>true,
        'resultado'=>$dados,
        'total'=>$total_saldo_geralF,
        'classeSaldo'=>$classe_saldo_geral
    ));
}else{
    $result = json_encode(array(
        'success'=>false,
        'resultado'=>'0',
        'total'=>$total_saldo_geralF,
        'classeSaldo'=>$classe_saldo_geral
    ));
}

echo $result;

?>