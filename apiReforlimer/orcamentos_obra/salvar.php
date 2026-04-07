<?php
header('Content-Type: application/json; charset=utf-8');
require_once(__DIR__ . '/../conexao.php');

// Funções auxiliares inspiradas em apiReforlimer/orcamento/salvar.php
function detectColumn(PDO $pdo, string $table, array $candidates)
{
    $stmt = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
    foreach ($candidates as $c) {
        $stmt->execute([$table, $c]);
        if ($stmt->fetch()) return $c;
    }
    return null;
}

function insertIfColumns(PDO $pdo, string $table, array $data)
{
    $cols = [];
    $vals = [];
    $placeholders = [];
    $stmtCheck = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
    foreach ($data as $col => $val) {
        $stmtCheck->execute([$table, $col]);
        if ($stmtCheck->fetch()) {
            $cols[] = $col;
            $vals[] = $val;
            $placeholders[] = '?';
        }
    }
    if (count($cols) === 0) {
        throw new Exception("Nenhuma coluna válida encontrada para inserção em {$table}");
    }
    $sql = "INSERT INTO {$table} (" . implode(',', $cols) . ") VALUES (" . implode(',', $placeholders) . ")";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($vals);
    return (int)$pdo->lastInsertId();
}

function parseBool($value): bool
{
    if (is_bool($value)) {
        return $value;
    }
    if (is_int($value) || is_float($value)) {
        return (int)$value === 1;
    }
    if (is_string($value)) {
        $v = mb_strtolower(trim($value), 'UTF-8');
        if ($v === '') return false;
        return in_array($v, ['1', 'true', 'sim', 'on', 'yes'], true);
    }
    return !empty($value);
}

