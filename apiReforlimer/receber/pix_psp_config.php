<?php
// Configuracao do PSP para cobranca PIX dinamica (somente RECEBER).
// Provedor suportado neste endpoint: Asaas.
//
// Prioridade da chave:
// 1) Variaveis de ambiente (ASAAS_API_KEY, ASAAS_ACCESS_TOKEN, ASAAS_TOKEN)
// 2) Valor preenchido em $apiKeyManual abaixo

$apiKeyManual = ''; // Cole aqui sua chave Asaas (ex.: $aact_xxxxx) se nao usar variavel de ambiente.
$apiKeyEnv = trim((string)getenv('ASAAS_API_KEY'));
if ($apiKeyEnv === '') {
    $apiKeyEnv = trim((string)getenv('ASAAS_ACCESS_TOKEN'));
}
if ($apiKeyEnv === '') {
    $apiKeyEnv = trim((string)getenv('ASAAS_TOKEN'));
}
$apiKey = $apiKeyEnv !== '' ? $apiKeyEnv : trim((string)$apiKeyManual);

return [
    'provider' => 'asaas',
    // Troque para false em producao.
    'sandbox' => true,

    // Chave da API do Asaas.
    // Formato esperado: $aact_...
    'apiKey' => $apiKey,

    // Opcional: se voce ja tiver um customer fixo no Asaas.
    // Ex.: 'cus_000000000000'
    'defaultCustomerId' => '',

    // Encargos padrao solicitados.
    'multaPercent' => 2.0,
    'jurosPercentDia' => 0.0334,

    // Permite pagamento via PIX ate X dias apos o vencimento.
    // Ex.: 30 = aceita em atraso ate o 30o dia; acima disso, expira.
    'maxDaysAfterDue' => 30,
];
