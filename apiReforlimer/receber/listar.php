<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

//$data = date("Y-m-d");
//$data_mes = date('Y-m-d', strtotime("+1 month", strtotime($data)));

$quantidade = 13;


$data = $_GET['data'] ?? '';
$data1 = $_GET['data1'] ?? '';
$statusMode = strtolower(trim((string)($_GET['status'] ?? 'pendente')));
// termo opcional de busca (cliente/descricao/local/entrada)
$busca = '';
if (isset($_GET['cliente'])) {
    $busca = trim((string)$_GET['cliente']);
} elseif (isset($_GET['fornecedor'])) {
    $busca = trim((string)$_GET['fornecedor']);
} elseif (isset($_GET['busca'])) {
    $busca = trim((string)$_GET['busca']);
}
$buscaLower = strtolower($busca);

// Query otimizada: evita N+1 com join de clientes e agregação de resíduos.
$whereParts = array();
$params = array();

if (!empty($data) && !empty($data1)) {
    $whereParts[] = "(
        DATE(cr.vencimento) BETWEEN :dataIni1 AND :dataFim1
        OR DATE(COALESCE(cr.data_baixa, cr.vencimento)) BETWEEN :dataIni2 AND :dataFim2
        OR EXISTS (
            SELECT 1
            FROM valor_parcial vp2
            WHERE vp2.id_conta = cr.id
              AND UPPER(TRIM(COALESCE(vp2.tipo, ''))) LIKE 'RECEBER%'
              AND DATE(vp2.data) BETWEEN :dataIni3 AND :dataFim3
        )
    )";
    $params[':dataIni1'] = $data;
    $params[':dataFim1'] = $data1;
    $params[':dataIni2'] = $data;
    $params[':dataFim2'] = $data1;
    $params[':dataIni3'] = $data;
    $params[':dataFim3'] = $data1;
}

if (!($statusMode === 'all' || $statusMode === 'todos')) {
    $whereParts[] = "UPPER(cr.status) LIKE 'PENDENTE%'";
}

$sql = "
    SELECT
        cr.*,
        c.nome AS cliente_nome,
        COALESCE(vp.total_resid, 0) AS total_resid,
        COALESCE(vp.qtd_resid, 0) AS qtd_resid
    FROM contas_receber cr
    LEFT JOIN clientes c ON c.id = cr.cliente
    LEFT JOIN (
        SELECT
            id_conta,
            SUM(valor) AS total_resid,
            COUNT(*) AS qtd_resid
        FROM valor_parcial
        WHERE UPPER(TRIM(COALESCE(tipo, ''))) LIKE 'RECEBER%'
        GROUP BY id_conta
    ) vp ON vp.id_conta = cr.id
";

if (count($whereParts) > 0) {
    $sql .= " WHERE " . implode(' AND ', $whereParts);
}

$sql .= " ORDER BY cr.vencimento ASC, cr.id ASC ";

$query = $pdo->prepare($sql);
$query->execute($params);

$res = $query->fetchAll(PDO::FETCH_ASSOC);
$dados = array();

for ($i=  0; $i < count($res); $i++) { 
    foreach ($res[$i] as $key => $value) {
    }

    $fornecedor_nome = trim((string)($res[$i]['cliente_nome'] ?? ''));
    if($fornecedor_nome === ''){
        $fornecedor_nome = $res[$i]['descricao'];
    }

     $arquivo = $res[$i]['arquivo'];
     //EXTRAIR EXTENSÃO DO ARQUIVO
    $ext = pathinfo($arquivo, PATHINFO_EXTENSION);   
    if($ext == 'pdf'){ 
        $tumb_arquivo = 'pdf.png';
    }else if($ext == 'rar' || $ext == 'zip'){
        $tumb_arquivo = 'rar.png';
    }else{
        $tumb_arquivo = $arquivo;
    }


    // Usamos agregado de resíduos já retornado no SELECT principal.
    $total_resid = (float)($res[$i]['total_resid'] ?? 0);
    $qtd_resid = (int)($res[$i]['qtd_resid'] ?? 0);
    $valor_com_residuos = 0;
    $valor_conta = (float)($res[$i]['valor'] ?? 0);
    if($qtd_resid > 0){

        $fornecedor_nome = '(Resíduo) - ' .$fornecedor_nome;

        $valor_com_residuos = $valor_conta + $total_resid;
    }
    if($valor_com_residuos > 0){
        $vlr_antigo_conta = '('.$valor_com_residuos.')';
       
    }else{
        $vlr_antigo_conta = '';
       
    }
   

    // se houver termo de busca, filtra por cliente, descricao, local e entrada/saida
    if ($buscaLower !== '') {
        $nomeLower = strtolower((string)($fornecedor_nome ?? ''));
        $descLower = strtolower((string)($res[$i]['descricao'] ?? ''));
        $localLower = strtolower((string)($res[$i]['local'] ?? ''));
        $entradaLower = strtolower((string)($res[$i]['entrada'] ?? ''));

        if (
            strpos($nomeLower, $buscaLower) === false &&
            strpos($descLower, $buscaLower) === false &&
            strpos($localLower, $buscaLower) === false &&
            strpos($entradaLower, $buscaLower) === false
        ) {
            continue;
        }
    }

    $dados[] = array(
        'id' => $res[$i]['id'],
        'cliente' => $fornecedor_nome,
        'saida' => $res[$i]['entrada'],
        'vencimento' => $res[$i]['vencimento'],
        'frequencia' => $res[$i]['frequencia'],
        'valor' => $res[$i]['valor'],
        'status' => $res[$i]['status'],
        'arquivo' => $res[$i]['arquivo'],
        'tumb' => $tumb_arquivo,
        'valor_antigo' => $vlr_antigo_conta,
        'devolucao' => isset($res[$i]['devolucao']) ? $res[$i]['devolucao'] : '0',
        'desconto' => isset($res[$i]['desconto']) ? $res[$i]['desconto'] : '0',
        'desconto_perc' => isset($res[$i]['desconto_perc']) ? $res[$i]['desconto_perc'] : '0',
        'acrescimo' => isset($res[$i]['acrescimo']) ? $res[$i]['acrescimo'] : '0',
        'acrescimo_perc' => isset($res[$i]['acrescimo_perc']) ? $res[$i]['acrescimo_perc'] : '0',
        // Campos adicionais usados pelo app para filtro/visualização
        'descricao' => $res[$i]['descricao'],
        'local' => isset($res[$i]['local']) ? $res[$i]['local'] : '',
    );
}

if(count($dados) > 0){
    $result = json_encode(array('success'=>true, 'resultado'=>$dados));
}else{
    $result = json_encode(array('success'=>false, 'resultado'=>'0'));
}

echo $result;

?>