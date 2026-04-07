<?php

function lc_normalize_text($value) {
    $text = trim((string)$value);
    if ($text === '') return '';

    $lower = strtolower($text);
    $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $lower);
    if ($normalized === false) {
        $normalized = $lower;
    }

    return preg_replace('/\s+/', ' ', trim($normalized));
}

function lc_extrair_nome_plano($planoConta) {
    $texto = trim((string)$planoConta);
    if ($texto === '') return '';

    if (strpos($texto, ' - ') !== false) {
        $partes = explode(' - ', $texto, 2);
        $nome = trim((string)($partes[1] ?? ''));
        if ($nome !== '') return $nome;
    }

    return $texto;
}

function lc_unique_contas($lista) {
    $map = array();

    foreach ($lista as $item) {
        $nome = trim((string)$item);
        if ($nome === '') continue;

        $key = lc_normalize_text($nome);
        if ($key === '') continue;

        if (!isset($map[$key])) {
            $map[$key] = $nome;
        }
    }

    $dados = array_values($map);
    sort($dados, SORT_NATURAL | SORT_FLAG_CASE);

    return $dados;
}

function lc_ensure_table($pdo) {
    $sql = "CREATE TABLE IF NOT EXISTS lancamentos_custos_contas_config (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        nome VARCHAR(180) NOT NULL,
        selecionada TINYINT(1) NOT NULL DEFAULT 0,
        origem VARCHAR(30) NOT NULL DEFAULT 'manual',
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_lcc_nome (nome)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

    $pdo->exec($sql);
}

function lc_contas_iniciais() {
    return array(
        'Aluguel de imoveis',
        'Elektro',
        'BRK',
        'Impostos',
        'Guia de arrecadacao',
        'Venda',
        'Folha de pagamento'
    );
}

function lc_seed_contas_iniciais($pdo) {
    $iniciais = lc_contas_iniciais();

    $stmt = $pdo->prepare("INSERT INTO lancamentos_custos_contas_config (nome, selecionada, origem) VALUES (:nome, 1, 'padrao') ON DUPLICATE KEY UPDATE selecionada = selecionada");

    foreach ($iniciais as $nome) {
        $stmt->bindValue(':nome', $nome);
        $stmt->execute();
    }
}

function lc_fetch_contas_base($pdo) {
    $lista = array();

    $queryPagar = $pdo->query("SELECT DISTINCT plano_conta FROM contas_pagar WHERE plano_conta IS NOT NULL AND TRIM(plano_conta) <> ''");
    $resPagar = $queryPagar->fetchAll(PDO::FETCH_ASSOC);

    for ($i = 0; $i < count($resPagar); $i++) {
        $lista[] = lc_extrair_nome_plano($resPagar[$i]['plano_conta']);
    }

    $queryReceber = $pdo->query("SELECT DISTINCT plano_conta FROM contas_receber WHERE plano_conta IS NOT NULL AND TRIM(plano_conta) <> ''");
    $resReceber = $queryReceber->fetchAll(PDO::FETCH_ASSOC);

    for ($i = 0; $i < count($resReceber); $i++) {
        $lista[] = lc_extrair_nome_plano($resReceber[$i]['plano_conta']);
    }

    return lc_unique_contas($lista);
}

function lc_fetch_configuradas($pdo) {
    $query = $pdo->query("SELECT nome, selecionada FROM lancamentos_custos_contas_config ORDER BY nome ASC");
    $res = $query->fetchAll(PDO::FETCH_ASSOC);

    $todas = array();
    $selecionadas = array();

    for ($i = 0; $i < count($res); $i++) {
        $nome = trim((string)$res[$i]['nome']);
        if ($nome === '') continue;

        $todas[] = $nome;
        if ((int)$res[$i]['selecionada'] === 1) {
            $selecionadas[] = $nome;
        }
    }

    return array(
        'todas' => lc_unique_contas($todas),
        'selecionadas' => lc_unique_contas($selecionadas),
    );
}

function lc_montar_payload($pdo) {
    $cfg = lc_fetch_configuradas($pdo);

    $disponiveis = lc_unique_contas(array_merge(
        lc_contas_iniciais(),
        $cfg['todas']
    ));

    $selecionadas = lc_unique_contas($cfg['selecionadas']);

    if (count($selecionadas) === 0) {
        $selecionadas = lc_contas_iniciais();
    }

    $dadosDisp = array();
    for ($i = 0; $i < count($disponiveis); $i++) {
        $dadosDisp[] = array(
            'id' => (string)($i + 1),
            'nome' => $disponiveis[$i],
        );
    }

    $dadosSel = array();
    for ($i = 0; $i < count($selecionadas); $i++) {
        $dadosSel[] = array(
            'id' => (string)($i + 1),
            'nome' => $selecionadas[$i],
        );
    }

    return array(
        'success' => true,
        'disponiveis' => $dadosDisp,
        'selecionadas' => $dadosSel,
    );
}

function lc_salvar_configuracao($pdo, $selecionadas, $disponiveis) {
    $selecionadasNorm = lc_unique_contas(is_array($selecionadas) ? $selecionadas : array());
    $disponiveisNorm = lc_unique_contas(is_array($disponiveis) ? $disponiveis : array());

    if (count($disponiveisNorm) === 0) {
        $disponiveisNorm = lc_contas_iniciais();
    }

    // garante que qualquer selecionada tambem exista entre as disponiveis
    $disponiveisNorm = lc_unique_contas(array_merge($disponiveisNorm, $selecionadasNorm));

    $pdo->exec("UPDATE lancamentos_custos_contas_config SET selecionada = 0");

    $upsert = $pdo->prepare("INSERT INTO lancamentos_custos_contas_config (nome, selecionada, origem) VALUES (:nome, :selecionada, :origem) ON DUPLICATE KEY UPDATE selecionada = VALUES(selecionada), origem = VALUES(origem)");

    for ($i = 0; $i < count($disponiveisNorm); $i++) {
        $nome = $disponiveisNorm[$i];
        $keyNome = lc_normalize_text($nome);

        $isSelected = false;
        for ($j = 0; $j < count($selecionadasNorm); $j++) {
            if (lc_normalize_text($selecionadasNorm[$j]) === $keyNome) {
                $isSelected = true;
                break;
            }
        }

        $origem = in_array($nome, lc_contas_iniciais(), true) ? 'padrao' : 'manual';

        $upsert->bindValue(':nome', $nome);
        $upsert->bindValue(':selecionada', $isSelected ? 1 : 0, PDO::PARAM_INT);
        $upsert->bindValue(':origem', $origem);
        $upsert->execute();
    }
}

?>
