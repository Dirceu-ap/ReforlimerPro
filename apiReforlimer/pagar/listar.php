<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

//$data = date("Y-m-d");
//$data_mes = date('Y-m-d', strtotime("+1 month", strtotime($data)));

$quantidade = 13;


$data = $_GET['data'] ?? '';
$data1 = $_GET['data1'] ?? '';
$statusMode = strtolower(trim((string)($_GET['status'] ?? 'pendente')));
// termo opcional de busca (nome/descrição/local)
$busca = isset($_GET['fornecedor']) ? trim($_GET['fornecedor']) : '';
$buscaLower = strtolower($busca);

// Consulta única para evitar N+1:
// 1) resolve nome exibido de cliente/fornecedor/colaborador
// 2) agrega resíduos por conta
$whereParts = [];
$params = [];

if (!empty($data) && !empty($data1)) {
    $whereParts[] = "(
        DATE(cp.vencimento) BETWEEN :dataIni1 AND :dataFim1
        OR DATE(COALESCE(cp.data_baixa, cp.vencimento)) BETWEEN :dataIni2 AND :dataFim2
        OR EXISTS (
            SELECT 1
            FROM valor_parcial vp2
            WHERE vp2.id_conta = cp.id
              AND UPPER(TRIM(COALESCE(vp2.tipo, ''))) LIKE 'PAGAR%'
              AND DATE(vp2.data) BETWEEN :dataIni3 AND :dataFim3
        )
    )";
    $params[':dataIni1'] = $data;
    $params[':dataFim1'] = $data1;
    $params[':dataIni2'] = $data;
    $params[':dataFim2'] = $data1;
    $params[':dataIni3'] = $data;
    $params[':dataFim3'] = $data1;

    if (!($statusMode === 'all' || $statusMode === 'todos')) {
        $whereParts[] = "cp.status = 'Pendente'";
    }
} else {
    if (!($statusMode === 'all' || $statusMode === 'todos')) {
        $whereParts[] = "UPPER(cp.status) LIKE 'PENDENTE%'";
    }
}

$whereSql = '';
if (count($whereParts) > 0) {
    $whereSql = 'WHERE ' . implode(' AND ', $whereParts);
}

$sql = "SELECT
            cp.*,
            COALESCE(
                CASE
                    WHEN cp.saida = 'Orcamento' THEN cli_orc.nome
                    WHEN cp.cliente LIKE 'C-%' THEN COALESCE(colab.nome, forn_colab.nome)
                    ELSE forn.nome
                END,
                cp.descricao
            ) AS fornecedor_nome_base,
            COALESCE(vp.total_resid, 0) AS total_resid
        FROM contas_pagar cp
        LEFT JOIN clientes cli_orc
               ON cp.saida = 'Orcamento' AND cli_orc.id = cp.cliente
        LEFT JOIN colaboradores colab
               ON cp.saida <> 'Orcamento'
              AND cp.cliente LIKE 'C-%'
              AND colab.id = SUBSTRING(cp.cliente, 3)
        LEFT JOIN fornecedores forn_colab
               ON cp.saida <> 'Orcamento'
              AND cp.cliente LIKE 'C-%'
              AND forn_colab.id = SUBSTRING(cp.cliente, 3)
        LEFT JOIN fornecedores forn
               ON cp.saida <> 'Orcamento'
              AND cp.cliente NOT LIKE 'C-%'
              AND forn.id = cp.cliente
        LEFT JOIN (
            SELECT id_conta, SUM(valor) AS total_resid
            FROM valor_parcial
            GROUP BY id_conta
        ) vp ON vp.id_conta = cp.id
        $whereSql
        ORDER BY cp.vencimento ASC, cp.id ASC";

$query = $pdo->prepare($sql);
$query->execute($params);

$res = $query->fetchAll(PDO::FETCH_ASSOC);
$dados = array();

for ($i=  0; $i < count($res); $i++) { 
    $fornecedor_nome = $res[$i]['fornecedor_nome_base'];

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
    // PEGAR RESIDUOS DA CONTA (já agregado na consulta)
    $total_resid = (float)$res[$i]['total_resid'];
    $valor_com_residuos = 0;
    $valor_conta = (float)$res[$i]['valor'];
    if($total_resid > 0){
        $fornecedor_nome = '(Resíduo) - ' .$fornecedor_nome;
        $valor_com_residuos = $valor_conta + $total_resid;
    }
    if($valor_com_residuos > 0){
        $vlr_antigo_conta = '('.$valor_com_residuos.')';
       
    }else{
        $vlr_antigo_conta = '';
       
    }
   

    // se houver termo de busca, filtra por nome (fornecedor_nome), descrição ou local
    if ($buscaLower !== '') {
        $nomeLower = strtolower($fornecedor_nome ?? '');
        $descLower = strtolower($res[$i]['descricao'] ?? '');
        $localLower = strtolower($res[$i]['local'] ?? '');

        if (
            strpos($nomeLower, $buscaLower) === false &&
            strpos($descLower, $buscaLower) === false &&
            strpos($localLower, $buscaLower) === false
        ) {
            continue; // não casa com o filtro, pula este registro
        }
    }

    $dados[] = array(
        'id' => $res[$i]['id'],
        'cliente' => $fornecedor_nome,
        'saida' => $res[$i]['saida'],
        'vencimento' => $res[$i]['vencimento'],
        'frequencia' => $res[$i]['frequencia'],
        'valor' => $res[$i]['valor'],
        'status' => $res[$i]['status'],
        'multa' => isset($res[$i]['multa']) ? $res[$i]['multa'] : '0',
        'juros' => isset($res[$i]['juros']) ? $res[$i]['juros'] : '0',
        'subtotal' => isset($res[$i]['subtotal']) ? $res[$i]['subtotal'] : $res[$i]['valor'],
        'devolucao' => isset($res[$i]['devolucao']) ? $res[$i]['devolucao'] : '0',
        'desconto' => isset($res[$i]['desconto']) ? $res[$i]['desconto'] : '0',
        'desconto_perc' => isset($res[$i]['desconto_perc']) ? $res[$i]['desconto_perc'] : '0',
        'acrescimo' => isset($res[$i]['acrescimo']) ? $res[$i]['acrescimo'] : '0',
        'acrescimo_perc' => isset($res[$i]['acrescimo_perc']) ? $res[$i]['acrescimo_perc'] : '0',
        'arquivo' => $res[$i]['arquivo'],
        'tumb' => $tumb_arquivo,
        'valor_antigo' => $vlr_antigo_conta,
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
