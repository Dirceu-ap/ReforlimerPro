<?php
header('Content-Type: application/json; charset=utf-8');
require_once("../conexao.php");
$pagina = 'contas_receber';

$postjson = json_decode(file_get_contents('php://input'), true);

$id = isset($postjson['id']) ? intval($postjson['id']) : 0;
$valor = @$postjson['valor'];
$valor = str_replace(',', '.', $valor);

$valor_desconto = @$postjson['desconto'];
$valor_desconto = str_replace(',', '.', $valor_desconto);

$valor_juros = @$postjson['juros'];
$valor_juros = str_replace(',', '.', $valor_juros);

$valor_multa = @$postjson['multa'];
$valor_multa = str_replace(',', '.', $valor_multa);

$valor_devolucao = @$postjson['devolucao'];
$valor_devolucao = str_replace(',', '.', $valor_devolucao);

$valor_acrescimo = @$postjson['acrescimo'];
$valor_acrescimo = str_replace(',', '.', $valor_acrescimo);

$valor_desconto_perc = @$postjson['desconto_perc'];
$valor_desconto_perc = str_replace(',', '.', $valor_desconto_perc);

$valor_acrescimo_perc = @$postjson['acrescimo_perc'];
$valor_acrescimo_perc = str_replace(',', '.', $valor_acrescimo_perc);

$subtotal = @$postjson['subtotal'];
$subtotal = str_replace(',', '.', $subtotal);

$saida = @$postjson['saida'];

$id_usuario = @$postjson['user'];

if ($id <= 0) {
    echo json_encode(array('mensagem' => 'ID inválido', 'sucesso' => false));
    exit();
}

function hasColumn($pdo, $table, $column){
    try{
        $stmt = $pdo->prepare("SHOW COLUMNS FROM {$table} LIKE :col");
        $stmt->bindValue(':col', $column);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC) ? true : false;
    }catch(Exception $e){
        return false;
    }
}

$temColunaAcrescimo = hasColumn($pdo, $pagina, 'acrescimo');


$data_atual = date('Y-m-d');
    $dia = date('d');
    $mes = date('m');
    $ano = date('Y');


$query = $pdo->query("SELECT * from $pagina where id = '$id' ");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
if (@count($res) == 0) {
    echo json_encode(array('mensagem' => 'Conta não encontrada!', 'sucesso' => false));
    exit();
}
$id = $res[0]['id'];
$cp1 = $res[0]['descricao'];
$cp2 = $res[0]['cliente'];
$cp3 = $res[0]['entrada'];
$cp4 = $res[0]['documento'];
$cp5 = $res[0]['plano_conta'];
$cp7 = $res[0]['vencimento'];
$cp8 = $res[0]['frequencia'];
$cp9 = $res[0]['valor'];
$data_rec = $res[0]['data_recor'];
$id_venda = $res[0]['id_venda'];
// campo de localidade (se existir na tabela)
$local = isset($res[0]['local']) ? $res[0]['local'] : '';

$query2 = $pdo->query("SELECT * FROM clientes WHERE id = '$cp2'");
$res2 = $query2->fetchAll(PDO::FETCH_ASSOC);
if(@count($res2) > 0){
$nome_fornecedor = $res2[0]['nome'];
$descricao_conta = $cp1 . ' - '. $nome_fornecedor;
}else{
$descricao_conta = $cp1;    
}


//RECUPERAR O CAIXA QUE ESTÁ ABERTO (CASO TENHA ALGUM)
$query2 = $pdo->query("SELECT * FROM caixa WHERE status = 'Aberto'");
$res2 = $query2->fetchAll(PDO::FETCH_ASSOC);
if(@count($res2) > 0){
    $caixa_aberto = $res2[0]['id'];
}else{
    $caixa_aberto = 0;
}




