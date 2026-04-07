import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { MaterialIcons } from "@expo/vector-icons";
import { format } from "date-fns";
import api from "../../services/api";
import fonts from "../../styles/fonts";
import Header from "../../components/Header";
import { styles } from "./styles";

interface Cliente {
  id: number | string;
  nome: string;
  endereco?: string;
  telefone?: string;
  email?: string;
}

interface ServicoObra {
  id: number | string;
  nome: string;
  unidade_base?: string;
  custo_mao_obra?: number;
  produtividade_horas_unidade?: string;
}

interface ServicoSelecionado {
  servico_id: string;
  nome: string;
  unidade_base?: string;
  quantidade: string; // m² ou unidade
  valor_unitario_mao_obra: string;
  produtividade_horas_unidade?: string; // horas por unidade
}

interface MaterialCalculado {
  produto_id: string;
  produto_nome?: string;
  quantidade_total: number | string;
  unidade?: string | null;
  valor_unitario: number | string;
  subtotal: number | string;
}

function NovoOrcamentoObra({ route }: any) {
  const navigation: any = useNavigation();

  // Geração de contrato de mão de obra conforme legislação brasileira
  const imprimirContrato = async () => {
    try {
      const dataHoje = format(new Date(), "dd/MM/yyyy");
      const totalDiasContrato = totalHorasMaoObra / 7.5;
      const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #222; padding: 24px; line-height: 1.5; }
        h1 { text-align: center; font-size: 16px; margin-bottom: 16px; text-transform: uppercase; }
        h2 { font-size: 14px; margin-top: 16px; margin-bottom: 8px; }
        p  { margin: 4px 0; text-align: justify; }
        .clausula { margin-top: 12px; font-weight: bold; }
        .assinaturas { margin-top: 40px; display: flex; justify-content: space-between; }
        .assinatura { text-align: center; width: 45%; }
        .linha { margin-top: 32px; border-top: 1px solid #000; padding-top: 4px; }
      </style>
    </head>
    <body>
      <h1>CONTRATO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS DE MÃO-DE-OBRA DE CONSTRUÇÃO CIVIL</h1>

      <p>
        Pelo presente instrumento particular, de um lado
        <strong>${clienteNome || "________________"}</strong>, brasileiro(a),
        estado civil ____________, profissão ____________, residente e domiciliado(a) em
        ${clienteEndereco || "________________"}, portador(a) do RG nº ____________ e CPF/MF nº ____________,
        doravante denominado(a) simplesmente <strong>CONTRATANTE</strong>, e de outro lado a empresa
        <strong>ReforLimer</strong>, inscrita no CNPJ/MF sob nº 00.000.000/0001-00, com sede em
        Rua Exemplo, 123, Bairro ________, Cidade/UF, doravante denominada simplesmente
        <strong>CONTRATADA</strong>, resolvem celebrar o presente CONTRATO PARTICULAR DE PRESTAÇÃO DE
        SERVIÇOS DE MÃO-DE-OBRA DE CONSTRUÇÃO CIVIL, que se regerá pelas cláusulas e condições seguintes.
      </p>

      <p class="clausula">CLÁUSULA 1ª – DO OBJETO</p>
      <p>
        A CONTRATADA se obriga a executar os serviços de mão-de-obra de construção/reforma consistentes em
        <strong>${descricao || "______________________________________"}</strong>, a serem realizados no imóvel
        situado em <strong>${localObra || "______________________________________"}</strong>.
      </p>

      <p>
        § único: A mão-de-obra fornecida pela CONTRATADA será necessária para a perfeita execução do serviço
        supra citado, devendo obedecer rigorosamente às determinações e orientações técnicas acordadas com a CONTRATANTE.
      </p>

      <p class="clausula">CLÁUSULA 2ª – DAS RESPONSABILIDADES DA CONTRATADA</p>
      <p>
        a) Ajustar em seu nome os empregados necessários aos serviços ora contratados, correndo por sua conta
        as despesas com salários, encargos previdenciários, seguro de acidentes, obrigações trabalhistas em geral,
        bem como, se houver, despesas com alimentação, alojamento e transporte de empregados até o canteiro de obras,
        não cabendo à CONTRATANTE qualquer ônus além dos aqui expressamente estabelecidos.
      </p>
      <p>
        b) Fornecer e utilizar as ferramentas e toda a mão-de-obra necessária à execução dos serviços contratados,
        tudo às suas expensas, observando as boas práticas da construção civil.
      </p>
      <p>
        c) Fornecer e utilizar os equipamentos de proteção individual (EPIs) exigidos para o tipo de serviço em execução,
        zelando pela segurança de seus prepostos e terceiros.
      </p>
      <p>
        d) Colocar de imediato no local dos serviços operários nas categorias profissionais necessárias à perfeita
        execução dos serviços ora contratados.
      </p>
      <p>
        e) Aumentar ou diminuir o quadro de operários quando solicitado pela CONTRATANTE, ficando reservado a esta o
        direito de exigir o afastamento imediato de qualquer empregado que, a seu juízo, esteja prejudicando o bom
        andamento dos trabalhos, correndo todas as despesas decorrentes por conta exclusiva da CONTRATADA.
      </p>
      <p>
        f) Iniciar os serviços tão logo seja autorizada pela CONTRATANTE, observando o cronograma físico-financeiro,
        quando houver.
      </p>
      <p>
        g) Na sua ausência ou impedimento, indicar por escrito substituto com poderes para definição de serviços,
        assinatura de requisições de materiais e equipamentos, bem como demais documentos necessários à execução
        deste contrato.
      </p>

      <p class="clausula">CLÁUSULA 3ª – DOS MATERIAIS</p>
      <p>
        Os materiais necessários à execução dos serviços contratados serão fornecidos pela CONTRATANTE,
        salvo ajuste diverso entre as partes.
      </p>
      <p>
        § único – A CONTRATANTE não se responsabiliza por perdas, extravios ou danos materiais nas ferramentas
        ou equipamentos de propriedade da CONTRATADA.
      </p>

      <p class="clausula">CLÁUSULA 4ª – DO PREÇO E FORMA DE PAGAMENTO</p>
      <p>
        Pelo presente contrato, a CONTRATANTE pagará à CONTRATADA, pela realização dos serviços ora contratados,
        o preço total de <strong>R$ ${valorTotal.toFixed(2)}</strong> (valor referente à mão de obra, conforme orçamento aprovado).
      </p>
      <p>
        A forma de pagamento poderá ser ajustada em parcelas entre as partes, devendo constar no orçamento aprovado
        ou em instrumento apartado, com datas e valores discriminados.
      </p>

      <p class="clausula">CLÁUSULA 5ª – DO PRAZO</p>
      <p>
        O prazo estimado para conclusão dos serviços é de
        <strong>${
          totalHorasMaoObra > 0
            ? `${totalDiasContrato.toFixed(2)} dias (aprox. ${totalHorasMaoObra.toFixed(2)} horas)`
            : "______________"
        }</strong>,
        podendo ser ajustado de comum acordo entre as partes, mediante registro em aditivo ou no próprio orçamento.
      </p>

      <p class="clausula">CLÁUSULA 6ª – DO FORO</p>
      <p>
        As partes elegem o foro da comarca de _______________________, com exclusão de qualquer outro,
        por mais privilegiado que seja, para dirimir as dúvidas decorrentes da interpretação e execução
        do presente contrato.
      </p>

      <p style="margin-top: 24px;">
        E por estarem justos e contratados, firmam o presente instrumento em duas vias de igual teor e forma,
        juntamente com duas testemunhas abaixo assinadas.
      </p>

      <p style="margin-top: 16px; text-align: center;">
        Local e data: ____________________________, ${dataHoje}
      </p>

      <div class="assinaturas">
        <div class="assinatura">
          <div class="linha">CONTRATANTE</div>
        </div>
        <div class="assinatura">
          <div class="linha">CONTRATADA</div>
        </div>
      </div>

      <div style="margin-top: 32px;">
        <p>_____________________________________<br/>Testemunha 1 – CPF: ____________________</p>
        <p>_____________________________________<br/>Testemunha 2 – CPF: ____________________</p>
      </div>

    </body>
  </html>`;
      const { uri } = await Print.printToFileAsync({ html });
      try {
        await Print.printAsync({ uri });
      } catch (e: any) {
        // Em muitos dispositivos, esse erro significa apenas que o usuário
        // fechou/cancelou a tela de impressão. Não é uma falha de geração.
        if (
          typeof e?.message === "string" &&
          e.message.includes("Printing did not complete")
        ) {
          console.log("imprimirContrato cancelado pelo usuário");
          return;
        }
        throw e;
      }
    } catch (e) {
      console.log("imprimirContrato erro", e);
      Alert.alert("Erro", "Não foi possível gerar o contrato.");
    }
  };
  const routeIdParam = route?.params?.id_reg ?? "0";
  const [idEditar, setIdEditar] = useState<string>(String(routeIdParam));
  const isEdit = idEditar !== "0";

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteEndereco, setClienteEndereco] = useState("");
  const [modalClienteVisivel, setModalClienteVisivel] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState("");

  const [descricao, setDescricao] = useState("");
  const [localObra, setLocalObra] = useState("");
  const [tipoObra, setTipoObra] = useState("");
  const [areaPrincipal, setAreaPrincipal] = useState("");
  const [dataOrcamento, setDataOrcamento] = useState<Date>(new Date());
  const [showDate, setShowDate] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [documento, setDocumento] = useState("");
  const [status, setStatus] = useState("Pendente");
  const [validade, setValidade] = useState("30 dias");
  const [gerarContaReceber, setGerarContaReceber] = useState(false);
  const [vencimentoConta, setVencimentoConta] = useState<Date>(new Date());
  const [showDateVencimento, setShowDateVencimento] = useState(false);
  const [modalContaValorVisivel, setModalContaValorVisivel] = useState(false);
  const [tipoValorConta, setTipoValorConta] = useState<
    "mao_obra" | "total_geral" | "com_bdi"
  >("total_geral");

  const [servicosDisponiveis, setServicosDisponiveis] = useState<ServicoObra[]>(
    [],
  );
  const [servicosSelec, setServicosSelec] = useState<ServicoSelecionado[]>([]);
  const [servicoIndexFocado, setServicoIndexFocado] = useState<number | null>(
    null,
  );
  const [buscaServico, setBuscaServico] = useState("");
  const [modalServicosVisivel, setModalServicosVisivel] = useState(false);

  const [materiaisCalc, setMateriaisCalc] = useState<MaterialCalculado[]>([]);
  const [valorTotal, setValorTotal] = useState(0);

  const [mostrarValoresServicosRelatorio, setMostrarValoresServicosRelatorio] =
    useState(true);
  const [
    mostrarCustoColaboradorRelatorio,
    setMostrarCustoColaboradorRelatorio,
  ] = useState(false);
  const [custoDiarioColaborador, setCustoDiarioColaborador] = useState("");
  const [bdiImpostosPercentual, setBdiImpostosPercentual] = useState("");
  const [bdiTaxaAdmPercentual, setBdiTaxaAdmPercentual] = useState("");
  const [bdiLucroPercentual, setBdiLucroPercentual] = useState("");
  const [mostrarBdiRelatorio, setMostrarBdiRelatorio] = useState(true);
  const [incluirMateriaisNosTotais, setIncluirMateriaisNosTotais] =
    useState(true);

  // Modais de seleção de validade e status, seguindo NovoOrcamento
  const [modalValidadeVisivel, setModalValidadeVisivel] = useState(false);
  const [modalStatusVisivel, setModalStatusVisivel] = useState(false);

  const logoUri = Image.resolveAssetSource(
    require("../../assets/logo2.png"),
  ).uri;

  useEffect(() => {
    carregarClientes();
    carregarServicos();
  }, []);

  useEffect(() => {
    const p = route?.params?.id_reg ?? "0";
    setIdEditar(String(p));
  }, [route?.params?.id_reg]);

  useEffect(() => {
    if (idEditar && idEditar !== "0") {
      // modo edição: carrega dados do servidor
      carregarOrcamento(idEditar);
    } else {
      // novo orçamento: garante data de hoje
      setDataOrcamento(new Date());
    }
  }, [idEditar]);

  useEffect(() => {
    const total = servicosSelec.reduce((acc, s) => {
      const q = parseFloat(s.quantidade.replace(",", ".")) || 0;
      const v = parseFloat(s.valor_unitario_mao_obra.replace(",", ".")) || 0;
      return acc + q * v;
    }, 0);
    setValorTotal(total);
  }, [servicosSelec]);

  const totalMateriais = materiaisCalc.reduce((acc, m) => {
    const sub = Number(m.subtotal ?? 0);
    return acc + (Number.isFinite(sub) ? sub : 0);
  }, 0);

  const totalGeral = incluirMateriaisNosTotais
    ? valorTotal + totalMateriais
    : valorTotal;

  const custoDiarioColaboradorNum =
    parseFloat(custoDiarioColaborador.replace(",", ".")) || 0;
  const bdiImpostosPercentualNum =
    parseFloat(bdiImpostosPercentual.replace(",", ".")) || 0;
  const bdiTaxaAdmPercentualNum =
    parseFloat(bdiTaxaAdmPercentual.replace(",", ".")) || 0;
  const bdiLucroPercentualNum =
    parseFloat(bdiLucroPercentual.replace(",", ".")) || 0;
  const percentualBdiTotal =
    bdiImpostosPercentualNum + bdiTaxaAdmPercentualNum + bdiLucroPercentualNum;

  const totalHorasMaoObra = servicosSelec.reduce((acc, s) => {
    const q = parseFloat(s.quantidade.replace(",", ".")) || 0;
    const prod = s.produtividade_horas_unidade
      ? parseFloat(String(s.produtividade_horas_unidade).replace(",", "."))
      : 0;
    return acc + q * prod;
  }, 0);

  const totalDiasMaoObra = totalHorasMaoObra / 7.5;
  const valorGastoColaborador = totalDiasMaoObra * custoDiarioColaboradorNum;
  const valorBdi = valorTotal * (percentualBdiTotal / 100);
  const totalComBdi = totalGeral + valorBdi;

  const carregarClientes = async () => {
    try {
      const res = await api.get("clientes/listar.php?pagina=1&limite=1000");
      const dados = res.data?.resultado || [];
      const ordenado = [...dados].sort((a, b) =>
        String(a.nome ?? "")
          .toLowerCase()
          .localeCompare(String(b.nome ?? "").toLowerCase(), "pt-BR"),
      );
      setClientes(ordenado);
    } catch (e) {
      console.log("carregarClientes erro", e);
      setClientes([]);
    }
  };

  const carregarEnderecoCliente = async (id: string) => {
    const idNum = Number(id);
    if (!idNum || Number.isNaN(idNum)) {
      setClienteEndereco("");
      return;
    }
    try {
      const res = await api.get(`clientes/listar_id.php?id=${idNum}`);
      if (res.data?.success && res.data?.dados) {
        setClienteEndereco(res.data.dados.endereco || "");
      }
    } catch (e) {
      console.log("carregarEnderecoCliente erro", e);
      setClienteEndereco("");
    }
  };

  const selecionarCliente = (cliente: Cliente) => {
    setClienteId(String(cliente.id));
    setClienteNome(cliente.nome);
    carregarEnderecoCliente(String(cliente.id));
    setModalClienteVisivel(false);
    setBuscaCliente("");
  };

  const selecionarClientePorId = (texto: string) => {
    setClienteId(texto);
    const idNum = texto.trim();
    if (!idNum) {
      setClienteNome("");
      setClienteEndereco("");
      return;
    }
    const cliente = clientes.find((c) => String(c.id) === idNum);
    setClienteNome(cliente?.nome || "");
    if (cliente) {
      carregarEnderecoCliente(String(cliente.id));
    } else {
      carregarEnderecoCliente(idNum);
    }
  };

  const carregarServicos = async () => {
    try {
      const res = await api.get("servicos_obra/listar.php");
      const dados = res.data?.resultado || [];
      setServicosDisponiveis(dados);
    } catch (e) {
      console.log("carregarServicos erro", e);
      setServicosDisponiveis([]);
    }
  };

  // parseia string "YYYY-MM-DD" sem aplicar offset de timezone
  const parseDateOnly = (dstr: string | undefined | null) => {
    if (!dstr) return new Date();
    const s = String(dstr);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const dt = new Date(s);
    return Number.isNaN(dt.getTime()) ? new Date() : dt;
  };

  const parseBoolLike = (value: any) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      return ["1", "true", "sim", "yes", "on"].includes(v);
    }
    return false;
  };

  const toInputNumber = (value: any) => {
    if (value === null || typeof value === "undefined") return "";
    const txt = String(value).trim();
    return txt === "" ? "" : txt;
  };

  const carregarOrcamento = async (id: string) => {
    try {
      const res = await api.get(`orcamentos_obra/listar_id.php?id=${id}`);
      if (!res.data?.success) return;

      const dados = res.data.dados || {};
      const servicos = res.data.servicos || [];
      const materiais = res.data.materiais || [];

      setClienteId(String(dados.cliente_id ?? ""));
      setClienteNome(dados.cliente_nome ?? "");
      setDescricao(dados.descricao ?? "");
      setLocalObra(dados.local ?? "");
      setTipoObra(dados.tipo_obra ?? "");
      setAreaPrincipal(String(dados.area_principal ?? ""));
      setObservacoes(dados.observacoes ?? "");
      setDocumento(String(dados.documento ?? ""));
      setStatus(dados.status ?? "Pendente");
      setValidade(dados.validade ?? "");
      setMostrarCustoColaboradorRelatorio(
        parseBoolLike((dados as any).mostrar_custo_colaborador_relatorio),
      );
      setCustoDiarioColaborador(
        toInputNumber((dados as any).custo_colaborador_dia),
      );
      setBdiImpostosPercentual(
        toInputNumber((dados as any).bdi_impostos_percentual),
      );
      setBdiTaxaAdmPercentual(
        toInputNumber((dados as any).bdi_taxa_adm_percentual),
      );
      setBdiLucroPercentual(toInputNumber((dados as any).bdi_lucro_percentual));
      setIncluirMateriaisNosTotais(
        typeof (dados as any).incluir_materiais_totais === "undefined"
          ? true
          : parseBoolLike((dados as any).incluir_materiais_totais),
      );

      if (dados.data_orcamento) {
        const dataStr = String(dados.data_orcamento).slice(0, 10);
        const partes = dataStr.split("-");
        if (partes.length === 3) {
          const ano = Number(partes[0]);
          const mes = Number(partes[1]) - 1;
          const dia = Number(partes[2]);
          const dataLocal = new Date(ano, mes, dia);
          if (!Number.isNaN(dataLocal.getTime())) {
            setDataOrcamento(dataLocal);
          }
        }
      }

      if (dados.cliente_id) {
        carregarEnderecoCliente(String(dados.cliente_id));
      }

      const listaServSel: ServicoSelecionado[] = servicos.map((s: any) => ({
        servico_id: String(s.servico_id ?? s.id ?? "0"),
        nome: String(s.servico_nome ?? s.nome ?? ""),
        unidade_base: s.unidade_base ? String(s.unidade_base) : undefined,
        quantidade: String(s.quantidade ?? dados.area_principal ?? "0"),
        valor_unitario_mao_obra: String(
          s.valor_unitario_mao_obra ?? s.custo_mao_obra ?? "0",
        ),
        produtividade_horas_unidade: s.produtividade_horas_unidade
          ? String(s.produtividade_horas_unidade)
          : undefined,
      }));
      setServicosSelec(listaServSel);

      setMateriaisCalc(materiais as MaterialCalculado[]);

      if (typeof dados.valor_total !== "undefined") {
        const vt = parseFloat(String(dados.valor_total).replace(",", "."));
        if (!Number.isNaN(vt)) setValorTotal(vt);
      }

      // Se já existir uma conta a receber vinculada a este orçamento de obra,
      // marcar o checkbox e carregar o vencimento da conta, para que
      // edições futuras atualizem o mesmo lançamento em contas_receber
      try {
        const contaReceberId =
          (dados as any).conta_receber_id ??
          (dados as any).id_conta_receber ??
          null;

        if (contaReceberId) {
          setGerarContaReceber(true);

          const respConta = await api.get(
            `receber/listar_id.php?id=${encodeURIComponent(String(contaReceberId))}`,
          );
          const vencStr = respConta?.data?.dados?.vencimento;
          if (vencStr) {
            setVencimentoConta(parseDateOnly(String(vencStr)));
          }
        }
      } catch (e) {
        console.log(
          "carregarOrcamento (obra) - erro ao carregar conta a receber vinculada",
          e,
        );
      }
    } catch (e) {
      console.log("carregarOrcamento erro", e);
    }
  };

  const adicionarServico = (s: ServicoObra) => {
    const novo: ServicoSelecionado = {
      servico_id: String(s.id),
      nome: s.nome,
      unidade_base: s.unidade_base,
      quantidade: "0",
      valor_unitario_mao_obra: String(s.custo_mao_obra ?? "0"),
      produtividade_horas_unidade: s.produtividade_horas_unidade,
    };

    setServicosSelec((prev) => {
      const novaLista = [...prev, novo];
      setServicoIndexFocado(novaLista.length - 1);
      return novaLista;
    });
  };

  const removerServico = (index: number) => {
    setServicosSelec((prev) => prev.filter((_, i) => i !== index));
  };

  const atualizarServico = (
    index: number,
    campo: keyof Pick<
      ServicoSelecionado,
      "quantidade" | "valor_unitario_mao_obra" | "produtividade_horas_unidade"
    >,
    valor: string,
  ) => {
    setServicosSelec((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [campo]: valor };
      return copia;
    });
  };

  const gerarHtml = () => {
    const clienteNomeLocal = clienteNome || "-";
    const clienteEnderecoLocal = clienteEndereco || "-";
    const localObraTexto = localObra || "-";

    const incluirValoresServicos = mostrarValoresServicosRelatorio;

    const linhasServicos = servicosSelec
      .map((s) => {
        const q = parseFloat(s.quantidade.replace(",", ".")) || 0;
        const v = parseFloat(s.valor_unitario_mao_obra.replace(",", ".")) || 0;
        const subtotal = q * v;
        const unidadeTexto = s.unidade_base ? ` ${s.unidade_base}` : "";
        const prodHoras = s.produtividade_horas_unidade
          ? parseFloat(String(s.produtividade_horas_unidade).replace(",", "."))
          : 0;
        const horasEstimadas = q * prodHoras;
        const diasEstimados = horasEstimadas / 7.5; // 7h30 por dia

        if (!incluirValoresServicos) {
          return `<tr>
  <td style="padding:6px;border:1px solid #ddd">${s.nome}</td>
  <td style="padding:6px;border:1px solid #ddd;text-align:center">${q.toFixed(
    2,
  )}${unidadeTexto}</td>
