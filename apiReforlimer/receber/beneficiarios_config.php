<?php

return [
    // Exibe bloco de diagnostico no PDF de cobranca PIX com regra/beneficiario aplicado.
    'pdfDiagnostics' => true,

    // Quando true, nome/endereco do beneficiario default podem ser complementados
    // automaticamente a partir do fornecedor id 14.
    // Quando false, respeita exatamente o beneficiario definido em 'default'.
    'overrideDefaultFromSupplier14' => false,

    'default' => [
        'id' => 'reforlimer',
        'nome' => 'Reforlimer',
        'documento' => 'CNPJ: 30.768.359/0001-74',
        'endereco' => 'Avenida Laranjeiras, n 701',
        'pixChave' => '30768359000174',
        'cidade' => 'Limeira',
        'usePsp' => true,
    ],
    'rules' => [
        [
            'id' => 'dam_residencia_aluguel',
            'enabled' => true,
            'criteria' => [
                'planContains' => ['residencia'],
                'descriptionContains' => ['aluguel de imoveis', 'acordo'],
                'requirePlanAndDescription' => false,
            ],
            'beneficiary' => [
                'nome' => 'D.A.M. Administracao de Bensa Ltda',
                'documento' => 'CNPJ: 55.287.563/0001-02',
                'endereco' => 'Av Laranjeiras n 701',
                'pixChave' => '55287563000102',
                'cidade' => 'Limeira',
            ],
            'pix' => [
                'usePsp' => true,
                'multaPercent' => 10,
                'jurosPercentDia' => 0.0334,
                // Define por quantos dias apos o vencimento o QR Code PIX permanece pagavel.
                'maxDiasPosVencimento' => 30,
            ],
        ],
    ],
];
