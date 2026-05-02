<?php
header("Content-Type: application/json; charset=utf-8");
include_once('../conexao.php');

// ler JSON ou fallback para GET/POST
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = $_REQUEST;

// possíveis nomes de parâmetro que o cliente pode enviar
$keysStart = ['data', 'data1', 'data_inicio', 'dataInicio', 'data_lanc_inicio', 'data_inicio_h', 'dataInicio_h', 'data_lanc_inicio_iso'];
$keysEnd   = ['data1', 'data_fim', 'dataFim', 'data_lanc_fim', 'data_fim_h', 'dataFim_h', 'data_lanc_fim_iso'];

// busca primeiro valor existente nas chaves
function pickFirst($arr, $keys) {
    foreach ($keys as $k) {
        if (isset($arr[$k]) && $arr[$k] !== '') return $arr[$k];
    }
    return null;
}

// normaliza entrada de data para formato Y-m-d H:i:s
function normalizeDateParam($raw, $isEnd = false) {
    if ($raw === null || $raw === '') return null;
    $s = trim((string)$raw);
    // se for dd/mm/YYYY possivelmente com hora
    if (preg_match('/^\d{2}\/\d{2}\/\d{4}/', $s)) {
        // separar parte data e hora se existir
        $parts = explode(' ', $s, 2);
        $d = $parts[0];
        list($dd, $mm, $yyyy) = explode('/', $d);
        $time = isset($parts[1]) ? $parts[1] : ($isEnd ? '23:59:59' : '00:00:00');
        return "{$yyyy}-{$mm}-{$dd} {$time}";
    }
    // se for YYYY-MM-DD possivelmente com hora
    if (preg_match('/^\d{4}-\d{2}-\d{2}/', $s)) {
        $parts = explode(' ', $s, 2);
        $d = $parts[0];
        $time = isset($parts[1]) ? $parts[1] : ($isEnd ? '23:59:59' : '00:00:00');
        return "{$d} {$time}";
    }
    // tentar parse genérico (ISO)
    try {
        $dt = new DateTime($s);
        if ($dt) {
            // se não vier hora, ajustar início/fim do dia
            $hasTime = preg_match('/\d{2}:\d{2}(:\d{2})?/', $s);
            if (!$hasTime) {
                $time = $isEnd ? '23:59:59' : '00:00:00';
                return $dt->format('Y-m-d') . " {$time}";
            }
            return $dt->format('Y-m-d H:i:s');
        }
    } catch (Exception $e) {}
    return null;
}

// escolher parâmetros
$rawStart = pickFirst($input, $keysStart);
$rawEnd   = pickFirst($input, $keysEnd);

// também aceitar campos separados dataInicio/dataFim enviados pelo app com formatos diferentes
if (!$rawStart && isset($input['dataInicio'])) $rawStart = $input['dataInicio'];
if (!$rawEnd && isset($input['dataFim'])) $rawEnd = $input['dataFim'];

// normalizar
$start = normalizeDateParam($rawStart, false);
$end   = normalizeDateParam($rawEnd, true);

// montar consulta segura
$dados = [];

try {
    if ($start && $end) {
        $sql = "SELECT v.*, c.nome AS nome_cliente, u.nome AS nome_usuario
                FROM vendas v
                LEFT JOIN clientes c ON c.id = v.cliente
                LEFT JOIN usuarios u ON u.id = v.usuario
                WHERE v.data_lanc BETWEEN :start AND :end
                ORDER BY v.data_lanc ASC, v.id ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':start', $start);
        $stmt->bindValue(':end', $end);
        $stmt->execute();
    } else {
        // sem período informado, retornar todos (mantém compatibilidade)
        $stmt = $pdo->query("SELECT v.*, c.nome AS nome_cliente, u.nome AS nome_usuario
                             FROM vendas v
                             LEFT JOIN clientes c ON c.id = v.cliente
                             LEFT JOIN usuarios u ON u.id = v.usuario
                             ORDER BY v.data_lanc ASC, v.id ASC");
    }

    $res = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($res) > 0) {
        foreach ($res as $row) {
            $id = $row['id'];
            $cp1 = $row['valor'] ?? 0;
            $cp2 = $row['usuario'] ?? null;
            $cp3 = $row['pagamento'] ?? '';
            $cp4 = $row['lancamento'] ?? '';
            $cp5 = $row['data_lanc'] ?? '';
            $cp6 = $row['data_pgto'] ?? '';
            $cp7 = $row['desconto'] ?? '0';
            $cp8 = $row['acrescimo'] ?? '0';
            $cp9 = $row['subtotal'] ?? 0;
            $cp10 = $row['parcelas'] ?? 1;
            $cp11 = $row['status'] ?? '';
            $cp12 = $row['cliente'] ?? '';

            $cp1f = number_format((float)$cp1, 2, ',', '.');
            $cp9f = number_format((float)$cp9, 2, ',', '.');

            // formatar datas para dd/mm/yyyy quando existirem
            $formatBR = function($d) {
                if (empty($d) || $d == '0000-00-00' || $d == '0000-00-00 00:00:00') return '';
                $part = explode(' ', $d)[0];
                $parts = explode('-', $part);
                if (count($parts) === 3) return $parts[2] . '/' . $parts[1] . '/' . $parts[0];
                return $d;
            };

            $cp6b = $formatBR($cp6);
            $cp5b = $formatBR($cp5);

            $nome_cliente = !empty($row['nome_cliente']) ? $row['nome_cliente'] : 'Sem Cliente';
            $nome_usuario = !empty($row['nome_usuario']) ? $row['nome_usuario'] : '';

            $classe = '#bf0808';
            if ($cp11 === 'Concluída') { $classe = '#046b33'; }
            elseif ($cp11 === 'Cancelada') { $classe = '#e37d10'; }

            $dados[] = array(
                'id' => $id,
                'valor' => $cp1f,
                'usuario' => $cp2,
                'pagamento' => $cp3,
                'lancamento' => $cp4,
                'data_lanc' => $cp5b,
                'data_pgto' => $cp6b,
                'desconto' => $cp7,
                'acrescimo' => $cp8,
                'subtotal' => $cp9f,
                'parcelas' => $cp10,
                'status' => $cp11,
                'cliente' => $nome_cliente,
                'cor' => $classe,
            );
        }

        echo json_encode(array('success' => true, 'resultado' => $dados));
        exit;
    } else {
        echo json_encode(array('success' => true, 'resultado' => []));
        exit;
    }
} catch (Exception $e) {
    error_log("vendas/listar.php error: " . $e->getMessage());
    echo json_encode(array('success' => false, 'mensagem' => 'Erro ao consultar vendas'));
    exit;
}
?>