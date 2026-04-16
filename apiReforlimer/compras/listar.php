<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

//$data = date("Y-m-d");
//$data_mes = date('Y-m-d', strtotime("+1 month", strtotime($data)));

$quantidade = 13;

//$pagina = @$_GET['pagina'] * $quantidade;

$data = @$_GET['data'];
$data1 = @$_GET['data1'];

$query = $pdo->prepare("SELECT * FROM compras WHERE (data_lanc BETWEEN '$data' and '$data1') order by data_lanc asc, id asc ");

$query->execute();

$res = $query->fetchAll(PDO::FETCH_ASSOC);

for ($i=  0; $i < count($res); $i++) { 
    foreach ($res[$i] as $key => $value) {
    }

   $id = $res[$i]['id'];
        $cp1 = $res[$i]['valor'];
        $cp2 = $res[$i]['usuario'];
        $cp3 = $res[$i]['pagamento'];
        $cp4 = $res[$i]['lancamento'];
        $cp5 = $res[$i]['data_lanc'];
        $cp6 = $res[$i]['data_pgto'];
       
        $cp10 = $res[$i]['parcelas'];
        $cp11 = $res[$i]['status'];
        $cp12 = $res[$i]['cliente'];

            $cp1 = number_format($cp1, 2, ',', '.');            
            $cp6 = implode('/', array_reverse(explode('-', $cp6)));
            $cp5 = implode('/', array_reverse(explode('-', $cp5)));

            $query1 = $pdo->query("SELECT * from fornecedores where id = '$cp12' ");
        $res1 = $query1->fetchAll(PDO::FETCH_ASSOC);
        if(@count($res1) > 0){
            $nome_cliente = $res1[0]['nome'];
                        
        }else{
            $nome_cliente = 'Sem Fornecedor';
        }


        $query1 = $pdo->query("SELECT * from usuarios where id = '$cp2' ");
        $res1 = $query1->fetchAll(PDO::FETCH_ASSOC);
        $nome_usuario = $res1[0]['nome'];

        if($cp11 == 'Concluída'){
            $classe = '#046b33';
            $ocultar = '';
            
        }else if($cp11 == 'Cancelada'){
            $classe = '#e37d10';
            $ocultar = 'd-none';
        }
        else{
            $classe = '#bf0808';
            $ocultar = '';
            }
   

    $dados[] = array(
        'id' => $id,
        'valor' => $cp1,
        'usuario' => $cp2,
        'pagamento' => $cp3,
        'lancamento' => $cp4,
        'data_lanc' => $cp5,
        'data_pgto' => $cp6,
        
        'parcelas' => $cp10,
        'status' => $cp11,
        'cliente' => $nome_cliente,
        'cor' => $classe,
    );
}

if(count($res) > 0){
    $result = json_encode(array('success'=>true, 'resultado'=>@$dados));
}else{
    $result = json_encode(array('success'=>false, 'resultado'=>'0'));
}

echo $result;

?>