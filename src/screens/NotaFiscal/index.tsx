import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import fonts from "../../styles/fonts";
import api from "../../services/api";
import {
  calcularIntegridadeNfse,
  EMISSOR_PADRAO_REFORLIMER,
  emitirNotaViaApi,
  emitirNotaViaSoapAbrasf,
  formatarCep,
  formatarCnpj,
  gerarPayloadNota,
} from "../../services/notaFiscal";

type Modo = "manual" | "api";

type ClienteCadastro = {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  ativo?: string;
};

const STORAGE_ENDPOINT = "@nf_api_endpoint";
const STORAGE_TOKEN = "@nf_api_token";
const ENDPOINT_NFSE_LIMEIRA_PROD =
  "https://limeira.iibrasil.com.br/api/soap/notafiscal.php?wsdl";
const ENDPOINT_NFSE_LIMEIRA_HOMO =
  "https://limeira.iibrasil.com.br/api/soap/homologacao_notafiscal.php?wsdl";
const CNPJ_PRESTADOR_HOMO = "88888888888888";
const TOKEN_PRESTADOR_HOMO = "TLXX4JN38KXTRNSEAJYYEA==";
const CNPJ_TOMADOR_HOMO = "55555555555555";
const NFSE_DEBUG_BUILD = "nfse-fix-20260321-1838";