</tr>`;
        }

        return `<tr>
  <td style="padding:6px;border:1px solid #ddd">${s.nome}</td>
  <td style="padding:6px;border:1px solid #ddd;text-align:center">${q.toFixed(
    2,
  )}${unidadeTexto}</td>
  <td style="padding:6px;border:1px solid #ddd;text-align:right">R$ ${v.toFixed(
    2,
  )}</td>
  <td style="padding:6px;border:1px solid #ddd;text-align:right">R$ ${subtotal.toFixed(
    2,
  )}</td>
  <td style="padding:6px;border:1px solid #ddd;text-align:right">${horasEstimadas.toFixed(
    2,
  )} h</td>
  <td style="padding:6px;border:1px solid #ddd;text-align:right">${diasEstimados.toFixed(
    2,
  )} dias</td>
</tr>`;
      })
      .join("");

    const cabecalhoServicos = incluirValoresServicos
      ? `<tr>
        <th>Serviço</th>
        <th>Quantidade</th>
        <th>Valor unitário (mão de obra)</th>
        <th>Subtotal</th>
        <th>Tempo (h)</th>
        <th>Dias (7h30)</th>
      </tr>`
      : `<tr>
        <th>Serviço</th>
        <th>Quantidade</th>
       
      </tr>`;

    const linhasMateriais = materiaisCalc
      .map((m) => {
        const qtd = Number(m.quantidade_total ?? 0);
        const valorUnit = Number(m.valor_unitario ?? 0);
        const sub = Number(m.subtotal ?? qtd * valorUnit);
        return `<tr>
  <td style="padding:6px;border:1px solid #ddd">${m.produto_nome || "-"}</td>
  <td style="padding:6px;border:1px solid #ddd;text-align:center">${qtd.toFixed(
    2,
  )} ${m.unidade || ""}</td>
  <td style="padding:6px;border:1px solid #ddd;text-align:right">R$ ${valorUnit.toFixed(
    2,
  )}</td>
  <td style="padding:6px;border:1px solid #ddd;text-align:right">R$ ${sub.toFixed(
    2,
  )}</td>
