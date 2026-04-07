<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

$id = @$_GET['id'];

$query = $pdo->prepare("SELECT * from contas_receber where id = '$id'");

$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);

for ($i=0; $i < count($res); $i++) { 
    foreach ($res[$i] as $key => $value) {
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

    $fornecedor = $res[$i]['cliente'];

    $query1 = $pdo->query("SELECT * from clientes where id = '$fornecedor' ");
    $res1 = $query1->fetchAll(PDO::FETCH_ASSOC);
    if(@count($res1) > 0){
          $tel_cli = $res1[0]['telefone'];
         @$fornecedor_nome = $res1[0]['nome'];
     }else{
         @$fornecedor_nome = $res[$i]['descricao'];
         $tel_cli = "";
     }

     $usu = $res[$i]['usuario_lanc'];
     $query1 = $pdo->query("SELECT * from usuarios where id = '$usu' ");
    $res1 = $query1->fetchAll(PDO::FETCH_ASSOC);
    if(@count($res1) > 0){
        $nome_usu_lanc = $res1[0]['nome'];
    }else{
        $nome_usu_lanc = 'Sem Usuário';
    }

    $data_emissao = implode('/', array_reverse(explode('-', $res[$i]['data_emissao'])));
    $data_venc = implode('/', array_reverse(explode('-', $res[$i]['vencimento'])));
    
    $valorF = number_format($res[$i]['valor'], 2, ',', '.');
    $subtotalRaw = isset($res[$i]['subtotal']) ? $res[$i]['subtotal'] : '';
    if($subtotalRaw === '' || $subtotalRaw === null){
        $subtotalRaw = $res[$i]['valor'];
    }


    $dados = array(
        'id' => $res[$i]['id'],
        'forn' => $res[$i]['cliente'],
        'fornF' => $fornecedor_nome,
        'saida' => $res[$i]['entrada'],
        'vencimento' => $res[$i]['vencimento'],
        'emis' => $res[$i]['data_emissao'],
        'vencF' => $data_venc,
        'emissao' => $data_emissao,
        'freq' => $res[$i]['frequencia'],
        'valor' => $res[$i]['valor'],
        'valorF' => $valorF,
        'multa' => isset($res[$i]['multa']) ? $res[$i]['multa'] : '0',
        'juros' => isset($res[$i]['juros']) ? $res[$i]['juros'] : '0',
        'subtotal' => $subtotalRaw,
        'status' => $res[$i]['status'],
        'arq' => $res[$i]['arquivo'],
        'usu' => $nome_usu_lanc,
        'plano' => $res[$i]['plano_conta'],
        'doc' => $res[$i]['documento'],
        'tumb' => $tumb_arquivo,
        'descricao' => $res[$i]['descricao'],
        'devolucao' => isset($res[$i]['devolucao']) ? $res[$i]['devolucao'] : '0',
        'desconto' => isset($res[$i]['desconto']) ? $res[$i]['desconto'] : '0',
        'desconto_perc' => isset($res[$i]['desconto_perc']) ? $res[$i]['desconto_perc'] : '0',
        'acrescimo' => isset($res[$i]['acrescimo']) ? $res[$i]['acrescimo'] : '0',
        'acrescimo_perc' => isset($res[$i]['acrescimo_perc']) ? $res[$i]['acrescimo_perc'] : '0',
        'local' => isset($res[$i]['local']) ? $res[$i]['local'] : '',
        'tel' => $tel_cli,

    );

      
}

if(count($res) > 0){
    $result = json_encode(array('success'=>true, 'dados'=>$dados));
}else{
    $result = json_encode(array('success'=>false, 'resultado'=>'0'));
}

echo $result;

?>