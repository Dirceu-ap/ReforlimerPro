<?php
// filepath: /C:/xampp/htdocs/apiFinanceiroAula3/orcamento/salvar.php
header('Content-Type: application/json; charset=utf-8');
require_once(__DIR__ . "/../conexao.php");

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $json = file_get_contents('php://input');
    $dados = json_decode($json, true);
    
    $id = $dados['id'] ?? '0';
    $cliente_id = $dados['cliente_id'];
    $data_orcamento = $dados['data_orcamento'];
    $validade = $dados['validade'];
    $status = $dados['status'];
    $descricao = $dados['descricao'] ?? '';
    $observacoes = $dados['observacoes'] ?? '';
    $valor_total = $dados['valor_total'];
    $produtos = $dados['produtos'] ?? [];
    $gerar_conta = $dados['gerar_conta_pagar'] ?? false;
    $vencimento_conta = $dados['vencimento_conta'] ?? null;
    $usuario = $dados['usuario'] ?? '';
    
    $pdo->beginTransaction();
    
    if ($id === '0') {
        // Inserir novo orçamento
        $sql = "INSERT INTO orcamentos (cliente_id, data_orcamento, validade, status, descricao, observacoes, valor_total, usuario, data_cadastro) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$cliente_id, $data_orcamento, $validade, $status, $descricao, $observacoes, $valor_total, $usuario]);
        $orcamento_id = $pdo->lastInsertId();
    } else {
        // Atualizar orçamento existente
        $sql = "UPDATE orcamentos SET cliente_id=?, data_orcamento=?, validade=?, status=?, descricao=?, observacoes=?, valor_total=? WHERE id=?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$cliente_id, $data_orcamento, $validade, $status, $descricao, $observacoes, $valor_total, $id]);
        $orcamento_id = $id;
        
        // Deletar produtos antigos
        $pdo->prepare("DELETE FROM orcamento_produtos WHERE orcamento_id=?")->execute([$orcamento_id]);
    }
    
    // Inserir produtos
    $sqlProd = "INSERT INTO orcamento_produtos (orcamento_id, produto_id, quantidade, valor_unitario, subtotal) VALUES (?, ?, ?, ?, ?)";
    $stmtProd = $pdo->prepare($sqlProd);
    
    foreach ($produtos as $prod) {
        $stmtProd->execute([
            $orcamento_id,
            $prod['produto_id'],
            $prod['quantidade'],
            $prod['valor_unitario'],
            $prod['subtotal']
        ]);
    }
    
    $conta_id = null;
    
    // Gerar conta a pagar se solicitado e status aprovado
    if ($gerar_conta && $status === 'Aprovado' && $vencimento_conta) {
        // Buscar nome do cliente
        $stmtCliente = $pdo->prepare("SELECT nome FROM clientes WHERE id=?");
        $stmtCliente->execute([$cliente_id]);
        $cliente = $stmtCliente->fetch(PDO::FETCH_ASSOC);
        
        $sqlConta = "INSERT INTO pagar (fornecedor, vencimento, valor, descricao, status, frequencia, saida, usuario, data_lancamento) 
                     VALUES (?, ?, ?, ?, 'Pendente', 'Uma Vez', 'A Definir', ?, NOW())";
        $stmtConta = $pdo->prepare($sqlConta);
        $stmtConta->execute([
            $cliente['nome'],
            $vencimento_conta,
            $valor_total,
            "Orçamento #$orcamento_id - $descricao",
            $usuario
        ]);
        $conta_id = $pdo->lastInsertId();
        
        // Atualizar orçamento com referência da conta
        $pdo->prepare("UPDATE orcamentos SET conta_pagar_id=? WHERE id=?")->execute([$conta_id, $orcamento_id]);
    }
    
    $pdo->commit();
    
    echo json_encode([
        'sucesso' => true,
        'mensagem' => 'Orçamento salvo com sucesso',
        'orcamento_id' => $orcamento_id,
        'conta_id' => $conta_id
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Erro salvar orçamento: " . $e->getMessage());
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro ao salvar: ' . $e->getMessage()
    ]);
}
?>