function parseDecimal($value, $default = 0.0): float
{
    if ($value === null || $value === '') {
        return (float)$default;
    }

    if (is_string($value)) {
        $value = str_replace(',', '.', trim($value));
    }

    if (!is_numeric($value)) {
        return (float)$default;
    }

    return (float)$value;
}

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!is_array($data)) {
        throw new Exception('JSON inválido');
    }

    // Logar payload recebido para depuração de geração de contas a receber
    try {
        $logDir = __DIR__ . '/../logs';
        if (!is_dir($logDir)) @mkdir($logDir, 0755, true);
        @file_put_contents(
            $logDir . '/orcamentos_obra_payload.log',
            date('Y-m-d H:i:s') . ' - ' . $json . PHP_EOL,
            FILE_APPEND
        );
    } catch (Exception $e) {
        // não interromper fluxo por causa de log
    }

    $id = isset($data['id']) ? (int)$data['id'] : 0;
    $cliente_id = isset($data['cliente_id']) ? (int)$data['cliente_id'] : 0;
    $descricao = isset($data['descricao']) ? trim($data['descricao']) : '';
    $local = isset($data['local']) ? trim($data['local']) : '';
    $tipo_obra = isset($data['tipo_obra']) ? trim($data['tipo_obra']) : '';
    $area_principal = isset($data['area_principal']) ? (float)$data['area_principal'] : 0;
    $observacoes = isset($data['observacoes']) ? trim($data['observacoes']) : '';
    $documento = isset($data['documento']) ? trim((string)$data['documento']) : '';
    $status = isset($data['status']) ? trim($data['status']) : 'Pendente';
    $validade = isset($data['validade']) ? trim($data['validade']) : '';
    $usuario = isset($data['usuario']) ? trim($data['usuario']) : '';
    $data_orcamento = isset($data['data_orcamento']) ? $data['data_orcamento'] : date('Y-m-d');
    // Agora usamos conta a RECEBER para orçamentos de obra
    // Aceita bool, 1/0 e strings comuns para evitar perda de sinal no payload.
    $gerar_conta_receber = parseBool($data['gerar_conta_receber'] ?? ($data['gerarContaReceber'] ?? false));
    $tipo_valor_conta = isset($data['tipo_valor_conta']) ? trim((string)$data['tipo_valor_conta']) : 'total_geral';
    if (!in_array($tipo_valor_conta, ['mao_obra', 'total_geral', 'com_bdi'], true)) {
        $tipo_valor_conta = 'total_geral';
    }
    $vencimento_conta = isset($data['vencimento_conta']) ? trim((string)$data['vencimento_conta']) : '';
    $mostrar_custo_colaborador_relatorio = parseBool($data['mostrar_custo_colaborador_relatorio'] ?? false);
    $custo_colaborador_dia = parseDecimal($data['custo_colaborador_dia'] ?? 0);
    $bdi_impostos_percentual = parseDecimal($data['bdi_impostos_percentual'] ?? 0);
    $bdi_taxa_adm_percentual = parseDecimal($data['bdi_taxa_adm_percentual'] ?? 0);
    $bdi_lucro_percentual = parseDecimal($data['bdi_lucro_percentual'] ?? 0);
    $incluir_materiais_totais = parseBool($data['incluir_materiais_totais'] ?? true);
    if ($gerar_conta_receber && $vencimento_conta === '') {
        // Fallback para garantir geracao da conta mesmo sem data informada explicitamente.
        $vencimento_conta = $data_orcamento ?: date('Y-m-d');
    }
    $servicos = isset($data['servicos']) && is_array($data['servicos']) ? $data['servicos'] : [];

    if ($cliente_id <= 0) {
        throw new Exception('cliente_id é obrigatório');
    }

    if ($area_principal <= 0) {
        throw new Exception('area_principal deve ser maior que zero');
    }

    if (empty($servicos)) {
        throw new Exception('Nenhum serviço informado');
    }

    // Se o usuário optou por gerar conta a receber com vencimento definido,
    // força o status do orçamento de obra para "Aprovado",
    // alinhando o comportamento com o orçamento comum/contas a pagar.
    if ($gerar_conta_receber && !empty($vencimento_conta)) {
        $status = 'Aprovado';
    }

    $colMostrarCustoColaborador = detectColumn($pdo, 'orcamentos_obra', ['mostrar_custo_colaborador_relatorio']);
    $colCustoColaboradorDia = detectColumn($pdo, 'orcamentos_obra', ['custo_colaborador_dia']);
    $colBdiImpostos = detectColumn($pdo, 'orcamentos_obra', ['bdi_impostos_percentual']);
    $colBdiTaxaAdm = detectColumn($pdo, 'orcamentos_obra', ['bdi_taxa_adm_percentual']);
    $colBdiLucro = detectColumn($pdo, 'orcamentos_obra', ['bdi_lucro_percentual']);
    $colBdiTotal = detectColumn($pdo, 'orcamentos_obra', ['bdi_total_percentual']);
    $colValorBdi = detectColumn($pdo, 'orcamentos_obra', ['valor_bdi']);
    $colValorTotalComBdi = detectColumn($pdo, 'orcamentos_obra', ['valor_total_com_bdi']);
    $colIncluirMateriaisTotais = detectColumn($pdo, 'orcamentos_obra', ['incluir_materiais_totais']);

    $pdo->beginTransaction();

    // possível conta a receber já vinculada (quando editando)
    $existingContaReceberId = null;
    $conta_receber_id = null;
    $conta_receber_processada = false;

    // Se editar, limpar itens antigos
    if ($id > 0) {
        // buscar id de conta_receber vinculada, se a coluna existir
        // aceita variações de nome de coluna para compatibilidade com bancos diferentes
        $colRefExistente = detectColumn($pdo, 'orcamentos_obra', ['conta_receber_id', 'id_conta_receber']);
        if ($colRefExistente !== null) {
            $stmtGetRef = $pdo->prepare("SELECT {$colRefExistente} AS conta_receber_id FROM orcamentos_obra WHERE id = ?");
            $stmtGetRef->execute([$id]);
            $rowRef = $stmtGetRef->fetch(PDO::FETCH_ASSOC);
            if ($rowRef && !empty($rowRef['conta_receber_id'])) {
                $existingContaReceberId = (int)$rowRef['conta_receber_id'];
            }
        }

        $dadosOrcamento = [
            'cliente_id' => $cliente_id,
            'descricao' => $descricao,
            'tipo_obra' => $tipo_obra,
            'area_principal' => $area_principal,
            'observacoes' => $observacoes,
            'data_orcamento' => $data_orcamento,
            'validade' => $validade,
            'status' => $status,
            'usuario' => $usuario,
            'local' => $local,
        ];

        if ($colMostrarCustoColaborador !== null) {
            $dadosOrcamento[$colMostrarCustoColaborador] = $mostrar_custo_colaborador_relatorio ? 1 : 0;
        }
        if ($colCustoColaboradorDia !== null) {
            $dadosOrcamento[$colCustoColaboradorDia] = $custo_colaborador_dia;
        }
        if ($colBdiImpostos !== null) {
            $dadosOrcamento[$colBdiImpostos] = $bdi_impostos_percentual;
        }
        if ($colBdiTaxaAdm !== null) {
            $dadosOrcamento[$colBdiTaxaAdm] = $bdi_taxa_adm_percentual;
        }
        if ($colBdiLucro !== null) {
            $dadosOrcamento[$colBdiLucro] = $bdi_lucro_percentual;
        }
        if ($colIncluirMateriaisTotais !== null) {
            $dadosOrcamento[$colIncluirMateriaisTotais] = $incluir_materiais_totais ? 1 : 0;
        }

        $setsUpd = [];
        $valsUpd = [];
        foreach ($dadosOrcamento as $col => $val) {
            $setsUpd[] = "{$col} = ?";
            $valsUpd[] = $val;
        }
        $valsUpd[] = $id;

        $sqlUpdOrc = "UPDATE orcamentos_obra SET " . implode(', ', $setsUpd) . " WHERE id = ?";
        $stmt = $pdo->prepare($sqlUpdOrc);
        $stmt->execute($valsUpd);

        $pdo->prepare("DELETE FROM orcamentos_obra_servicos WHERE orcamento_obra_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM orcamentos_obra_materiais WHERE orcamento_obra_id = ?")->execute([$id]);
        $orcamento_id = $id;
    } else {
        $dadosOrcamento = [
            'cliente_id' => $cliente_id,
            'descricao' => $descricao,
            'tipo_obra' => $tipo_obra,
            'area_principal' => $area_principal,
            'observacoes' => $observacoes,
            'data_orcamento' => $data_orcamento,
            'validade' => $validade,
            'status' => $status,
            'usuario' => $usuario,
            'local' => $local,
        ];

        if ($colMostrarCustoColaborador !== null) {
            $dadosOrcamento[$colMostrarCustoColaborador] = $mostrar_custo_colaborador_relatorio ? 1 : 0;
        }
        if ($colCustoColaboradorDia !== null) {
            $dadosOrcamento[$colCustoColaboradorDia] = $custo_colaborador_dia;
        }
        if ($colBdiImpostos !== null) {
            $dadosOrcamento[$colBdiImpostos] = $bdi_impostos_percentual;
        }
        if ($colBdiTaxaAdm !== null) {
            $dadosOrcamento[$colBdiTaxaAdm] = $bdi_taxa_adm_percentual;
        }
        if ($colBdiLucro !== null) {
            $dadosOrcamento[$colBdiLucro] = $bdi_lucro_percentual;
        }
        if ($colIncluirMateriaisTotais !== null) {
            $dadosOrcamento[$colIncluirMateriaisTotais] = $incluir_materiais_totais ? 1 : 0;
        }

        $colsIns = array_keys($dadosOrcamento);
        $valsIns = array_values($dadosOrcamento);
        $placeholdersIns = implode(',', array_fill(0, count($colsIns), '?'));
        $sqlInsOrc = "INSERT INTO orcamentos_obra (" . implode(',', $colsIns) . ") VALUES ({$placeholdersIns})";
        $stmt = $pdo->prepare($sqlInsOrc);
        $stmt->execute($valsIns);
        $orcamento_id = (int)$pdo->lastInsertId();
    }

    // Mapa de materiais agregados: produto_id => [quantidade_total, valor_unitario]
    $materiaisAggreg = [];
    $valor_total = 0; // total geral (mão de obra + materiais)
    $total_mao_obra = 0;
    $total_materiais = 0;

    // Inserir serviços e calcular materiais
    // Detecta se existe coluna de produtividade específica no orçamento
    $hasProdHorasServCol = false;
    try {
        $chkServ = $pdo->query("SHOW COLUMNS FROM orcamentos_obra_servicos LIKE 'produtividade_horas_unidade'");
        if ($chkServ && $chkServ->fetch(PDO::FETCH_ASSOC)) {
            $hasProdHorasServCol = true;
        }
    } catch (Exception $e) {
        $hasProdHorasServCol = false;
    }

    if ($hasProdHorasServCol) {
        $sqlInsertServ = "INSERT INTO orcamentos_obra_servicos (orcamento_obra_id, servico_id, quantidade, valor_unitario_mao_obra, subtotal_mao_obra, produtividade_horas_unidade) VALUES (?,?,?,?,?,?)";
    } else {
        $sqlInsertServ = "INSERT INTO orcamentos_obra_servicos (orcamento_obra_id, servico_id, quantidade, valor_unitario_mao_obra, subtotal_mao_obra) VALUES (?,?,?,?,?)";
    }
    $stmtServ = $pdo->prepare($sqlInsertServ);

    foreach ($servicos as $s) {
        $servico_id = isset($s['servico_id']) ? (int)$s['servico_id'] : 0;
        $quantidade = isset($s['quantidade']) ? (float)$s['quantidade'] : $area_principal;
        $valor_mao_obra = isset($s['valor_unitario_mao_obra']) ? (float)$s['valor_unitario_mao_obra'] : 0;
        $prod_horas_unidade = isset($s['produtividade_horas_unidade'])
            ? (float)$s['produtividade_horas_unidade']
            : null;

        if ($servico_id <= 0 || $quantidade <= 0) {
            continue;
        }

        // buscar serviço para custo default de mão de obra e produtividade padrão
        $stmtS = $pdo->prepare("SELECT custo_mao_obra, produtividade_horas_unidade FROM servicos_obra WHERE id = ?");
        $stmtS->execute([$servico_id]);
        $servRow = $stmtS->fetch(PDO::FETCH_ASSOC);
        $custoDefault = $servRow ? (float)$servRow['custo_mao_obra'] : 0;
        $prodDefault = ($servRow && isset($servRow['produtividade_horas_unidade']) && $servRow['produtividade_horas_unidade'] !== null)
            ? (float)$servRow['produtividade_horas_unidade']
            : null;
        if ($valor_mao_obra <= 0) {
            $valor_mao_obra = $custoDefault;
        }

        // se produtividade não veio do app, usar a do serviço base (quando existir)
        if ($prod_horas_unidade === null && $prodDefault !== null) {
            $prod_horas_unidade = $prodDefault;
        }

        $subtotalMao = $quantidade * $valor_mao_obra;
        $valor_total += $subtotalMao;
        $total_mao_obra += $subtotalMao;

        if ($hasProdHorasServCol) {
            $stmtServ->execute([
                $orcamento_id,
                $servico_id,
                $quantidade,
                $valor_mao_obra,
                $subtotalMao,
                $prod_horas_unidade,
            ]);
        } else {
            $stmtServ->execute([
                $orcamento_id,
                $servico_id,
                $quantidade,
                $valor_mao_obra,
                $subtotalMao,
            ]);
        }

        // composição de materiais para este serviço, incluindo unidade e rendimento do produto
        $stmtMat = $pdo->prepare("SELECT som.*, p.valor_venda, p.unidade, p.rendimento_por_unidade_m2
                   FROM servico_obra_materiais som
                   LEFT JOIN produtos p ON som.produto_id = p.id
                   WHERE som.servico_id = ?");
        $stmtMat->execute([$servico_id]);
        $rowsMat = $stmtMat->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rowsMat as $m) {
            $pid = (int)$m['produto_id'];
            $consumo = (float)$m['consumo_por_unidade'];
            if ($pid <= 0 || $consumo <= 0) continue;

            $qtdTotal = $quantidade * $consumo; // regra: consumo * metragem/quantidade de serviço
            $valor_unit = isset($m['valor_venda']) ? (float)$m['valor_venda'] : 0;
            $subtotalProd = $qtdTotal * $valor_unit;
            $valor_total += $subtotalProd;
            $total_materiais += $subtotalProd;

            if (!isset($materiaisAggreg[$pid])) {
                $materiaisAggreg[$pid] = [
                    'produto_id' => $pid,
                    'quantidade_total' => 0,
                    'unidade' => isset($m['unidade']) ? $m['unidade'] : null,
                    'valor_unitario' => $valor_unit,
                ];
            }

            $materiaisAggreg[$pid]['quantidade_total'] += $qtdTotal;
        }
    }

    // Verificar se a coluna "unidade" existe na tabela de materiais do orçamento
    $hasUnidadeCol = false;
    try {
        $chk = $pdo->query("SHOW COLUMNS FROM orcamentos_obra_materiais LIKE 'unidade'");
        if ($chk && $chk->fetch(PDO::FETCH_ASSOC)) {
            $hasUnidadeCol = true;
        }
    } catch (Exception $e) {
        // Se der erro aqui, simplesmente consideramos que não existe a coluna
        $hasUnidadeCol = false;
    }

    // Inserir materiais agregados
    if (!empty($materiaisAggreg)) {
        if ($hasUnidadeCol) {
            $sqlInsertMat = "INSERT INTO orcamentos_obra_materiais (orcamento_obra_id, produto_id, quantidade_total, unidade, valor_unitario, subtotal) VALUES (?,?,?,?,?,?)";
        } else {
            $sqlInsertMat = "INSERT INTO orcamentos_obra_materiais (orcamento_obra_id, produto_id, quantidade_total, valor_unitario, subtotal) VALUES (?,?,?,?,?)";
        }

        $stmtMatIns = $pdo->prepare($sqlInsertMat);

        foreach ($materiaisAggreg as $agg) {
            $subtotal = $agg['quantidade_total'] * $agg['valor_unitario'];

            if ($hasUnidadeCol) {
                $stmtMatIns->execute([
                    $orcamento_id,
                    $agg['produto_id'],
                    $agg['quantidade_total'],
                    $agg['unidade'],
                    $agg['valor_unitario'],
                    $subtotal,
                ]);
            } else {
                $stmtMatIns->execute([
                    $orcamento_id,
                    $agg['produto_id'],
                    $agg['quantidade_total'],
                    $agg['valor_unitario'],
                    $subtotal,
                ]);
            }
        }
    }

    $bdi_total_percentual = $bdi_impostos_percentual + $bdi_taxa_adm_percentual + $bdi_lucro_percentual;
    // BDI aplicado apenas sobre mão de obra
    $valor_bdi = $total_mao_obra * ($bdi_total_percentual / 100);
    $total_geral_calculado = $incluir_materiais_totais ? $valor_total : $total_mao_obra;
    $valor_total_com_bdi = $total_geral_calculado + $valor_bdi;

    // Atualizar valor_total do orçamento e campos opcionais de BDI, se existirem
    $dadosTotaisOrc = [
        'valor_total' => $valor_total,
    ];
    if ($colBdiTotal !== null) {
        $dadosTotaisOrc[$colBdiTotal] = $bdi_total_percentual;
    }
    if ($colValorBdi !== null) {
        $dadosTotaisOrc[$colValorBdi] = $valor_bdi;
    }
    if ($colValorTotalComBdi !== null) {
        $dadosTotaisOrc[$colValorTotalComBdi] = $valor_total_com_bdi;
    }

    $setsTotal = [];
    $valsTotal = [];
    foreach ($dadosTotaisOrc as $col => $val) {
        $setsTotal[] = "{$col} = ?";
        $valsTotal[] = $val;
    }
    $valsTotal[] = $orcamento_id;

    $stmtUpd = $pdo->prepare("UPDATE orcamentos_obra SET " . implode(', ', $setsTotal) . " WHERE id = ?");
    $stmtUpd->execute($valsTotal);

    // OPCIONAL: gerar lançamento em contas_receber quando o app solicitar
    // (gerar_conta_receber=true) e houver vencimento definido
    if ($gerar_conta_receber && !empty($vencimento_conta)) {
        // debug opcional: escrever log simples
        try {
            $logDir = __DIR__ . '/../logs';
            if (!is_dir($logDir)) @mkdir($logDir, 0755, true);
            @file_put_contents(
                $logDir . '/orcamentos_obra_contas_receber.log',
                date('Y-m-d H:i:s') .
                " - gerar_conta_receber=1, vencimento={$vencimento_conta}, tipo_valor_conta={$tipo_valor_conta}, total_mao_obra={$total_mao_obra}, valor_total={$valor_total}, valor_total_com_bdi={$valor_total_com_bdi}" .
                PHP_EOL,
                FILE_APPEND
            );
        } catch (Exception $e) {
            // não falhar por causa de log
        }
        $descricaoConta = "Orçamento Obra #{$orcamento_id}" . ($descricao ? " - {$descricao}" : "");

        // Decide qual valor usar: apenas mão de obra, total geral ou total com BDI
        if ($tipo_valor_conta === 'mao_obra') {
            $valorConta = $total_mao_obra;
        } elseif ($tipo_valor_conta === 'com_bdi') {
            $valorConta = $valor_total_com_bdi;
        } else {
            $valorConta = $total_geral_calculado;
        }

        $colCliente = detectColumn($pdo, 'contas_receber', ['cliente_id', 'id_cliente', 'cliente']);

        $dadosConta = [
            'descricao'    => $descricaoConta,
            'entrada'      => 'OrcamentoObra',
            'documento'    => $documento,
            'plano_conta'  => 'Obra',
            'data_emissao' => $data_orcamento,
            'vencimento'   => $vencimento_conta,
            'frequencia'   => 'Uma Vez',
            'valor'        => $valorConta,
            'usuario_lanc' => $usuario,
            'usuario_baixa'=> '',
            'status'       => 'Pendente',
            'data_recor'   => null,
            'juros'        => 0,
            'multa'        => 0,
            'desconto'     => 0,
            'subtotal'     => $valorConta,
            'data_baixa'   => null,
            'id_venda'     => 0,
            'arquivo'      => 'sem-foto.jpg',
            // tenta gravar também o local do orçamento, se a tabela tiver essa coluna
            'local'        => $local,
        ];

        if ($colCliente === 'cliente') {
            $dadosConta['cliente'] = $cliente_id;
        } elseif ($colCliente !== null) {
            $dadosConta[$colCliente] = $cliente_id;
        }

        // Fallback: se não encontramos uma conta_receber vinculada por coluna
        // em orcamentos_obra, tentamos localizar uma existente pelo padrão
        // de descrição/entrada/cliente, para evitar criar nova a cada edição.
        if (empty($existingContaReceberId) && $id > 0) {
            try {
                $sqlFind = "SELECT id FROM contas_receber WHERE entrada = 'OrcamentoObra' AND descricao LIKE ?";
                $paramsFind = ["Orçamento Obra #{$orcamento_id}%"];

                if ($colCliente !== null) {
                    $sqlFind .= " AND {$colCliente} = ?";
                    $paramsFind[] = $cliente_id;
                }

                $sqlFind .= " ORDER BY id DESC LIMIT 1";
                $stmtFind = $pdo->prepare($sqlFind);
                $stmtFind->execute($paramsFind);
                $rowFind = $stmtFind->fetch(PDO::FETCH_ASSOC);
                if ($rowFind && !empty($rowFind['id'])) {
                    $existingContaReceberId = (int)$rowFind['id'];
                }
            } catch (Exception $e) {
                // não falhar o fluxo principal por causa do fallback de busca
            }
        }

        // se já existe conta_receber vinculada ao orçamento de obra, atualizar; caso contrário inserir
        if (!empty($existingContaReceberId)) {
            $stmtCheck = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contas_receber' AND COLUMN_NAME = ?");
            $cols = [];
            $vals = [];
            foreach ($dadosConta as $col => $val) {
                $stmtCheck->execute([$col]);
                if ($stmtCheck->fetch()) {
                    $cols[] = $col;
                    $vals[] = $val;
                }
            }
            if (count($cols) > 0) {
                $sets = implode(", ", array_map(function($c){ return "{$c} = ?"; }, $cols));
                $sqlUpd = "UPDATE contas_receber SET {$sets} WHERE id = ?";
                $vals[] = $existingContaReceberId;
                $pdo->prepare($sqlUpd)->execute($vals);
            }
            $conta_receber_id = $existingContaReceberId;
        } else {
            $conta_receber_id = insertIfColumns($pdo, 'contas_receber', $dadosConta);
        }

        $conta_receber_processada = !empty($conta_receber_id);

        // Se a tabela orcamentos_obra possuir coluna de vínculo para conta a receber, atualizar
        $colRef = detectColumn($pdo, 'orcamentos_obra', ['conta_receber_id', 'id_conta_receber']);
        if ($colRef !== null) {
            $stmtRef = $pdo->prepare("UPDATE orcamentos_obra SET {$colRef} = ? WHERE id = ?");
            $stmtRef->execute([$conta_receber_id, $orcamento_id]);
        }
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'mensagem' => 'Orçamento de obra salvo com sucesso',
        'id' => $orcamento_id,
        'valor_total' => $valor_total,
        'incluir_materiais_totais' => $incluir_materiais_totais,
        'total_geral_calculado' => $total_geral_calculado,
        'bdi_total_percentual' => $bdi_total_percentual,
        'valor_bdi' => $valor_bdi,
        'valor_total_com_bdi' => $valor_total_com_bdi,
        'gerar_conta_receber' => $gerar_conta_receber,
        'conta_receber_processada' => $conta_receber_processada,
        'conta_receber_id' => $conta_receber_id,
    ]);
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'erro' => $e->getMessage(),
    ]);
}

?>