</tr>`;
      })
      .join("");

    const totalMaoObra = valorTotal;
    const totalMateriais = materiaisCalc.reduce((acc, m) => {
      const sub = Number(m.subtotal ?? 0);
      return acc + (Number.isFinite(sub) ? sub : 0);
    }, 0);
    const totalGeral = incluirMateriaisNosTotais
      ? totalMaoObra + totalMateriais
      : totalMaoObra;
    const totalHoras = servicosSelec.reduce((acc, s) => {
      const q = parseFloat(s.quantidade.replace(",", ".")) || 0;
      const prod = s.produtividade_horas_unidade
        ? parseFloat(String(s.produtividade_horas_unidade).replace(",", "."))
        : 0;
      return acc + q * prod;
    }, 0);
    const totalDias = totalHoras / 7.5; // 7h30 por dia
    const custoColaboradorDia =
      parseFloat(custoDiarioColaborador.replace(",", ".")) || 0;
    const valorColaborador = totalDias * custoColaboradorDia;
    const exibirCustoColaborador =
      mostrarCustoColaboradorRelatorio && custoColaboradorDia > 0;

    const percImpostos =
      parseFloat(bdiImpostosPercentual.replace(",", ".")) || 0;
    const percTaxaAdm = parseFloat(bdiTaxaAdmPercentual.replace(",", ".")) || 0;
    const percLucro = parseFloat(bdiLucroPercentual.replace(",", ".")) || 0;
    const percBdiTotal = percImpostos + percTaxaAdm + percLucro;
    const valorBdiRelatorio = totalMaoObra * (percBdiTotal / 100);
    const totalGeralRelatorio = totalGeral + valorBdiRelatorio;

    const linhaTotalServicos = incluirValoresServicos
      ? `<tr>
  <td style="padding:6px;border:1px solid #ddd;font-weight:bold" colspan="3">Total mão de obra</td>
  <td style="padding:6px;border:1px solid #ddd;text-align:right;font-weight:bold">R$ ${totalMaoObra.toFixed(
    2,
  )}</td>
  <td style="padding:6px;border:1px solid #ddd"></td>
  <td style="padding:6px;border:1px solid #ddd"></td>
