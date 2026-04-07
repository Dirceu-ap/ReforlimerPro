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
// termo opcional de busca (nome/descrição/local)
$busca = isset($_GET['fornecedor']) ? trim($_GET['fornecedor']) : '';
$buscaLower = strtolower($busca);

// Se não for informado período, retorna todos os títulos pendentes
if (!empty($data) && !empty($data1)) {
    if ($statusMode === 'all' || $statusMode === 'todos') {
        $query = $pdo->prepare("SELECT * FROM contas_pagar WHERE (vencimento BETWEEN '$data' and '$data1') order by vencimento asc, id asc ");
    } else {
        $query = $pdo->prepare("SELECT * FROM contas_pagar WHERE (vencimento BETWEEN '$data' and '$data1') and status = 'Pendente' order by vencimento asc, id asc ");
    }
} else {
    // Modo "todos pendentes": usa comparação case-insensitive para evitar
    // problemas com variações de texto (ex: 'pendente', 'Pendente ', etc.)
    if ($statusMode === 'all' || $statusMode === 'todos') {
        $query = $pdo->prepare("SELECT * FROM contas_pagar order by vencimento asc, id asc ");
    } else {
        $query = $pdo->prepare("SELECT * FROM contas_pagar WHERE UPPER(status) LIKE 'PENDENTE%' order by vencimento asc, id asc ");
    }
}

$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);

for ($i=  0; $i < count($res); $i++) { 
    foreach ($res[$i] as $key => $value) {
    }

    $cliente = $res[$i]['cliente'];
    $saida   = $res[$i]['saida'];

    // Para contas geradas a partir de Orçamento comum, o campo `cliente`
    // guarda o ID da tabela `clientes`, para manter o vínculo com o mesmo
    // cliente usado no orçamento.
    if ($saida === 'Orcamento') {
        $cliId = $cliente;
        $query1 = $pdo->query("SELECT * FROM clientes WHERE id = '$cliId' ");
        $res1 = $query1->fetchAll(PDO::FETCH_ASSOC);
        if(@count($res1) > 0){
            @$fornecedor_nome = $res1[0]['nome'];
        }else{
            @$fornecedor_nome = $res[$i]['descricao'];
        }
    } else {
        // Regra antiga: se começar com C- é colaborador, caso contrário fornecedor
        if (substr($cliente, 0, 2) === 'C-') {
            $colab_id = substr($cliente, 2);
            $query1 = $pdo->query("SELECT * from colaboradores where id = '$colab_id' ");
            $res1 = $query1->fetchAll(PDO::FETCH_ASSOC);
            if(@count($res1) > 0){
                @$fornecedor_nome = $res1[0]['nome'];
            }else{
                // fallback para fornecedor ou descrição
                $query1 = $pdo->query("SELECT * from fornecedores where id = '$colab_id' ");
                $res1 = $query1->fetchAll(PDO::FETCH_ASSOC);
                if(@count($res1) > 0){
                    @$fornecedor_nome = $res1[0]['nome'];
                }else{
                    @$fornecedor_nome = $res[$i]['descricao'];
                }
            }
        } else {
            $fornecedor = $cliente;
            $query1 = $pdo->query("SELECT * from fornecedores where id = '$fornecedor' ");
            $res1 = $query1->fetchAll(PDO::FETCH_ASSOC);
            if(@count($res1) > 0){
                @$fornecedor_nome = $res1[0]['nome'];
            }else{
                @$fornecedor_nome = $res[$i]['descricao'];
            }
        }
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

if(count($res) > 0){
    $result = json_encode(array('success'=>true, 'resultado'=>@$dados));
}else{
    $result = json_encode(array('success'=>false, 'resultado'=>'0'));
}

echo $result;

?>
