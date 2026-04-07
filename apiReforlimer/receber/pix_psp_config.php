<?php
// Configuracao do PSP para cobranca PIX dinamica (somente RECEBER).
// Provedor suportado neste endpoint: Asaas.
//
// Preencha com sua chave real para ativar:
// - Sandbox: $aact_...
// - Producao: $aact_...

return [
    'provider' => 'asaas',
    // Troque para false em producao.
    'sandbox' => true,

    // Chave da API do Asaas.
    // Pode vir de variavel de ambiente ASAAS_API_KEY.
    'apiKey' => getenv('ASAAS_API_KEY') ?: 'INFORME_SUA_API_KEY_AQUI',

    // Opcional: se voce ja tiver um customer fixo no Asaas.
    // Ex.: 'cus_000000000000'
    'defaultCustomerId' => '',

    // Encargos padrao solicitados.
    'multaPercent' => 2.0,
    'jurosPercentDia' => 0.0334,
];