</tr>`
      : `<tr>
  <td style="padding:6px;border:1px solid #ddd;font-weight:bold">Total mão de obra</td>
  <td style="padding:6px;border:1px solid #ddd;text-align:right;font-weight:bold">R$ ${totalMaoObra.toFixed(
    2,
  )}</td>
</tr>`;

    const linhaTotalMateriais = `<tr>
  <td style="padding:6px;border:1px solid #ddd;font-weight:bold" colspan="3">Total materiais</td>
  <td style="padding:6px;border:1px solid #ddd;text-align:right;font-weight:bold">R$ ${totalMateriais.toFixed(
    2,
  )}</td>
</tr>`;

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
	body{font-family:Arial,Helvetica,sans-serif;color:#333;padding:12px 20px 18px 20px;font-size:11px;line-height:1.35}
	h1,h2,h3{margin:0 0 6px 0}
	table{width:100%;border-collapse:collapse;margin-top:8px;font-size:10px}
	th,td{padding:4px;border:1px solid #ddd;font-size:11px}
	th{background:#f5f5f5;text-align:left}
  </style>
</head>
<body>
  <div style="position:relative;display:flex;align-items:flex-start;justify-content:center;margin-bottom:6px;min-height:140px">
    <img
      src="${logoUri}"
      style="position:absolute;left:0;top:0;height:140px;object-fit:contain;max-width:45%"/>
    <div style="text-align:center;margin:0 auto">
      <h1 style="margin:0;padding:0;font-size:24px">ReforLimer</h1>
      <p style="margin:2px 0 0 0;font-size:12px">Reformas • Projetos • Construção</p>
    </div>
  </div>

  <div style="text-align:right;font-size:11px;margin-bottom:6px">
    <p style="margin:0 0 4px 0"><strong>Data:</strong> ${format(
      dataOrcamento,
      "dd/MM/yyyy",
    )}</p>
    <p style="margin:0"><strong>Área:</strong> ${areaPrincipal || "-"} m²</p>
  </div>

  <h2 style="margin-bottom:4px">Dados do Cliente</h2>
  <p style="margin:1px 0;font-size:11px;line-height:1.2"><strong>Cliente:</strong> ${clienteNomeLocal}</p>
  <p style="margin:1px 0;font-size:11px;line-height:1.2"><strong>Endereço:</strong> ${clienteEnderecoLocal}</p>
  <p style="margin:1px 0;font-size:11px;line-height:1.2"><strong>Local da obra:</strong> ${localObraTexto}</p>
  <p style="margin:1px 0 4px 0;font-size:11px;line-height:1.2"><strong>Tipo de obra:</strong> ${tipoObra || "-"}</p>

  <h2>Serviços (mão de obra)</h2>
  <table>
    <thead>
      ${cabecalhoServicos}
    </thead>
    <tbody>${linhasServicos}${linhaTotalServicos}</tbody>
  </table>

  <h2>Estimativa de materiais</h2>
  <table>
    <thead>
      <tr>
        <th>Produto</th>
        <th>Quantidade</th>
        <th>Valor unitário</th>
        <th>Subtotal</th>
      </tr>
    </thead>
    <tbody>${linhasMateriais}${linhaTotalMateriais}</tbody>
  </table>

  <h2>Totais</h2>
  <p><strong>Mão de obra:</strong> R$ ${totalMaoObra.toFixed(2)}</p>
  <p><strong>Tempo total estimado:</strong> ${totalDias.toFixed(
    2,
  )} dias (aprox. ${totalHoras.toFixed(2)} h, jornada de 7h30/dia)</p>
  ${
    exibirCustoColaborador
      ? `<p><strong>Custo estimado com colaborador:</strong> R$ ${valorColaborador.toFixed(2)} (${totalDias.toFixed(2)} dias x R$ ${custoColaboradorDia.toFixed(2)}/dia)</p>`
      : ""
  }
  <p><strong>Materiais:</strong> R$ ${totalMateriais.toFixed(2)}</p>
  <p><strong>Materiais no total geral:</strong> ${
    incluirMateriaisNosTotais ? "Sim" : "Não"
  }</p>
  <p><strong>Sub Total:</strong> R$ ${totalGeral.toFixed(2)}</p>
  ${
    mostrarBdiRelatorio
      ? `<p><strong>BDI:</strong> ${percBdiTotal.toFixed(2)}% (Impostos ${percImpostos.toFixed(2)}% + Taxa Adm ${percTaxaAdm.toFixed(2)}% + Lucro ${percLucro.toFixed(2)}%)</p>
  <p><strong>Base BDI (mão de obra):</strong> R$ ${totalMaoObra.toFixed(2)}</p>
  <p><strong>Valor BDI:</strong> R$ ${valorBdiRelatorio.toFixed(2)}</p>`
      : ""
  }
  <p><strong>Total geral:</strong> R$ ${totalGeralRelatorio.toFixed(2)}</p>

  <h3>Observações</h3>
  <p>${observacoes || "-"}</p>
</body>
</html>`;

    return html;
  };

  const gerarPdf = async () => {
    try {
      // Para novo orçamento, exige salvar antes para haver vínculo de id.
      // Em edição, usa o estado atual da tela para não perder ajustes locais
      // (ex.: checkboxes opcionais do relatório) ao recarregar do backend.
      if (!idEditar || idEditar === "0") {
        Alert.alert(
          "Atenção",
          "Salve o orçamento de obra antes de gerar o relatório.",
        );
        return null;
      }

      const html = gerarHtml();
      const { uri } = await Print.printToFileAsync({ html });
      return uri;
    } catch (e) {
      console.log("gerarPdf erro", e);
      Alert.alert("Erro", "Não foi possível gerar o PDF do orçamento.");
      return null;
    }
  };

  const [imprimindo, setImprimindo] = useState(false);
  const imprimirPdf = async () => {
    if (imprimindo) return;
    setImprimindo(true);
    try {
      const uri = await gerarPdf();
      if (!uri) return;
      await Print.printAsync({ uri });
    } catch (e: any) {
      console.log("imprimirPdf erro", e);
      if (
        e?.message &&
        e.message.includes("Another print request is already in progress")
      ) {
        Alert.alert(
          "Aguarde",
          "Já existe uma impressão em andamento. Por favor, aguarde a finalização.",
        );
      }
    } finally {
      setImprimindo(false);
    }
  };

  const enviarViaWhatsApp = async () => {
    const uri = await gerarPdf();
    if (!uri) return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Enviar orçamento de obra",
        });
      } else {
        Alert.alert(
          "Compartilhamento indisponível",
          "Nao foi possivel abrir o compartilhamento neste dispositivo.",
        );
      }
    } catch (e) {
      console.log("enviarViaWhatsApp erro", e);
    }
  };

  const salvar = async () => {
    if (!clienteId) {
      Alert.alert("Validação", "Selecione o cliente");
      return;
    }
    const area = parseFloat(areaPrincipal.replace(",", ".")) || 0;
    if (area <= 0) {
      Alert.alert("Validação", "Informe a metragem/área principal da obra");
      return;
    }
    if (servicosSelec.length === 0) {
      Alert.alert("Validação", "Adicione ao menos um serviço");
      return;
    }

    try {
      const payload = {
        id: isEdit ? Number(idEditar) : 0,
        cliente_id: Number(clienteId),
        descricao,
        local: localObra,
        tipo_obra: tipoObra,
        area_principal: area,
        observacoes,
        documento,
        status,
        validade,
        usuario: "app",
        data_orcamento: format(dataOrcamento, "yyyy-MM-dd"),
        // Envia 1/0 para evitar ambiguidades de serializacao no backend PHP
        gerar_conta_receber: gerarContaReceber ? 1 : 0,
        tipo_valor_conta: tipoValorConta,
        vencimento_conta:
          gerarContaReceber && vencimentoConta
            ? format(vencimentoConta, "yyyy-MM-dd")
            : null,
        mostrar_custo_colaborador_relatorio: mostrarCustoColaboradorRelatorio
          ? 1
          : 0,
        custo_colaborador_dia: custoDiarioColaboradorNum,
        bdi_impostos_percentual: bdiImpostosPercentualNum,
        bdi_taxa_adm_percentual: bdiTaxaAdmPercentualNum,
        bdi_lucro_percentual: bdiLucroPercentualNum,
        bdi_total_percentual: percentualBdiTotal,
        valor_bdi: valorBdi,
        incluir_materiais_totais: incluirMateriaisNosTotais ? 1 : 0,
        valor_total_com_bdi: totalComBdi,
        servicos: servicosSelec.map((s) => ({
          servico_id: Number(s.servico_id),
          quantidade: parseFloat(s.quantidade.replace(",", ".")) || area,
          valor_unitario_mao_obra:
            parseFloat(s.valor_unitario_mao_obra.replace(",", ".")) || 0,
          produtividade_horas_unidade: s.produtividade_horas_unidade
            ? parseFloat(
                String(s.produtividade_horas_unidade).replace(",", "."),
              )
            : null,
        })),
      };

      const res = await api.post("orcamentos_obra/salvar.php", payload);
      if (res.data?.success) {
        const contaReceberProcessada =
          res.data?.gerar_conta_receber === true ||
          res.data?.gerar_conta_receber === 1 ||
          res.data?.gerar_conta_receber === "1";

        const contaReceberId = res.data?.conta_receber_id;

        const mensagemSucesso = gerarContaReceber
          ? contaReceberProcessada
            ? contaReceberId
              ? `Orçamento de obra salvo com sucesso. Lancamento em contas a receber criado/atualizado (ID ${contaReceberId}).`
              : "Orçamento de obra salvo com sucesso. Conta a receber processada."
            : "Orçamento de obra salvo, mas a conta a receber nao foi processada no backend."
          : "Orçamento de obra salvo com sucesso";

        Alert.alert("Sucesso", mensagemSucesso, [
          {
            text: "OK",
            onPress: () => {
              // após salvar, voltar para a lista de orçamentos de obra
              navigation.navigate("Orcamento", { modoObraInicial: true });
            },
          },
        ]);
      } else {
        Alert.alert("Erro", res.data?.erro || "Não foi possível salvar");
      }
    } catch (e: any) {
      console.log("salvar orcamento obra erro", e?.response?.data ?? e);
      const msgServidor =
        e?.response?.data?.erro || e?.response?.data?.mensagem;
      Alert.alert("Erro", msgServidor || "Falha ao salvar orçamento de obra");
    }
  };

  const renderServicoSelec = ({
    item,
    index,
  }: {
    item: ServicoSelecionado;
    index: number;
  }) => {
    const q = parseFloat(item.quantidade.replace(",", ".")) || 0;
    const v = parseFloat(item.valor_unitario_mao_obra.replace(",", ".")) || 0;
    const subtotal = q * v;
    const prodHoras = item.produtividade_horas_unidade
      ? parseFloat(String(item.produtividade_horas_unidade).replace(",", "."))
      : 0;
    const horasEstimadas = q * prodHoras;
    const diasEstimados = horasEstimadas / 7.5;

    return (
      <View style={styles.servicoRow}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.servicoNome}>{item.nome}</Text>
          <TouchableOpacity onPress={() => removerServico(index)}>
            <Text style={{ color: "#e74c3c", fontFamily: fonts.text }}>
              Remover
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.servicoInputsRow}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Text style={styles.label}>Metragem / qtd</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              autoFocus={servicoIndexFocado === index}
              selectTextOnFocus
              value={item.quantidade}
              onChangeText={(v) => {
                let novoValor = v;
                if (
                  novoValor.length === 2 &&
                  novoValor[0] === "0" &&
                  novoValor[1] !== "," &&
                  novoValor[1] !== "."
                ) {
                  novoValor = novoValor[1];
                }
                atualizarServico(index, "quantidade", novoValor);
              }}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={styles.label}>Mão de obra (un)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={item.valor_unitario_mao_obra}
              onChangeText={(v) =>
                atualizarServico(index, "valor_unitario_mao_obra", v)
              }
            />
          </View>
        </View>
        <View style={styles.servicoInputsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Produtividade (h/un)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={item.produtividade_horas_unidade || ""}
              onChangeText={(v) =>
                atualizarServico(index, "produtividade_horas_unidade", v)
              }
              placeholder="Ex: 0,50"
            />
          </View>
        </View>
        <Text style={styles.servicoSubtotal}>
          Subtotal mão de obra: R$ {subtotal.toFixed(2)}
        </Text>
        {prodHoras > 0 ? (
          <Text style={styles.servicoSubtotal}>
            Tempo estimado: {diasEstimados.toFixed(2)} dias (aprox.{" "}
            {horasEstimadas.toFixed(2)} h, {prodHoras.toFixed(2)} h/
            {item.unidade_base || "un"})
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <SafeAreaView style={styles.Container}>
        <Header
          title={isEdit ? "Editar Orçamento Obra" : "Novo Orçamento Obra"}
          backTo="Orcamento"
        />
        <ScrollView
          contentContainerStyle={styles.ScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          contentInset={{ bottom: 24 }}
          scrollIndicatorInsets={{ bottom: 24 }}
        >
          <View style={styles.Section}>
            <Text style={styles.SectionTitle}>Dados do Cliente</Text>
            <Text style={styles.Label}>
              Cliente <Text style={styles.Required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.ButtonSelect}
              onPress={() => {
                carregarClientes();
                setModalClienteVisivel(true);
              }}
            >
              <Text
                style={
                  clienteNome
                    ? styles.ButtonSelectText
                    : [styles.ButtonSelectText, styles.ButtonSelectPlaceholder]
                }
              >
                {clienteNome || "Toque para selecionar o cliente"}
              </Text>
            </TouchableOpacity>
            {clienteId ? (
              <Text style={styles.EmptyText}>ID selecionado: {clienteId}</Text>
            ) : null}
          </View>

          <View style={styles.Section}>
            <Text style={styles.SectionTitle}>Dados da Obra</Text>

            <Text style={styles.Label}>Descrição da obra</Text>
            <TextInput
              style={styles.Input}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Ex: Construção casa 80m²"
            />

            <Text style={styles.Label}>Local da obra</Text>
            <TextInput
              style={styles.Input}
              value={localObra}
              onChangeText={setLocalObra}
              placeholder="Ex: Rua X, Bairro Y, Cidade"
            />

            <Text style={styles.Label}>Tipo de obra</Text>
            <TextInput
              style={styles.Input}
              value={tipoObra}
              onChangeText={setTipoObra}
              placeholder="Residencial, reforma, laje, etc"
            />

            <View style={styles.Row}>
              <View style={styles.HalfInput}>
                <Text style={styles.Label}>
                  Área principal (m²) <Text style={styles.Required}>*</Text>
                </Text>
                <TextInput
                  style={styles.Input}
                  keyboardType="numeric"
                  value={areaPrincipal}
                  onChangeText={setAreaPrincipal}
                />
              </View>
              <View style={[styles.HalfInput, { marginRight: 0 }]}>
                <Text style={styles.Label}>Data do orçamento</Text>
                <TouchableOpacity onPress={() => setShowDate(true)}>
                  <Text style={styles.inputFake}>
                    {format(dataOrcamento, "dd/MM/yyyy")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Validade e Status, alinhados com NovoOrcamento */}
            <Text style={styles.Label}>Validade</Text>
            <TouchableOpacity
              style={styles.ButtonSelect}
              onPress={() => setModalValidadeVisivel(true)}
            >
              <Text style={styles.ButtonSelectText}>{validade}</Text>
            </TouchableOpacity>

            <Text style={styles.Label}>Status</Text>
            <TouchableOpacity
              style={styles.ButtonSelect}
              onPress={() => setModalStatusVisivel(true)}
            >
              <Text style={styles.ButtonSelectText}>{status}</Text>
            </TouchableOpacity>

            <Text style={styles.Label}>Observações</Text>
            <TextInput
              style={[styles.Input, styles.InputMultiline]}
              multiline
              value={observacoes}
              onChangeText={setObservacoes}
            />

            <Text style={[styles.SectionTitle, { marginTop: 10 }]}>
              Conta a Receber
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
              onPress={() => {
                const novo = !gerarContaReceber;
                setGerarContaReceber(novo);
                if (novo) {
                  setModalContaValorVisivel(true);
                }
              }}
            >
              <MaterialIcons
                name={
                  gerarContaReceber ? "check-box" : "check-box-outline-blank"
                }
                size={24}
                color="#32B768"
              />
              <Text style={[styles.Label, { marginLeft: 8, marginBottom: 0 }]}>
                Gerar conta a receber para este orçamento
              </Text>
            </TouchableOpacity>

            <Text style={styles.Label}>Documento</Text>
            <TextInput
              style={styles.Input}
              value={documento}
              onChangeText={setDocumento}
              placeholder="Ex: Contrato 123, NF, Pedido"
            />

            <Text style={styles.Label}>
              Data de vencimento <Text style={styles.Required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.ButtonSelect}
              onPress={() => setShowDateVencimento(true)}
            >
              <Text style={styles.ButtonSelectText}>
                {format(vencimentoConta, "dd/MM/yyyy")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.Section}>
            <Text style={styles.SectionTitle}>Serviços da Obra</Text>
            {servicosDisponiveis.length === 0 ? (
              <View>
                <Text style={styles.EmptyText}>
                  Nenhum serviço de obra cadastrado. Toque abaixo para cadastrar
                  as composições.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.SaveButton,
                    { backgroundColor: "#8e44ad", marginTop: 10 },
                  ]}
                  onPress={() => navigation.navigate("ServicosObra")}
                >
                  <Text style={styles.SaveButtonText}>
                    Abrir Serviços de Obra
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.SaveButton,
                    { backgroundColor: "#8e44ad", marginTop: 10 },
                  ]}
                  onPress={() => navigation.navigate("ServicosObra")}
                >
                  <Text style={styles.SaveButtonText}>
                    Cadastrar/editar serviços de obra
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {servicosSelec.map((s, index) => (
              <View key={index.toString()}>
                {renderServicoSelec({ item: s, index })}
              </View>
            ))}

            {servicosDisponiveis.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.SaveButton,
                  { backgroundColor: "#32B768", marginTop: 10 },
                ]}
                onPress={() => setModalServicosVisivel(true)}
              >
                <Text style={styles.SaveButtonText}>Adicionar serviço</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 10,
              }}
              onPress={() => setMostrarValoresServicosRelatorio((old) => !old)}
            >
              <MaterialIcons
                name={
                  mostrarValoresServicosRelatorio
                    ? "check-box"
                    : "check-box-outline-blank"
                }
                size={22}
                color="#32B768"
              />
              <Text style={[styles.Label, { marginLeft: 8, marginBottom: 0 }]}>
                Mostrar valor unitário e subtotal de mão de obra por serviço no
                relatório
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 10,
              }}
              onPress={() => setMostrarCustoColaboradorRelatorio((old) => !old)}
            >
              <MaterialIcons
                name={
                  mostrarCustoColaboradorRelatorio
                    ? "check-box"
                    : "check-box-outline-blank"
                }
                size={22}
                color="#32B768"
              />
              <Text style={[styles.Label, { marginLeft: 8, marginBottom: 0 }]}>
                Exibir no relatório o custo estimado com colaborador (opcional)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 10,
              }}
              onPress={() => setIncluirMateriaisNosTotais((old) => !old)}
            >
              <MaterialIcons
                name={
                  incluirMateriaisNosTotais
                    ? "check-box"
                    : "check-box-outline-blank"
                }
                size={22}
                color="#32B768"
              />
              <Text style={[styles.Label, { marginLeft: 8, marginBottom: 0 }]}>
                Incluir materiais no total geral e no total com BDI
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 10,
              }}
              onPress={() => setMostrarBdiRelatorio((old) => !old)}
            >
              <MaterialIcons
                name={
                  mostrarBdiRelatorio ? "check-box" : "check-box-outline-blank"
                }
                size={22}
                color="#32B768"
              />
              <Text style={[styles.Label, { marginLeft: 8, marginBottom: 0 }]}>
                Exibir BDI, base BDI e valor BDI no relatório
              </Text>
            </TouchableOpacity>

            <Text
              style={[styles.SectionTitle, { marginTop: 16, marginBottom: 10 }]}
            >
              Colaborador e BDI
            </Text>
            <Text style={styles.Label}>Custo diário do colaborador (R$)</Text>
            <TextInput
              style={styles.Input}
              keyboardType="numeric"
              value={custoDiarioColaborador}
              onChangeText={setCustoDiarioColaborador}
              placeholder="Ex: 180,00"
            />

            <View style={styles.Row}>
              <View style={styles.HalfInput}>
                <Text style={styles.Label}>Impostos (%)</Text>
                <TextInput
                  style={styles.Input}
                  keyboardType="numeric"
                  value={bdiImpostosPercentual}
                  onChangeText={setBdiImpostosPercentual}
                  placeholder="Ex: 6,00"
                />
              </View>
              <View style={[styles.HalfInput, { marginRight: 0 }]}>
                <Text style={styles.Label}>Taxa adm (%)</Text>
                <TextInput
                  style={styles.Input}
                  keyboardType="numeric"
                  value={bdiTaxaAdmPercentual}
                  onChangeText={setBdiTaxaAdmPercentual}
                  placeholder="Ex: 8,00"
                />
              </View>
            </View>

            <Text style={styles.Label}>Lucro (%)</Text>
            <TextInput
              style={styles.Input}
              keyboardType="numeric"
              value={bdiLucroPercentual}
              onChangeText={setBdiLucroPercentual}
              placeholder="Ex: 12,00"
            />
          </View>

          <View style={styles.Section}>
            <View style={styles.TotalContainer}>
              <Text style={styles.TotalLabel}>Total mão de obra-</Text>
              <Text style={styles.TotalValue}>R$ {valorTotal.toFixed(2)}</Text>
            </View>
            {totalHorasMaoObra > 0 ? (
              <View style={styles.TotalContainer}>
                <Text style={styles.TotalLabel}>Tempo total estimado-</Text>
                <Text style={styles.TotalValue}>
                  {totalDiasMaoObra.toFixed(2)} dias (aprox.{" "}
                  {totalHorasMaoObra.toFixed(2)} h)
                </Text>
              </View>
            ) : null}
            {custoDiarioColaboradorNum > 0 && totalDiasMaoObra > 0 ? (
              <View style={styles.TotalContainer}>
                <Text style={styles.TotalLabel}>Gasto com colaborador-</Text>
                <Text style={styles.TotalValue}>
                  R$ {valorGastoColaborador.toFixed(2)} (
                  {totalDiasMaoObra.toFixed(2)} dias)
                </Text>
              </View>
            ) : null}
            <View style={styles.TotalContainer}>
              <Text style={styles.TotalLabel}>BDI total-</Text>
              <Text style={styles.TotalValue}>
                {percentualBdiTotal.toFixed(2)}%
              </Text>
            </View>
            <View style={styles.TotalContainer}>
              <Text style={styles.TotalLabel}>Valor BDI-</Text>
              <Text style={styles.TotalValue}>R$ {valorBdi.toFixed(2)}</Text>
              <Text style={styles.servicoSubtotal}>
                Base BDI: mão de obra (R$ {valorTotal.toFixed(2)})
              </Text>
            </View>
            <View style={styles.TotalContainer}>
              <Text style={styles.TotalLabel}>Total geral-</Text>
              <Text style={styles.TotalValue}>R$ {totalGeral.toFixed(2)}</Text>
            </View>
            <View style={styles.TotalContainer}>
              <Text style={styles.TotalLabel}>Total com BDI-</Text>
              <Text style={styles.TotalValue}>R$ {totalComBdi.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.SaveButton} onPress={salvar}>
              <Text style={styles.SaveButtonText}>
                Salvar orçamento de obra
              </Text>
            </TouchableOpacity>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 12,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.SaveButton,
                  {
                    flex: 1,
                    backgroundColor: imprimindo ? "#b2bec3" : "#0984e3",
                    borderRadius: 8,
                    elevation: 2,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2,
                  },
                ]}
                onPress={imprimirPdf}
                disabled={imprimindo}
              >
                <Text
                  style={[
                    styles.SaveButtonText,
                    { fontWeight: "bold", fontSize: 15 },
                  ]}
                >
                  {imprimindo ? "Imprimindo..." : "Imprimir PDF"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.SaveButton,
                  {
                    flex: 1,
                    backgroundColor: "#25D366",
                    borderRadius: 8,
                    elevation: 2,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2,
                  },
                ]}
                onPress={enviarViaWhatsApp}
              >
                <Text
                  style={[
                    styles.SaveButtonText,
                    { fontWeight: "bold", fontSize: 15 },
                  ]}
                >
                  Whats App
                </Text>
              </TouchableOpacity>
              {status === "Aprovado" && (
                <TouchableOpacity
                  style={[
                    styles.SaveButton,
                    {
                      flex: 1,
                      backgroundColor: "#636e72",
                      borderRadius: 8,
                      elevation: 2,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 2,
                    },
                  ]}
                  onPress={imprimirContrato}
                >
                  <Text
                    style={[
                      styles.SaveButtonText,
                      { fontWeight: "bold", fontSize: 15 },
                    ]}
                  >
                    Imprimir Contrato
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* DatePicker iOS/Android para data do orçamento */}
          {Platform.OS === "ios" ? (
            <>
              <Modal
                transparent
                visible={showDate}
                animationType="fade"
                onRequestClose={() => setShowDate(false)}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgba(0,0,0,0.4)",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: 14,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      width: "90%",
                      maxWidth: 360,
                      alignSelf: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.text,
                        fontSize: 16,
                        marginBottom: 8,
                        textAlign: "center",
                      }}
                    >
                      Selecione a data do orçamento
                    </Text>
                    {showDate && (
                      <DateTimePicker
                        testID="dateTimePicker"
                        value={dataOrcamento}
                        mode="date"
                        display="inline"
                        onChange={(_, d) => {
                          setShowDate(false);
                          if (d) setDataOrcamento(d);
                        }}
                        locale="pt-BR"
                        themeVariant="light"
                        style={{ width: "100%" }}
                      />
                    )}
                    <TouchableOpacity
                      onPress={() => setShowDate(false)}
                      style={{
                        alignSelf: "flex-end",
                        marginTop: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.text,
                          fontSize: 14,
                          color: "#4CAF50",
                          fontWeight: "600",
                        }}
                      >
                        Fechar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </>
          ) : (
            <>
              {showDate && (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={dataOrcamento}
                  mode="date"
                  is24Hour={true}
                  display="calendar"
                  onChange={(_, d) => {
                    setShowDate(false);
                    if (d) setDataOrcamento(d);
                  }}
                />
              )}
            </>
          )}

          {/* DatePicker iOS/Android para vencimento da conta (padrão Contas a Receber) */}
          {Platform.OS === "ios" ? (
            <>
              <Modal
                transparent
                visible={showDateVencimento}
                animationType="fade"
                onRequestClose={() => setShowDateVencimento(false)}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgba(0,0,0,0.4)",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: 14,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      width: "90%",
                      maxWidth: 360,
                      alignSelf: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.text,
                        fontSize: 16,
                        marginBottom: 8,
                        textAlign: "center",
                      }}
                    >
                      Selecione o vencimento da conta
                    </Text>
                    {showDateVencimento && (
                      <DateTimePicker
                        testID="dateTimePicker"
                        value={vencimentoConta}
                        mode="date"
                        display="inline"
                        onChange={(_, d) => {
                          setShowDateVencimento(false);
                          if (d) setVencimentoConta(d);
                        }}
                        locale="pt-BR"
                        themeVariant="light"
                        style={{ width: "100%" }}
                      />
                    )}
                    <TouchableOpacity
                      onPress={() => setShowDateVencimento(false)}
                      style={{
                        alignSelf: "flex-end",
                        marginTop: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.text,
                          fontSize: 14,
                          color: "#4CAF50",
                          fontWeight: "600",
                        }}
                      >
                        Fechar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </>
          ) : (
            <>
              {showDateVencimento && (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={vencimentoConta}
                  mode="date"
                  is24Hour={true}
                  display="calendar"
                  onChange={(_, d) => {
                    setShowDateVencimento(false);
                    if (d) setVencimentoConta(d);
                  }}
                />
              )}
            </>
          )}

          {/* Modal para escolher o valor da conta (mão de obra, total geral ou com BDI) */}
          <Modal
            visible={modalContaValorVisivel}
            animationType="slide"
            transparent
            onRequestClose={() => setModalContaValorVisivel(false)}
          >
            <View style={styles.ModalOverlay}>
              <View style={styles.ModalContent}>
                <View style={styles.ModalHeader}>
                  <Text style={styles.ModalTitle}>
                    Valor da conta a receber
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setModalContaValorVisivel(false);
                      // se fechar sem escolher, desmarca gerar conta
                      if (!tipoValorConta) {
                        setGerarContaReceber(false);
                      }
                    }}
                  >
                    <Text style={{ color: "#dc3545" }}>Fechar</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.OptionItem}
                  onPress={() => {
                    setTipoValorConta("mao_obra");
                    setModalContaValorVisivel(false);
                  }}
                >
                  <Text
                    style={[
                      styles.OptionText,
                      tipoValorConta === "mao_obra" &&
                        styles.OptionTextSelected,
                    ]}
                  >
                    Mão de obra (R$ {valorTotal.toFixed(2)})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.OptionItem}
                  onPress={() => {
                    setTipoValorConta("total_geral");
                    setModalContaValorVisivel(false);
                  }}
                >
                  <Text
                    style={[
                      styles.OptionText,
                      tipoValorConta === "total_geral" &&
                        styles.OptionTextSelected,
                    ]}
                  >
                    Total geral (mão de obra + materiais)
                    {materiaisCalc.length > 0
                      ? ` - R$ ${totalGeral.toFixed(2)}`
                      : " (calculado ao salvar)"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.OptionItem}
                  onPress={() => {
                    setTipoValorConta("com_bdi");
                    setModalContaValorVisivel(false);
                  }}
                >
                  <Text
                    style={[
                      styles.OptionText,
                      tipoValorConta === "com_bdi" && styles.OptionTextSelected,
                    ]}
                  >
                    Com BDI (Total geral + BDI) - R$ {totalComBdi.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            visible={modalServicosVisivel}
            animationType="slide"
            transparent
            onRequestClose={() => setModalServicosVisivel(false)}
          >
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={[styles.ModalOverlay, { justifyContent: "center" }]}>
                <View style={[styles.ModalContent, { maxHeight: "90%" }]}>
                  <View style={styles.ModalHeader}>
                    <Text style={styles.ModalTitle}>Escolha o serviço</Text>
                    <TouchableOpacity
                      onPress={() => setModalServicosVisivel(false)}
                    >
                      <Text style={{ color: "#dc3545" }}>Fechar</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.SearchInput}
                    placeholder="Buscar serviço por nome"
                    value={buscaServico}
                    onChangeText={setBuscaServico}
                  />
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 20 }}
                  >
                    {servicosDisponiveis
                      .filter((s) => {
                        if (!buscaServico.trim()) return true;
                        const termo = buscaServico.trim().toLowerCase();
                        return (s.nome || "").toLowerCase().includes(termo);
                      })
                      .map((s) => (
                        <TouchableOpacity
                          key={s.id}
                          style={styles.ListItem}
                          onPress={() => {
                            adicionarServico(s);
                            setModalServicosVisivel(false);
                            setBuscaServico("");
                          }}
                        >
                          <Text style={styles.ListItemText}>{s.nome}</Text>
                          {s.unidade_base || s.custo_mao_obra ? (
                            <Text style={{ fontSize: 12, color: "#6b7280" }}>
                              {s.unidade_base ? `Un.: ${s.unidade_base}` : ""}
                              {s.unidade_base && s.custo_mao_obra ? " • " : ""}
                              {s.custo_mao_obra
                                ? `Mão de obra: R$ ${s.custo_mao_obra}`
                                : ""}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          <Modal
            visible={modalClienteVisivel}
            animationType="slide"
            transparent
            onRequestClose={() => setModalClienteVisivel(false)}
          >
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={[styles.ModalOverlay, { justifyContent: "center" }]}>
                <View style={[styles.ModalContent, { maxHeight: "90%" }]}>
                  <View style={styles.ModalHeader}>
                    <Text style={styles.ModalTitle}>Selecionar Cliente</Text>
                    <TouchableOpacity
                      onPress={() => setModalClienteVisivel(false)}
                    >
                      <Text style={{ color: "#dc3545" }}>Fechar</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.SearchInput}
                    placeholder="Buscar cliente pelo nome"
                    value={buscaCliente}
                    onChangeText={setBuscaCliente}
                  />
                  <FlatList
                    data={clientes.filter((c) =>
                      (c.nome ?? "")
                        .toString()
                        .toLowerCase()
                        .includes((buscaCliente ?? "").toLowerCase()),
                    )}
                    keyExtractor={(item) => String(item.id)}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 20 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.ListItem}
                        onPress={() => selecionarCliente(item)}
                      >
                        <Text style={styles.ListItemText}>{item.nome}</Text>
                        <Text style={{ fontSize: 12, color: "#6b7280" }}>
                          ID: {item.id}
                        </Text>
                        {item.endereco ? (
                          <Text style={{ fontSize: 12, color: "#6b7280" }}>
                            {item.endereco}
                          </Text>
                        ) : null}
                        {item.telefone ? (
                          <Text style={{ fontSize: 12, color: "#6b7280" }}>
                            {item.telefone}
                          </Text>
                        ) : null}
                        {item.email ? (
                          <Text style={{ fontSize: 12, color: "#6b7280" }}>
                            {item.email}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text style={styles.EmptyText}>
                        Nenhum cliente encontrado
                      </Text>
                    }
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Modal Validade */}
          <Modal
            visible={modalValidadeVisivel}
            animationType="slide"
            transparent
            onRequestClose={() => setModalValidadeVisivel(false)}
          >
            <View style={styles.ModalOverlay}>
              <View style={styles.ModalContent}>
                <View style={styles.ModalHeader}>
                  <Text style={styles.ModalTitle}>Validade</Text>
                  <TouchableOpacity
                    onPress={() => setModalValidadeVisivel(false)}
                  >
                    <Text style={{ color: "#dc3545" }}>Fechar</Text>
                  </TouchableOpacity>
                </View>
                {["7 dias", "15 dias", "30 dias", "60 dias", "90 dias"].map(
                  (opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.OptionItem}
                      onPress={() => {
                        setValidade(opt);
                        setModalValidadeVisivel(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.OptionText,
                          validade === opt && styles.OptionTextSelected,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </View>
          </Modal>

          {/* Modal Status */}
          <Modal
            visible={modalStatusVisivel}
            animationType="slide"
            transparent
            onRequestClose={() => setModalStatusVisivel(false)}
          >
            <View style={styles.ModalOverlay}>
              <View style={styles.ModalContent}>
                <View style={styles.ModalHeader}>
                  <Text style={styles.ModalTitle}>Status</Text>
                  <TouchableOpacity
                    onPress={() => setModalStatusVisivel(false)}
                  >
                    <Text style={{ color: "#dc3545" }}>Fechar</Text>
                  </TouchableOpacity>
                </View>
                {["Pendente", "Aprovado", "Rejeitado"].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.OptionItem}
                    onPress={() => {
                      setStatus(opt);
                      setModalStatusVisivel(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.OptionText,
                        status === opt && styles.OptionTextSelected,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

export default NovoOrcamentoObra;
