<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

require_once('../conexao.php');

$mes = isset($_GET['mes']) ? $_GET['mes'] : date('Y-m'); // formato yyyy-MM
$dataInicio = isset($_GET['data_inicio']) ? $_GET['data_inicio'] : null; // formato yyyy-MM-dd
$dataFim = isset($_GET['data_fim']) ? $_GET['data_fim'] : null; // formato yyyy-MM-dd

// Validação simples do formato do mês
if (!preg_match('/^\d{4}-\d{2}$/', $mes)) {
    echo json_encode(['success' => false, 'message' => 'Parâmetro "mes" inválido']);
    exit;
}

// Validação opcional de data_inicio e data_fim, se informados
if ($dataInicio !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataInicio)) {
    echo json_encode(['success' => false, 'message' => 'Parâmetro "data_inicio" inválido']);
    exit;
}

if ($dataFim !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataFim)) {
    echo json_encode(['success' => false, 'message' => 'Parâmetro "data_fim" inválido']);
    exit;
}

try {
    // ATENÇÃO: garanta que a tabela livro_ponto tenha estas colunas:
    // id, colaborador_id, data, entrada, saida, total_horas,
    // almoco_saida, almoco_retorno, observacao, local

    $sql = "SELECT 
                lp.id,
                lp.data AS data,
                lp.entrada,
                lp.saida,
                lp.total_horas,
                lp.almoco_saida,
                lp.almoco_retorno,
                lp.observacao,
                lp.local AS local,
                lp.colaborador_id AS colaborador_id,
                c.nome AS colaborador_nome
            FROM livro_ponto lp
            LEFT JOIN colaboradores c ON c.id = lp.colaborador_id";

    $conditions = [];
    $params = [];

    // Se datas forem informadas, elas prevalecem sobre o filtro de mês
    if ($dataInicio !== null || $dataFim !== null) {
        if ($dataInicio !== null) {
            $conditions[] = 'lp.data >= :data_inicio';
            $params[':data_inicio'] = $dataInicio;
        }
        if ($dataFim !== null) {
            $conditions[] = 'lp.data <= :data_fim';
            $params[':data_fim'] = $dataFim;
        }
    } else {
        $conditions[] = "DATE_FORMAT(lp.data, '%Y-%m') = :mes";
        $params[':mes'] = $mes;
    }

    if (!empty($conditions)) {
        $sql .= ' WHERE ' . implode(' AND ', $conditions);
    }

    $sql .= ' ORDER BY lp.data ASC, colaborador_nome ASC';

    $stmt = $pdo->prepare($sql);

    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();

    $res = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($res) > 0) {
        echo json_encode([
            'success'  => true,
            'resultado'=> $res,
        ]);
    } else {
        echo json_encode([
            'success'  => true,
            'resultado'=> [],
        ]);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Erro: ' . $e->getMessage()]);
}

