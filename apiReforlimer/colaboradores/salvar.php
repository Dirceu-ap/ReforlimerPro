<?php 

require_once("../conexao.php");
$pagina = 'colaboradores';

$postjson = json_decode(file_get_contents('php://input'), true);

$id       = @$postjson['id'];
$nome     = @$postjson['nome'];
$telefone = @$postjson['celular'];
$email    = @$postjson['email'];
$endereco = @$postjson['endereco'];
$ativo    = @$postjson['ativo'];
$cpf      = @$postjson['cpf'];
$pessoa   = @$postjson['pessoa'];
$obs      = @$postjson['obs'];
$rg       = @$postjson['rg'];
$pix      = @$postjson['pix'];
$conta    = @$postjson['conta'];
$agencia  = @$postjson['agencia'];
$banco    = @$postjson['banco'];

// Novos campos
$funcao         = @$postjson['funcao'];
$salario_diario = @$postjson['salario_diario'];

$data = date('Y-m-d');

// VALIDAR CPF/CNPJ (doc) ÚNICO
$query = $pdo->query("SELECT * FROM $pagina WHERE doc = '$cpf'");
$res = $query->fetchAll(PDO::FETCH_ASSOC);
$total_reg = @count($res);
$id_reg = @$res[0]['id'];

if ($total_reg > 0 && $id_reg != $id) {
    $result = json_encode(array('mensagem' => 'CPF/CNPJ já Cadastrado!', 'sucesso' => false));
    echo $result;
    exit();
}

if ($id == "" || $id == "0") {
    // INSERT
    $sql = "INSERT INTO $pagina SET 
                nome           = :nome, 
                telefone       = :telefone, 
                email          = :email, 
                endereco       = :endereco, 
                ativo          = :ativo, 
                pessoa         = :pessoa, 
                doc            = :cpf, 
                obs            = :obs, 
                rg             = :rg,
                pix            = :pix,
                data           = curDate(), 
                conta          = :conta, 
                agencia        = :agencia, 
                banco          = :banco,
                funcao         = :funcao,
                salario_diario = :salario_diario";
} else {
    // UPDATE
    $sql = "UPDATE $pagina SET 
                nome           = :nome, 
                telefone       = :telefone, 
                email          = :email, 
                endereco       = :endereco, 
                ativo          = :ativo, 
                pessoa         = :pessoa, 
                doc            = :cpf, 
                obs            = :obs, 
                rg             = :rg,
                pix            = :pix,
                data           = curDate(), 
                conta          = :conta, 
                agencia        = :agencia, 
                banco          = :banco,
                funcao         = :funcao,
                salario_diario = :salario_diario
            WHERE id = '$id'";
}

$res = $pdo->prepare($sql);

$res->bindValue(":nome", $nome);
$res->bindValue(":telefone", $telefone);
$res->bindValue(":email", $email);
$res->bindValue(":endereco", $endereco);
$res->bindValue(":ativo", $ativo);
$res->bindValue(":cpf", $cpf);
$res->bindValue(":obs", $obs);
$res->bindValue(":rg", $rg);
$res->bindValue(":pix", $pix);
$res->bindValue(":pessoa", $pessoa);
$res->bindValue(":conta", $conta);
$res->bindValue(":agencia", $agencia);
$res->bindValue(":banco", $banco);
$res->bindValue(":funcao", $funcao);
$res->bindValue(":salario_diario", $salario_diario);

@$res->execute();

$result = json_encode(array('mensagem' => 'Salvo com sucesso!', 'sucesso' => true));

echo $result;

?>