if($valor == $cp9){

    $juros_total = floatval($valor_juros);
    if(!$temColunaAcrescimo){
        $juros_total += floatval($valor_acrescimo);
    }
    $pdo->query("UPDATE $pagina set entrada = '$saida', usuario_baixa = '$id_usuario', status = 'Paga', juros = '$juros_total', multa = '$valor_multa', desconto = '$valor_desconto', subtotal = '$subtotal', data_baixa = curDate() where id = '$id'");

    //CRIAR A PRÓXIMA CONTA A PAGAR
    $frequencia = $cp8;
    $query1 = $pdo->query("SELECT * from frequencias where nome = '$frequencia' ");
    $res1 = $query1->fetchAll(PDO::FETCH_ASSOC);
    $dias_frequencia = @count($res1) > 0 ? intval($res1[0]['dias']) : 0;

    if($dias_frequencia == 30 || $dias_frequencia == 31){

        $data_recor = date('Y/m/d', strtotime("+1 month",strtotime($data_rec)));
        $nova_data_vencimento = date('Y/m/d', strtotime("+1 month",strtotime($cp7)));

    }else if($dias_frequencia == 90){ 

        $data_recor = date('Y/m/d', strtotime("+3 month",strtotime($data_rec)));
        $nova_data_vencimento = date('Y/m/d', strtotime("+3 month",strtotime($cp7)));

    }else if($dias_frequencia == 180){ 

        $data_recor = date('Y/m/d', strtotime("+6 month",strtotime($data_rec)));
        $nova_data_vencimento = date('Y/m/d', strtotime("+6 month",strtotime($cp7)));

    }else if($dias_frequencia == 360){ 

        $data_recor = date('Y/m/d', strtotime("+1 year",strtotime($data_rec)));
        $nova_data_vencimento = date('Y/m/d', strtotime("+1 year",strtotime($cp7)));

    }else{
        $data_recor = date('Y/m/d', strtotime("+$dias_frequencia days",strtotime($data_atual)));
        $nova_data_vencimento = date('Y/m/d', strtotime("+$dias_frequencia days",strtotime($cp7))); 
    }


    if(@$dias_frequencia > 0){
        $pdo->query("INSERT INTO $pagina set descricao = '$cp1', cliente = '$cp2', entrada = '$cp3', documento = '$cp4', plano_conta = '$cp5', data_emissao = curDate(), vencimento = '$nova_data_vencimento', frequencia = '$cp8', valor = '$cp9', usuario_lanc = '$id_usuario', status = 'Pendente', data_recor = '$data_recor', arquivo = 'sem-foto.jpg'");
                $id_ult_registro = $pdo->lastInsertId();

                $pdo->query("UPDATE $pagina set data_recor = '' where id='$id'");
    }

    

}else{

    $descricao_conta = '(Resíduo) ' .$descricao_conta;
    //PEGAR RESIDUOS DA CONTA
    $total_resid = 0;
    $query = $pdo->query("SELECT * FROM valor_parcial WHERE id_conta = '$id'");
    $res = $query->fetchAll(PDO::FETCH_ASSOC);
    if(@count($res) > 0){
    
        for($i=0; $i < @count($res); $i++){
        foreach ($res[$i] as $key => $value){} 
            $valor_resid = $res[$i]['valor'];
            $total_resid += $valor_resid;
        }
    }

    $cp9 = $cp9 - $subtotal;

    $pdo->query("INSERT INTO valor_parcial set id_conta = '$id', tipo = 'Pagar', valor = '$subtotal', data = curDate(), usuario = '$id_usuario'");

    $juros_total = floatval($valor_juros);
    if(!$temColunaAcrescimo){
        $juros_total += floatval($valor_acrescimo);
    }
    $pdo->query("UPDATE $pagina set entrada = '$saida', usuario_baixa = '$id_usuario', status = 'Pendente', juros = '$juros_total', multa = '$valor_multa', desconto = '$valor_desconto', valor = '$cp9', subtotal = '$subtotal', data_baixa = curDate() where id = '$id'");

}

$camposOpcionais = array(
    'devolucao' => ($valor_devolucao !== '' ? $valor_devolucao : '0'),
    'desconto_perc' => ($valor_desconto_perc !== '' ? $valor_desconto_perc : '0'),
    'acrescimo' => ($valor_acrescimo !== '' ? $valor_acrescimo : '0'),
    'acrescimo_perc' => ($valor_acrescimo_perc !== '' ? $valor_acrescimo_perc : '0')
);

foreach($camposOpcionais as $campo => $valorCampo){
    if(hasColumn($pdo, $pagina, $campo)){
        $upd = $pdo->prepare("UPDATE {$pagina} SET {$campo} = :valor WHERE id = :id");
        $upd->bindValue(':valor', $valorCampo);
        $upd->bindValue(':id', $id);
        @$upd->execute();
    }
}

//LANÇAR NAS MOVIMENTAÇÕES (inclui local quando existir)
    $pdo->query("INSERT INTO movimentacoes set tipo = 'Entrada', movimento = 'Conta à Receber', descricao = '$descricao_conta', valor = '$subtotal', usuario = '$id_usuario', data = curDate(), lancamento = '$saida', plano_conta = '$cp5', documento = '$cp4', caixa_periodo = '$caixa_aberto', id_mov = '$id_venda', local = '$local'");



//VERIFICAR SE A CONTA É DE UMA VENDA E SE ELA ESTÁ TOTALMENTE PAGA
$query = $pdo->query("SELECT * FROM $pagina WHERE id_venda = '$id_venda'");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$paga = 'Sim';
for($i=0; $i < @count($res); $i++){
        foreach ($res[$i] as $key => $value){} 
        $status = $res[$i]['status'];
        if($status == 'Pendente'){
            $paga = 'Não';
        }
}
if($paga == 'Sim'){
    $pdo->query("UPDATE vendas set status = 'Concluída', data_pgto = curDate() where id = '$id_venda'");
}



echo json_encode(array('mensagem'=>'Salvo com sucesso!', 'sucesso'=>true));

?>