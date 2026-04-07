import * as Crypto from "expo-crypto";

export type EmissorNota = {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  numero: string;
  cep: string;
};

export type DestinatarioNota = {
  nome: string;
  documento: string;
  email?: string;
};

export type ItemNota = {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
};

export type NotaPayload = {
  emissor: EmissorNota;
  destinatario: DestinatarioNota;
  itens: ItemNota[];
  valorTotal: number;
  observacoes?: string;
  dataEmissaoISO: string;
};

export const EMISSOR_PADRAO_REFORLIMER: EmissorNota = {
  nomeFantasia: "Reforlimer",
  razaoSocial: "Derick Aparecido Mossarelli - ME",
  cnpj: "30768359000174",
  endereco: "Francisca Galii Pfister",
  numero: "590",
  cep: "13480337",
};

export function somenteDigitos(v: string): string {
  return String(v || "").replace(/\D/g, "");
}

export function formatarCnpj(v: string): string {
  const d = somenteDigitos(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatarCep(v: string): string {
  const d = somenteDigitos(v).slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function gerarPayloadNota(params: {
  emissor: EmissorNota;
  destinatario: DestinatarioNota;
  descricaoServico: string;
  valorServico: number;
  observacoes?: string;
}): NotaPayload {
  const valor = Number(params.valorServico || 0);

  return {
    emissor: {
      ...params.emissor,
      cnpj: somenteDigitos(params.emissor.cnpj),
      cep: somenteDigitos(params.emissor.cep),
    },
    destinatario: {
      ...params.destinatario,
      documento: somenteDigitos(params.destinatario.documento),
    },
    itens: [
      {
        descricao: params.descricaoServico,
        quantidade: 1,
        valorUnitario: valor,
      },
    ],
    valorTotal: valor,
    observacoes: params.observacoes,
    dataEmissaoISO: new Date().toISOString(),
  };
}

export async function emitirNotaViaApi(params: {
  endpoint: string;
  token?: string;
  payload: NotaPayload;
}): Promise<{ ok: boolean; status: number; body: any }> {
  const endpoint = String(params.endpoint || "").trim();
  if (!endpoint) {
    throw new Error("Endpoint da API fiscal nao informado.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (params.token) {
    headers.Authorization = `Bearer ${params.token}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(params.payload),
  });

  const text = await response.text();
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    body: parsed,
  };
}

function escapeXml(unsafe: string): string {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizarEndpointSoap(url: string): string {
  let normalized = String(url || "").trim();

  // Corrige typos comuns de protocolo e dominio.
  normalized = normalized
    .replace(/^http\/(?!\/)/i, "http://")
    .replace(/^https\/(?!\/)/i, "https://")
    .replace(/\.com\.be\b/i, ".com.br");

  normalized = normalized.replace(/\?wsdl$/i, "");

  // Em ambiente real, o endpoint funcional da Limeira responde em iibrasil.com.br.
  normalized = normalized.replace(
    "limeira.iibr.com.br",
    "limeira.iibrasil.com.br",
  );

  return normalized;
}

function endpointSoapFromWsdl(url: string): string {
  return normalizarEndpointSoap(url);
}

function appendQueryParams(url: string, params: Record<string, string>): string {
  const base = String(url || "").trim();
  if (!base) return base;

  const pairs = Object.entries(params)
    .filter(([, v]) => String(v || "").trim().length > 0)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);

  if (pairs.length === 0) return base;
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}${pairs.join("&")}`;
}

function normalizarDadosPorOperacao(params: {
  operation: string;
  nfseDadosMsg: string;
}): {
  nfseDadosMsg: string;
  wrappedFromRps: boolean;
} {
  const operation = normalizarOperacaoAbrasf(params.operation);
  const raw = String(params.nfseDadosMsg || "").trim();

  if (operation !== "GerarNfse") {
    return { nfseDadosMsg: raw, wrappedFromRps: false };
  }

  const jaEnvelopeGerarNfse = /<\s*(?:\w+:)?GerarNfseEnvio\b/i.test(raw);
  if (jaEnvelopeGerarNfse) {
    return { nfseDadosMsg: raw, wrappedFromRps: false };
  }

  const rps = extrairPrimeiraTagRps(raw);
  if (!rps) {
    return { nfseDadosMsg: raw, wrappedFromRps: false };
  }

  return {
    nfseDadosMsg: `<GerarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">\n  ${rps}\n</GerarNfseEnvio>`,
    wrappedFromRps: true,
  };
}

function montarNfseDadosFallbackHomologMinimo(nfseDadosMsg: string): string {
  let xml = String(nfseDadosMsg || "").trim();
  if (!xml) return xml;

  // Mantem o envelope ABRASF e reduz campos opcionais que costumam acionar erro interno 5xx em homolog.
  xml = xml
    .replace(/<ValorPis>[^<]*<\/(?:\w+:)?ValorPis>/gi, "")
    .replace(/<ValorCofins>[^<]*<\/(?:\w+:)?ValorCofins>/gi, "")
    .replace(/<ValorInss>[^<]*<\/(?:\w+:)?ValorInss>/gi, "")
    .replace(/<ValorIr>[^<]*<\/(?:\w+:)?ValorIr>/gi, "")
    .replace(/<ValorCsll>[^<]*<\/(?:\w+:)?ValorCsll>/gi, "")
    .replace(/<OutrasRetencoes>[^<]*<\/(?:\w+:)?OutrasRetencoes>/gi, "")
    .replace(/<Aliquota>[^<]*<\/(?:\w+:)?Aliquota>/gi, "")
    .replace(
      /<DescontoIncondicionado>[^<]*<\/(?:\w+:)?DescontoIncondicionado>/gi,
      "",
    )
    .replace(
      /<DescontoCondicionado>[^<]*<\/(?:\w+:)?DescontoCondicionado>/gi,
      "",
    )
    .replace(/<ResponsavelRetencao>[^<]*<\/(?:\w+:)?ResponsavelRetencao>/gi, "")
    .replace(/<InscricaoMunicipal>\s*0\s*<\/(?:\w+:)?InscricaoMunicipal>/gi, "");

  if (/<(?:\w+:)?ItemListaServico\b/i.test(xml)) {
    xml = xml.replace(
      /<(?:\w+:)?ItemListaServico\b[^>]*>[\s\S]*?<\/(?:\w+:)?ItemListaServico>/i,
      "<ItemListaServico>01.07</ItemListaServico>",
    );
  }

  if (/<(?:\w+:)?CodigoTributacaoNacional\b/i.test(xml)) {
    xml = xml.replace(
      /<(?:\w+:)?CodigoTributacaoNacional\b[^>]*>[\s\S]*?<\/(?:\w+:)?CodigoTributacaoNacional>/i,
      "<CodigoTributacaoNacional>01.07</CodigoTributacaoNacional>",
    );
  }

  if (/<(?:\w+:)?IssRetido\b/i.test(xml)) {
    xml = xml.replace(
      /<(?:\w+:)?IssRetido\b[^>]*>[\s\S]*?<\/(?:\w+:)?IssRetido>/i,
      "<IssRetido>2</IssRetido>",
    );
  }

  return xml;
}

function normalizarTextoIntegridade(valor: string): string {
  return String(valor || "")
    .replace(/[^\x20-\x7E]+/g, "")
    .replace(/[ ]+/g, "");
}

function extrairPrimeiraTagRps(xml: string): string {
  const source = String(xml || "");
  const tokenRegex = /<\/?(?:\w+:)?Rps\b[^>]*>/gi;

  let depth = 0;
  let start = -1;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(source))) {
    const tag = match[0] || "";
    const isClosing = /^<\s*\//.test(tag);
    const isSelfClosing = /\/>\s*$/.test(tag);

    if (!isClosing) {
      if (depth === 0) {
        start = match.index;
      }

      if (!isSelfClosing) {
        depth += 1;
      }

      if (isSelfClosing && depth === 0 && start >= 0) {
        return source.slice(start, tokenRegex.lastIndex);
      }

      continue;
    }

    if (depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        return source.slice(start, tokenRegex.lastIndex);
      }
    }
  }

  return "";
}

function extrairCnpjPrestador(xml: string): string {
  const byPrestador = String(xml || "").match(
    /<(?:\w+:)?Prestador\b[^>]*>[\s\S]*?<(?:\w+:)?Cnpj\b[^>]*>([\d\.\/-]+)<\/(?:\w+:)?Cnpj>/i,
  );
  if (byPrestador?.[1]) {
    return somenteDigitos(byPrestador[1]);
  }

  const byAnyCnpj = String(xml || "").match(
    /<(?:\w+:)?Cnpj\b[^>]*>([\d\.\/-]+)<\/(?:\w+:)?Cnpj>/i,
  );
  return byAnyCnpj?.[1] ? somenteDigitos(byAnyCnpj[1]) : "";
}

export async function calcularIntegridadeNfse(params: {
  nfseDadosMsg: string;
  token: string;
}): Promise<{
  integridade: string;
  tagRpsOriginal: string;
  tagRpsNormalizada: string;
}> {
  const token = String(params.token || "").trim();
  const tagRpsOriginal = extrairPrimeiraTagRps(params.nfseDadosMsg);

  if (!token || !tagRpsOriginal) {
    return {
      integridade: "",
      tagRpsOriginal,
      tagRpsNormalizada: "",
    };
  }

  const tagRpsNormalizada = normalizarTextoIntegridade(tagRpsOriginal);
  const base = `${tagRpsNormalizada}${token}`;
  const integridade = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA512,
    base,
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  return {
    integridade,
    tagRpsOriginal,
    tagRpsNormalizada,
  };
}

async function gerarHashesIntegridadeCandidatas(params: {
  token: string;
  nfseDadosMsg: string;
  tagRpsOriginal: string;
  tagRpsNormalizada: string;
  hashPrincipal: string;
}): Promise<string[]> {
  const token = String(params.token || "").trim();
  if (!token) return [];

  const cands: string[] = [];
  const add = (v: string) => {
    const vv = String(v || "").trim();
    if (vv && !cands.includes(vv)) cands.push(vv);
  };

  add(params.hashPrincipal);

  const rpsOriginal = String(params.tagRpsOriginal || "");
  const rpsNormalizada = String(params.tagRpsNormalizada || "");
  const rpsSemWhitespace = rpsOriginal.replace(/\s+/g, "");
  const rpsEscapada = escapeXml(rpsOriginal);
  const rpsEscapadaSemWhitespace = rpsEscapada.replace(/\s+/g, "");
  const dadosSemWhitespace = String(params.nfseDadosMsg || "").replace(
    /\s+/g,
    "",
  );
  const dadosNormalizados = normalizarTextoIntegridade(params.nfseDadosMsg);
  const dadosEscapados = escapeXml(params.nfseDadosMsg);
  const dadosEscapadosSemWhitespace = dadosEscapados.replace(/\s+/g, "");

  const bases = [
    rpsOriginal,
    rpsNormalizada,
    rpsSemWhitespace,
    rpsEscapada,
    rpsEscapadaSemWhitespace,
    dadosSemWhitespace,
    dadosNormalizados,
    dadosEscapados,
    dadosEscapadosSemWhitespace,
  ].filter(Boolean);

  for (const base of bases) {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA512,
      `${base}${token}`,
      { encoding: Crypto.CryptoEncoding.HEX },
    );
    add(hash);
    add(hash.toUpperCase());
  }

  return cands;
}

const ABRASF_OPERACOES_SUPORTADAS = [
  "GerarNfse",
  "RecepcionarLoteRpsSincrono",
  "RecepcionarLoteRps",
  "ConsultarNfsePorRps",
  "ConsultarLoteRps",
  "CancelarNfse",
  "SubstituirNfse",
  "ConsultarNfseServicoPrestado",
  "ConsultarNfseServicoTomado",
  "ConsultarNfsePorFaixa",
];

function normalizarOperacaoAbrasf(rawOperation: string): string {
  const raw = String(rawOperation || "").trim();
  if (!raw) return "GerarNfse";

  const semEspacos = raw.replace(/\s+/g, "");
  const key = semEspacos.toLowerCase();

  const aliases: Record<string, string> = {
    gerarnfse: "GerarNfse",
    gerarnfe: "GerarNfse",
    recepcionarloterpssincrono: "RecepcionarLoteRpsSincrono",
    recepcionarloterps: "RecepcionarLoteRps",
    consultarnfseporrps: "ConsultarNfsePorRps",
    consultarloterps: "ConsultarLoteRps",
    cancelarnfse: "CancelarNfse",
    substituirnfse: "SubstituirNfse",
    consultarnfseservicoprestado: "ConsultarNfseServicoPrestado",
    consultarnfseservicotomado: "ConsultarNfseServicoTomado",
    consultarnfseporfaixa: "ConsultarNfsePorFaixa",
  };

  const normalized = aliases[key] || semEspacos;
  const supported = ABRASF_OPERACOES_SUPORTADAS.includes(normalized);

  if (!supported) {
    throw new Error(
      `Operacao SOAP invalida: ${raw}. Use uma das operacoes suportadas no app.`,
    );
  }

  return normalized;
}

function decodeXmlEntities(value: string): string {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractSoapTagValue(xml: string, tagName: string): string {
  const tag = String(tagName || "").trim();
  if (!tag) return "";

  const pattern = new RegExp(
    `<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`,
    "i",
  );
  const match = String(xml || "").match(pattern);
  return match?.[1] ? decodeXmlEntities(match[1]) : "";
}

function extractXmlTagValue(xml: string, tagName: string): string {
  const tag = String(tagName || "").trim();
  if (!tag) return "";

  const pattern = new RegExp(
    `<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`,
    "i",
  );
  const match = String(xml || "").match(pattern);
  return match?.[1] ? decodeXmlEntities(match[1]).trim() : "";
}

function analisarOutputXmlNfse(outputXML: string): {
  situacao: "sucesso" | "erro" | "indefinido";
  numeroNfse: string;
  codigoVerificacao: string;
  protocolo: string;
  mensagem: string;
} {
  const xml = String(outputXML || "").trim();
  if (!xml) {
    return {
      situacao: "indefinido",
      numeroNfse: "",
      codigoVerificacao: "",
      protocolo: "",
      mensagem: "",
    };
  }

  const numeroNfse =
    extractXmlTagValue(xml, "Numero") ||
    extractXmlTagValue(xml, "NumeroNfse") ||
    extractXmlTagValue(xml, "InfNfse");

  const codigoVerificacao =
    extractXmlTagValue(xml, "CodigoVerificacao") ||
    extractXmlTagValue(xml, "CodigoDeVerificacao");

  const protocolo =
    extractXmlTagValue(xml, "Protocolo") ||
    extractXmlTagValue(xml, "NumeroLote");

  const mensagem =
    extractXmlTagValue(xml, "Mensagem") ||
    extractXmlTagValue(xml, "MensagemRetorno") ||
    extractXmlTagValue(xml, "Descricao") ||
    extractXmlTagValue(xml, "faultstring");

  const hasErrorTag = /<(?:\w+:)?ListaMensagemRetorno\b|<(?:\w+:)?MensagemRetorno\b/i.test(
    xml,
  );
  const hasSuccessHint =
    /<(?:\w+:)?Nfse\b|<(?:\w+:)?CompNfse\b|<(?:\w+:)?ListaNfse\b/i.test(xml) ||
    Boolean(numeroNfse);

  let situacao: "sucesso" | "erro" | "indefinido" = "indefinido";
  if (hasErrorTag) situacao = "erro";
  else if (hasSuccessHint) situacao = "sucesso";

  return {
    situacao,
    numeroNfse,
    codigoVerificacao,
    protocolo,
    mensagem,
  };
}

export function montarSoapEnvelopeAbrasf(params: {
  operation: string;
  nfseCabecMsg: string;
  nfseDadosMsg: string;
}): string {
  const op = normalizarOperacaoAbrasf(params.operation);
  const cabecEsc = escapeXml(params.nfseCabecMsg);
  const dadosEsc = escapeXml(params.nfseDadosMsg);

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://nfse.abrasf.org.br">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:${op}Request>
      <nfseCabecMsg>${cabecEsc}</nfseCabecMsg>
      <nfseDadosMsg>${dadosEsc}</nfseDadosMsg>
    </ws:${op}Request>
  </soapenv:Body>
</soapenv:Envelope>`;
}

export function montarSoapEnvelopeAbrasfComAuth(params: {
  operation: string;
  nfseCabecMsg: string;
  nfseDadosMsg: string;
  cnpj?: string;
  token?: string;
  integridade?: string;
  upperCaseTags?: boolean;
}): string {
  const op = normalizarOperacaoAbrasf(params.operation);
  const cabecEsc = escapeXml(params.nfseCabecMsg);
  const dadosEsc = escapeXml(params.nfseDadosMsg);
  const useUpper = Boolean(params.upperCaseTags);
  const cnpjTag = useUpper ? "CNPJ" : "cnpj";
  const tokenTag = useUpper ? "TOKEN" : "token";
  const integTag = useUpper ? "INTEGRIDADE" : "integridade";

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://nfse.abrasf.org.br">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:${op}Request>
      <nfseCabecMsg>${cabecEsc}</nfseCabecMsg>
      <nfseDadosMsg>${dadosEsc}</nfseDadosMsg>
      <${cnpjTag}>${escapeXml(params.cnpj || "")}</${cnpjTag}>
      <${tokenTag}>${escapeXml(params.token || "")}</${tokenTag}>
      <${integTag}>${escapeXml(params.integridade || "")}</${integTag}>
    </ws:${op}Request>
  </soapenv:Body>
</soapenv:Envelope>`;
}

export async function emitirNotaViaSoapAbrasf(params: {
  endpoint: string;
  operation: string;
  nfseCabecMsg: string;
  nfseDadosMsg: string;
  token?: string;
}): Promise<{ ok: boolean; status: number; body: any; raw: string }> {
  const endpoint = endpointSoapFromWsdl(String(params.endpoint || "").trim());
  if (!endpoint) {
    throw new Error("Endpoint SOAP nao informado.");
  }

  const operation = normalizarOperacaoAbrasf(params.operation);
  const soapAction = `http://nfse.abrasf.org.br/${operation}`;
  const token = String(params.token || "").trim();
  const dadosNormalizados = normalizarDadosPorOperacao({
    operation,
    nfseDadosMsg: params.nfseDadosMsg,
  });
  const nfseDadosOriginal = dadosNormalizados.nfseDadosMsg;
  const cnpjPrestador = extrairCnpjPrestador(nfseDadosOriginal);
  const integridadeInfo = await calcularIntegridadeNfse({
    nfseDadosMsg: nfseDadosOriginal,
    token,
  });
  const integridadeCandidatas = await gerarHashesIntegridadeCandidatas({
    token,
    nfseDadosMsg: nfseDadosOriginal,
    tagRpsOriginal: integridadeInfo.tagRpsOriginal,
    tagRpsNormalizada: integridadeInfo.tagRpsNormalizada,
    hashPrincipal: integridadeInfo.integridade,
  });
  let integridadeEfetiva = integridadeInfo.integridade;

  const nfseDadosComIntegridade = {
    xml: nfseDadosOriginal,
    integridadeNoXml: false,
  };
  let fallbackHomologMinimoAplicado = false;
  let fallbackHomologMinimoElegivel = false;
  let nfseDadosEfetivoEnvio = nfseDadosComIntegridade.xml;

  const buildEnvelope = (nfseDadosMsg: string) =>
    montarSoapEnvelopeAbrasf({
      operation,
      nfseCabecMsg: params.nfseCabecMsg,
      nfseDadosMsg,
    });

  const buildHeaders = (opts: {
    includeAuth: boolean;
    quoteSoapAction: boolean;
  }): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: opts.quoteSoapAction ? `"${soapAction}"` : soapAction,
    };

    if (opts.includeAuth && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (token) {
      headers.Token = token;
      headers.TOKEN = token;
      headers.token = token;
      headers["X-Nfse-Token"] = token;
    }

    if (cnpjPrestador) {
      headers.CNPJ = cnpjPrestador;
      headers.cnpj = cnpjPrestador;
      headers["X-Nfse-Cnpj"] = cnpjPrestador;
    }

    if (integridadeInfo.integridade) {
      headers.Integridade = integridadeInfo.integridade;
      headers.INTEGRIDADE = integridadeInfo.integridade;
      headers.integridade = integridadeInfo.integridade;
      headers["X-Nfse-Integridade"] = integridadeInfo.integridade;
    }

    return headers;
  };

  const doRequest = async (
    url: string,
    headers: Record<string, string>,
    xmlBody: string,
    timeoutMs = 30000,
  ) => {
    const ac = new AbortController();
    let timeoutTriggered = false;
    const timer = setTimeout(() => {
      timeoutTriggered = true;
      ac.abort();
    }, timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: xmlBody,
        signal: ac.signal,
      });
      const txt = await res.text();
      return { res, txt, url };
    } catch (error: any) {
      const errMessage = String(error?.message || "").trim();
      const errName = String(error?.name || "").trim();
      const abortedLike =
        /abort/i.test(errMessage) ||
        /abort/i.test(errName) ||
        /The operation was aborted/i.test(String(error || ""));

      if (timeoutTriggered || abortedLike) {
        throw new Error(`Timeout SOAP apos ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };

  const endpointEhIiBrasil = /iibrasil\.com\.br|iibr\.com\.br/i.test(endpoint);
  const endpointEhHomologIiBrasil =
    endpointEhIiBrasil && /homologacao_notafiscal\.php/i.test(endpoint);
  const integridadeUpper = String(integridadeInfo.integridade || "").toUpperCase();
  const endpointIiBrasilWithQueryLower = appendQueryParams(endpoint, {
    cnpj: cnpjPrestador,
    token,
    integridade: integridadeInfo.integridade,
  });
  const endpointIiBrasilWithQueryUpper = appendQueryParams(endpoint, {
    CNPJ: cnpjPrestador,
    TOKEN: token,
    INTEGRIDADE: integridadeInfo.integridade,
  });
  const endpointIiBrasilWithQueryUpperHex = appendQueryParams(endpoint, {
    CNPJ: cnpjPrestador,
    TOKEN: token,
    INTEGRIDADE: integridadeUpper,
  });
  const timeoutTentativaMs = endpointEhIiBrasil ? 90000 : 30000;
  const timeoutRetryMs = endpointEhIiBrasil ? 45000 : 20000;

  const hasIntegridadeError = (soapText: string): boolean => {
    const t = String(soapText || "");
    return /EI33|EI35|Integridade\s+n[aã]o\s+informada|Integridade\s+inv[aá]lida/i.test(
      t,
    );
  };

  const extractIntegridadeHint = (soapText: string): string => {
    const output =
      extractSoapTagValue(soapText, "outputXML") ||
      extractSoapTagValue(soapText, "outputXml") ||
      extractSoapTagValue(soapText, "returnXML") ||
      extractSoapTagValue(soapText, "return");
    return extractXmlTagValue(output, "Integridade");
  };

  const attempts: Array<{
    url: string;
    headers: Record<string, string>;
    label: string;
    xmlBody: string;
  }> = [
    {
      url: endpointIiBrasilWithQueryUpperHex,
      headers: buildHeaders({ includeAuth: false, quoteSoapAction: true }),
      label: "query-auth-upper-hash-upper",
      xmlBody: buildEnvelope(nfseDadosComIntegridade.xml),
    },
    {
      url: endpointIiBrasilWithQueryUpper,
      headers: buildHeaders({ includeAuth: false, quoteSoapAction: true }),
      label: "query-auth-upper",
      xmlBody: buildEnvelope(nfseDadosComIntegridade.xml),
    },
    {
      url: endpointIiBrasilWithQueryLower,
      headers: buildHeaders({ includeAuth: false, quoteSoapAction: true }),
      label: "query-auth-lower",
      xmlBody: buildEnvelope(nfseDadosComIntegridade.xml),
    },
    {
      url: endpoint,
      headers: buildHeaders({
        includeAuth: !endpointEhIiBrasil,
        quoteSoapAction: false,
      }),
      label: "padrao",
      xmlBody: buildEnvelope(nfseDadosComIntegridade.xml),
    },
    {
      url: endpoint,
      headers: buildHeaders({ includeAuth: false, quoteSoapAction: false }),
      label: "sem-auth",
      xmlBody: buildEnvelope(nfseDadosComIntegridade.xml),
    },
    {
      url: endpoint,
      headers: buildHeaders({ includeAuth: false, quoteSoapAction: true }),
      label: "soapaction-quoted",
      xmlBody: buildEnvelope(nfseDadosComIntegridade.xml),
    },
  ];

  let response: Response | null = null;
  let text = "";
  let lastNonEmptyText = "";
  let usedEndpoint = endpoint;
  let tentativa = "";
  let tentouHashSugerido = false;
  const networkErrors: string[] = [];

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });

  const doRequestSafe = async (
    url: string,
    headers: Record<string, string>,
    xmlBody: string,
    timeoutMs = 30000,
  ) => {
    try {
      const ok = await doRequest(url, headers, xmlBody, timeoutMs);
      return { ...ok, failed: false as const, error: "" };
    } catch (error: any) {
      const errMsg = String(error?.message || error || "Falha de rede");
      networkErrors.push(`${url} -> ${errMsg}`);
      return {
        res: null,
        txt: "",
        url,
        failed: true as const,
        error: errMsg,
      };
    }
  };

  for (const attempt of attempts) {
    const result = await doRequestSafe(
      attempt.url,
      attempt.headers,
      attempt.xmlBody,
      timeoutTentativaMs,
    );
    if (!result.res) {
      tentativa = `${attempt.label}-network-error`;
      continue;
    }
    response = result.res;
    text = result.txt;
    if (String(text || "").trim()) {
      lastNonEmptyText = text;
    }
    usedEndpoint = result.url;
    tentativa = attempt.label;

    if (endpointEhIiBrasil && hasIntegridadeError(text) && !tentouHashSugerido) {
      const hinted = extractIntegridadeHint(text);
      if (hinted) {
        const retryUrl = appendQueryParams(endpoint, {
          cnpj: cnpjPrestador,
          token,
          integridade: hinted,
        });
        const retryHeaders = buildHeaders({
          includeAuth: false,
          quoteSoapAction: true,
        });
        retryHeaders.Integridade = hinted;
        retryHeaders.INTEGRIDADE = hinted;
        retryHeaders.integridade = hinted;

        const hintedResult = await doRequestSafe(
          retryUrl,
          retryHeaders,
          attempt.xmlBody,
          timeoutTentativaMs,
        );
        if (!hintedResult.res) {
          tentativa = `${attempt.label}-hinted-integridade-network-error`;
          continue;
        }
        response = hintedResult.res;
        text = hintedResult.txt;
        if (String(text || "").trim()) {
          lastNonEmptyText = text;
        }
        usedEndpoint = hintedResult.url;
        tentativa = `${attempt.label}-hinted-integridade`;
        integridadeEfetiva = hinted;
        tentouHashSugerido = true;
      }
    }

    const bodyNotEmpty = Boolean(String(text || "").trim());
    const podePararPorIntegridade =
      !endpointEhIiBrasil || !hasIntegridadeError(text);

    if (
      (response.ok || bodyNotEmpty || response.status < 500) &&
      podePararPorIntegridade
    ) {
      break;
    }
  }

  if (endpointEhIiBrasil && hasIntegridadeError(text)) {
    for (let i = 0; i < integridadeCandidatas.length; i += 1) {
      const candidate = integridadeCandidatas[i];
      if (!candidate || candidate === String(integridadeEfetiva || "").toLowerCase()) {
        continue;
      }

      const retryUrl = appendQueryParams(endpoint, {
        cnpj: cnpjPrestador,
        token,
        integridade: candidate,
      });
      const retryHeaders = buildHeaders({
        includeAuth: false,
        quoteSoapAction: true,
      });
      retryHeaders.Integridade = candidate;
      retryHeaders.INTEGRIDADE = candidate;
      retryHeaders.integridade = candidate;

      const alt = await doRequestSafe(
        retryUrl,
        retryHeaders,
        buildEnvelope(nfseDadosComIntegridade.xml),
        timeoutTentativaMs,
      );
      if (!alt.res) {
        tentativa = `alt-hash-${i + 1}-network-error`;
        continue;
      }

      response = alt.res;
      text = alt.txt;
      if (String(text || "").trim()) {
        lastNonEmptyText = text;
      }
      usedEndpoint = alt.url;
      tentativa = `alt-hash-${i + 1}`;
      integridadeEfetiva = candidate;

      if (!hasIntegridadeError(text)) {
        break;
      }
    }
  }

  if (!response) {
    const detalhesRede = networkErrors.length
      ? ` Tentativas de rede: ${networkErrors.join(" | ")}`
      : "";
    throw new Error(`Falha ao enviar requisicao SOAP.${detalhesRede}`);
  }

  const shouldRetryGatewayOr5xx = [500, 502, 503, 504].includes(
    response.status,
  );

  if (shouldRetryGatewayOr5xx && endpointEhIiBrasil) {
    const quotedHeaders = buildHeaders({
      includeAuth: false,
      quoteSoapAction: true,
    });
    const plainHeaders = buildHeaders({
      includeAuth: false,
      quoteSoapAction: false,
    });
    if (integridadeEfetiva) {
      quotedHeaders.Integridade = integridadeEfetiva;
      quotedHeaders.INTEGRIDADE = integridadeEfetiva;
      quotedHeaders.integridade = integridadeEfetiva;
      plainHeaders.Integridade = integridadeEfetiva;
      plainHeaders.INTEGRIDADE = integridadeEfetiva;
      plainHeaders.integridade = integridadeEfetiva;
    }

    const endpointComAuthEfetivo = appendQueryParams(endpoint, {
      cnpj: cnpjPrestador,
      token,
      integridade: integridadeEfetiva,
    });

    const endpointComAuthUpper = appendQueryParams(endpoint, {
      CNPJ: cnpjPrestador,
      TOKEN: token,
      INTEGRIDADE: integridadeEfetiva,
    });

    const endpointComAuthUpperHex = appendQueryParams(endpoint, {
      CNPJ: cnpjPrestador,
      TOKEN: token,
      INTEGRIDADE: String(integridadeEfetiva || "").toUpperCase(),
    });

    const endpointAlternativoHost = endpointComAuthEfetivo.includes(
      "iibrasil.com.br",
    )
      ? endpointComAuthEfetivo.replace("iibrasil.com.br", "iibr.com.br")
      : endpointComAuthEfetivo.includes("iibr.com.br")
        ? endpointComAuthEfetivo.replace("iibr.com.br", "iibrasil.com.br")
        : endpointComAuthEfetivo;

    const endpointPuroAlternativo = endpoint.includes("iibrasil.com.br")
      ? endpoint.replace("iibrasil.com.br", "iibr.com.br")
      : endpoint.includes("iibr.com.br")
        ? endpoint.replace("iibr.com.br", "iibrasil.com.br")
        : endpoint;

    const hostIibrInalcanavel = networkErrors.some((entry) =>
      /iibr\.com\.br.*Network request failed/i.test(String(entry || "")),
    );

    const retryCandidates = [
      usedEndpoint,
      endpoint,
      endpointPuroAlternativo,
      endpointComAuthEfetivo,
      endpointComAuthUpper,
      endpointComAuthUpperHex,
      endpointAlternativoHost,
    ]
      .map((u) => String(u || "").trim())
      .filter((u, idx, arr) => u.length > 0 && arr.indexOf(u) === idx)
      .filter((u) => {
        if (!hostIibrInalcanavel) return true;
        return !/iibr\.com\.br/i.test(u);
      });

    for (let i = 0; i < retryCandidates.length; i += 1) {
      if (i > 0) {
        await sleep(Math.min(1500 * i, 3000));
      }
      const retryUrl = retryCandidates[i];
      const headersRetry = i % 2 === 0 ? quotedHeaders : plainHeaders;
      const retry = await doRequestSafe(
        retryUrl,
        headersRetry,
        buildEnvelope(nfseDadosComIntegridade.xml),
        timeoutRetryMs,
      );
      if (!retry.res) {
        tentativa = `${tentativa || "retry-5xx"}-retry-${i + 1}-network-error`;
        continue;
      }
      response = retry.res;
      text = retry.txt;
      if (String(text || "").trim()) {
        lastNonEmptyText = text;
      }
      usedEndpoint = retry.url;
      tentativa = `${tentativa || "retry-5xx"}-retry-${i + 1}-${i % 2 === 0 ? "soapaction-quoted" : "soapaction-plain"}`;

      if (![500, 502, 503, 504].includes(response.status)) {
        break;
      }
    }

    const semCorpoRetorno = !String(text || "").trim();
    if (
      endpointEhIiBrasil &&
      [500, 502, 503, 504].includes(response.status) &&
      semCorpoRetorno &&
      String(integridadeEfetiva || "").trim() &&
      String(integridadeEfetiva || "") !== String(integridadeEfetiva || "").toUpperCase()
    ) {
      const headersUpperHex = buildHeaders({
        includeAuth: false,
        quoteSoapAction: true,
      });
      headersUpperHex.Integridade = String(integridadeEfetiva || "").toUpperCase();
      headersUpperHex.INTEGRIDADE = String(integridadeEfetiva || "").toUpperCase();
      headersUpperHex.integridade = String(integridadeEfetiva || "").toUpperCase();

      const retryUpperHex = await doRequestSafe(
        endpointComAuthUpperHex,
        headersUpperHex,
        buildEnvelope(nfseDadosComIntegridade.xml),
        timeoutRetryMs,
      );
      if (retryUpperHex.res) {
        response = retryUpperHex.res;
        text = retryUpperHex.txt;
        if (String(text || "").trim()) {
          lastNonEmptyText = text;
        }
        usedEndpoint = retryUpperHex.url;
        tentativa = `${tentativa || "retry-5xx"}-hash-upper`;
        integridadeEfetiva = String(integridadeEfetiva || "").toUpperCase();
      }
    }

    if (
      endpointEhHomologIiBrasil &&
      operation === "GerarNfse" &&
      [500, 502, 503, 504].includes(response.status) &&
      !String(text || "").trim()
    ) {
      fallbackHomologMinimoElegivel = true;
      const xmlFallbackMinimo = montarNfseDadosFallbackHomologMinimo(
        nfseDadosComIntegridade.xml,
      );

      if (
        xmlFallbackMinimo &&
        xmlFallbackMinimo.trim() &&
        xmlFallbackMinimo.trim() !== nfseDadosComIntegridade.xml.trim()
      ) {
        const integridadeFallbackInfo = await calcularIntegridadeNfse({
          nfseDadosMsg: xmlFallbackMinimo,
          token,
        });
        const integridadeFallback = String(
          integridadeFallbackInfo.integridade || integridadeEfetiva || "",
        ).trim();

        const retryFallbackUrl = appendQueryParams(endpoint, {
          CNPJ: cnpjPrestador,
          TOKEN: token,
          INTEGRIDADE: integridadeFallback,
        });

        const headersFallback = buildHeaders({
          includeAuth: false,
          quoteSoapAction: true,
        });

        if (integridadeFallback) {
          headersFallback.Integridade = integridadeFallback;
          headersFallback.INTEGRIDADE = integridadeFallback;
          headersFallback.integridade = integridadeFallback;
        }

        const retryFallback = await doRequestSafe(
          retryFallbackUrl,
          headersFallback,
          buildEnvelope(xmlFallbackMinimo),
          timeoutRetryMs,
        );

        if (retryFallback.res) {
          response = retryFallback.res;
          text = retryFallback.txt;
          if (String(text || "").trim()) {
            lastNonEmptyText = text;
          }
          usedEndpoint = retryFallback.url;
          tentativa = `${tentativa || "retry-5xx"}-homolog-minimo`;
          integridadeEfetiva = integridadeFallback || integridadeEfetiva;
          nfseDadosEfetivoEnvio = xmlFallbackMinimo;
          fallbackHomologMinimoAplicado = true;
        }
      }
    }
  }

  if (!String(text || "").trim() && String(lastNonEmptyText || "").trim()) {
    text = lastNonEmptyText;
  }

  const outputXmlCandidates = [
    "outputXML",
    "outputXml",
    "returnXML",
    "return",
  ];

  let outputXML = "";
  let outputTag = "";

  for (const candidate of outputXmlCandidates) {
    const found = extractSoapTagValue(text, candidate);
    if (found) {
      outputXML = found;
      outputTag = candidate;
      break;
    }
  }

  const faultString =
    extractSoapTagValue(text, "faultstring") ||
    extractSoapTagValue(text, "Reason") ||
    extractSoapTagValue(text, "Text");

  const rawPreview = String(text || "").replace(/\s+/g, " ").slice(0, 600);
  const analiseNfse = analisarOutputXmlNfse(outputXML);
  const rpsEnviado = extrairPrimeiraTagRps(nfseDadosEfetivoEnvio);
  const nfseDadosEnviadoPreview = String(nfseDadosEfetivoEnvio || "")
    .replace(/\s+/g, " ")
    .slice(0, 1200);
  const outputXmlPreview = String(outputXML || "")
    .replace(/\s+/g, " ")
    .slice(0, 1200);

  const ocorrenciaResumo =
    analiseNfse.situacao === "sucesso"
      ? "NFS-e processada com indicios de sucesso."
      : analiseNfse.situacao === "erro"
        ? analiseNfse.mensagem ||
          faultString ||
          "Retorno com indicios de erro da prefeitura."
        : faultString ||
          (response.ok
            ? "Requisicao concluida sem indicio claro de sucesso/erro no XML."
            : "Falha HTTP sem detalhe conclusivo no corpo SOAP.");

  return {
    ok: response.ok,
    status: response.status,
    body: {
      soapAction,
      endpointUsado: usedEndpoint,
      tentativaCompat: tentativa,
      dadosNormalizados: {
        wrappedFromRps: dadosNormalizados.wrappedFromRps,
        fallbackHomologMinimoAplicado,
        fallbackHomologMinimoElegivel,
        raiz:
          /<\s*(?:\w+:)?([A-Za-z0-9_]+)/.exec(nfseDadosEfetivoEnvio)?.[1] ||
          "",
      },
      cnpjPrestador,
      integridade: {
        enviada: Boolean(integridadeEfetiva),
        hash: integridadeEfetiva,
        noXml: nfseDadosComIntegridade.integridadeNoXml,
        rpsEncontrada: Boolean(integridadeInfo.tagRpsOriginal),
        rpsNormalizadaPreview: integridadeInfo.tagRpsNormalizada.slice(0, 220),
      },
      outputXML,
      hasOutputXML: Boolean(outputXML),
      outputTag,
      rpsEnviado,
      hasRpsEnviado: Boolean(rpsEnviado),
      nfseDadosEnviadoPreview,
      outputXmlPreview,
      ocorrenciaResumo,
      faultString,
      rawPreview,
      analiseNfse,
      networkErrors,
    },
    raw: text,
  };
}
