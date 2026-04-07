<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

//$data = date("Y-m-d");
//$data_mes = date('Y-m-d', strtotime("+1 month", strtotime($data)));

$quantidade = 13;

//$pagina = @$_GET['pagina'] * $quantidade;

$data = @$_GET['data'];
$data1 = @$_GET['data1'];
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

// Se não for informado período, retorna todos os títulos pendentes
if (!empty($data) && !empty($data1)) {
    if ($statusMode === 'all' || $statusMode === 'todos') {
        $query = $pdo->prepare("SELECT * FROM contas_receber WHERE (vencimento BETWEEN '$data' and '$data1') order by vencimento asc, id asc ");
    } else {
        $query = $pdo->prepare("SELECT * FROM contas_receber WHERE (vencimento BETWEEN '$data' and '$data1') and status = 'Pendente' order by vencimento asc, id asc ");
    }
} else {
    // Modo "todos pendentes": usa comparação case-insensitive para evitar
    // problemas com variações de texto (ex: 'pendente', 'Pendente ', etc.)
    if ($statusMode === 'all' || $statusMode === 'todos') {
        $query = $pdo->prepare("SELECT * FROM contas_receber order by vencimento asc, id asc ");
    } else {
        $query = $pdo->prepare("SELECT * FROM contas_receber WHERE UPPER(status) LIKE 'PENDENTE%' order by vencimento asc, id asc ");
    }
}

$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);
$dados = array();

for ($i=  0; $i < count($res); $i++) { 
    foreach ($res[$i] as $key => $value) {
    }

    $fornecedor = $res[$i]['cliente'];

    $query1 = $pdo->query("SELECT * from clientes where id = '$fornecedor' ");
    $res1 = $query1->fetchAll(PDO::FETCH_ASSOC);
    if(@count($res1) > 0){
         @$fornecedor_nome = $res1[0]['nome'];
     }else{
         @$fornecedor_nome = $res[$i]['descricao'];
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


        //PEGAR RESIDUOS DA CONTA
    $total_resid = 0;
    $valor_com_residuos = 0;
    $id = $res[$i]['id'];
    $valor_conta = $res[$i]['valor'];
    $query2 = $pdo->query("SELECT * FROM valor_parcial WHERE id_conta = '$id'");
    $res2 = $query2->fetchAll(PDO::FETCH_ASSOC);
    if(@count($res2) > 0){

        $fornecedor_nome = '(Resíduo) - ' .$fornecedor_nome;

        for($i2=0; $i2 < @count($res2); $i2++){
            foreach ($res2[$i2] as $key => $value){} 
                $id_res = $res2[$i2]['id'];
            $valor_resid = $res2[$i2]['valor'];
            $total_resid += $valor_resid;
        }


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