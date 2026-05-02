<?php 

include_once('../conexao.php');

$postjson = json_decode(file_get_contents('php://input'), true);

//$data = date("Y-m-d");
//$data_mes = date('Y-m-d', strtotime("+1 month", strtotime($data)));

$quantidade = 13;


$data = $_GET['data'] ?? '';
$data1 = $_GET['data1'] ?? '';

$query = $pdo->prepare("SELECT c.*, COALESCE(f.nome, 'Sem Fornecedor') AS nome_cliente, u.nome AS nome_usuario
                        FROM compras c
                        LEFT JOIN fornecedores f ON f.id = c.cliente
                        LEFT JOIN usuarios u ON u.id = c.usuario
                        WHERE c.data_lanc BETWEEN :dataIni AND :dataFim
                        ORDER BY c.data_lanc ASC, c.id ASC");

$query->execute([
    ':dataIni' => $data,
    ':dataFim' => $data1,
]);

$res = $query->fetchAll(PDO::FETCH_ASSOC);

for ($i=  0; $i < count($res); $i++) { 
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

        $nome_cliente = $res[$i]['nome_cliente'];
        $nome_usuario = $res[$i]['nome_usuario'];

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
    $result = json_encode(array('success'=>true, 'resultado'=>$dados));
}else{
    $result = json_encode(array('success'=>false, 'resultado'=>'0'));
}

echo $result;

?>