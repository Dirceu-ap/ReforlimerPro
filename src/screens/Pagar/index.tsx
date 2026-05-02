import React, {
  memo,
  useEffect,
  useState,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import {
  TextInput,
  ActivityIndicator,
  Modal,
  Image,
  Alert,
  FlatList,
  Platform,
  Text,
  TouchableOpacity,
  View,
  Keyboard,
} from "react-native";
// Linking via require para evitar conflitos de tipo com TypeScript
const { Linking } = require("react-native");
// Remove old imports:
// import { PanGestureHandler } from 'react-native-gesture-handler';
// import { useAnimatedGestureHandler } from 'react-native-reanimated';

// Use new imports instead:
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RectButton } from "react-native-gesture-handler";
import { EvilIcons, MaterialIcons } from "@expo/vector-icons";
import { add, format, parseISO, sub } from "date-fns";
import { styles } from "./style";
import DateTimePicker from "@react-native-community/datetimepicker";
import Header from "../../components/Header";
import Load from "../../components/Load";
import api from "../../services/api";
import fonts from "../../styles/fonts";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/core";
import { CommonActions } from "@react-navigation/native";
import SwipeableRow from "./../../components/SwipeableRow/pagar";
import urlImgContas from "../../services/urlImgContas";
import { showMessage } from "react-native-flash-message";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { SelectField } from "../../components/SelectField";

interface Conta {
  id: string;
  valor: string;
  cliente: string;
  saida: string;
  vencimento: string;
  frequencia: string;
  arquivo?: string;
  tumb?: string;
  status?: string;
  valor_antigo?: string;
  descricao?: string;
  local?: string;
  devolucao?: string;
  desconto?: string;
  desconto_perc?: string;
  acrescimo?: string;
  acrescimo_perc?: string;
}

interface Frequencia {
  nome: string;
}

// Mínimo de caracteres para disparar busca automática no campo de pesquisa
const MIN_SEARCH_LENGTH = 3;
const PAGAR_CACHE_TTL_MS = 60000;