const SOAP_OPERACOES_LIMEIRA = [
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

const SOAP_CABECALHO_PADRAO =
  '<cabecalho versao="2.04" xmlns="http://www.abrasf.org.br/nfse.xsd"><versaoDados>2.04</versaoDados></cabecalho>';
const SOAP_DADOS_PADRAO =
  '<GerarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd"></GerarNfseEnvio>';

function somenteDigitos(v: string): string {
  return String(v || "").replace(/\D/g, "");
}

function escapeXml(v: string): string {
  return String(v || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function valorXml(v: number): string {
  return Number(v || 0).toFixed(2);
}

function montarBlocoRpsLimeira(params: {
  data: string;
  valor: string;
  cnpjPrestador: string;
  docTomador: string;
  clienteNome: string;
  clienteEmail: string;
  descricaoServico: string;
  observacoes: string;
  homologacao?: boolean;
}): string {
  const emHomologacao = Boolean(params.homologacao);
  const itemListaServico = emHomologacao ? "01.07" : "07.02";
  const codigoTributacaoNacional = emHomologacao ? "01.07" : "07.02";
  const issRetido = emHomologacao ? "2" : "1";
  const responsavelRetencao = emHomologacao ? "2" : "1";

  const tomadorDocTag =
    params.docTomador.length > 11
      ? `<Cnpj>${params.docTomador}</Cnpj>`
      : `<Cpf>${params.docTomador}</Cpf>`;

  return `<Rps>
    <InfDeclaracaoPrestacaoServico Id="rps1">
      <Rps>
        <IdentificacaoRps>
          <Numero>1</Numero>
          <Serie>A</Serie>
          <Tipo>1</Tipo>
        </IdentificacaoRps>
        <DataEmissao>${params.data}</DataEmissao>
        <Status>1</Status>
      </Rps>
      <Competencia>${params.data}</Competencia>
      <Servico>
        <Valores>
          <ValorServicos>${params.valor}</ValorServicos>
          <ValorDeducoes>0</ValorDeducoes>
          <ValorPis>0</ValorPis>
          <ValorCofins>0</ValorCofins>
          <ValorInss>0</ValorInss>
          <ValorIr>0</ValorIr>
          <ValorCsll>0</ValorCsll>
          <OutrasRetencoes>0</OutrasRetencoes>
          <Aliquota>0</Aliquota>
          <DescontoIncondicionado>0</DescontoIncondicionado>
          <DescontoCondicionado>0</DescontoCondicionado>
        </Valores>
        <IssRetido>${issRetido}</IssRetido>
        <ResponsavelRetencao>${responsavelRetencao}</ResponsavelRetencao>
        <ItemListaServico>${itemListaServico}</ItemListaServico>
        <CodigoTributacaoNacional>${codigoTributacaoNacional}</CodigoTributacaoNacional>
        <Discriminacao>${escapeXml(params.descricaoServico || "PRESTACAO DE SERVICO")}</Discriminacao>
        <CodigoMunicipio>3526902</CodigoMunicipio>
      </Servico>
      <Prestador>
        <Cnpj>${params.cnpjPrestador}</Cnpj>
        <InscricaoMunicipal>0</InscricaoMunicipal>
      </Prestador>
      <TomadorServico>
        <IdentificacaoTomador>
          <CpfCnpj>
            ${tomadorDocTag}
          </CpfCnpj>
        </IdentificacaoTomador>
        <RazaoSocial>${escapeXml(params.clienteNome || "Tomador")}</RazaoSocial>
        <Endereco>
          <Endereco>Sem logradouro</Endereco>
          <Numero>0</Numero>
          <Complemento>GERADO NO APP</Complemento>
          <Bairro>Centro</Bairro>
          <CodigoMunicipio>3526902</CodigoMunicipio>
          <Uf>SP</Uf>
          <Cep>13480000</Cep>
        </Endereco>
        <Contato>
          <Telefone>00000000000</Telefone>
          <Email>${escapeXml(params.clienteEmail || "teste@teste.com")}</Email>
        </Contato>
      </TomadorServico>
      <InformacoesComplementares>${escapeXml(params.observacoes || "GERADO PELO APP")}</InformacoesComplementares>
    </InfDeclaracaoPrestacaoServico>
  </Rps>`;
}

function montarSoapDadosBase(params: {
  operacao: string;
  clienteNome: string;
  clienteDocumento: string;
  clienteEmail: string;
  descricaoServico: string;
  valorServico: number;
  observacoes: string;
  cnpjPrestador: string;
  homologacao?: boolean;
}): string {
  const operacao = String(params.operacao || "GerarNfse").trim();
  const agora = new Date();
  const ano = String(agora.getFullYear());
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  const data = `${ano}-${mes}-${dia}`;
  const valor = valorXml(params.valorServico);
  const cnpjPrestador = somenteDigitos(params.cnpjPrestador);
  const docTomador = somenteDigitos(params.clienteDocumento);

  const rps = montarBlocoRpsLimeira({
    data,
    valor,
    cnpjPrestador,
    docTomador,
    clienteNome: params.clienteNome,
    clienteEmail: params.clienteEmail,
    descricaoServico: params.descricaoServico,
    observacoes: params.observacoes,
    homologacao: params.homologacao,
  });

  if (operacao === "GerarNfse") {
    return `<GerarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  ${rps}
</GerarNfseEnvio>`;
  }

  if (
    operacao === "RecepcionarLoteRpsSincrono" ||
    operacao === "RecepcionarLoteRps"
  ) {
    const root =
      operacao === "RecepcionarLoteRpsSincrono"
        ? "EnviarLoteRpsSincronoEnvio"
        : "EnviarLoteRpsEnvio";

    return `<${root} xmlns="http://www.abrasf.org.br/nfse.xsd">
  <LoteRps Id="1" versao="2.04">
    <NumeroLote>1</NumeroLote>
    <CpfCnpj>
      <Cnpj>${cnpjPrestador}</Cnpj>
    </CpfCnpj>
    <InscricaoMunicipal>0</InscricaoMunicipal>
    <QuantidadeRps>1</QuantidadeRps>
    <ListaRps>
      ${rps}
    </ListaRps>
  </LoteRps>
</${root}>`;
  }

  if (operacao === "ConsultarNfsePorRps") {
    return `<ConsultarNfseRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  <IdentificacaoRps>
    <Numero>1</Numero>
    <Serie>1</Serie>
    <Tipo>1</Tipo>
  </IdentificacaoRps>
  <Prestador>
    <Cnpj>${cnpjPrestador}</Cnpj>
    <InscricaoMunicipal>000000</InscricaoMunicipal>
  </Prestador>
</ConsultarNfseRpsEnvio>`;
  }

  if (operacao === "ConsultarLoteRps") {
    return `<ConsultarLoteRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Prestador>
    <Cnpj>${cnpjPrestador}</Cnpj>
    <InscricaoMunicipal>000000</InscricaoMunicipal>
  </Prestador>
  <Protocolo>000000000000000</Protocolo>
</ConsultarLoteRpsEnvio>`;
  }

  if (operacao === "CancelarNfse") {
    return `<CancelarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Pedido>
    <InfPedidoCancelamento Id="can1">
      <IdentificacaoNfse>
        <Numero>0</Numero>
        <Cnpj>${cnpjPrestador}</Cnpj>
        <InscricaoMunicipal>000000</InscricaoMunicipal>
        <CodigoMunicipio>3526902</CodigoMunicipio>
      </IdentificacaoNfse>
      <CodigoCancelamento>1</CodigoCancelamento>
    </InfPedidoCancelamento>
  </Pedido>
</CancelarNfseEnvio>`;
  }

  return `<GerarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Rps>
    <InfDeclaracaoPrestacaoServico Id="rps1">
      <Servico>
        <Valores>
          <ValorServicos>${valor}</ValorServicos>
        </Valores>
        <Discriminacao>${escapeXml(params.descricaoServico || "Prestacao de servicos")}</Discriminacao>
      </Servico>
      <Prestador>
        <Cnpj>${cnpjPrestador}</Cnpj>
        <InscricaoMunicipal>000000</InscricaoMunicipal>
      </Prestador>
      <TomadorServico>
        <RazaoSocial>${escapeXml(params.clienteNome || "Tomador")}</RazaoSocial>
      </TomadorServico>
    </InfDeclaracaoPrestacaoServico>
  </Rps>
</GerarNfseEnvio>`;
}

const NotaFiscal: React.FC = () => {
  const navigation: any = useNavigation();

  const [modo, setModo] = useState<Modo>("api");

  const [razaoSocial, setRazaoSocial] = useState(
    EMISSOR_PADRAO_REFORLIMER.razaoSocial,
  );
  const [nomeFantasia, setNomeFantasia] = useState(
    EMISSOR_PADRAO_REFORLIMER.nomeFantasia,
  );
  const [cnpj, setCnpj] = useState(
    formatarCnpj(EMISSOR_PADRAO_REFORLIMER.cnpj),
  );
  const [endereco, setEndereco] = useState(EMISSOR_PADRAO_REFORLIMER.endereco);
  const [numero, setNumero] = useState(EMISSOR_PADRAO_REFORLIMER.numero);
  const [cep, setCep] = useState(formatarCep(EMISSOR_PADRAO_REFORLIMER.cep));

  const [clienteNome, setClienteNome] = useState("");
  const [clienteDocumento, setClienteDocumento] = useState(CNPJ_TOMADOR_HOMO);
  const [clienteEmail, setClienteEmail] = useState("");

  const [descricaoServico, setDescricaoServico] = useState(
    "Prestacao de servicos",
  );
  const [valorServico, setValorServico] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [endpointApi, setEndpointApi] = useState(ENDPOINT_NFSE_LIMEIRA_HOMO);
  const [tokenApi, setTokenApi] = useState(TOKEN_PRESTADOR_HOMO);
  const [formatoApi, setFormatoApi] = useState<"soap" | "json">("soap");
  const [soapOperacao, setSoapOperacao] = useState("GerarNfse");
  const [soapCabecMsg, setSoapCabecMsg] = useState(SOAP_CABECALHO_PADRAO);
  const [soapDadosMsg, setSoapDadosMsg] = useState(SOAP_DADOS_PADRAO);

  const [salvandoApi, setSalvandoApi] = useState(false);
  const [emitindo, setEmitindo] = useState(false);
  const [ultimoErroNfse, setUltimoErroNfse] = useState("");

  const [modalClientesVisible, setModalClientesVisible] = useState(false);
  const [modalNovoClienteVisible, setModalNovoClienteVisible] = useState(false);
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const [somenteAtivos, setSomenteAtivos] = useState(true);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clientesCadastrados, setClientesCadastrados] = useState<
    ClienteCadastro[]
  >([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<ClienteCadastro[]>(
    [],
  );

  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [novoClienteDocumento, setNovoClienteDocumento] = useState("");
  const [novoClienteEmail, setNovoClienteEmail] = useState("");
  const [novoClienteTelefone, setNovoClienteTelefone] = useState("");
  const [salvandoNovoCliente, setSalvandoNovoCliente] = useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const ep = await AsyncStorage.getItem(STORAGE_ENDPOINT);
        const tk = await AsyncStorage.getItem(STORAGE_TOKEN);
        if (ep) {
          setEndpointApi(ep);
          if (/\/soap\//i.test(ep)) setFormatoApi("soap");
        }
        if (tk) setTokenApi(tk);
      } catch {
        // sem bloqueio
      }
    })();
  }, []);

  const valorNumero = useMemo(() => {
    const raw = String(valorServico || "").trim();
    if (!raw) return 0;
    const n = parseFloat(raw.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }, [valorServico]);

  function validarCamposBase(): boolean {
    if (!clienteNome.trim()) {
      Alert.alert("Campo obrigatorio", "Informe o nome do cliente/tomador.");
      return false;
    }
    if (!clienteDocumento.trim()) {
      Alert.alert("Campo obrigatorio", "Informe CPF/CNPJ do cliente/tomador.");
      return false;
    }
    if (!descricaoServico.trim()) {
      Alert.alert("Campo obrigatorio", "Informe a descricao do servico.");
      return false;
    }
    if (valorNumero <= 0) {
      Alert.alert("Valor invalido", "Informe um valor maior que zero.");
      return false;
    }
    return true;
  }

  async function carregarClientesCadastrados() {
    try {
      setCarregandoClientes(true);
      const response = await api.get(
        "clientes/listar.php?pagina=1&limite=1000",
      );
      const lista = Array.isArray(response?.data?.resultado)
        ? response.data.resultado
        : [];

      const ordenada = [...lista].sort((a: any, b: any) => {
        const ativoA = String(a?.ativo ?? "").toLowerCase() === "sim" ? 1 : 0;
        const ativoB = String(b?.ativo ?? "").toLowerCase() === "sim" ? 1 : 0;
        if (ativoA !== ativoB) return ativoB - ativoA;
        return String(a?.nome ?? "")
          .toLowerCase()
          .localeCompare(String(b?.nome ?? "").toLowerCase(), "pt-BR");
      });

      setClientesCadastrados(ordenada);
      setClientesFiltrados(
        somenteAtivos
          ? ordenada.filter(
              (c) => String(c?.ativo ?? "").toLowerCase() === "sim",
            )
          : ordenada,
      );
    } catch {
      Alert.alert("Erro", "Nao foi possivel carregar clientes cadastrados.");
    } finally {
      setCarregandoClientes(false);
    }
  }

  async function abrirSeletorClientes() {
    setModalClientesVisible(true);
    setBuscaCliente("");

    if (clientesCadastrados.length === 0) {
      await carregarClientesCadastrados();
    } else {
      setClientesFiltrados(
        somenteAtivos
          ? clientesCadastrados.filter(
              (c) => String(c?.ativo ?? "").toLowerCase() === "sim",
            )
          : clientesCadastrados,
      );
    }
  }

  function filtrarClientes(texto: string) {
    setBuscaCliente(texto);
    const q = String(texto || "")
      .trim()
      .toLowerCase();

    const base = somenteAtivos
      ? clientesCadastrados.filter(
          (c) => String(c?.ativo ?? "").toLowerCase() === "sim",
        )
      : clientesCadastrados;

    if (!q) {
      setClientesFiltrados(base);
      return;
    }

    setClientesFiltrados(
      base.filter((c) => {
        const nome = String(c?.nome ?? "").toLowerCase();
        const email = String(c?.email ?? "").toLowerCase();
        const telefone = String(c?.telefone ?? "").toLowerCase();
        return nome.includes(q) || email.includes(q) || telefone.includes(q);
      }),
    );
  }

  function alternarFiltroAtivos() {
    const prox = !somenteAtivos;
    setSomenteAtivos(prox);

    const base = prox
      ? clientesCadastrados.filter(
          (c) => String(c?.ativo ?? "").toLowerCase() === "sim",
        )
      : clientesCadastrados;

    const q = String(buscaCliente || "")
      .trim()
      .toLowerCase();
    if (!q) {
      setClientesFiltrados(base);
      return;
    }

    setClientesFiltrados(
      base.filter((c) => {
        const nome = String(c?.nome ?? "").toLowerCase();
        const email = String(c?.email ?? "").toLowerCase();
        const telefone = String(c?.telefone ?? "").toLowerCase();
        return nome.includes(q) || email.includes(q) || telefone.includes(q);
      }),
    );
  }

  async function selecionarClienteCadastrado(cliente: ClienteCadastro) {
    setClienteNome(String(cliente?.nome ?? ""));
    setClienteEmail(String(cliente?.email ?? ""));

    try {
      const response = await api.get(`clientes/listar_id.php?id=${cliente.id}`);
      const doc =
        response?.data?.dados?.cpf ??
        response?.data?.dados?.doc ??
        response?.data?.dados?.cnpj ??
        "";
      setClienteDocumento(String(doc ?? ""));
    } catch {
      // mantém nome/email mesmo sem detalhe
    }

    setModalClientesVisible(false);
  }

  async function salvarNovoClienteRapido() {
    if (!novoClienteNome.trim()) {
      Alert.alert("Campo obrigatorio", "Informe o nome do cliente.");
      return;
    }
    if (!novoClienteDocumento.trim()) {
      Alert.alert("Campo obrigatorio", "Informe CPF/CNPJ do cliente.");
      return;
    }

    try {
      setSalvandoNovoCliente(true);
      const payload = {
        id: "0",
        nome: novoClienteNome.trim(),
        celular: novoClienteTelefone.trim(),
        email: novoClienteEmail.trim(),
        endereco: "",
        ativo: "sim",
        cpf: novoClienteDocumento.trim(),
        pessoa: "Fisica",
        obs: "",
        conta: "",
        agencia: "",
        banco: "",
      };

      const resp = await api.post("clientes/salvar.php", payload);
      if (resp?.data?.sucesso === false) {
        Alert.alert(
          "Erro",
          String(resp?.data?.mensagem || "Falha ao salvar cliente."),
        );
        return;
      }

      setClienteNome(novoClienteNome.trim());
      setClienteDocumento(novoClienteDocumento.trim());
      setClienteEmail(novoClienteEmail.trim());

      setModalNovoClienteVisible(false);
      setNovoClienteNome("");
      setNovoClienteDocumento("");
      setNovoClienteEmail("");
      setNovoClienteTelefone("");

      await carregarClientesCadastrados();
      Alert.alert("Sucesso", "Cliente cadastrado com sucesso.");
    } catch {
      Alert.alert("Erro", "Nao foi possivel cadastrar o cliente.");
    } finally {
      setSalvandoNovoCliente(false);
    }
  }

  function montarPayload() {
    return gerarPayloadNota({
      emissor: {
        nomeFantasia,
        razaoSocial,
        cnpj,
        endereco,
        numero,
        cep,
      },
      destinatario: {
        nome: clienteNome,
        documento: clienteDocumento,
        email: clienteEmail,
      },
      descricaoServico,
      valorServico: valorNumero,
      observacoes,
    });
  }

  function aplicarXmlBaseAbrasf() {
    const emHomologacao = /homologacao_notafiscal\.php/i.test(
      String(endpointApi || ""),
    );
    const xml = montarSoapDadosBase({
      operacao: soapOperacao,
      clienteNome,
      clienteDocumento,
      clienteEmail,
      descricaoServico,
      valorServico: valorNumero,
      observacoes,
      cnpjPrestador: cnpj,
      homologacao: emHomologacao,
    });
    setSoapCabecMsg(SOAP_CABECALHO_PADRAO);
    setSoapDadosMsg(xml);
    Alert.alert(
      "XML base gerado",
      "nfseCabecMsg e nfseDadosMsg foram preenchidos. Revise InscricaoMunicipal e campos obrigatorios do municipio antes de emitir.",
    );
  }

  async function salvarConfiguracaoApi() {
    const endpoint = String(endpointApi || "").trim();
    if (!endpoint) {
      Alert.alert("Campo obrigatorio", "Informe o endpoint da API fiscal.");
      return;
    }
    if (!/^https?:\/\//i.test(endpoint)) {
      Alert.alert(
        "Endpoint invalido",
        "Informe uma URL valida iniciando com http:// ou https://",
      );
      return;
    }

    try {
      setSalvandoApi(true);
      await AsyncStorage.setItem(STORAGE_ENDPOINT, endpoint);
      await AsyncStorage.setItem(STORAGE_TOKEN, tokenApi.trim());
      Alert.alert(
        "Configuracao salva",
        "Endpoint e token foram salvos no app.",
      );
    } catch {
      Alert.alert("Erro", "Nao foi possivel salvar a configuracao da API.");
    } finally {
      setSalvandoApi(false);
    }
  }

  async function gerarPreNotaManual() {
    if (!validarCamposBase()) return;

    try {
      const payload = montarPayload();
      const totalFmt = payload.valorTotal.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; font-size: 12px; color:#222; padding: 14px; }
              h1 { font-size: 18px; margin: 0 0 8px 0; }
              h2 { font-size: 14px; margin: 16px 0 8px 0; }
              .box { border:1px solid #ddd; border-radius:8px; padding:10px; margin-bottom:10px; }
              .label { color:#666; font-size:11px; }
              .value { font-weight:bold; margin-bottom:6px; }
              table { width:100%; border-collapse: collapse; margin-top:8px; }
              th, td { border:1px solid #ddd; padding:6px; text-align:left; }
              .right { text-align:right; }
            </style>
          </head>
          <body>
            <h1>Pre-Nota Fiscal (Manual Assistida)</h1>
            <div>Gerado em: ${new Date().toLocaleString("pt-BR")}</div>

            <h2>Emitente</h2>
            <div class="box">
              <div class="label">Razao Social</div><div class="value">${payload.emissor.razaoSocial}</div>
              <div class="label">Nome Fantasia</div><div class="value">${payload.emissor.nomeFantasia}</div>
              <div class="label">CNPJ</div><div class="value">${formatarCnpj(payload.emissor.cnpj)}</div>
              <div class="label">Endereco</div><div class="value">${payload.emissor.endereco}, ${payload.emissor.numero} - CEP ${formatarCep(payload.emissor.cep)}</div>
            </div>

            <h2>Tomador</h2>
            <div class="box">
              <div class="label">Nome</div><div class="value">${payload.destinatario.nome}</div>
              <div class="label">Documento</div><div class="value">${payload.destinatario.documento}</div>
              <div class="label">E-mail</div><div class="value">${payload.destinatario.email || "-"}</div>
            </div>

            <h2>Servico</h2>
            <table>
              <thead>
                <tr>
                  <th>Descricao</th>
                  <th>Qtd</th>
                  <th class="right">Valor Unit.</th>
                  <th class="right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${payload.itens[0].descricao}</td>
                  <td>1</td>
                  <td class="right">R$ ${totalFmt}</td>
                  <td class="right">R$ ${totalFmt}</td>
                </tr>
              </tbody>
            </table>

            <h2>Observacoes</h2>
            <div class="box">${payload.observacoes || "-"}</div>

            <h2>Total</h2>
            <div class="box"><strong>R$ ${totalFmt}</strong></div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch {
      Alert.alert("Erro", "Nao foi possivel gerar a pre-nota em PDF.");
    }
  }

  async function emitirViaApi() {
    if (!validarCamposBase()) return;

    const endpoint = String(endpointApi || "").trim();
    if (!endpoint) {
      Alert.alert(
        "API nao configurada",
        "Informe o endpoint do provedor fiscal.",
      );
      return;
    }

    const logErroNfse = (titulo: string, detalhes: Record<string, any>) => {
      try {
        const logId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const rawCompleto = String(detalhes?.rawCompleto || "");
        const printChunked = (
          tag: string,
          content: string,
          chunkSize = 3000,
        ) => {
          const texto = String(content || "");
          if (!texto) return;
          const total = Math.max(1, Math.ceil(texto.length / chunkSize));
          for (let i = 0; i < total; i += 1) {
            const inicio = i * chunkSize;
            const fim = inicio + chunkSize;
            const parte = texto.slice(inicio, fim);
            console.log(`${tag}[PARTE ${i + 1}/${total}] ${parte}`);
          }
        };

        const payload = JSON.stringify(
          {
            logId,
            build: NFSE_DEBUG_BUILD,
            titulo,
            timestamp: new Date().toISOString(),
            ...detalhes,
          },
          null,
          2,
        );

        setUltimoErroNfse(payload);

        // Em alguns ambientes o console.error pode nao ficar visivel no terminal.
        console.log("[NFS-E][LOG][INICIO]");
        printChunked("[NFS-E][PAYLOAD]", payload);
        if (rawCompleto) {
          console.log(`[NFS-E][RAW][INICIO][${logId}]`);
          printChunked(`[NFS-E][RAW][${logId}]`, rawCompleto);
          console.log(`[NFS-E][RAW][FIM][${logId}]`);
        }
        console.log("[NFS-E][LOG][FIM]");

        console.error(`[NFS-E][ERRO][${logId}] ${payload}`);
        console.warn(
          `[NFS-E][DICA][${logId}] Se nao aparecer no terminal, veja o bloco 'Ultimo erro NFS-e' na tela.`,
        );
      } catch {
        setUltimoErroNfse(
          JSON.stringify(
            {
              titulo,
              timestamp: new Date().toISOString(),
              ...detalhes,
            },
            null,
            2,
          ),
        );
        console.error("[NFS-E][ERRO]", titulo, detalhes);
      }
    };

    try {
      setEmitindo(true);
      let resp: { ok: boolean; status: number; body: any; raw?: string };

      if (formatoApi === "soap") {
        if (!soapOperacao.trim()) {
          Alert.alert("Campo obrigatorio", "Informe a operacao SOAP.");
          return;
        }
        if (!soapCabecMsg.trim() || !soapDadosMsg.trim()) {
          Alert.alert(
            "Campos obrigatorios",
            "Informe nfseCabecMsg e nfseDadosMsg para envio SOAP.",
          );
          return;
        }

        const endpointEhIiBrasil = /iibrasil\.com\.br|iibr\.com\.br/i.test(
          endpoint,
        );
        if (endpointEhIiBrasil && !tokenApi.trim()) {
          Alert.alert(
            "Token obrigatorio",
            "Para iiBrasil/Limeira informe o token do prestador para calcular a integridade.",
          );
          return;
        }

        const diagnosticoIntegridade = await calcularIntegridadeNfse({
          nfseDadosMsg: soapDadosMsg.trim(),
          token: tokenApi.trim(),
        });

        let dadosSoapParaEnvio = soapDadosMsg.trim();
        const operacaoAtual = soapOperacao.trim();

        // Evita reenvio de XML desatualizado: para GerarNfse em iiBrasil,
        // regenera o XML base antes do envio usando o formato homologado.
        if (endpointEhIiBrasil && operacaoAtual === "GerarNfse") {
          const emHomologacao = /homologacao_notafiscal\.php/i.test(endpoint);
          dadosSoapParaEnvio = montarSoapDadosBase({
            operacao: operacaoAtual,
            clienteNome,
            clienteDocumento,
            clienteEmail,
            descricaoServico,
            valorServico: valorNumero,
            observacoes,
            cnpjPrestador: cnpj,
            homologacao: emHomologacao,
          });
          setSoapDadosMsg(dadosSoapParaEnvio);
        }

        resp = await emitirNotaViaSoapAbrasf({
          endpoint,
          operation: operacaoAtual,
          nfseCabecMsg: soapCabecMsg.trim(),
          nfseDadosMsg: dadosSoapParaEnvio,
          token: tokenApi.trim(),
        });

        if (
          endpointEhIiBrasil &&
          tokenApi.trim() &&
          !diagnosticoIntegridade.integridade
        ) {
          logErroNfse("integridade_nao_calculada", {
            endpoint,
            operacao: soapOperacao,
            motivo: "tag_rps_ausente_ou_token_invalido",
            nfseDadosMsgPreview: String(soapDadosMsg || "").slice(0, 800),
          });
        }
      } else {
        const payload = montarPayload();
        resp = await emitirNotaViaApi({
          endpoint,
          token: tokenApi.trim(),
          payload,
        });
      }

      if (!resp.ok) {
        if (formatoApi === "soap") {
          logErroNfse("falha_http", {
            status: resp.status,
            endpoint: endpoint,
            endpointUsado: resp.body?.endpointUsado,
            operacao: soapOperacao,
            soapAction: resp.body?.soapAction,
            tentativaCompat: resp.body?.tentativaCompat,
            integridadeEnviada: resp.body?.integridade?.enviada,
            integridadeNoXml: resp.body?.integridade?.noXml,
            integridadeHash: resp.body?.integridade?.hash,
            rpsEncontrada: resp.body?.integridade?.rpsEncontrada,
            dadosNormalizados: resp.body?.dadosNormalizados,
            faultString: resp.body?.faultString,
            mensagemNfse: resp.body?.analiseNfse?.mensagem,
            outputTag: resp.body?.outputTag,
            outputXMLPreview: String(resp.body?.outputXML || "").slice(0, 800),
            networkErrors: resp.body?.networkErrors,
            rawPreview:
              resp.body?.rawPreview || String(resp.raw || "").slice(0, 800),
            rawCompleto: String(resp.raw || "").slice(0, 20000),
            nfseCabecMsgPreview: String(soapCabecMsg || "").slice(0, 300),
            nfseDadosMsgPreview: String(soapDadosMsg || "").slice(0, 500),
          });
        }

        const detalheCurto =
          formatoApi === "soap"
            ? [
                `tentativa: ${String(resp.body?.tentativaCompat || "-")}`,
                `endpoint: ${String(resp.body?.endpointUsado || endpoint || "-")}`,
                `mensagem: ${String(resp.body?.analiseNfse?.mensagem || resp.body?.faultString || "-")}`,
              ].join("\n")
            : typeof resp.body === "string"
              ? resp.body
              : JSON.stringify(resp.body);

        Alert.alert(
          "Falha na emissao",
          `Status ${resp.status}\n\n${detalheCurto}\n\nVeja o log completo no terminal do VS Code (tags [NFS-E][RAW]).`,
        );
        return;
      }

      const resumoSoap =
        formatoApi === "soap"
          ? `\n\noutputXML: ${resp.body?.hasOutputXML ? "recebido" : "nao encontrado"}` +
            `${resp.body?.tentativaCompat ? `\ntentativa: ${resp.body.tentativaCompat}` : ""}` +
            `${resp.body?.outputTag ? `\ntag retorno: ${resp.body.outputTag}` : ""}` +
            `${resp.body?.analiseNfse?.situacao ? `\nsituacao: ${resp.body.analiseNfse.situacao}` : ""}` +
            `${resp.body?.integridade?.enviada ? "\nintegridade: enviada" : "\nintegridade: nao enviada"}` +
            `${resp.body?.integridade?.noXml ? "\nintegridade no XML: sim" : "\nintegridade no XML: nao"}` +
            `${resp.body?.analiseNfse?.numeroNfse ? `\nnumero NFS-e: ${resp.body.analiseNfse.numeroNfse}` : ""}` +
            `${resp.body?.analiseNfse?.codigoVerificacao ? `\ncodigo verificacao: ${resp.body.analiseNfse.codigoVerificacao}` : ""}` +
            `${resp.body?.analiseNfse?.protocolo ? `\nprotocolo: ${resp.body.analiseNfse.protocolo}` : ""}` +
            `${resp.body?.analiseNfse?.mensagem ? `\nmensagem: ${resp.body.analiseNfse.mensagem}` : ""}` +
            `${resp.body?.faultString ? `\nSOAP Fault: ${resp.body.faultString}` : ""}` +
            `${!resp.body?.hasOutputXML && resp.body?.rawPreview ? `\nresposta: ${String(resp.body.rawPreview).slice(0, 220)}...` : ""}`
          : "";

      Alert.alert(
        formatoApi === "soap" && resp.body?.analiseNfse?.situacao === "erro"
          ? "Retorno NFS-e com erro"
          : "Nota enviada",
        `Emissao enviada com sucesso (status ${resp.status}).${resumoSoap}`,
      );

      if (
        formatoApi === "soap" &&
        resp.body?.analiseNfse?.situacao === "erro"
      ) {
        logErroNfse("retorno_schema_ou_regra", {
          status: resp.status,
          endpoint: endpoint,
          endpointUsado: resp.body?.endpointUsado,
          operacao: soapOperacao,
          soapAction: resp.body?.soapAction,
          tentativaCompat: resp.body?.tentativaCompat,
          integridadeEnviada: resp.body?.integridade?.enviada,
          integridadeNoXml: resp.body?.integridade?.noXml,
          integridadeHash: resp.body?.integridade?.hash,
          rpsEncontrada: resp.body?.integridade?.rpsEncontrada,
          dadosNormalizados: resp.body?.dadosNormalizados,
          mensagemNfse: resp.body?.analiseNfse?.mensagem,
          faultString: resp.body?.faultString,
          outputTag: resp.body?.outputTag,
          outputXMLPreview: String(resp.body?.outputXML || "").slice(0, 1200),
          rawPreview:
            resp.body?.rawPreview || String(resp.raw || "").slice(0, 800),
          rawCompleto: String(resp.raw || "").slice(0, 20000),
          nfseCabecMsgPreview: String(soapCabecMsg || "").slice(0, 300),
          nfseDadosMsgPreview: String(soapDadosMsg || "").slice(0, 800),
        });
      }
    } catch (error: any) {
      logErroNfse("excecao_envio", {
        endpoint: endpoint,
        operacao: soapOperacao,
        erro: error?.message || String(error),
        stack: error?.stack,
        nfseCabecMsgPreview: String(soapCabecMsg || "").slice(0, 300),
        nfseDadosMsgPreview: String(soapDadosMsg || "").slice(0, 800),
      });
      Alert.alert("Erro", error?.message || "Nao foi possivel emitir via API.");
    } finally {
      setEmitindo(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back-circle-outline" size={34} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nota Fiscal</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              modo === "manual" && styles.segmentBtnActive,
            ]}
            onPress={() => setModo("manual")}
          >
            <Text
              style={[
                styles.segmentText,
                modo === "manual" && styles.segmentTextActive,
              ]}
            >
              Manual Assistida
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              modo === "api" && styles.segmentBtnActive,
            ]}
            onPress={() => setModo("api")}
          >
            <Text
              style={[
                styles.segmentText,
                modo === "api" && styles.segmentTextActive,
              ]}
            >
              Integracao API
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Emitente</Text>
        <TextInput
          style={styles.input}
          value={razaoSocial}
          onChangeText={setRazaoSocial}
          placeholder="Razao social"
        />
        <TextInput
          style={styles.input}
          value={nomeFantasia}
          onChangeText={setNomeFantasia}
          placeholder="Nome fantasia"
        />
        <TextInput
          style={styles.input}
          value={cnpj}
          onChangeText={(v) => setCnpj(formatarCnpj(v))}
          placeholder="CNPJ"
          keyboardType="number-pad"
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.col70]}
            value={endereco}
            onChangeText={setEndereco}
            placeholder="Endereco"
          />
          <TextInput
            style={[styles.input, styles.col30]}
            value={numero}
            onChangeText={setNumero}
            placeholder="Numero"
          />
        </View>
        <TextInput
          style={styles.input}
          value={cep}
          onChangeText={(v) => setCep(formatarCep(v))}
          placeholder="CEP"
          keyboardType="number-pad"
        />

        <Text style={styles.sectionTitle}>Tomador / Cliente</Text>
        <TouchableOpacity
          style={styles.selectClientButton}
          onPress={abrirSeletorClientes}
        >
          <MaterialIcons name="person-search" size={18} color="#1f8d4d" />
          <Text style={styles.selectClientButtonText}>
            Selecionar cliente cadastrado
          </Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={clienteNome}
          onChangeText={setClienteNome}
          placeholder="Nome do cliente"
        />
        <TextInput
          style={styles.input}
          value={clienteDocumento}
          onChangeText={setClienteDocumento}
          placeholder="CPF ou CNPJ"
          keyboardType="number-pad"
        />
        <TextInput
          style={styles.input}
          value={clienteEmail}
          onChangeText={setClienteEmail}
          placeholder="E-mail (opcional)"
        />

        <Text style={styles.sectionTitle}>Servico</Text>
        <TextInput
          style={styles.input}
          value={descricaoServico}
          onChangeText={setDescricaoServico}
          placeholder="Descricao do servico"
        />
        <TextInput
          style={styles.input}
          value={valorServico}
          onChangeText={setValorServico}
          placeholder="Valor (ex: 1500,00)"
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={observacoes}
          onChangeText={setObservacoes}
          placeholder="Observacoes"
          multiline
        />

        {modo === "api" && (
          <>
            <Text style={styles.sectionTitle}>Configuracao da API Fiscal</Text>
            <TextInput
              style={styles.input}
              value={endpointApi}
              onChangeText={setEndpointApi}
              placeholder="Endpoint de emissao (provedor fiscal)"
              autoCapitalize="none"
            />

            <View style={styles.segmentRow}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  formatoApi === "soap" && styles.segmentBtnActive,
                ]}
                onPress={() => setFormatoApi("soap")}
              >
                <Text
                  style={[
                    styles.segmentText,
                    formatoApi === "soap" && styles.segmentTextActive,
                  ]}
                >
                  SOAP iiBrasil
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  formatoApi === "json" && styles.segmentBtnActive,
                ]}
                onPress={() => setFormatoApi("json")}
              >
                <Text
                  style={[
                    styles.segmentText,
                    formatoApi === "json" && styles.segmentTextActive,
                  ]}
                >
                  JSON generico
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => {
                  setEndpointApi(ENDPOINT_NFSE_LIMEIRA_PROD);
                  setFormatoApi("soap");
                }}
              >
                <Text style={styles.modalActionButtonText}>
                  Usar Producao Limeira
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => {
                  setEndpointApi(ENDPOINT_NFSE_LIMEIRA_HOMO);
                  setFormatoApi("soap");
                }}
              >
                <Text style={styles.modalActionButtonText}>
                  Usar Homologacao Limeira
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setEndpointApi(ENDPOINT_NFSE_LIMEIRA_HOMO);
                setFormatoApi("soap");
                setTokenApi(TOKEN_PRESTADOR_HOMO);
                setCnpj(formatarCnpj(CNPJ_PRESTADOR_HOMO));
                setClienteDocumento(CNPJ_TOMADOR_HOMO);
                setClienteNome((prev) => prev || "Tomador Homologacao");
                setClienteEmail((prev) => prev || "teste@teste.com");
              }}
            >
              <Text style={styles.secondaryButtonText}>
                Preencher dados de teste (homologacao)
              </Text>
            </TouchableOpacity>

            <Text style={styles.apiHintText}>
              Endpoints oficiais de Limeira (iiBrasil SOAP/WSDL).
            </Text>

            {formatoApi === "soap" && (
              <>
                <Text style={styles.sectionTitle}>Operacao SOAP</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.soapOpsRow}>
                    {SOAP_OPERACOES_LIMEIRA.map((op) => (
                      <TouchableOpacity
                        key={op}
                        style={[
                          styles.soapOpButton,
                          soapOperacao === op && styles.soapOpButtonActive,
                        ]}
                        onPress={() => setSoapOperacao(op)}
                      >
                        <Text
                          style={[
                            styles.soapOpButtonText,
                            soapOperacao === op &&
                              styles.soapOpButtonTextActive,
                          ]}
                        >
                          {op}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <TextInput
                  style={styles.input}
                  value={soapOperacao}
                  onChangeText={setSoapOperacao}
                  placeholder="Operacao SOAP (ex: GerarNfse)"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={aplicarXmlBaseAbrasf}
                >
                  <Text style={styles.secondaryButtonText}>
                    Gerar XML base ABRASF
                  </Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={soapCabecMsg}
                  onChangeText={setSoapCabecMsg}
                  placeholder="nfseCabecMsg (XML)"
                  multiline
                />
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={soapDadosMsg}
                  onChangeText={setSoapDadosMsg}
                  placeholder="nfseDadosMsg (XML)"
                  multiline
                />
              </>
            )}

            <TextInput
              style={styles.input}
              value={tokenApi}
              onChangeText={setTokenApi}
              placeholder="Token do prestador iiBrasil"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={salvarConfiguracaoApi}
            >
              <Text style={styles.secondaryButtonText}>
                {salvandoApi ? "Salvando..." : "Salvar configuracao"}
              </Text>
            </TouchableOpacity>

            {!!ultimoErroNfse && (
              <>
                <Text style={styles.sectionTitle}>Ultimo erro NFS-e</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti, { minHeight: 160 }]}
                  value={ultimoErroNfse}
                  editable={false}
                  multiline
                />
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setUltimoErroNfse("")}
                >
                  <Text style={styles.secondaryButtonText}>Limpar erro</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {modo === "manual" ? (
          <TouchableOpacity
            style={styles.mainButton}
            onPress={gerarPreNotaManual}
          >
            <MaterialIcons name="picture-as-pdf" size={22} color="#fff" />
            <Text style={styles.mainButtonText}>Gerar pre-nota em PDF</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.mainButton} onPress={emitirViaApi}>
            <MaterialIcons name="send" size={22} color="#fff" />
            <Text style={styles.mainButtonText}>
              {emitindo ? "Emitindo..." : "Emitir via API"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={modalClientesVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalClientesVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar cliente</Text>
              <TouchableOpacity onPress={() => setModalClientesVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              value={buscaCliente}
              onChangeText={filtrarClientes}
              placeholder="Buscar por nome, e-mail ou telefone"
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={alternarFiltroAtivos}
              >
                <Text style={styles.modalActionButtonText}>
                  {somenteAtivos ? "Somente ativos" : "Todos"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => setModalNovoClienteVisible(true)}
              >
                <Text style={styles.modalActionButtonText}>Novo cliente</Text>
              </TouchableOpacity>
            </View>

            {carregandoClientes ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#1f8d4d" />
              </View>
            ) : (
              <FlatList
                data={clientesFiltrados}
                keyExtractor={(item) => String(item.id)}
                ListEmptyComponent={
                  <Text style={styles.modalEmpty}>
                    Nenhum cliente encontrado.
                  </Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.clientItem}
                    onPress={() => selecionarClienteCadastrado(item)}
                  >
                    <Text style={styles.clientItemName}>{item.nome}</Text>
                    <Text style={styles.clientItemSub}>
                      {item.email || item.telefone || "Sem contato"}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={modalNovoClienteVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalNovoClienteVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo cliente rapido</Text>
              <TouchableOpacity
                onPress={() => setModalNovoClienteVisible(false)}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              value={novoClienteNome}
              onChangeText={setNovoClienteNome}
              placeholder="Nome do cliente"
            />
            <TextInput
              style={styles.input}
              value={novoClienteDocumento}
              onChangeText={setNovoClienteDocumento}
              placeholder="CPF/CNPJ"
              keyboardType="number-pad"
            />
            <TextInput
              style={styles.input}
              value={novoClienteEmail}
              onChangeText={setNovoClienteEmail}
              placeholder="E-mail (opcional)"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={novoClienteTelefone}
              onChangeText={setNovoClienteTelefone}
              placeholder="Telefone (opcional)"
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={styles.mainButton}
              onPress={salvarNovoClienteRapido}
              disabled={salvandoNovoCliente}
            >
              <MaterialIcons name="save" size={22} color="#fff" />
              <Text style={styles.mainButtonText}>
                {salvandoNovoCliente ? "Salvando..." : "Salvar cliente"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default NotaFiscal;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f7f8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 22,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  back: { marginRight: 10 },
  headerTitle: {
    fontFamily: fonts.text,
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  content: { padding: 14, paddingBottom: 30 },
  segmentRow: {
    flexDirection: "row",
    backgroundColor: "#e8ebed",
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  segmentBtnActive: { backgroundColor: "#1f8d4d" },
  segmentText: {
    color: "#374151",
    fontFamily: fonts.text,
    fontSize: 13,
    fontWeight: "600",
  },
  segmentTextActive: { color: "#fff" },
  sectionTitle: {
    fontFamily: fonts.text,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontFamily: fonts.text,
    color: "#111827",
  },
  inputMulti: { minHeight: 84, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 8 },
  col70: { flex: 0.7 },
  col30: { flex: 0.3 },
  selectClientButton: {
    backgroundColor: "#eaf7ef",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#b7e3c8",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  selectClientButtonText: {
    marginLeft: 8,
    color: "#1f8d4d",
    fontFamily: fonts.text,
    fontSize: 14,
    fontWeight: "700",
  },
  mainButton: {
    marginTop: 14,
    backgroundColor: "#1f8d4d",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  mainButtonText: {
    color: "#fff",
    fontFamily: fonts.text,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#eef2f7",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: "#111827",
    fontFamily: fonts.text,
    fontSize: 14,
    fontWeight: "600",
  },
  apiHintText: {
    color: "#4b5563",
    fontFamily: fonts.text,
    fontSize: 12,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "center",
    padding: 14,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    color: "#111827",
    fontFamily: fonts.text,
    fontSize: 18,
    fontWeight: "700",
  },
  modalLoading: { paddingVertical: 30 },
  modalActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  modalActionButton: {
    flex: 1,
    backgroundColor: "#eef2f7",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalActionButtonText: {
    color: "#111827",
    fontFamily: fonts.text,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  modalEmpty: {
    textAlign: "center",
    color: "#6b7280",
    paddingVertical: 20,
    fontFamily: fonts.text,
  },
  clientItem: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  clientItemName: {
    color: "#111827",
    fontFamily: fonts.text,
    fontSize: 15,
    fontWeight: "700",
  },
  clientItemSub: {
    color: "#6b7280",
    fontFamily: fonts.text,
    fontSize: 13,
    marginTop: 2,
  },
  soapOpsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  soapOpButton: {
    backgroundColor: "#eef2f7",
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  soapOpButtonActive: { backgroundColor: "#1f8d4d" },
  soapOpButtonText: {
    color: "#1f2937",
    fontFamily: fonts.text,
    fontSize: 12,
    fontWeight: "700",
  },
  soapOpButtonTextActive: { color: "#fff" },
});
