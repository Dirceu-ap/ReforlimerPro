import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  Keyboard,
  Platform,
  Linking,
  Image,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showMessage } from "react-native-flash-message";
import api from "../../services/api";
import Header from "../../components/Header";
import fonts from "../../styles/fonts";
import { styles } from "./styles";

interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
}

interface Produto {
  id: string;
  nome: string;
  valor?: string;
  descricao?: string;
  codigo?: string;
  searchText?: string;
  [key: string]: any;
}

interface ProdutoSelecionado extends Produto {
  quantidade: number;
  subtotal: number;
  valor: string;
}

function NovoOrcamento({ route, navigation }: any) {
  const routeIdParam = route?.params?.id_reg ?? "0";
  const [idReg, setIdReg] = useState<string>(String(routeIdParam));
  useEffect(() => {
    const p = route?.params?.id_reg ?? "0";
    setIdReg(String(p));
  }, [route?.params?.id_reg]);
  const isEdit = idReg !== "0";

  const [loading, setLoading] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteEndereco, setClienteEndereco] = useState("");
  const [localOrcamento, setLocalOrcamento] = useState("");
  const [dataOrcamento, setDataOrcamento] = useState(new Date());
  const [validade, setValidade] = useState("30 dias");
  const [status, setStatus] = useState("Pendente");
  const [validadePickerVisible, setValidadePickerVisible] = useState(false);
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [gerarContaPagar, setGerarContaPagar] = useState(false);
  const [gerarContaReceber, setGerarContaReceber] = useState(false);
  const [vencimentoConta, setVencimentoConta] = useState(new Date());

  const [produtos, setProdutos] = useState<ProdutoSelecionado[]>([]);
  const [valorTotal, setValorTotal] = useState(0);

  const [modalCliente, setModalCliente] = useState(false);
  const [modalProduto, setModalProduto] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDateVencimento, setShowDateVencimento] = useState(false);
  const [modalQuantidadeVisivel, setModalQuantidadeVisivel] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<Produto[]>([]);
  const [searchCliente, setSearchCliente] = useState("");
  const [searchProduto, setSearchProduto] = useState("");

  const [produtoTemp, setProdutoTemp] = useState<Produto | null>(null);
  const [quantidadeTemp, setQuantidadeTemp] = useState("1");
  const [produtoParaAdicionar, setProdutoParaAdicionar] =
    useState<Produto | null>(null);
  const [quantidadeAdicionar, setQuantidadeAdicionar] = useState("1");

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const logoUri = Image.resolveAssetSource(
    require("../../assets/logo2.png"),
  ).uri;

  const getPrecoProduto = (p: any) => {
    const raw =
      p?.valor ??
      p?.valor_venda ??
      p?.preco_venda ??
      p?.preco ??
      p?.valor_unitario ??
      p?.venda ??
      p?.price ??
      p?.sale_price ??
      p?.price_sale ??
      "0";
    const num = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(num) ? num : 0;
  };

  const gerarHtmlOrcamento = () => {
    const clienteInfo = clientes.find((c) => c.id === clienteId) || ({} as any);
    const clienteTelefone = clienteInfo?.telefone ?? "-";
    const clienteEmail = clienteInfo?.email ?? "-";
    const clienteEndereco =
      clienteInfo?.endereco ??
      clienteInfo?.endereco_rua ??
      clienteInfo?.rua ??
      clienteInfo?.logradouro ??
      clienteInfo?.address ??
      "-";

    const numeroOrcamento = idReg && idReg !== "0" ? idReg : "—";

    const rows = produtos
      .map(
        (p) =>
          `<tr>
            <td style="padding:6px;border:1px solid #ddd">${p.nome}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:center">${
              p.quantidade
            }</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:right">R$ ${getPrecoProduto(
              p,
            ).toFixed(2)}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:right">R$ ${p.subtotal.toFixed(
              2,
            )}</td>
          </tr>`,
      )
      .join("");

    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
      body{font-family:Arial,Helvetica,sans-serif;color:#333;padding:20px;font-size:11px;line-height:1.35}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
      .brand{display:flex;align-items:center;gap:10px}
      .client{margin-top:6px}
      table{width:100%;border-collapse:collapse;margin-top:8px;font-size:10px}
      th{background:#f5f5f5;padding:6px;border:1px solid #ddd;text-align:left}
      </style></head><body>
      <div class="header">
        <div class="brand">
          <img src="${logoUri}" style="height:60px;object-fit:contain" />
          <div>
            <h2 style="margin:0;padding:0">ReforLimer</h2>
            <p style="margin:2px 0 0 0;font-size:12px">Reformas • Projetos • Construção</p>
          </div>
        </div>
        <div style="text-align:right">
          <p><strong>Orçamento nº:</strong> ${numeroOrcamento}</p>
          <p><strong>Data:</strong> ${format(dataOrcamento, "dd/MM/yyyy")}</p>
          <p><strong>Validade:</strong> ${validade}</p>
        </div>
      </div>

      <div class="client">
        <p><strong>Cliente:</strong> ${clienteNome || "-"}</p>
        <p><strong>Endereço:</strong> ${clienteEndereco}</p>
        <p><strong>Local:</strong> ${localOrcamento || "-"}</p>
        <p><strong>Telefone:</strong> ${clienteTelefone}</p>
        <p><strong>Email:</strong> ${clienteEmail}</p>
      </div>

      <table>
        <thead><tr><th>Produto</th><th style="text-align:center">Qtd</th><th style="text-align:right">Preço</th><th style="text-align:right">Subtotal</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding:8px;border:1px solid #ddd;text-align:right"><strong>Total</strong></td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right"><strong>R$ ${valorTotal.toFixed(
              2,
            )}</strong></td>
          </tr>
        </tfoot>
      </table>

      <div style="margin-top:18px">
        ${descricao ? `<p><strong>Descrição:</strong> ${descricao}</p>` : ""}
        <p><strong>Observações:</strong> ${observacoes ? observacoes : "-"}</p>
      </div>

      </body></html>`;
    return html;
  };

  const gerarPdf = async () => {
    try {
      const html = gerarHtmlOrcamento();
      const { uri } = await Print.printToFileAsync({ html });
      return uri;
    } catch (error) {
      console.log("Erro gerarPdf:", error);
      Alert.alert("Erro", "Não foi possível gerar PDF");
      return null;
    }
  };

  const enviarViaWhatsApp = async () => {
    const uri = await gerarPdf();
    if (!uri) return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        const text = `Orçamento para ${
          clienteNome || ""
        } - Total R$ ${valorTotal.toFixed(2)}`;
        const url = Platform.select({
          ios: `whatsapp://send?text=${encodeURIComponent(text)}`,
          android: `whatsapp://send?text=${encodeURIComponent(text)}`,
        });
        if (url) {
          Linking.openURL(url).catch(() => {
            Alert.alert("WhatsApp", "WhatsApp não disponível");
          });
        }
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Enviar Orçamento via WhatsApp",
      });
    } catch (error) {
      console.log("Erro enviarViaWhatsApp:", error);
    }
  };

  useEffect(() => {
    carregarClientes();
    carregarProdutos(); // carrega listagem inicial completa
    if (isEdit) {
      carregarOrcamento();
    }
    // limpar debounce ao desmontar
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    const total = produtos.reduce((acc, p) => acc + p.subtotal, 0);
    setValorTotal(total);
  }, [produtos]);

  const carregarClientes = async () => {
    try {
      const response = await api.get("clientes/listar.php");
      if (response.data?.resultado && Array.isArray(response.data.resultado)) {
        const ordenado = [...response.data.resultado].sort((a: any, b: any) =>
          String(a.nome ?? "")
            .toLowerCase()
            .localeCompare(String(b.nome ?? "").toLowerCase(), "pt-BR"),
        );
        setClientes(ordenado);
      }
    } catch (error) {
      console.log("Erro API clientes/listar.php ->", error);
    }
  };

  // parseia string "YYYY-MM-DD" sem aplicar offset de timezone
  const parseDateOnly = (dstr: string | undefined | null) => {
    if (!dstr) return new Date();
    const s = String(dstr);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    // fallback: tentar Date normal
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? new Date() : dt;
  };

  const carregarOrcamento = async () => {
    if (!isEdit) return;
    try {
      setLoading(true);

      const endpoints = [
        `orcamento/listar_id.php?id=${idReg}`,
        `orcamento/listar.php?id=${idReg}`,
      ];

      let resp: any = null;
      for (const ep of endpoints) {
        try {
          resp = await api.get(ep);
          console.log("[carregarOrcamento] resposta endpoint", ep, resp?.data);
          break;
        } catch (e: any) {
          console.log(
            "[carregarOrcamento] endpoint falhou",
            ep,
            e?.response?.status,
          );
          // se erro não for 404, repassa
          if (e?.response?.status && e.response.status !== 404) throw e;
        }
      }

      if (!resp || !resp.data) {
        throw new Error("Resposta inválida do servidor ao carregar orçamento");
      }

      // normalizar origem dos dados do orçamento
      let orc: any = resp.data.dados ?? null;
      if (!orc) {
        if (
          Array.isArray(resp.data.resultado) &&
          resp.data.resultado.length > 0
        ) {
          orc = resp.data.resultado[0];
        } else {
          // tentar usar resp.data diretamente (quando listar retorna o objeto)
          orc = resp.data;
        }
      }
      if (!orc)
        throw new Error("Orçamento não encontrado na resposta do servidor");

      // preencher campos básicos
      setClienteId(
        String(orc.cliente_id ?? orc.cliente_id ?? orc.cliente ?? ""),
      );
      setClienteNome(orc.cliente ?? orc.cliente_nome ?? "");
      setClienteEndereco(
        orc.cliente_endereco ?? orc.endereco ?? orc.logradouro ?? "",
      );
      setLocalOrcamento(orc.local ?? "");
      setDataOrcamento(parseDateOnly(orc.data_orcamento ?? orc.data));
      setValidade(orc.validade || "30 dias");
      setStatus(orc.status || "Pendente");
      setDescricao(orc.descricao || "");
      setObservacoes(orc.observacoes || "");

      // Se já existirem contas vinculadas a este orçamento, marcar os checkboxes
      // para que edições posteriores atualizem os lançamentos existentes.
      const contaPagarId =
        orc.conta_pagar_id ?? orc.id_conta_pagar ?? orc.contaPagarId ?? null;
      const contaReceberId =
        orc.conta_receber_id ??
        orc.id_conta_receber ??
        orc.contaReceberId ??
        null;

      setGerarContaPagar(!!contaPagarId);
      setGerarContaReceber(!!contaReceberId);

      // Tenta recuperar o vencimento a partir da conta já gerada
      try {
        if (contaPagarId) {
          const respConta = await api.get(
            `pagar/listar_id.php?id=${encodeURIComponent(contaPagarId)}`,
          );
          const vencStr = respConta?.data?.dados?.vencimento;
          if (vencStr) {
            setVencimentoConta(parseDateOnly(String(vencStr)));
          }
        } else if (contaReceberId) {
          const respConta = await api.get(
            `receber/listar_id.php?id=${encodeURIComponent(contaReceberId)}`,
          );
          const vencStr = respConta?.data?.dados?.vencimento;
          if (vencStr) {
            setVencimentoConta(parseDateOnly(String(vencStr)));
          }
        }
      } catch (e) {
        console.log(
          "[carregarOrcamento] erro ao carregar vencimento da conta vinculada ->",
          e,
        );
      }

      // montar array de produtos com validação
      let produtosResp: any =
        resp.data.produtos ??
        orc.produtos ??
        resp.data.resultadoProdutos ??
        resp.data.resultado_produtos ??
        [];
      if (!Array.isArray(produtosResp)) {
        console.log(
          "[carregarOrcamento] produtosResp não é array, valor:",
          produtosResp,
        );
        produtosResp = [];
      }

      const prods = produtosResp.map((p: any) => ({
        id: String(p.produto_id ?? p.id ?? p.codigo ?? ""),
        nome: p.nome ?? p.descricao ?? p.title ?? "",
        valor: String(p.valor_unitario ?? p.valor ?? p.preco ?? "0"),
        descricao: p.descricao ?? p.description ?? "",
        quantidade: parseInt(p.quantidade ?? p.qtd ?? 1),
        subtotal:
          parseFloat(
            p.subtotal ??
              Number(p.quantidade ?? 1) *
                parseFloat(String(p.valor_unitario ?? p.valor ?? 0)),
          ) || 0,
      }));

      setProdutos(prods);
    } catch (err: any) {
      console.log(
        "[NovoOrcamento] erro carregarOrcamento ->",
        err?.response ?? err,
      );
      showMessage({
        message: "Aviso",
        description:
          err?.response?.status === 404
            ? "Orçamento não encontrado no servidor. Entrando em modo criação."
            : "Não foi possível carregar o orçamento. Entrando em modo criação.",
        type: "warning",
      });
      navigation.setParams?.({ id_reg: "0" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarOrcamento();
  }, [idReg]);

  const selecionarCliente = (cliente: Cliente) => {
    setClienteId(cliente.id);
    setClienteNome(cliente.nome);
    setModalCliente(false);
    setSearchCliente("");
  };

  const abrirModalProduto = (produto: Produto) => {
    setProdutoTemp(produto);
    setQuantidadeTemp("1");
    setModalProduto(false);
  };

  const adicionarProduto = (produto: Produto, quantidade: string) => {
    const qtd = parseInt(quantidade) || 1;
    const valor = getPrecoProduto(produto);
    const subtotal = qtd * valor;
    const existe = produtos.find((p) => p.id === produto.id);
    if (existe) {
      Alert.alert(
        "Produto já lançado",
        "Este produto já foi lançado no orçamento. Deseja somar a quantidade informada ao item existente?",
        [
          {
            text: "Não",
            style: "cancel",
          },
          {
            text: "Sim",
            onPress: () => {
              const atualizados = produtos.map((p) => {
                if (p.id !== produto.id) return p;
                const novaQuantidade = (p.quantidade || 0) + qtd;
                const novoSubtotal = novaQuantidade * valor;
                return {
                  ...p,
                  quantidade: novaQuantidade,
                  subtotal: novoSubtotal,
                };
              });
              setProdutos(atualizados);
            },
          },
        ],
      );
    } else {
      const novoProduto: ProdutoSelecionado = {
        ...produto,
        valor: String(valor.toFixed(2)),
        quantidade: qtd,
        subtotal,
      };
      setProdutos([...produtos, novoProduto]);
    }

    setProdutoTemp(null);
    setQuantidadeTemp("1");
    setModalProduto(false);
  };

  const removerProduto = (id: string) => {
    setProdutos(produtos.filter((p) => p.id !== id));
  };

  const salvarOrcamento = async () => {
    if (!clienteId) {
      Alert.alert("Atenção", "Selecione um cliente");
      return;
    }
    if (produtos.length === 0) {
      Alert.alert("Atenção", "Adicione pelo menos um produto");
      return;
    }

    const confirmarAtualizar = (): Promise<boolean> =>
      new Promise((resolve) => {
        Alert.alert(
          "Orçamento existente",
          "Já existe um orçamento para este cliente/data. Deseja atualizar o orçamento existente ou criar um novo?",
          [
            { text: "Atualizar", onPress: () => resolve(true) },
            { text: "Criar novo", onPress: () => resolve(false) },
            {
              text: "Cancelar",
              style: "cancel",
              onPress: () => resolve(false),
            },
          ],
          { cancelable: true },
        );
      });

    try {
      setLoading(true);
      if (idReg === "0") {
        try {
          const qData = format(dataOrcamento, "yyyy-MM-dd");
          const respCheck = await api.get(
            `orcamento/listar.php?cliente=${encodeURIComponent(
              String(clienteId),
            )}&data=${encodeURIComponent(qData)}`,
          );
          const resultados = respCheck?.data?.resultado ?? [];
          if (Array.isArray(resultados) && resultados.length > 0) {
            const existente = resultados[0];
            const atualizar = await confirmarAtualizar();
            if (atualizar) setIdReg(String(existente.id));
          }
        } catch (errCheck) {
          console.log("Erro ao checar existência de orçamento ->", errCheck);
        }
      }

      // se houver geração de conta (pagar ou receber), força status "Aprovado"
      let statusParaEnvio = status;
      if ((gerarContaPagar || gerarContaReceber) && status !== "Aprovado") {
        statusParaEnvio = "Aprovado";
      }

      const user = await AsyncStorage.getItem("@user");
      const dados = {
        id: idReg,
        cliente_id: clienteId,
        cliente_nome: clienteNome,
        local: localOrcamento,
        data_orcamento: format(dataOrcamento, "yyyy-MM-dd"),
        validade,
        status: statusParaEnvio,
        descricao,
        observacoes,
        valor_total: valorTotal.toFixed(2),
        produtos: produtos.map((p) => ({
          produto_id: p.id,
          quantidade: p.quantidade,
          valor_unitario: getPrecoProduto(p).toFixed(2),
          subtotal: p.subtotal.toFixed(2),
        })),
        conta_tipo:
          gerarContaPagar && gerarContaReceber
            ? "pagar_e_receber"
            : gerarContaPagar
              ? "pagar"
              : gerarContaReceber
                ? "receber"
                : "nenhum",
        gerar_conta_pagar: gerarContaPagar,
        gerar_conta_receber: gerarContaReceber,
        vencimento_conta:
          gerarContaPagar || gerarContaReceber
            ? format(vencimentoConta, "yyyy-MM-dd")
            : null,
        usuario: user,
      };

      const response = await api.post("orcamento/salvar.php", dados);
      if (response.data?.sucesso) {
        setStatus(statusParaEnvio);
        if (response.data?.orcamento_id) {
          setIdReg(String(response.data.orcamento_id));
          navigation.setParams?.({
            id_reg: String(response.data.orcamento_id),
          });
        }
        showMessage({
          message: "Sucesso",
          description: isEdit ? "Orçamento atualizado" : "Orçamento criado",
          type: "success",
        });
        if ((gerarContaPagar || gerarContaReceber) && response.data?.conta_id) {
          showMessage({
            message: "Conta",
            description:
              gerarContaPagar && gerarContaReceber
                ? "Contas a pagar e a receber geradas com sucesso"
                : gerarContaPagar
                  ? "Conta a pagar gerada com sucesso"
                  : "Conta a receber gerada com sucesso",
            type: "info",
          });
        }
        try {
          navigation.navigate("Orcamento");
        } catch {
          if (navigation.canGoBack()) navigation.goBack();
        }
      } else {
        Alert.alert(
          "Erro",
          response.data?.mensagem || "Não foi possível salvar",
        );
      }
    } catch (error: any) {
      console.log("Erro API orcamento/salvar.php ->", error);
      console.log("error.response?.data ->", error?.response?.data);
      Alert.alert(
        "Erro",
        `Falha ao salvar orçamento. Resposta do servidor: ${
          error?.response?.data?.mensagem ??
          error?.response?.data ??
          error?.message
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  const clientesFiltrados = clientes.filter((c) =>
    (c.nome ?? "")
      .toString()
      .toLowerCase()
      .includes((searchCliente ?? "").toLowerCase()),
  );

  const normalize = (s: any) =>
    String(s ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  // função que busca produtos no servidor; se termo vazio retorna lista completa
  const fetchProdutos = useCallback(
    async (termo: string) => {
      try {
        const q = String(termo ?? "").trim();
        // força um limite alto para retornar todos produtos quando necessário
        const LIMITE_ALTO = 99999;
        const url = q
          ? `produtos/listar.php?q=${encodeURIComponent(
              q,
            )}&pagina=1&limite=${LIMITE_ALTO}`
          : `produtos/listar.php?pagina=1&limite=${LIMITE_ALTO}`;

        const response = await api.get(url);
        let resultados = response?.data?.resultado ?? response?.data ?? [];
        if (!Array.isArray(resultados)) resultados = [];

        // normalizar e indexar searchText
        const normalized = resultados.map((p: any) => {
          const id = String(p.id ?? p.produto_id ?? p.codigo ?? p.code ?? "");
          const nome = (
            p.nome ??
            p.name ??
            p.descricao ??
            p.title ??
            ""
          ).toString();
          const descricao = (p.descricao ?? p.description ?? "").toString();
          const codigo = String(p.codigo ?? p.sku ?? p.code ?? "");
          const searchText = normalize(`${id} ${nome} ${descricao} ${codigo}`);
          return { ...p, id, nome, descricao, codigo, searchText };
        });

        // ordenar por nome
        normalized.sort((a: any, b: any) =>
          a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
        );

        setProdutosDisponiveis(normalized);
      } catch (err) {
        console.log("Erro ao buscar produtos ->", err);
      }
    },
    [normalize],
  );

  // carregamento inicial
  const carregarProdutos = async () => {
    // solicita todos os produtos na primeira carga
    await fetchProdutos("");
  };

  // debounce quando usuário digita na pesquisa de produto
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProdutos(searchProduto);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchProduto, fetchProdutos]);

  const produtosFiltrados = produtosDisponiveis.filter((p) => {
    const q = normalize(searchProduto);
    if (!q) return true;
    return String(p.searchText ?? "").includes(q);
  });

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#32B768" />
      </View>
    );
  }

  return (
    <View style={styles.Container}>
      <Header title={""} />
      <View style={styles.TitleContainer}>
        <Text style={styles.Title}>
          {isEdit ? "Editar Orçamento" : "Novo Orçamento"}
        </Text>
      </View>

      <ScrollView style={styles.ScrollContent}>
        {/* Cliente, dados, produtos etc (mantive iguais) */}
        <View style={styles.Section}>
          <Text style={styles.SectionTitle}>Cliente</Text>
          <Text style={styles.Label}>
            Cliente <Text style={styles.Required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.ButtonSelect}
            onPress={() => {
              carregarClientes();
              setModalCliente(true);
            }}
          >
            <Text
              style={[
                styles.ButtonSelectText,
                !clienteNome && styles.ButtonSelectPlaceholder,
              ]}
            >
              {clienteNome || "Selecionar cliente"}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Dados do Orçamento */}
        <View style={styles.Section}>
          <Text style={styles.SectionTitle}>Dados do Orçamento</Text>

          <View style={styles.Row}>
            <View style={styles.HalfInput}>
              <Text style={styles.Label}>Data</Text>
              <TouchableOpacity
                style={styles.ButtonSelect}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.ButtonSelectText}>
                  {format(dataOrcamento, "dd/MM/yyyy")}
                </Text>
                <MaterialIcons name="calendar-today" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.HalfInput}>
              <Text style={styles.Label}>Validade</Text>
              <TouchableOpacity
                style={styles.ButtonSelect}
                onPress={() => setValidadePickerVisible(true)}
              >
                <Text style={styles.ButtonSelectText}>{validade}</Text>
                <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Modal Validade */}
          <Modal
            visible={validadePickerVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setValidadePickerVisible(false)}
          >
            <View style={styles.ModalOverlay}>
              <View style={styles.ModalContent}>
                <View style={styles.ModalHeader}>
                  <Text style={styles.ModalTitle}>Validade</Text>
                  <TouchableOpacity
                    onPress={() => setValidadePickerVisible(false)}
                  >
                    <Ionicons name="close" size={28} color="#333" />
                  </TouchableOpacity>
                </View>
                {/* Lista de opções para Validade (melhor compatibilidade que Picker em modal) */}
                {["7 dias", "15 dias", "30 dias", "60 dias", "90 dias"].map(
                  (opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.OptionItem}
                      onPress={() => {
                        setValidade(opt);
                        setValidadePickerVisible(false);
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

          <Text style={styles.Label}>Status</Text>
          <TouchableOpacity
            style={styles.ButtonSelect}
            onPress={() => setStatusPickerVisible(true)}
          >
            <Text style={styles.ButtonSelectText}>{status}</Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>

          {/* Modal Status */}
          <Modal
            visible={statusPickerVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setStatusPickerVisible(false)}
          >
            <View style={styles.ModalOverlay}>
              <View style={styles.ModalContent}>
                <View style={styles.ModalHeader}>
                  <Text style={styles.ModalTitle}>Status</Text>
                  <TouchableOpacity
                    onPress={() => setStatusPickerVisible(false)}
                  >
                    <Ionicons name="close" size={28} color="#333" />
                  </TouchableOpacity>
                </View>
                {/* Lista de opções para Status */}
                {["Pendente", "Aprovado", "Rejeitado"].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.OptionItem}
                    onPress={() => {
                      setStatus(opt);
                      setStatusPickerVisible(false);
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

          <Text style={styles.Label}>Descrição</Text>
          <TextInput
            style={[styles.Input, styles.InputMultiline]}
            placeholder="Descrição do orçamento"
            value={descricao}
            onChangeText={setDescricao}
            multiline
          />

          <Text style={styles.Label}>Local</Text>
          <TextInput
            style={[styles.Input, styles.InputMultiline]}
            placeholder="Local do orçamento / obra"
            value={localOrcamento}
            onChangeText={setLocalOrcamento}
            multiline
          />

          <Text style={styles.Label}>Observações</Text>
          <TextInput
            style={[styles.Input, styles.InputMultiline]}
            placeholder="Observações adicionais"
            value={observacoes}
            onChangeText={setObservacoes}
            multiline
          />
        </View>

        {/* Seção Produtos */}
        <View style={styles.Section}>
          <Text style={styles.SectionTitle}>
            Produtos <Text style={styles.Required}>*</Text>
          </Text>

          {produtos.map((produto) => (
            <View key={produto.id} style={styles.ProductItem}>
              <View style={styles.ProductInfo}>
                <Text style={styles.ProductName}>{produto.nome}</Text>
                <Text style={styles.ProductDetails}>
                  Qtd: {produto.quantidade} x R${" "}
                  {getPrecoProduto(produto).toFixed(2)}
                </Text>
              </View>
              <Text style={styles.ProductPrice}>
                R$ {produto.subtotal.toFixed(2)}
              </Text>
              <TouchableOpacity onPress={() => removerProduto(produto.id)}>
                <MaterialIcons name="delete" size={24} color="#dc3545" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.AddButton}
            onPress={() => {
              carregarProdutos();
              setSearchProduto("");
              setModalProduto(true);
            }}
          >
            <Text style={styles.AddButtonText}>+ Adicionar Produto</Text>
          </TouchableOpacity>
        </View>

        {/* Total */}
        <View style={styles.TotalContainer}>
          <Text style={styles.TotalLabel}>Valor Total:</Text>
          <Text style={styles.TotalValue}>R$ {valorTotal.toFixed(2)}</Text>
        </View>

        {/* Gerar Conta a Pagar / Receber */}
        <View style={styles.Section}>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 15,
            }}
            onPress={() => setGerarContaPagar((prev) => !prev)}
          >
            <MaterialIcons
              name={gerarContaPagar ? "check-box" : "check-box-outline-blank"}
              size={24}
              color="#32B768"
            />
            <Text style={[styles.Label, { marginLeft: 10, marginBottom: 0 }]}>
              Gerar Conta a Pagar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 15,
            }}
            onPress={() => setGerarContaReceber((prev) => !prev)}
          >
            <MaterialIcons
              name={gerarContaReceber ? "check-box" : "check-box-outline-blank"}
              size={24}
              color="#32B768"
            />
            <Text style={[styles.Label, { marginLeft: 10, marginBottom: 0 }]}>
              Gerar Conta a Receber
            </Text>
          </TouchableOpacity>

          {(gerarContaPagar || gerarContaReceber) && (
            <>
              <Text style={styles.Label}>Vencimento da Conta</Text>
              <TouchableOpacity
                style={styles.ButtonSelect}
                onPress={() => setShowDateVencimento(true)}
              >
                <Text style={styles.ButtonSelectText}>
                  {format(vencimentoConta, "dd/MM/yyyy")}
                </Text>
                <MaterialIcons name="calendar-today" size={20} color="#666" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* Botão Salvar */}
      <TouchableOpacity style={styles.SaveButton} onPress={salvarOrcamento}>
        <Text style={styles.SaveButtonText}>
          {isEdit ? "Atualizar Orçamento" : "Criar Orçamento"}
        </Text>
      </TouchableOpacity>

      {/* Modal Cliente */}
      <Modal
        visible={modalCliente}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalCliente(false)}
      >
        <View style={styles.ModalOverlay}>
          <View style={styles.ModalContent}>
            <View style={styles.ModalHeader}>
              <Text style={styles.ModalTitle}>Selecionar Cliente</Text>
              <TouchableOpacity onPress={() => setModalCliente(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.SearchInput}
              placeholder="Buscar cliente..."
              value={searchCliente}
              onChangeText={setSearchCliente}
            />

            <FlatList
              data={clientesFiltrados}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.ListItem}
                  onPress={() => selecionarCliente(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ListItemText}>{item.nome}</Text>
                    {item.telefone ? (
                      <Text
                        style={[
                          styles.ListItemText,
                          { fontSize: 12, color: "#666" },
                        ]}
                      >
                        {item.telefone}
                      </Text>
                    ) : null}
                    {item.endereco ? (
                      <Text
                        style={[
                          styles.ListItemText,
                          { fontSize: 12, color: "#666" },
                        ]}
                      >
                        {item.endereco}
                      </Text>
                    ) : null}
                    {item.email ? (
                      <Text
                        style={[
                          styles.ListItemText,
                          { fontSize: 12, color: "#666" },
                        ]}
                      >
                        {item.email}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.EmptyText}>Nenhum cliente encontrado</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Modal Produto */}
      <Modal
        visible={modalProduto}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalProduto(false)}
      >
        <View style={styles.ModalOverlay}>
          <View style={styles.ModalContent}>
            <View style={styles.ModalHeader}>
              <Text style={styles.ModalTitle}>Selecionar Produto</Text>
              <TouchableOpacity onPress={() => setModalProduto(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.SearchInput}
              placeholder="Buscar produto..."
              value={searchProduto}
              onChangeText={setSearchProduto}
            />

            <FlatList
              data={produtosFiltrados}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.ListItem}
                  onPress={() => {
                    setProdutoParaAdicionar(item);
                    setQuantidadeAdicionar("1");
                    setModalProduto(false);
                    setModalQuantidadeVisivel(true);
                  }}
                >
                  <Text style={styles.ListItemText}>{item.nome}</Text>
                  <Text
                    style={[
                      styles.ListItemText,
                      { fontSize: 14, color: "#28a745" },
                    ]}
                  >
                    R$ {getPrecoProduto(item).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.EmptyText}>Nenhum produto encontrado</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Modal Quantidade (adicionar produto) */}
      <Modal
        visible={modalQuantidadeVisivel}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalQuantidadeVisivel(false);
          setProdutoParaAdicionar(null);
        }}
      >
        <View style={styles.ModalOverlay}>
          <View style={styles.ModalContent}>
            <View style={styles.ModalHeader}>
              <Text style={styles.ModalTitle}>Adicionar Produto</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalQuantidadeVisivel(false);
                  setProdutoParaAdicionar(null);
                }}
              >
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.Label}>{produtoParaAdicionar?.nome || ""}</Text>
            <Text style={[styles.Label, { marginTop: 6 }]}>
              Preço: R${" "}
              {produtoParaAdicionar
                ? getPrecoProduto(produtoParaAdicionar).toFixed(2)
                : "0.00"}
            </Text>

            <TextInput
              style={styles.SearchInput}
              keyboardType="numeric"
              value={quantidadeAdicionar}
              onChangeText={(t) =>
                setQuantidadeAdicionar(String(t).replace(/[^0-9]/g, ""))
              }
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => {
                Keyboard.dismiss();
              }}
              placeholder="Quantidade"
            />

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <TouchableOpacity
                style={[styles.SaveButton, { flex: 1, marginRight: 8 }]}
                onPress={() => {
                  Keyboard.dismiss();
                  setModalQuantidadeVisivel(false);
                  setProdutoParaAdicionar(null);
                }}
              >
                <Text style={styles.SaveButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.SaveButton,
                  { flex: 1, backgroundColor: "#28a745" },
                ]}
                onPress={() => {
                  Keyboard.dismiss();
                  if (produtoParaAdicionar)
                    adicionarProduto(
                      produtoParaAdicionar,
                      quantidadeAdicionar || "1",
                    );
                  setModalQuantidadeVisivel(false);
                  setProdutoParaAdicionar(null);
                }}
              >
                <Text style={styles.SaveButtonText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {Platform.OS === "ios" ? (
        <>
          <Modal
            transparent
            visible={showDatePicker}
            animationType="fade"
            onRequestClose={() => setShowDatePicker(false)}
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
                {showDatePicker && (
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={dataOrcamento}
                    mode="date"
                    display="inline"
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) setDataOrcamento(date);
                    }}
                    locale="pt-BR"
                    themeVariant="light"
                    style={{ width: "100%" }}
                  />
                )}
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
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
                    onChange={(event, date) => {
                      setShowDateVencimento(false);
                      if (date) setVencimentoConta(date);
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
          {showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={dataOrcamento}
              mode="date"
              is24Hour={true}
              display="calendar"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) setDataOrcamento(date);
              }}
            />
          )}

          {showDateVencimento && (
            <DateTimePicker
              testID="dateTimePicker"
              value={vencimentoConta}
              mode="date"
              is24Hour={true}
              display="calendar"
              onChange={(event, date) => {
                setShowDateVencimento(false);
                if (date) setVencimentoConta(date);
              }}
            />
          )}
        </>
      )}

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          marginHorizontal: 15,
          marginBottom: 12,
        }}
      >
        <TouchableOpacity
          style={[styles.SaveButton, { backgroundColor: "#32B768", flex: 1 }]}
          onPress={async () => {
            const uri = await gerarPdf();
            if (uri) {
              if (Platform.OS === "ios" || Platform.OS === "android") {
                await Print.printAsync({ uri }).catch(() => {});
              }
            }
          }}
        >
          <Text style={styles.SaveButtonText}>Imprimir PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.SaveButton, { backgroundColor: "#075E54", flex: 1 }]}
          onPress={enviarViaWhatsApp}
        >
          <Text style={styles.SaveButtonText}>Enviar via WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default NovoOrcamento;