function Pagar() {
  const navigation: any = useNavigation();
  const route: any = useRoute();
  const modoVencidas = route?.params?.modo === "vencidas";

  const [abrirModal, setAbrirModal] = useState(false);
  const [abrirModalParc, setAbrirModalParc] = useState(false);

  const [lista_freq, setListaFreq] = useState<Frequencia[]>([]);
  const [frequencia, setFrequencia] = useState("Mensal");

  const [parcela, setParcela] = useState("");
  const [idConta, setIdConta] = useState("");

  const [valor, setValor] = useState("");
  const [forn, setForn] = useState("");
  const [saida, setSaida] = useState("");
  const [venc, setVenc] = useState("");
  const [doc, setDoc] = useState("");
  const [plano, setPlano] = useState("");
  const [emissao, setEmissao] = useState("");
  const [freq, setFreq] = useState("");
  const [arq, setArq] = useState("");
  const [usu, setUsu] = useState("");
  const [tumb, setTumb] = useState("");

  const [loading, setLoading] = useState(false);
  // Removido navigation duplicado
  const [contas, setContas] = useState<Conta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [date, setDate] = useState<Date>(new Date());
  const [show, setShow] = useState<boolean>(false);

  const [date2, setDate2] = useState<Date>(new Date());
  const [show2, setShow2] = useState(false);

  const [fornecedorFiltro, setFornecedorFiltro] = useState<string>("");
  const [fornecedorClearKey, setFornecedorClearKey] = useState<number>(0);

  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedContas, setSelectedContas] = useState<Record<string, Conta>>(
    {},
  );
  const [isBaixandoLote, setIsBaixandoLote] = useState(false);

  const parseNum = (value: string | number | undefined) => {
    return parseFloat(String(value ?? "0").replace(",", ".")) || 0;
  };

  const getCacheKey = useCallback(
    (date1: string, date2: string, forn?: string) => {
      const filtro = String(forn ?? "")
        .trim()
        .toLowerCase();
      return `@pagar_cache:${date1}:${date2}:${filtro}`;
    },
    [],
  );

  const readCache = useCallback(
    async (
      date1: string,
      date2: string,
      forn?: string,
    ): Promise<Conta[] | null> => {
      try {
        const key = getCacheKey(date1, date2, forn);
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        const updatedAt = Number(parsed?.updatedAt ?? 0);
        const dados = parsed?.dados;
        if (!updatedAt || !Array.isArray(dados)) return null;
        if (Date.now() - updatedAt > PAGAR_CACHE_TTL_MS) return null;
        return dados as Conta[];
      } catch {
        return null;
      }
    },
    [getCacheKey],
  );

  const writeCache = useCallback(
    async (
      date1: string,
      date2: string,
      forn: string | undefined,
      dados: Conta[],
    ) => {
      try {
        const key = getCacheKey(date1, date2, forn);
        await AsyncStorage.setItem(
          key,
          JSON.stringify({
            updatedAt: Date.now(),
            dados,
          }),
        );
      } catch {
        // sem ação
      }
    },
    [getCacheKey],
  );

  const logoUri = Image.resolveAssetSource(
    require("../../assets/logo2.png"),
  ).uri;

  // debounce local usado pelo Header (cada Header tem seu próprio debounce)
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Função para buscar frequências
  const selectListaFreq = useCallback(async () => {
    try {
      const response = await api.get("pagar/listar_freq.php");
      if (response.data && response.data.resultado) {
        setListaFreq(response.data.resultado);
      }
    } catch (error) {
      console.log("Erro ao buscar frequências:", error);
    }
  }, []);

  // Função principal para buscar dados
  const fetchData = useCallback(
    async (fornecedorOverride?: string, showLoading: boolean = true) => {
      let shouldHideLoadingInFinally = showLoading;
      try {
        const date1 = format(date, "yyyy-MM-dd");
        const dates2 = format(date2, "yyyy-MM-dd");

        let url = `pagar/listar.php?data=${date1}&data1=${dates2}`;
        const fornecedor = fornecedorOverride ?? undefined;
        if (fornecedor) {
          url += `&fornecedor=${encodeURIComponent(fornecedor)}`;
        }

        if (showLoading) {
          const cached = await readCache(date1, dates2, fornecedor);
          if (cached && cached.length >= 0) {
            setContas(cached);
            setIsLoading(false);
            shouldHideLoadingInFinally = false;
          } else {
            setIsLoading(true);
          }
        }

        const response = await api.get(url);

        if (
          response.data &&
          response.data.resultado &&
          response.data.resultado !== "0"
        ) {
          const lista = Array.isArray(response.data.resultado)
            ? (response.data.resultado as Conta[])
            : [];
          setContas(lista);
          await writeCache(date1, dates2, fornecedor, lista);
        } else {
          setContas([]);
          await writeCache(date1, dates2, fornecedor, []);
        }
      } catch (error) {
        console.log("Erro ao buscar dados:", error);
        setContas([]);
      } finally {
        if (shouldHideLoadingInFinally) setIsLoading(false);
      }
    },
    [date, date2, readCache, writeCache],
  );

  // Date picker handlers
  const onChange = useCallback((event: any, selectedDate: any) => {
    if (event.type === "set" && selectedDate) {
      setDate(selectedDate);
    }
    if (Platform.OS === "android") {
      setShow(false);
    }
  }, []);

  const onChange2 = useCallback((event: any, selectedDate: any) => {
    if (event.type === "set" && selectedDate) {
      setDate2(selectedDate);
    }
    if (Platform.OS === "android") {
      setShow2(false);
    }
  }, []);

  // Carregar dados de uma conta específica
  const loadData = useCallback(async (id_reg: string) => {
    try {
      setLoading(true);
      const res = await api.get(`pagar/listar_id.php?id=${id_reg}`);

      if (res.data && res.data.dados) {
        const dados = res.data.dados;
        setValor(dados.valor ?? "");
        setForn(dados.fornF ?? "");
        setPlano(dados.plano ?? "");
        setSaida(dados.saida ?? "");
        setDoc(dados.doc ?? "");
        setVenc(dados.vencF ?? "");
        setEmissao(dados.emissao ?? "");
        setFreq(dados.freq ?? "");
        setArq(dados.arq ?? "");
        setUsu(dados.usu ?? "");
        setTumb(dados.tumb ?? "");
        setIdConta(dados.id ?? "");
        setFrequencia(dados.frequencia ?? "Mensal");
      }
      setAbrirModal(true);
      // limpar campo de busca do header independente
      setFornecedorFiltro("");
      headerRef.current?.clear?.();
    } catch (error) {
      console.log("Erro ao carregar os Dados:", error);
      Alert.alert("Erro", "Não foi possível carregar os dados da conta");
    } finally {
      setLoading(false);
    }
  }, []);

  // Modal de parcelamento
  const modalParcelar = useCallback(
    async (id_reg: string) => {
      setIdConta(id_reg);
      try {
        const res = await api.get(`pagar/listar_id.php?id=${id_reg}`);
        if (res.data && res.data.dados) {
          setValor(res.data.dados.valor ?? "");
          await selectListaFreq();
          setAbrirModalParc(true);
        }
      } catch (error) {
        console.log("Erro ao carregar dados para parcelamento:", error);
      }
    },
    [selectListaFreq],
  );

  // Gerar parcelas
  const gerarParcelas = useCallback(async () => {
    if (!parcela || !idConta) {
      Alert.alert("Atenção", "Preencha o número de parcelas");
      return;
    }

    try {
      const obj = {
        id: idConta,
        parcelas: parcela,
        frequencia: frequencia,
      };

      const res = await api.post("pagar/parcelar.php", obj);

      if (res.data.sucesso === false) {
        showMessage({
          message: "Erro ao Salvar",
          description: res.data.mensagem,
          type: "warning",
        });
        return;
      }

      setFrequencia("Mensal");
      setParcela("");

      showMessage({
        message: "Parcelado",
        description: "Parcelado com Sucesso!!",
        type: "success",
      });

      setAbrirModalParc(false);
      fetchData();
    } catch (error) {
      console.log("Erro ao gerar parcelas:", error);
      Alert.alert("Ops", "Alguma coisa deu errado, tente novamente.");
    }
  }, [parcela, idConta, frequencia, fetchData]);

  // Excluir conta
  const excluir = useCallback(
    async (nome: string, id: string) => {
      const user = await AsyncStorage.getItem("@user");
      Alert.alert(
        "Excluir",
        `Você tem certeza que deseja excluir a Conta de valor: ${nome}`,
        [
          { text: "Não", style: "cancel" },
          {
            text: "Sim",
            onPress: async () => {
              try {
                const res = await api.get(
                  `pagar/excluir.php?id=${id}&user=${user}`,
                );
                if (res.data.sucesso === false) {
                  showMessage({
                    message: "Restrição ao Excluir",
                    description: res.data.mensagem,
                    type: "warning",
                  });
                  return;
                }
                showMessage({
                  message: "Exclusão",
                  description: "Registro " + nome + " Excluído com Sucesso",
                  type: "info",
                });
                fetchData();
              } catch (error) {
                console.log("Erro ao excluir:", error);
                Alert.alert("Não foi possivel excluir, tente novamente!");
              }
            },
          },
        ],
      );
    },
    [fetchData],
  );

  // Gerar relatório PDF
  const gerarRelatorioPDF = useCallback(async () => {
    try {
      // Buscar dados
      const date1 = format(date, "yyyy-MM-dd");
      const dates2 = format(date2, "yyyy-MM-dd");
      const periodo = `${format(date, "dd/MM/yyyy")} até ${format(
        date2,
        "dd/MM/yyyy",
      )}`;

      let url = `pagar/listar.php?data=${date1}&data1=${dates2}`;
      if (fornecedorFiltro) {
        url += `&fornecedor=${encodeURIComponent(fornecedorFiltro)}`;
      }

      const response = await api.get(url);

      if (!response.data?.resultado?.length) {
        Alert.alert("Sem Dados", "Nenhum Registro Encontrado no Período!");
        return;
      }

      const dadosRelatorio = response.data.resultado;

      // Calcular total geral
      let totalGeral = 0;
      dadosRelatorio.forEach((item: Conta) => {
        const valorNum = parseFloat(item.valor) || 0;
        totalGeral += valorNum;
      });

      // Montar HTML do relatório (mesmo layout do Contas a Receber)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #2c3e50; font-size: 11px; line-height: 1.35; }
              .header { margin-bottom: 10px; }
              .header-top { display: flex; align-items: center; }
              .header-right { flex: 1; text-align: center; font-size: 10px; }
              .header h1 { color: #32B768; margin: 6px 0 0 0; font-size: 15px; font-weight: bold; }
              .empresa { font-size: 13px; font-weight: bold; }
              .endereco { font-size: 10px; margin-top: 2px; }
              .logo { height: 90px; margin-right: 10px; }
              .info { margin-top: 4px; margin-bottom: 8px; font-size: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
              th { background: #32B768; color: white; padding: 6px; text-align: left; }
              td { padding: 6px; border: 1px solid #ddd; }
              tr:nth-child(even) { background: #f9f9f9; }
              .total { margin-top: 12px; font-weight: bold; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-top">
                <img class="logo" src="${logoUri}" alt="Logo" />
                <div class="header-right">
                  <div class="empresa">Reforlimer reformas e construções</div>
                  <div class="endereco">Avenida Laranjeiras, nº 701</div>
                  <h1>Relatório de Contas a Pagar</h1>
                </div>
              </div>
              <div class="info">
                <div>Período: ${periodo}</div>
                ${
                  fornecedorFiltro
                    ? `<div>Cliente/Fornecedor: ${fornecedorFiltro}</div>`
                    : ""
                }
                <div>Emissão: ${format(
                  new Date(),
                  "dd/MM/yyyy 'às' HH:mm",
                )}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Cliente/Fornecedor</th>
                  <th>Vencimento</th>
                  <th>Descrição</th>
                  <th>Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                ${dadosRelatorio
                  .map((item: Conta) => {
                    const vencimento = item.vencimento
                      ? format(parseISO(item.vencimento), "dd/MM/yyyy")
                      : "N/A";
                    const valorNum = parseFloat(item.valor) || 0;
                    const valorFormatado = valorNum.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                    const fornecedor = item.cliente
                      ? item.cliente.substring(0, 75)
                      : "";
                    const baseDesc = item.descricao || "";
                    const localInfo = item.local ? ` - Loc: ${item.local}` : "";
                    const descricao = (baseDesc + localInfo).substring(0, 75);
                    return `
                    <tr>
                      <td>${fornecedor}</td>
                      <td>${vencimento}</td>
                      <td>${descricao}</td>
                      <td style="text-align:right;">${valorFormatado}</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
            <div class="total">
              Total Geral: R$ ${totalGeral.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </body>
        </html>
      `;

      // Gerar PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 612,
        height: 792,
        margins: { left: 20, top: 20, right: 20, bottom: 20 },
      });

      // Compartilhar ou imprimir
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Relatório Contas a Pagar - ${periodo}`,
        });
      } else {
        await Print.printAsync({ uri });
      }

      Alert.alert("Sucesso", "Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      Alert.alert("Erro", "Falha ao gerar relatório");
    }
  }, [date, date2, fornecedorFiltro]);

  const toggleSelectConta = useCallback((conta: Conta) => {
    setSelectedContas((prev) => {
      const next = { ...prev };
      if (next[conta.id]) {
        delete next[conta.id];
      } else {
        next[conta.id] = conta;
      }
      return next;
    });
  }, []);

  const limparSelecaoMultipla = useCallback(() => {
    setSelectedContas({});
  }, []);

  const totalSelecionado = useMemo(() => {
    return Object.values(selectedContas).reduce((acc, conta) => {
      const v = parseFloat(String(conta.valor).replace(",", ".")) || 0;
      return acc + v;
    }, 0);
  }, [selectedContas]);

  const allContasSelecionadas = useMemo(() => {
    if (!contas?.length) return false;
    return contas.every((item) => !!selectedContas[String(item.id)]);
  }, [contas, selectedContas]);

  const handleToggleMultiSelectMode = useCallback(() => {
    setMultiSelectMode((prev) => {
      const novo = !prev;
      if (!novo) {
        // ao sair do modo múltiplo, limpa seleção
        limparSelecaoMultipla();
      }
      return novo;
    });
  }, [limparSelecaoMultipla]);

  const handleSelecionarTodos = useCallback(() => {
    if (!contas?.length) return;

    if (allContasSelecionadas) {
      limparSelecaoMultipla();
      return;
    }

    const novoSelecionado: Record<string, Conta> = {};
    contas.forEach((item) => {
      if (item?.id != null) {
        novoSelecionado[String(item.id)] = item;
      }
    });
    setSelectedContas(novoSelecionado);
  }, [contas, allContasSelecionadas, limparSelecaoMultipla]);

  const handleBaixarSelecionados = useCallback(async () => {
    const itens = Object.values(selectedContas);
    if (!itens.length) {
      Alert.alert("Atenção", "Selecione ao menos uma conta para baixar.");
      return;
    }

    Alert.alert(
      "Confirmar baixa",
      `Deseja dar baixa em ${itens.length} conta(s) no valor total de R$ ${totalSelecionado
        .toFixed(2)
        .replace(".", ",")}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              setIsBaixandoLote(true);
              const user = await AsyncStorage.getItem("@user");

              for (const conta of itens) {
                const toNum = (value: unknown) =>
                  parseFloat(String(value ?? "0").replace(",", ".")) || 0;

                const valorNum = toNum(conta.valor);
                if (!valorNum || valorNum <= 0) continue;

                const multaNum = 0;
                const jurosNum = 0;
                const descontoNum = toNum(conta.desconto);
                const devolucaoNum = toNum(conta.devolucao);
                const acrescimoNum = toNum(conta.acrescimo);
                const subtotalCalculado =
                  Math.round(
                    (valorNum +
                      multaNum +
                      jurosNum +
                      acrescimoNum -
                      descontoNum -
                      devolucaoNum) *
                      100,
                  ) / 100;
                const subtotalNum = Math.max(subtotalCalculado, 0);

                const payload = {
                  id: conta.id,
                  valor: valorNum,
                  multa: multaNum,
                  juros: jurosNum,
                  desconto: descontoNum,
                  subtotal: subtotalNum,
                  devolucao: devolucaoNum,
                  desconto_perc: toNum(conta.desconto_perc),
                  acrescimo: acrescimoNum,
                  acrescimo_perc: toNum(conta.acrescimo_perc),
                  saida: conta.saida || "Caixa",
                  user: user || "default_user",
                };

                await api.post("pagar/baixar.php", payload);
              }

              showMessage({
                message: "Baixa concluída",
                description:
                  "As contas selecionadas foram baixadas com sucesso.",
                type: "success",
              });

              limparSelecaoMultipla();
              setMultiSelectMode(false);
              fetchData();
            } catch (error) {
              console.log("Erro ao baixar em lote:", error);
              Alert.alert(
                "Erro",
                "Não foi possível concluir a baixa múltipla.",
              );
            } finally {
              setIsBaixandoLote(false);
            }
          },
        },
      ],
    );
  }, [selectedContas, totalSelecionado, fetchData, limparSelecaoMultipla]);

  // ref para limpar o header quando abrir edição
  const headerRef = useRef<any>(null);
  const handleChangeFiltro = useCallback((t: string) => {
    setFornecedorFiltro(t);
  }, []);

  const handleSearchWithText = useCallback(
    (t: string) => {
      const filtro = t ?? "";
      setFornecedorFiltro(filtro);

      // Busca remota
      fetchData(filtro, false).then(() => {
        // Após buscar, filtra localmente se necessário
        if (filtro && filtro.trim() !== "") {
          setContas((prev) => {
            const term = filtro.toLowerCase().trim();
            return prev.filter((it: any) => {
              const nome = String(it?.cliente ?? it?.nome ?? "").toLowerCase();
              const descricao = String(it?.descricao ?? "").toLowerCase();
              const local = String(it?.local ?? "").toLowerCase();
              return (
                nome.includes(term) ||
                descricao.includes(term) ||
                local.includes(term)
              );
            });
          });
        }
      });
    },
    [fetchData],
  );

  // Render item da lista
  const renderItem = useCallback(
    ({ item }: { item: Conta }) => {
      const valorFormatado = String(item.valor ?? "").replace(".", ",");
      const valorNum = parseNum(item.valor);
      const descontoNum = parseNum(item.desconto);
      const devolucaoNum = parseNum(item.devolucao);
      const acrescimoNum = parseNum(item.acrescimo);
      const valorLiquidoNum = Math.max(
        Math.round(
          (valorNum + acrescimoNum - descontoNum - devolucaoNum) * 100,
        ) / 100,
        0,
      );
      const deltaLiquido = valorLiquidoNum - valorNum;
      const mostrarValorLiquido =
        Math.abs(valorLiquidoNum - valorNum) >= 0.01 || acrescimoNum > 0;
      const valorLiquidoFormatado = valorLiquidoNum
        .toFixed(2)
        .replace(".", ",");
      const estiloLiquido =
        deltaLiquido < -0.009
          ? styles.ValorLiquidoReducao
          : deltaLiquido > 0.009
            ? styles.ValorLiquidoAcrescimo
            : styles.ValorLiquido;
      const data = item.vencimento ? parseISO(item.vencimento) : new Date();
      const vencimento = format(data, "dd/MM/yyyy");

      // Nome que será exibido na lista (fornecedor/colaborador)
      let clienteVisivel = String(item.cliente ?? "").trim();

      // Tratar casos de Livro Ponto para mostrar apenas o nome do colaborador
      if (clienteVisivel) {
        let prefixResiduo = "";
        const baseLower = clienteVisivel.toLowerCase();

        // Se vier com prefixo de resíduo, preserva-o e corta antes de tratar Livro Ponto
        const prefixResiduoLower = "(resíduo) -";
        if (baseLower.startsWith(prefixResiduoLower)) {
          prefixResiduo = "(Resíduo) - ";
          clienteVisivel = clienteVisivel
            .substring(prefixResiduoLower.length)
            .trim();
        }

        const lower = clienteVisivel.toLowerCase();
        const marcadorLivroPonto = " - livro ponto";
        const idxNovo = lower.indexOf(marcadorLivroPonto);

        if (idxNovo > 0) {
          // Padrão novo: "Nome Colaborador - Livro Ponto (...)"
          const nome = clienteVisivel.substring(0, idxNovo).trim();
          clienteVisivel = (prefixResiduo + nome).trim();
        } else if (lower.startsWith("livro ponto -")) {
          // Padrão antigo: "Livro Ponto - Nome Colaborador (...)"
          const prefixLen = "livro ponto -".length;
          let resto = clienteVisivel.substring(prefixLen).trim();
          let stop = resto.indexOf(" - ");
          if (stop < 0) stop = resto.indexOf("(");
          if (stop < 0) stop = resto.length;
          const nome = resto.substring(0, stop).trim();
          clienteVisivel = (prefixResiduo + nome).trim();
        } else if (prefixResiduo) {
          // Caso resíduo mas sem "Livro Ponto", só recoloca prefixo
          clienteVisivel = (prefixResiduo + clienteVisivel).trim();
        }
      }

      const handlePressArquivo = () => {
        if (
          item.arquivo &&
          item.arquivo !== "sem-foto.jpg" &&
          item.arquivo !== ""
        ) {
          // abre o anexo da conta (imagem, PDF, etc.)
          Linking.openURL(urlImgContas + "contas/" + item.arquivo);
        }
      };

      const isSelecionada = !!selectedContas[item.id];

      return (
        <View
          style={
            item.status == "Pendente"
              ? styles.CardContainer
              : styles.CardContainerVerde
          }
        >
          {multiSelectMode && (
            <TouchableOpacity
              style={styles.checkboxSelect}
              onPress={() => toggleSelectConta(item)}
            >
              <Ionicons
                name={isSelecionada ? "checkbox-outline" : "square-outline"}
                size={24}
                color={isSelecionada ? "#31b555" : "#999"}
              />
            </TouchableOpacity>
          )}
          <SwipeableRow
            item={item}
            itemId={item.id}
            valor={item.valor}
            disabled={multiSelectMode}
            onAfterBaixa={() => fetchData()}
            onPressWhatsapp={async () => {
              navigation.push("BaixarPagar", {
                id_reg: item.id,
                valor_conta: item.valor,
                devolucao: item.devolucao,
                desconto: item.desconto,
                desconto_perc: item.desconto_perc,
                acrescimo: item.acrescimo,
                acrescimo_perc: item.acrescimo_perc,
              });
            }}
            onPressEdit={async () => {
              navigation.push("NovaContaPagar", { id_reg: item.id });
            }}
            onPressDelete={async () => {
              excluir(item.valor, item.id);
            }}
            onPressParcelar={async () => {
              modalParcelar(item.id);
            }}
          >
            <TouchableOpacity
              onPress={() => {
                if (multiSelectMode) {
                  toggleSelectConta(item);
                } else {
                  loadData(item.id);
                }
              }}
            >
              <Text style={styles.Cliente}>{clienteVisivel}</Text>
              <Text style={styles.Valor}>
                R$ {valorFormatado}{" "}
                {item.valor_antigo && (
                  <Text style={styles.ValorRes}>{item.valor_antigo}</Text>
                )}
              </Text>
              {mostrarValorLiquido && (
                <Text style={styles.ValorLiquido}>
                  Líquido: R$ {valorLiquidoFormatado}
                </Text>
              )}

              <View style={styles.Section}>
                <MaterialIcons
                  style={styles.Icon}
                  name="attach-money"
                  size={22}
                  color="#c1c1c1"
                />
                <Text style={styles.Entrada}>{item.saida}</Text>

                {item.arquivo &&
                item.arquivo !== "sem-foto.jpg" &&
                item.tumb ? (
                  item.tumb === "pdf.png" ? (
                    <Image
                      style={styles.Vencimento2}
                      source={require("../../assets/pdf.png")}
                    />
                  ) : item.tumb === "rar.png" ? (
                    <Image
                      style={styles.Vencimento2}
                      source={require("../../assets/rar.png")}
                    />
                  ) : (
                    <Image
                      style={styles.Vencimento2}
                      source={{ uri: urlImgContas + "contas/" + item.arquivo }}
                    />
                  )
                ) : null}

                <Text style={styles.Vencimento}>{vencimento}</Text>
              </View>

              <View style={styles.Footer}>
                <Text style={styles.FooterText}>
                  Frequência:{" "}
                  <Text style={{ color: "gray" }}>{item.frequencia ?? ""}</Text>
                </Text>
                {item.local ? (
                  <Text style={styles.FooterText}>
                    Local: <Text style={{ color: "gray" }}>{item.local}</Text>
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          </SwipeableRow>
        </View>
      );
    },
    [
      excluir,
      loadData,
      modalParcelar,
      navigation,
      multiSelectMode,
      selectedContas,
      toggleSelectConta,
      fetchData,
    ],
  );

  // Componente para lista vazia
  const ListEmptyComponent = useCallback(
    () => (
      <View
        style={{
          justifyContent: "center",
          alignItems: "center",
          marginTop: 20,
        }}
      >
        <Text style={{ fontFamily: fonts.text, fontSize: 16 }}>
          Não tem nenhuma conta para este período.
        </Text>
      </View>
    ),
    [],
  );
  // Ao abrir com modo "vencidas", ajusta o período para pegar apenas contas vencidas
  useEffect(() => {
    if (modoVencidas) {
      // início bem antigo para garantir pegar todo histórico
      const inicio = new Date(2000, 0, 1);
      // fim: ontem (hoje já é tratado como "hoje", não vencido)
      const ontem = sub(new Date(), { days: 1 });
      setDate(inicio);
      setDate2(ontem);
    }
  }, [modoVencidas]);

  // Efeitos
  // Efeitos
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    selectListaFreq();
  }, [selectListaFreq]);

  // Atualiza a listagem sempre que a tela ganha foco (ex.: após dar baixa)
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation, fetchData]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#fff",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color="#000" size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f2f2f2", marginTop: 50 }}>
      <View style={styles.header}>
        <View style={styles.containerHeader}>
          <TouchableOpacity
            style={styles.menu}
            onPress={() => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "Home", params: { screen: "Inicio" } }],
                }),
              );
            }}
          >
            <Ionicons name="arrow-back-circle-outline" size={35} color="#000" />
          </TouchableOpacity>
          <Image
            style={styles.logo}
            source={require("../../assets/logo2.png")}
          />
        </View>
      </View>
      {Platform.OS === "ios" ? (
        <>
          <Modal
            transparent
            visible={show}
            animationType="fade"
            onRequestClose={() => setShow(false)}
          >
            <View style={styles.centralizarModal}>
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
                  Selecione a data inicial
                </Text>
                {show && (
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={date}
                    mode="date"
                    display="inline"
                    onChange={onChange}
                    locale="pt-BR"
                    themeVariant="light"
                    style={{ width: "100%" }}
                  />
                )}
                <TouchableOpacity
                  onPress={() => setShow(false)}
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
            visible={show2}
            animationType="fade"
            onRequestClose={() => setShow2(false)}
          >
            <View style={styles.centralizarModal}>
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
                  Selecione a data final
                </Text>
                {show2 && (
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={date2}
                    mode="date"
                    display="inline"
                    onChange={onChange2}
                    locale="pt-BR"
                    themeVariant="light"
                    style={{ width: "100%" }}
                  />
                )}
                <TouchableOpacity
                  onPress={() => setShow2(false)}
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
          {show && (
            <DateTimePicker
              testID="dateTimePicker"
              value={date}
              mode="date"
              is24Hour={true}
              display="calendar"
              onChange={onChange}
            />
          )}

          {show2 && (
            <DateTimePicker
              testID="dateTimePicker"
              value={date2}
              mode="date"
              is24Hour={true}
              display="calendar"
              onChange={onChange2}
            />
          )}
        </>
      )}
      <View style={styles.Container}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
            paddingLeft: 0,
          }}
        >
          <TouchableOpacity
            style={styles.printButton}
            onPress={gerarRelatorioPDF}
          >
            <MaterialIcons name="print" size={24} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.printButton,
              {
                marginLeft: 10,
                backgroundColor: multiSelectMode ? "#555" : "#4CAF50",
              },
            ]}
            onPress={handleToggleMultiSelectMode}
          >
            <MaterialIcons
              name={multiSelectMode ? "check-box" : "check-box-outline-blank"}
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>

          <Text style={[styles.Title, { flex: 1, textAlign: "center" }]}>
            Contas a Pagar
          </Text>
        </View>
      </View>
      {isLoading ? (
        <Load />
      ) : (
        <FlatList
          data={contas}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            <HeaderSearch
              ref={headerRef}
              onChangeFilter={handleChangeFiltro}
              onSearchWithText={handleSearchWithText}
              date={date}
              date2={date2}
              setDate={setDate}
              setDate2={setDate2}
              setShow={setShow}
              setShow2={setShow2}
            />
          }
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          ListEmptyComponent={ListEmptyComponent}
          removeClippedSubviews={Platform.OS === "android"}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        />
      )}
      {multiSelectMode && (
        <View style={styles.multiSelectBar}>
          <Text style={styles.multiSelectText}>
            {Object.keys(selectedContas).length} selecionada(s) - Total R${" "}
            {totalSelecionado.toFixed(2).replace(".", ",")}
          </Text>
          <View style={styles.multiSelectActions}>
            <TouchableOpacity
              style={[
                styles.multiSelectButton,
                {
                  backgroundColor: allContasSelecionadas
                    ? "#6b7280"
                    : "#2563eb",
                  opacity: isBaixandoLote ? 0.55 : 1,
                },
              ]}
              onPress={handleSelecionarTodos}
              disabled={isBaixandoLote}
            >
              <Text style={styles.multiSelectButtonText}>
                {allContasSelecionadas ? "Limpar" : "Selecionar todos"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.multiSelectButton,
                {
                  backgroundColor: "#16a34a",
                  opacity:
                    isBaixandoLote || !Object.keys(selectedContas).length
                      ? 0.55
                      : 1,
                },
              ]}
              onPress={handleBaixarSelecionados}
              disabled={isBaixandoLote || !Object.keys(selectedContas).length}
            >
              <Text style={styles.multiSelectButtonText}>
                {isBaixandoLote ? "Baixando..." : "Baixar selecionadas"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View
        style={[
          styles.containerFloat,
          multiSelectMode ? { bottom: 106 } : null,
        ]}
      >
        <TouchableOpacity
          style={styles.CartButton}
          onPress={() => navigation.push("NovaContaPagar", { id_reg: "0" })}
        >
          <Ionicons name="add-outline" size={35} color="#fff" />
        </TouchableOpacity>
      </View>
      {/* Modal de Detalhes */}
      <Modal
        visible={abrirModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAbrirModal(false)}
      >
        <View style={styles.centralizarModal}>
          <View style={styles.CardContainerModal}>
            <TouchableOpacity
              style={styles.removeItem}
              onPress={() => setAbrirModal(false)}
            >
              <EvilIcons name="close" size={25} color="black" />
            </TouchableOpacity>

            <Text style={styles.Cliente}>{forn}</Text>
            <Text style={styles.Valor}>R$ {valor}</Text>

            <View style={styles.Section}>
              <MaterialIcons
                style={styles.Icon}
                name="attach-money"
                size={22}
                color="#c1c1c1"
              />
              <Text style={styles.Entrada}>{saida}</Text>
              <Text style={styles.Vencimento}>Vencimento: {venc}</Text>
            </View>

            <View style={styles.Section}>
              <MaterialIcons
                style={styles.Icon}
                name="money"
                size={22}
                color="#c1c1c1"
              />
              <Text style={styles.Entrada}>{doc}</Text>
              <Text style={styles.Vencimento}>{plano}</Text>
            </View>

            <View style={styles.Section}>
              <MaterialIcons
                style={styles.Icon}
                name="date-range"
                size={22}
                color="#c1c1c1"
              />
              <Text style={styles.Entrada}>Emissão {emissao}</Text>
              <Text style={styles.Vencimento}>{usu}</Text>
            </View>

            <View style={styles.Footer}>
              <Text style={styles.FooterText}>
                Frequência: <Text style={{ color: "gray" }}>{freq}</Text>
              </Text>
            </View>

            {arq && arq !== "sem-foto.jpg" && arq !== "" && (
              <TouchableOpacity
                onPress={() => Linking.openURL(urlImgContas + "contas/" + arq)}
              >
                <View style={styles.viewImg}>
                  {tumb === "pdf.png" ? (
                    <Image
                      style={styles.ImagemModal}
                      source={require("../../assets/pdf.png")}
                    />
                  ) : tumb === "rar.png" ? (
                    <Image
                      style={styles.ImagemModal}
                      source={require("../../assets/rar.png")}
                    />
                  ) : (
                    <Image
                      style={styles.ImagemModal}
                      source={{ uri: urlImgContas + "contas/" + tumb }}
                      onError={() =>
                        console.log("Erro ao carregar imagem do modal")
                      }
                    />
                  )}
                  <Text style={styles.textoAbrir}>(Clique para Abrir)</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
      {/* Modal de Parcelamento */}
      <Modal
        visible={abrirModalParc}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAbrirModalParc(false)}
      >
        <View style={styles.centralizarModal}>
          <View style={styles.CardContainerModal}>
            <TouchableOpacity
              style={styles.removeItem}
              onPress={() => setAbrirModalParc(false)}
            >
              <EvilIcons name="close" size={25} color="black" />
            </TouchableOpacity>

            <Text style={styles.tituloModal}>
              Parcelar Conta - Valor: {valor}
            </Text>

            <View>
              <Text style={styles.TitleInputs}>Parcelas *</Text>
              <TextInput
                placeholder="Número de Parcelas"
                onChangeText={setParcela}
                value={parcela}
                style={styles.TextInput}
                keyboardType="numeric"
              />
            </View>

            <SelectField
              label="Frequência"
              selectedValue={String(frequencia)}
              onChange={(value) => setFrequencia(String(value))}
              options={lista_freq.map((item: Frequencia) => ({
                label: String(item?.nome ?? ""),
                value: String(item?.nome ?? ""),
              }))}
              labelStyle={styles.TitleInputs}
              containerStyle={styles.TextInput}
            />

            <TouchableOpacity
              style={[styles.Button, !parcela && { opacity: 0.5 }]}
              onPress={gerarParcelas}
              disabled={!parcela}
            >
              <Text style={styles.ButtonText}>Parcelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default Pagar;

// Header de busca independente, definido fora de Pagar para não perder foco/teclado a cada render
interface HeaderSearchProps {
  onChangeFilter: (text: string) => void;
  onSearchWithText: (text: string) => void;
  date: Date;
  date2: Date;
  setDate: (d: Date) => void;
  setDate2: (d: Date) => void;
  setShow: (v: boolean) => void;
  setShow2: (v: boolean) => void;
}

const HeaderSearch = memo(
  forwardRef(function HeaderSearch(
    {
      onChangeFilter,
      onSearchWithText,
      date,
      date2,
      setDate,
      setDate2,
      setShow,
      setShow2,
    }: HeaderSearchProps,
    ref: any,
  ) {
    const [text, setText] = useState("");
    const timer = useRef<NodeJS.Timeout | null>(null);

    useImperativeHandle(ref, () => ({
      clear: () => setText(""),
    }));

    const handleChange = (t: string) => {
      setText(t);
      onChangeFilter(t);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (t.length === 0 || t.length >= MIN_SEARCH_LENGTH) {
          onSearchWithText(t);
        }
      }, 450);
    };

    return (
      <View style={{ marginBottom: 10 }}>
        <View
          style={{
            marginTop: 10,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TextInput
            style={[styles.TextInput, { flex: 1, height: 35 }]}
            placeholder="Pesquisar por nome, descrição ou local"
            value={text}
            onChangeText={handleChange}
            returnKeyType="search"
            blurOnSubmit={false}
            onSubmitEditing={() => {
              Keyboard.dismiss();
              onSearchWithText(text);
            }}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <RectButton
            style={[styles.ButtonDates, { marginLeft: 5 }]}
            onPress={() => {
              Keyboard.dismiss();
              onSearchWithText(text);
            }}
          >
            <Text style={styles.ButtonDatesText}>Filtrar</Text>
          </RectButton>
        </View>

        <View style={styles.dates}>
          <RectButton
            style={styles.ButtonDates}
            onPress={() => {
              setDate(sub(new Date(), { years: 1 }));
              setDate2(sub(new Date(), { days: 1 }));
            }}
          >
            <Text style={styles.ButtonDatesText}>Vencidas</Text>
          </RectButton>
          <RectButton
            style={styles.ButtonDates}
            onPress={() => {
              setDate(new Date());
              setDate2(new Date());
            }}
          >
            <Text style={styles.ButtonDatesText}>Hoje</Text>
          </RectButton>
          <RectButton
            style={styles.ButtonDates}
            onPress={() => {
              setDate(add(new Date(), { days: 1 }));
              setDate2(add(new Date(), { days: 1 }));
            }}
          >
            <Text style={styles.ButtonDatesText}>Amanhã</Text>
          </RectButton>
        </View>

        <View style={styles.Dates}>
          <TouchableOpacity
            style={styles.pickDate}
            onPress={() => setShow(true)}
          >
            <Text style={{ fontFamily: fonts.text, fontSize: 16 }}>DE</Text>
            <Text style={styles.date}>{format(date, "dd/MM/yyyy")}</Text>
          </TouchableOpacity>
          <View style={{ alignSelf: "center" }}>
            <Ionicons name="arrow-forward-outline" size={30} color="#484a4d" />
          </View>
          <TouchableOpacity
            style={styles.pickDate}
            onPress={() => setShow2(true)}
          >
            <Text style={{ fontFamily: fonts.text, fontSize: 16 }}>ATÉ</Text>
            <Text style={styles.date}>{format(date2, "dd/MM/yyyy")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }),
);
