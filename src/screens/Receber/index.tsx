import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  Button,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RectButton } from "react-native-gesture-handler";
import { EvilIcons, MaterialIcons } from "@expo/vector-icons";
import { add, format, parseISO, sub } from "date-fns";
import { styles } from "./style";
import DateTimePicker from "@react-native-community/datetimepicker";
import Header from "../../components/Header";
import Load from "../../components/Load";
import Title from "../../components/Title";
import api from "../../services/api";
import fonts from "../../styles/fonts";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/core";
import { CommonActions } from "@react-navigation/native";
import SwipeableRow from "../../components/SwipeableRow/receber";
import urlImgContas from "../../services/urlImgContas";
import { showMessage } from "react-native-flash-message";
import { jsPDF } from "jspdf";
import * as FileSystem from "expo-file-system";
import { shareAsync } from "expo-sharing";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { SelectField } from "../../components/SelectField";

// Definição do tipo ContaReceber
interface ContaReceber {
  id: string;
  cliente: string;
  vencimento: string;
  descricao: string;
  valor: string;
  valor_antigo?: string;
  frequencia?: string;
  saida?: string;
  multa?: string;
  juros?: string;
  desconto?: string;
  desconto_perc?: string;
  acrescimo?: string;
  acrescimo_perc?: string;
  arquivo?: string;
  tumb?: string;
  status?: string;
}

interface BeneficiarioCobranca {
  nome: string;
  documento: string;
  endereco: string;
  pixChave: string;
  cidade?: string;
}

function Receber() {
  const [abrirModal, setAbrirModal] = useState(false);
  const [abrirModalParc, setAbrirModalParc] = useState(false);
  const [clienteFiltro, setClienteFiltro] = useState(""); // filtro persistente

  const [lista_freq, setListaFreq] = useState<any[]>([]);
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
  const [vencIso, setVencIso] = useState("");
  const [arq, setArq] = useState("");
  const [usu, setUsu] = useState("");
  const [tumb, setTumb] = useState("");
  const [tel, setTel] = useState("");
  const [beneficiario, setBeneficiario] = useState<BeneficiarioCobranca>({
    nome: "Reforlimer reformas e construcoes",
    documento: "CNPJ: INFORMAR",
    endereco: "Avenida Laranjeiras, n 701",
    pixChave: "INFORMAR_CHAVE_PIX",
    cidade: "Limeira",
  });

  // Busca habilitada para qualquer tamanho de texto
  const MIN_SEARCH_LENGTH = 0;

  // Fila de envios em massa via WhatsApp (um por telefone)
  const [filaWhatsapp, setFilaWhatsapp] = useState<any[]>([]);
  const [indiceFila, setIndiceFila] = useState(0);

  const [loading, setLoading] = useState(false);

  const navigation: any = useNavigation();
  const route: any = useRoute();
  const modoVencidas = route?.params?.modo === "vencidas";
  const [contas, setContas] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [date, setDate] = useState<any>(new Date());
  const [show, setShow] = useState<any>(false);
  const [mode, setMode] = useState<any>(true);

  const [date2, setDate2] = useState<any>(new Date());
  const [show2, setShow2] = useState(false);
  const lastAutoSearchRef = useRef<string>("__INIT__");
  const didInitAutoSearchRef = useRef(false);
  const latestRequestRef = useRef(0);
  const [relatorioVencidosComJuros, setRelatorioVencidosComJuros] =
    useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedContas, setSelectedContas] = useState<
    Record<string, ContaReceber>
  >({});
  const [isGerandoPixSelecionados, setIsGerandoPixSelecionados] =
    useState(false);
  const [isBaixandoSelecionados, setIsBaixandoSelecionados] = useState(false);

  // campo de filtro visível (rápido) para garantir interface igual ao Pagar
  const [searchLocal, setSearchLocal] = useState<string>("");

  const logoUri = Image.resolveAssetSource(
    require("../../assets/logo2.png"),
  ).uri;

  const parseMoney = useCallback((v: string) => {
    const raw = String(v ?? "0").trim();
    if (!raw) return 0;
    if (raw.includes(",") && raw.includes(".")) {
      return parseFloat(raw.replace(/\./g, "").replace(",", ".")) || 0;
    }
    if (raw.includes(",")) {
      return parseFloat(raw.replace(",", ".")) || 0;
    }
    return parseFloat(raw) || 0;
  }, []);

  const calcularValorTituloCorrigido = useCallback(
    (item: Partial<ContaReceber>) => {
      const valorOriginal = parseMoney(String(item.valor ?? "0"));

      const acrescimoValor = parseMoney(String(item.acrescimo ?? "0"));
      const acrescimoPerc = parseMoney(String(item.acrescimo_perc ?? "0"));
      const acrescimoPorcentagem = valorOriginal * (acrescimoPerc / 100);
      const acrescimoTotal = acrescimoValor + acrescimoPorcentagem;

      const descontoValor = parseMoney(String(item.desconto ?? "0"));
      const descontoPerc = parseMoney(String(item.desconto_perc ?? "0"));
      const descontoPorcentagem = valorOriginal * (descontoPerc / 100);
      const descontoTotal = descontoValor + descontoPorcentagem;

      let dataVenc = new Date();
      const vencIso = String(item.vencimento ?? "");
      if (vencIso) {
        const parsed = parseISO(vencIso);
        if (!isNaN(parsed.getTime())) {
          dataVenc = parsed;
        }
      }

      const hoje = new Date();
      const hojeSemHora = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate(),
      );
      const vencSemHora = new Date(
        dataVenc.getFullYear(),
        dataVenc.getMonth(),
        dataVenc.getDate(),
      );

      const msDia = 24 * 60 * 60 * 1000;
      const diasAtraso = Math.max(
        0,
        Math.floor((hojeSemHora.getTime() - vencSemHora.getTime()) / msDia),
      );

      const multaBase = diasAtraso > 0 ? valorOriginal * 0.02 : 0;
      const multa = multaBase + acrescimoTotal;
      const juros = diasAtraso > 0 ? valorOriginal * 0.000334 * diasAtraso : 0;
      const totalCobrar = Math.max(
        0,
        valorOriginal + multa + juros - descontoTotal,
      );

      return {
        valorOriginal,
        acrescimoTotal,
        descontoTotal,
        diasAtraso,
        multa,
        juros,
        totalCobrar,
      };
    },
    [parseMoney],
  );

  const toggleSelectConta = useCallback((conta: ContaReceber) => {
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

  const totalSelecionadoCorrigido = useMemo(() => {
    return Object.values(selectedContas).reduce((acc, conta) => {
      return acc + calcularValorTituloCorrigido(conta).totalCobrar;
    }, 0);
  }, [selectedContas, calcularValorTituloCorrigido]);

  const allContasSelecionadas = useMemo(() => {
    if (!contas?.length) return false;
    return contas.every((item: any) => !!selectedContas[String(item.id)]);
  }, [contas, selectedContas]);

  const handleToggleMultiSelectMode = useCallback(() => {
    setMultiSelectMode((prev) => {
      const novo = !prev;
      if (!novo) {
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

    const novoSelecionado: Record<string, ContaReceber> = {};
    contas.forEach((item: any) => {
      if (item?.id != null) {
        novoSelecionado[String(item.id)] = item as ContaReceber;
      }
    });
    setSelectedContas(novoSelecionado);
  }, [contas, allContasSelecionadas, limparSelecaoMultipla]);

  // Se vier do card "Receber vencidas", ajusta o período para pegar só vencidas
  useEffect(() => {
    if (modoVencidas) {
      const inicio = sub(new Date(), { years: 1 });
      const ontem = sub(new Date(), { days: 1 });
      setDate(inicio);
      setDate2(ontem);
    }
  }, [modoVencidas]);

  async function selectListaFreq() {
    try {
      const response = await api.get("receber/listar_freq.php");
      setListaFreq(response.data.resultado ?? []);
    } catch (error) {
      console.log(error);
    }
  }

  // fetchData aceita opcionalmente um cliente/fornecedor para uso imediato
  const fetchData = useCallback(
    async (clienteParam?: string) => {
      const requestId = ++latestRequestRef.current;
      try {
        setIsLoading(true);
        const date1 = format(date, "yyyy-MM-dd");
        const dates2 = format(date2, "yyyy-MM-dd");

        const clienteToUse =
          typeof clienteParam === "string" ? clienteParam : clienteFiltro;
        const q = clienteToUse
          ? encodeURIComponent(String(clienteToUse).trim())
          : "";

        // Delega o filtro principal ao backend (parâmetro cliente),
        // retornando já somente o que bate com o texto.
        const relUrl =
          `receber/listar.php?data=${date1}&data1=${dates2}` +
          (q ? `&busca=${q}` : "");

        const response = await api.get(relUrl);
        const raw = response?.data?.resultado ?? response?.data ?? [];
        const lista = Array.isArray(raw) ? raw : [];

        if (requestId === latestRequestRef.current) {
          setContas(lista);
        }
        return lista;
      } catch (error) {
        console.log("Erro ao buscar dados:", error);
        if (requestId === latestRequestRef.current) {
          setContas([]);
        }
        return [];
      } finally {
        if (requestId === latestRequestRef.current) {
          setIsLoading(false);
        }
      }
    },
    [date, date2, clienteFiltro],
  );

  const handleBaixarSelecionados = useCallback(async () => {
    const itens = Object.values(selectedContas);
    if (!itens.length) {
      Alert.alert("Atenção", "Selecione ao menos uma conta para baixar.");
      return;
    }

    Alert.alert(
      "Confirmar baixa",
      `Deseja dar baixa em ${itens.length} conta(s) no valor total de R$ ${totalSelecionadoCorrigido
        .toFixed(2)
        .replace(".", ",")}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              setIsBaixandoSelecionados(true);
              const user = await AsyncStorage.getItem("@user");

              for (const conta of itens) {
                const valorNum = parseMoney(String(conta.valor ?? "0"));
                if (!valorNum || valorNum <= 0) continue;

                const payload = {
                  id: conta.id,
                  id_compra: conta.id,
                  valor: valorNum,
                  saida: conta.saida || "Caixa",
                  multa: 0,
                  juros: 0,
                  desconto: 0,
                  subtotal: valorNum,
                  devolucao: 0,
                  desconto_perc: 0,
                  acrescimo: 0,
                  acrescimo_perc: 0,
                  user: user || "default_user",
                };

                const res = await api.post("receber/baixar.php", payload);
                if (!res?.data?.sucesso) {
                  throw new Error(
                    String(res?.data?.mensagem || "Falha ao baixar conta."),
                  );
                }
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
            } catch (error: any) {
              Alert.alert(
                "Erro",
                error?.message || "Não foi possível concluir a baixa múltipla.",
              );
            } finally {
              setIsBaixandoSelecionados(false);
            }
          },
        },
      ],
    );
  }, [
    selectedContas,
    totalSelecionadoCorrigido,
    parseMoney,
    limparSelecaoMultipla,
    fetchData,
  ]);

  const onChange = async (event: any, selectedDate: any) => {
    if (event.type === "set") {
      const currentDate = selectedDate || date;
      setDate(currentDate);
    }
    if (Platform.OS === "android") {
      setShow(false);
    }
  };

  const showDatepicker = () => {
    setShow(true);
  };

  const onChange2 = async (event: any, selectedDate: any) => {
    if (event.type === "set") {
      const currentDate = selectedDate || date;
      setDate2(currentDate);
    }
    if (Platform.OS === "android") {
      setShow2(false);
    }
  };

  const showDatepicker1 = () => {
    setShow2(true);
  };

  async function loadData(id_reg: string) {
    try {
      setLoading(true);
      const res = await api.get(`receber/listar_id.php?id=${id_reg}`);
      setIdConta(id_reg);
      setValor(res.data.dados.valor);
      setForn(res.data.dados.fornF);
      setSaida(res.data.dados.saida);
      setDoc(res.data.dados.doc);
      setVenc(res.data.dados.vencF);
      setVencIso(String(res.data.dados.vencimento ?? ""));
      setEmissao(res.data.dados.emissao);
      setFreq(res.data.dados.freq);
      setArq(res.data.dados.arq);
      setUsu(res.data.dados.usu);
      setTumb(res.data.dados.tumb);
      setTel(res.data.dados.tel);
      setAbrirModal(true);
      setLoading(false);
    } catch (error) {
      console.log("Error ao carregar os Dados");
    }
  }

  async function modalParcelar(id_reg: string) {
    setIdConta(id_reg);
    try {
      const res = await api.get(`receber/listar_id.php?id=${id_reg}`);
      setValor(res.data.dados.valor);
      selectListaFreq();
      setAbrirModalParc(true);
    } catch (error) {
      console.log("Error ao carregar os Dados");
    }
  }

  async function gerarParcelas() {
    try {
      const obj = {
        id: idConta,
        parcelas: parcela,
        frequencia: frequencia,
      };

      const res = await api.post("receber/parcelar.php", obj);

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
      Alert.alert("Ops", "Alguma coisa deu errado, tente novamente.");
    }
  }

  async function excluir(nome: string, id: string) {
    const user = await AsyncStorage.getItem("@user");
    Alert.alert(
      "Sair",
      `Você tem certeza que deseja excluir a Conta de valor : ` + nome,
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim",
          onPress: async () => {
            try {
              const res = await api.get(
                `receber/excluir.php?id=${id}&user=${user}`,
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
              if (navigation.canGoBack && navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("Receber");
              }
            } catch (error) {
              Alert.alert("Não foi possivel excluir, tente novamente!");
            }
          },
        },
      ],
    );
  }

  async function enviarCobrancasAtrasadas() {
    try {
      // Se já existe fila preparada e ainda há mensagens pendentes,
      // apenas pergunta se deve enviar a próxima
      if (filaWhatsapp.length > 0 && indiceFila < filaWhatsapp.length) {
        const proximo = filaWhatsapp[indiceFila];

        Alert.alert(
          "Enviar próxima cobrança",
          `Enviar mensagem de cobrança para ${proximo.nome}?`,
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Enviar",
              onPress: async () => {
                try {
                  const url = `http://api.whatsapp.com/send?1=pt_BR&phone=55${
                    proximo.numero
                  }&text=${encodeURIComponent(proximo.mensagem)}`;
                  await Linking.openURL(url);

                  const novoIndice = indiceFila + 1;
                  if (novoIndice >= filaWhatsapp.length) {
                    Alert.alert(
                      "Fim",
                      "Todas as cobranças da fila foram abertas no WhatsApp.",
                    );
                    setFilaWhatsapp([]);
                    setIndiceFila(0);
                  } else {
                    setIndiceFila(novoIndice);
                  }
                } catch (e) {
                  Alert.alert(
                    "Erro",
                    "Não foi possível abrir a próxima cobrança no WhatsApp.",
                  );
                }
              },
            },
          ],
        );

        return;
      }

      if (!contas || contas.length === 0) {
        Alert.alert("Aviso", "Não há contas carregadas para enviar cobrança.");
        return;
      }

      const hoje = new Date();
      const hojeSemHora = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate(),
        0,
        0,
        0,
        0,
      );

      const contasVencidas = contas.filter((item: any) => {
        try {
          if (!item.vencimento) return false;
          const data = parseISO(String(item.vencimento));
          const dataSemHora = new Date(
            data.getFullYear(),
            data.getMonth(),
            data.getDate(),
            0,
            0,
            0,
            0,
          );
          return dataSemHora < hojeSemHora;
        } catch (e) {
          return false;
        }
      });

      if (contasVencidas.length === 0) {
        Alert.alert(
          "Aviso",
          "Não há contas vencidas para enviar cobrança nesse período.",
        );
        return;
      }

      Alert.alert(
        "Enviar cobranças",
        `Será enviada uma mensagem de cobrança via WhatsApp para ${contasVencidas.length} título(s) vencido(s). Deseja continuar?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Enviar",
            onPress: async () => {
              try {
                const agrupadoPorTelefone: {
                  [telefone: string]: {
                    nome: string;
                    titulos: {
                      id: string;
                      vencimento: string;
                      valor: string;
                    }[];
                  };
                } = {};

                // Primeiro, buscar os dados de cada título vencido e agrupar por telefone
                for (const conta of contasVencidas) {
                  try {
                    const res = await api.get(
                      `receber/listar_id.php?id=${conta.id}`,
                    );
                    const dados = res.data?.dados || {};
                    const telConta = dados.tel;
                    if (!telConta) {
                      continue;
                    }

                    const numeroLimpo = String(telConta).replace(/\D/g, "");
                    const nome = dados.fornF || conta.cliente || "Cliente";
                    const vencimentoFormatado =
                      dados.vencF ||
                      (conta.vencimento
                        ? format(parseISO(conta.vencimento), "dd/MM/yyyy")
                        : "");
                    const idTitulo = String(dados.id || conta.id || "");
                    const valorConta = String(dados.valor || conta.valor || "");

                    if (!agrupadoPorTelefone[numeroLimpo]) {
                      agrupadoPorTelefone[numeroLimpo] = {
                        nome,
                        titulos: [],
                      };
                    }

                    agrupadoPorTelefone[numeroLimpo].titulos.push({
                      id: idTitulo,
                      vencimento: vencimentoFormatado,
                      valor: valorConta,
                    });
                  } catch (error) {
                    console.error("Erro ao preparar cobrança:", error);
                  }
                }

                const telefones = Object.keys(agrupadoPorTelefone);
                if (telefones.length === 0) {
                  Alert.alert(
                    "Aviso",
                    "Não há títulos vencidos com telefone cadastrado para enviar cobrança.",
                  );
                  return;
                }

                // Monta fila de mensagens (uma por telefone)
                const novaFila = telefones.map((numero) => {
                  const grupo = agrupadoPorTelefone[numero];
                  const linhasTitulos = grupo.titulos
                    .map((t) => {
                      return `\nTítulo nº ${t.id} - Venc.: ${t.vencimento} - Valor: R$ ${t.valor}`;
                    })
                    .join("");

                  const mensagem = `Olá, ${grupo.nome}. Lembrete de cobrança referente aos seguintes títulos vencidos:${linhasTitulos}\nCaso já tenham sido liquidados, favor desconsiderar este aviso.`;

                  return {
                    numero,
                    nome: grupo.nome,
                    mensagem,
                  };
                });

                if (novaFila.length === 0) {
                  Alert.alert(
                    "Aviso",
                    "Não há títulos vencidos com telefone cadastrado para enviar cobrança.",
                  );
                  return;
                }

                setFilaWhatsapp(novaFila);
                setIndiceFila(0);

                const primeiro = novaFila[0];

                Alert.alert(
                  "Enviar cobranças",
                  `Foram encontrados ${novaFila.length} telefone(s) com títulos vencidos. Deseja abrir a primeira mensagem agora?`,
                  [
                    { text: "Agora não", style: "cancel" },
                    {
                      text: "Enviar primeira",
                      onPress: async () => {
                        try {
                          const url = `http://api.whatsapp.com/send?1=pt_BR&phone=55${
                            primeiro.numero
                          }&text=${encodeURIComponent(primeiro.mensagem)}`;
                          await Linking.openURL(url);

                          if (novaFila.length > 1) {
                            setIndiceFila(1);
                          } else {
                            setFilaWhatsapp([]);
                            setIndiceFila(0);
                          }
                        } catch (e) {
                          Alert.alert(
                            "Erro",
                            "Não foi possível abrir a cobrança no WhatsApp.",
                          );
                        }
                      },
                    },
                  ],
                );
              } catch (error) {
                console.error("Erro geral ao enviar cobranças:", error);
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Erro",
        "Não foi possível preparar o envio das cobranças. Tente novamente.",
      );
    }
  }

  const gerarRelatorioPDF = useCallback(async () => {
    try {
      const date1 = format(date, "yyyy-MM-dd");
      const dates2 = format(date2, "yyyy-MM-dd");
      const periodo = `${format(date, "dd/MM/yyyy")} até ${format(
        date2,
        "dd/MM/yyyy",
      )}`;

      let url = `receber/listar.php?data=${date1}&data1=${dates2}`;
      if (clienteFiltro) {
        url += `&busca=${encodeURIComponent(clienteFiltro)}`;
      }

      const response = await api.get(url);

      if (!response.data?.resultado?.length) {
        Alert.alert("Sem Dados", "Nenhum Registro Encontrado no Período!");
        return;
      }

      const tituloRelatorio = relatorioVencidosComJuros
        ? "Relatório de Vencidos com Multa e Juros"
        : "Relatório de Contas a Receber";

      const dadosRelatorio = response.data.resultado as ContaReceber[];

      const hoje = new Date();
      const hojeSemHora = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate(),
        0,
        0,
        0,
        0,
      );

      const parseMoney = (v: string) => {
        const raw = String(v ?? "0").trim();
        if (!raw) return 0;
        if (raw.includes(",") && raw.includes(".")) {
          return parseFloat(raw.replace(/\./g, "").replace(",", ".")) || 0;
        }
        if (raw.includes(",")) {
          return parseFloat(raw.replace(",", ".")) || 0;
        }
        return parseFloat(raw) || 0;
      };

      const formatMoney = (v: number) =>
        v.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

      const dadosRelatorioVencidos = dadosRelatorio
        .map((item) => {
          if (!item?.vencimento) return null;

          const dataVenc = parseISO(String(item.vencimento));
          if (isNaN(dataVenc.getTime())) return null;

          const dataVencSemHora = new Date(
            dataVenc.getFullYear(),
            dataVenc.getMonth(),
            dataVenc.getDate(),
            0,
            0,
            0,
            0,
          );

          if (dataVencSemHora >= hojeSemHora) return null;

          const valorOriginal = parseMoney(item.valor);

          const acrescimoValor = parseMoney(String(item.acrescimo ?? "0"));
          const acrescimoPerc = parseMoney(String(item.acrescimo_perc ?? "0"));
          const acrescimoPorcentagem = valorOriginal * (acrescimoPerc / 100);
          const acrescimoTotal = acrescimoValor + acrescimoPorcentagem;

          const descontoValor = parseMoney(String(item.desconto ?? "0"));
          const descontoPerc = parseMoney(String(item.desconto_perc ?? "0"));
          const descontoPorcentagem = valorOriginal * (descontoPerc / 100);
          const descontoTotal = descontoValor + descontoPorcentagem;

          const diasAtraso = Math.max(
            0,
            Math.floor(
              (hojeSemHora.getTime() - dataVencSemHora.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          );

          const multaBase = valorOriginal * 0.02;
          const multa = multaBase + acrescimoTotal;
          const juros = valorOriginal * 0.000334 * diasAtraso;
          const totalAtualizado = Math.max(
            0,
            valorOriginal + multa + juros - descontoTotal,
          );

          return {
            ...item,
            diasAtraso,
            valorOriginal,
            acrescimoTotal,
            descontoTotal,
            multa,
            juros,
            totalAtualizado,
          };
        })
        .filter(Boolean) as Array<
        ContaReceber & {
          diasAtraso: number;
          valorOriginal: number;
          acrescimoTotal: number;
          descontoTotal: number;
          multa: number;
          juros: number;
          totalAtualizado: number;
        }
      >;

      if (relatorioVencidosComJuros && dadosRelatorioVencidos.length === 0) {
        Alert.alert(
          "Sem Dados",
          "Não há contas vencidas para gerar relatório com multa e juros no período.",
        );
        return;
      }

      const totalGeral = relatorioVencidosComJuros
        ? dadosRelatorioVencidos.reduce(
            (acc, item) => acc + item.totalAtualizado,
            0,
          )
        : dadosRelatorio.reduce(
            (acc, item) => acc + (parseMoney(item.valor) || 0),
            0,
          );

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
                  <h1>${tituloRelatorio}</h1>
                </div>
              </div>
              <div class="info">
                <div>Período: ${periodo}</div>
                ${clienteFiltro ? `<div>Cliente: ${clienteFiltro}</div>` : ""}
                ${
                  relatorioVencidosComJuros
                    ? "<div>Filtro: Somente vencidos com multa e juros</div>"
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
                  <th>Cliente</th>
                  <th>Vencimento</th>
                  <th>Descrição</th>
                  ${
                    relatorioVencidosComJuros
                      ? "<th>Dias Atraso</th><th>Valor (R$)</th><th>Multa + Acrésc. (R$)</th><th>Juros (R$)</th><th>Desconto (R$)</th><th>Total (R$)</th>"
                      : "<th>Valor (R$)</th>"
                  }
                </tr>
              </thead>
              <tbody>
                ${(relatorioVencidosComJuros
                  ? dadosRelatorioVencidos
                  : dadosRelatorio
                )
                  .map((item: any) => {
                    const vencimento = item.vencimento
                      ? format(parseISO(item.vencimento), "dd/MM/yyyy")
                      : "N/A";
                    const cliente = item.cliente?.substring(0, 75) || "";
                    const descricao = item.descricao?.substring(0, 75) || "";

                    if (relatorioVencidosComJuros) {
                      return `
                    <tr>
                      <td>${cliente}</td>
                      <td>${vencimento}</td>
                      <td>${descricao}</td>
                      <td style="text-align:center;">${item.diasAtraso}</td>
                      <td style="text-align:right;">${formatMoney(item.valorOriginal)}</td>
                      <td style="text-align:right;">${formatMoney(item.multa)}</td>
                      <td style="text-align:right;">${formatMoney(item.juros)}</td>
                      <td style="text-align:right;">${formatMoney(item.descontoTotal)}</td>
                      <td style="text-align:right;">${formatMoney(item.totalAtualizado)}</td>
                    </tr>
                  `;
                    }

                    const valorNum = parseMoney(item.valor);
                    return `
                    <tr>
                      <td>${cliente}</td>
                      <td>${vencimento}</td>
                      <td>${descricao}</td>
                      <td style="text-align:right;">${formatMoney(valorNum)}</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
            <div class="total">
              Total Geral: R$ ${formatMoney(totalGeral)}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 612,
        height: 792,
        margins: { left: 20, top: 20, right: 20, bottom: 20 },
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `${tituloRelatorio} - ${periodo}`,
        });
      } else {
        await Print.printAsync({ uri });
      }

      Alert.alert("Sucesso", "Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      Alert.alert("Erro", "Falha ao gerar relatório");
    }
  }, [date, date2, clienteFiltro, relatorioVencidosComJuros]);

  const carregarDadosBeneficiario = useCallback(async () => {
    try {
      const res = await api.get("receber/dados_cobranca.php");
      const b = res?.data?.beneficiario;
      if (b) {
        setBeneficiario({
          nome: String(b?.nome ?? "Reforlimer reformas e construcoes"),
          documento: String(b?.documento ?? "CNPJ: INFORMAR"),
          endereco: String(b?.endereco ?? "Avenida Laranjeiras, n 701"),
          pixChave: String(b?.pixChave ?? "INFORMAR_CHAVE_PIX"),
          cidade: String(b?.cidade ?? "Limeira"),
        });
      }
    } catch (error) {
      console.log("Erro ao carregar beneficiario da cobranca:", error);
    }
  }, []);

  const gerarBoletoPixCobrancaPDF = useCallback(async () => {
    try {
      const selecionadas = Object.values(selectedContas);
      const idsSelecionados = selecionadas
        .map((conta) => String(conta.id || "").trim())
        .filter(Boolean);

      const idsParaGerar = idsSelecionados.length
        ? idsSelecionados
        : idConta
          ? [String(idConta)]
          : [];

      if (!idsParaGerar.length) {
        Alert.alert(
          "Atenção",
          "Selecione ao menos um título para gerar cobrança.",
        );
        return;
      }

      setIsGerandoPixSelecionados(true);

      const detalhesTitulos = await Promise.all(
        idsParaGerar.map(async (id) => {
          try {
            const res = await api.get(`receber/listar_id.php?id=${id}`);
            const dados = res?.data?.dados ?? {};

            return {
              id: String(dados?.id ?? id),
              cliente: String(dados?.fornF ?? dados?.cliente ?? ""),
              vencimento: String(dados?.vencimento ?? ""),
              vencF: String(dados?.vencF ?? ""),
              valor: String(dados?.valor ?? "0"),
              desconto: String(dados?.desconto ?? "0"),
              desconto_perc: String(dados?.desconto_perc ?? "0"),
              acrescimo: String(dados?.acrescimo ?? "0"),
              acrescimo_perc: String(dados?.acrescimo_perc ?? "0"),
              doc: String(dados?.doc ?? ""),
              tel: String(dados?.tel ?? ""),
            };
          } catch {
            const base = selecionadas.find((s) => String(s.id) === id);
            return {
              id,
              cliente: String(base?.cliente ?? forn ?? ""),
              vencimento: String(base?.vencimento ?? vencIso ?? ""),
              vencF: String(venc ?? ""),
              valor: String(base?.valor ?? valor ?? "0"),
              desconto: String(base?.desconto ?? "0"),
              desconto_perc: String(base?.desconto_perc ?? "0"),
              acrescimo: String(base?.acrescimo ?? "0"),
              acrescimo_perc: String(base?.acrescimo_perc ?? "0"),
              doc: String(doc ?? ""),
              tel: String(tel ?? ""),
            };
          }
        }),
      );

      const titulosCalculados = detalhesTitulos.map((item) => ({
        ...item,
        ...calcularValorTituloCorrigido(item),
      }));

      let totalCobrar = titulosCalculados.reduce(
        (acc, item) => acc + item.totalCobrar,
        0,
      );
      const valorBase = titulosCalculados.reduce(
        (acc, item) => acc + item.valorOriginal,
        0,
      );
      const multaExibirInicial = titulosCalculados.reduce(
        (acc, item) => acc + item.multa,
        0,
      );
      const jurosExibirInicial = titulosCalculados.reduce(
        (acc, item) => acc + item.juros,
        0,
      );
      const acrescimoExibir = titulosCalculados.reduce(
        (acc, item) => acc + item.acrescimoTotal,
        0,
      );
      const descontoExibir = titulosCalculados.reduce(
        (acc, item) => acc + item.descontoTotal,
        0,
      );
      const diasAtrasoExibirInicial = Math.max(
        0,
        ...titulosCalculados.map((item) => item.diasAtraso),
      );

      const idContaRef =
        titulosCalculados.length > 1
          ? `${titulosCalculados[0].id}-L${titulosCalculados.length}`
          : String(titulosCalculados[0]?.id ?? idConta);

      const normalizeDueDate = (vIso: string, vBr: string) => {
        if (vIso) {
          return String(vIso).substring(0, 10);
        }
        if (vBr && vBr.includes("/")) {
          const [d, m, a] = String(vBr).split("/");
          return `${a}-${m}-${d}`;
        }
        return format(new Date(), "yyyy-MM-dd");
      };

      let multaExibir = multaExibirInicial;
      let jurosExibir = jurosExibirInicial;
      let diasAtrasoExibir = diasAtrasoExibirInicial;

      const valorFmt = (n: number) =>
        n.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

      const onlyDigits = (s: string) => String(s ?? "").replace(/\D/g, "");
      const normalizeText = (s: string) =>
        String(s ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9 ]/g, "")
          .trim();
      const emv = (id: string, value: string) =>
        `${id}${String(value.length).padStart(2, "0")}${value}`;

      const crc16 = (payload: string) => {
        let crc = 0xffff;
        for (let i = 0; i < payload.length; i++) {
          crc ^= payload.charCodeAt(i) << 8;
          for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
              crc = (crc << 1) ^ 0x1021;
            } else {
              crc <<= 1;
            }
            crc &= 0xffff;
          }
        }
        return crc.toString(16).toUpperCase().padStart(4, "0");
      };

      const documentoDigits = onlyDigits(beneficiario.documento);
      const chavePixFinal =
        documentoDigits.length === 14 || documentoDigits.length === 11
          ? documentoDigits
          : String(beneficiario.pixChave ?? "").trim();

      const merchantName = normalizeText(beneficiario.nome || "Reforlimer")
        .toUpperCase()
        .substring(0, 25);
      // Cidade padrao da cobranca PIX
      const merchantCity = normalizeText(beneficiario.cidade || "Limeira")
        .toUpperCase()
        .substring(0, 15);
      const txid =
        normalizeText(`REFORLIMER${idContaRef}`)
          .replace(/ /g, "")
          .substring(0, 25) || "REFORLIMER";
      const amount = totalCobrar.toFixed(2);

      const merchantAccountInfo =
        emv("00", "br.gov.bcb.pix") + emv("01", chavePixFinal);

      const additionalDataField = emv("05", txid);

      let brCodePix = "";
      let qrCodeUrl = "";
      let origemCobranca = "LOCAL";

      try {
        const primeiroTitulo = titulosCalculados[0];
        const vencimentoYmd = normalizeDueDate(
          String(primeiroTitulo?.vencimento ?? vencIso ?? ""),
          String(primeiroTitulo?.vencF ?? venc ?? ""),
        );
        const pspRes = await api.post("receber/gerar_cobranca_pix.php", {
          idConta: idContaRef,
          valor: totalCobrar,
          vencimento: vencimentoYmd,
          pagadorNome:
            titulosCalculados.length > 1
              ? "Pagador diversos"
              : titulosCalculados[0]?.cliente || forn || "Consumidor Final",
          pagadorDocumento:
            titulosCalculados.length > 1
              ? ""
              : String(titulosCalculados[0]?.doc ?? doc ?? ""),
          descricao:
            titulosCalculados.length > 1
              ? `Cobranca ${titulosCalculados.length} titulos`
              : `Cobranca titulo ${idContaRef}`,
        });

        const pspOk = pspRes?.data?.success === true;
        const copiaECola = String(pspRes?.data?.pix?.copiaECola ?? "").trim();
        const qrImg = String(pspRes?.data?.pix?.qrCodeImage ?? "").trim();

        if (pspOk && copiaECola) {
          origemCobranca = "PSP";
          brCodePix = copiaECola;
          if (qrImg.startsWith("http") || qrImg.startsWith("data:image")) {
            qrCodeUrl = qrImg;
          } else if (qrImg) {
            qrCodeUrl = `data:image/png;base64,${qrImg}`;
          }
          totalCobrar =
            Number(pspRes?.data?.pix?.valor ?? totalCobrar) || totalCobrar;
          multaExibir =
            Number(pspRes?.data?.pix?.multaValor ?? multaExibir) || 0;
          jurosExibir =
            Number(pspRes?.data?.pix?.jurosValor ?? jurosExibir) || 0;
          diasAtrasoExibir =
            Number(pspRes?.data?.pix?.diasAtraso ?? diasAtrasoExibir) || 0;
        }
      } catch (e) {
        // segue para fallback local sem interromper o fluxo
      }

      if (!brCodePix) {
        const semCrc =
          "000201" +
          emv("26", merchantAccountInfo) +
          "52040000" +
          "5303986" +
          emv("54", amount) +
          "5802BR" +
          emv("59", merchantName) +
          emv("60", merchantCity) +
          emv("62", additionalDataField) +
          "6304";

        brCodePix = semCrc + crc16(semCrc);
      }

      if (!qrCodeUrl) {
        qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
          brCodePix,
        )}`;
      }

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #1f2937; }
              .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; }
              h1 { font-size: 18px; margin: 0 0 6px; color: #166534; }
              .sub { font-size: 12px; color: #475569; margin-bottom: 10px; }
              .sec { margin-top: 10px; }
              .ttl { font-size: 12px; font-weight: bold; color: #334155; margin-bottom: 3px; }
              .txt { font-size: 12px; line-height: 1.4; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #d1d5db; padding: 6px; font-size: 12px; }
              th { background: #f3f4f6; text-align: left; }
              .right { text-align: right; }
              .total { margin-top: 10px; font-size: 14px; font-weight: bold; }
              .pix { margin-top: 12px; background: #ecfdf5; border: 1px solid #86efac; padding: 8px; border-radius: 6px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Boleto de Cobranca com PIX</h1>
              <div class="sub">Titulo em aberto sem baixa</div>

              <div class="sec">
                <div class="ttl">Beneficiario</div>
                <div class="txt">${beneficiario.nome}</div>
                <div class="txt">${beneficiario.documento}</div>
                <div class="txt">${beneficiario.endereco}</div>
              </div>

              <div class="sec">
                <div class="ttl">Pagador</div>
                <div class="txt">${
                  titulosCalculados.length > 1
                    ? "Titulos selecionados (multiplos clientes)"
                    : titulosCalculados[0]?.cliente || forn || "Nao informado"
                }</div>
                <div class="txt">Telefone: ${
                  titulosCalculados.length > 1
                    ? "Nao aplicavel"
                    : titulosCalculados[0]?.tel || tel || "Nao informado"
                }</div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Titulo</th>
                    <th>Vencimento</th>
                    <th class="right">Valor Base (R$)</th>
                    <th class="right">Acrésc. (R$)</th>
                    <th class="right">Desc. (R$)</th>
                    <th class="right">Total Corrigido (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  ${titulosCalculados
                    .map(
                      (titulo) => `
                  <tr>
                    <td>${titulo.id}</td>
                    <td>${
                      titulo.vencF
                        ? titulo.vencF
                        : titulo.vencimento
                          ? format(
                              parseISO(String(titulo.vencimento)),
                              "dd/MM/yyyy",
                            )
                          : "-"
                    }</td>
                    <td class="right">${valorFmt(titulo.valorOriginal)}</td>
                    <td class="right">${valorFmt(titulo.acrescimoTotal)}</td>
                    <td class="right">${valorFmt(titulo.descontoTotal)}</td>
                    <td class="right">${valorFmt(titulo.totalCobrar)}</td>
                  </tr>
                  `,
                    )
                    .join("")}
                  <tr>
                    <td colspan="2">Multa por atraso (2%)</td>
                    <td class="right" colspan="4">${valorFmt(multaExibir)}</td>
                  </tr>
                  <tr>
                    <td colspan="2">Juros por atraso (0,0334% ao dia x ${diasAtrasoExibir} dia(s))</td>
                    <td class="right" colspan="4">${valorFmt(jurosExibir)}</td>
                  </tr>
                  <tr>
                    <td colspan="2">Acréscimo total aplicado</td>
                    <td class="right" colspan="4">${valorFmt(acrescimoExibir)}</td>
                  </tr>
                  <tr>
                    <td colspan="2">Desconto total aplicado</td>
                    <td class="right" colspan="4">${valorFmt(descontoExibir)}</td>
                  </tr>
                </tbody>
              </table>

              <div class="total">Total para pagamento: R$ ${valorFmt(totalCobrar)}</div>

              <div class="sub">Origem da cobranca PIX: ${origemCobranca}</div>

              <div class="pix">
                <div class="ttl">Pagamento via PIX</div>
                <div class="txt">Chave PIX: ${chavePixFinal}</div>
                <div class="txt">Cidade recebedor: ${merchantCity}</div>
                <div class="txt">TXID: ${txid}</div>
                <div class="txt" style="word-break: break-all;">Copia e cola: ${brCodePix}</div>
                <div style="margin-top:8px; text-align:center;">
                  <img src="${qrCodeUrl}" alt="QR Code PIX" style="width:180px;height:180px;" />
                </div>
              </div>

              <div class="sub" style="margin-top: 10px;">
                Emissao: ${format(new Date(), "dd/MM/yyyy 'as' HH:mm")}
              </div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html,
        width: 612,
        height: 792,
        margins: { left: 20, top: 20, right: 20, bottom: 20 },
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle:
            titulosCalculados.length > 1
              ? `Cobranca PIX - ${titulosCalculados.length} titulos`
              : `Cobranca PIX - Titulo ${idContaRef}`,
        });
      } else {
        await Print.printAsync({ uri });
      }

      if (idsSelecionados.length) {
        limparSelecaoMultipla();
      }
    } catch (error) {
      console.log("Erro ao gerar boleto PIX:", error);
      Alert.alert("Erro", "Nao foi possivel gerar o PDF de cobranca.");
    } finally {
      setIsGerandoPixSelecionados(false);
    }
  }, [
    selectedContas,
    idConta,
    forn,
    vencIso,
    venc,
    valor,
    doc,
    tel,
    beneficiario,
    calcularValorTituloCorrigido,
    limparSelecaoMultipla,
  ]);

  // Header com campo de filtro (sem memo)
  const Headers: React.FC = () => {
    return (
      <View style={{ marginBottom: 10 }}>
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
  };

  const renderItem = ({ item }: any) => {
    const valor = String(item.valor).replace(".", ",");
    const data = parseISO(item.vencimento) || item.vencimento;
    const vencimento = format(data, "dd/MM/yyyy");
    const isSelecionada = !!selectedContas[item.id];

    return (
      <View
        style={
          item.status == "Pendente"
            ? styles.CardContainerVerde
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
          disabled={multiSelectMode}
          onPressWhatsapp={async () => {
            navigation.push("BaixarReceber", {
              id_reg: item.id,
              valor_conta: item.valor,
              multa: item.multa,
              juros: item.juros,
              devolucao: item.devolucao,
              desconto: item.desconto,
              desconto_perc: item.desconto_perc,
              acrescimo: item.acrescimo,
              acrescimo_perc: item.acrescimo_perc,
            });
          }}
          onPressEdit={async () => {
            navigation.navigate("NovaContaReceber", { id_reg: item.id });
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
            <Text style={styles.Cliente}>{item.cliente}</Text>
            <Text style={styles.Valor}>
              R$ {valor}{" "}
              <Text style={styles.ValorRes}>{item.valor_antigo}</Text>
            </Text>

            <View style={styles.Section}>
              <MaterialIcons
                style={styles.Icon}
                name="attach-money"
                size={22}
                color="#c1c1c1"
              />
              <Text style={styles.Entrada}>{item.saida}</Text>

              {item.arquivo && item.arquivo !== "sem-foto.jpg" && item.tumb ? (
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
                <Text style={{ color: "gray" }}>{item.frequencia}</Text>
              </Text>
            </View>
          </TouchableOpacity>
        </SwipeableRow>
      </View>
    );
  };

  const isEmpty = () => (
    <View
      style={{ justifyContent: "center", alignItems: "center", marginTop: 20 }}
    >
      <Text style={{ fontFamily: fonts.text, fontSize: 16 }}>
        Não tem nenhuma conta para este dia.
      </Text>
    </View>
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    carregarDadosBeneficiario();
  }, [carregarDadosBeneficiario]);

  // Atualiza a listagem sempre que voltar para esta tela (ex.: após baixa)
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (route?.params?.modo === "vencidas") {
        setDate(sub(new Date(), { years: 1 }));
        setDate2(sub(new Date(), { days: 1 }));
        return;
      }
      fetchData();
    });
    return unsubscribe;
  }, [navigation, fetchData, route?.params?.modo]);

  // campo de filtro fixo (igual ao padrão de Pagar)
  const onPressFiltrarVisivel = async () => {
    const valor = String(searchLocal ?? "").trim();

    // Sem texto: recarrega normalmente
    if (!valor) {
      setClienteFiltro("");
      await fetchData("");
      Keyboard.dismiss();
      return;
    }

    // Com texto: aplica mesmo critério de Pagar (cliente/descrição/local)
    setClienteFiltro(valor);
    const term = valor.toLowerCase();

    // 1) Busca remota pelo cliente (como hoje)
    const lista = await fetchData(valor);

    // 2) Filtro local complementar, igual ao Contas a Pagar
    const filtrado = (lista || []).filter((it: any) => {
      const nome = String(it?.cliente ?? it?.nome ?? "").toLowerCase();
      const descricao = String(it?.descricao ?? "").toLowerCase();
      const local = String(it?.local ?? "").toLowerCase();
      return (
        nome.includes(term) || descricao.includes(term) || local.includes(term)
      );
    });

    setContas(filtrado);
    Keyboard.dismiss();
  };

  useEffect(() => {
    if (!didInitAutoSearchRef.current) {
      didInitAutoSearchRef.current = true;
      lastAutoSearchRef.current = String(searchLocal ?? "").trim();
      return;
    }

    const termo = String(searchLocal ?? "").trim();

    if (termo === lastAutoSearchRef.current) return;

    const timer = setTimeout(() => {
      if (termo.length === 0 || termo.length >= MIN_SEARCH_LENGTH) {
        lastAutoSearchRef.current = termo;
        onPressFiltrarVisivel();
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchLocal]);

  if (loading === true) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <ActivityIndicator
          style={{ marginTop: 100 }}
          color="#000"
          size="large"
        />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#f2f2f2",
        marginTop: 50,
        padding: 10,
      }}
    >
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

      <Header
        onBackPress={() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Home", params: { screen: "Inicio" } }],
            }),
          );
        }}
      />

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
            style={[styles.printButton, { marginLeft: 8 }]}
            onPress={enviarCobrancasAtrasadas}
          >
            <Ionicons name="logo-whatsapp" size={24} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.printButton,
              {
                marginLeft: 8,
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
            Contas a Receber
          </Text>
        </View>

        <TouchableOpacity
          style={styles.checkboxRelatorioRow}
          onPress={() =>
            setRelatorioVencidosComJuros((valorAtual) => !valorAtual)
          }
        >
          <MaterialIcons
            name={
              relatorioVencidosComJuros
                ? "check-box"
                : "check-box-outline-blank"
            }
            size={22}
            color={relatorioVencidosComJuros ? "#2e7d32" : "#666"}
          />
          <Text style={styles.checkboxRelatorioText}>
            Relatório: listar somente vencidos com multa e juros
          </Text>
        </TouchableOpacity>
      </View>

      {/* Campo de filtro fixo e funcional */}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <TextInput
          style={[styles.TextInput, { flex: 1, height: 40 }]}
          placeholder="Filtrar cliente/descricao/local"
          value={searchLocal}
          onChangeText={setSearchLocal}
          returnKeyType="search"
          onSubmitEditing={onPressFiltrarVisivel}
        />
        <RectButton
          style={[
            styles.ButtonDates,
            { marginLeft: 8, height: 40, justifyContent: "center" },
          ]}
          onPress={onPressFiltrarVisivel}
        >
          <Text style={styles.ButtonDatesText}>Filtrar</Text>
        </RectButton>
      </View>

      {isLoading ? (
        <Load />
      ) : (
        <FlatList
          data={contas}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={Headers}
          initialNumToRender={5}
          ListEmptyComponent={isEmpty}
        />
      )}

      {multiSelectMode && (
        <View style={styles.multiSelectBar}>
          <Text style={styles.multiSelectText}>
            {Object.keys(selectedContas).length} selecionada(s) - Total
            corrigido R${" "}
            {totalSelecionadoCorrigido.toFixed(2).replace(".", ",")}
          </Text>
          <View style={styles.multiSelectActions}>
            <TouchableOpacity
              style={[
                styles.multiSelectButton,
                {
                  backgroundColor: allContasSelecionadas
                    ? "#6b7280"
                    : "#2563eb",
                  opacity:
                    isBaixandoSelecionados || isGerandoPixSelecionados
                      ? 0.55
                      : 1,
                },
              ]}
              onPress={handleSelecionarTodos}
              disabled={isBaixandoSelecionados || isGerandoPixSelecionados}
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
                    isBaixandoSelecionados ||
                    isGerandoPixSelecionados ||
                    !Object.keys(selectedContas).length
                      ? 0.55
                      : 1,
                },
              ]}
              onPress={handleBaixarSelecionados}
              disabled={
                isBaixandoSelecionados ||
                isGerandoPixSelecionados ||
                !Object.keys(selectedContas).length
              }
            >
              <Text style={styles.multiSelectButtonText}>
                {isBaixandoSelecionados ? "Baixando..." : "Baixar"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.multiSelectButton,
                {
                  backgroundColor: "#0891b2",
                  opacity:
                    isGerandoPixSelecionados ||
                    isBaixandoSelecionados ||
                    !Object.keys(selectedContas).length
                      ? 0.55
                      : 1,
                },
              ]}
              onPress={gerarBoletoPixCobrancaPDF}
              disabled={
                isGerandoPixSelecionados ||
                isBaixandoSelecionados ||
                !Object.keys(selectedContas).length
              }
            >
              <Text style={styles.multiSelectButtonText}>
                {isGerandoPixSelecionados ? "Gerando..." : "Gerar PIX"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View
        style={[
          styles.containerFloat,
          multiSelectMode ? { bottom: 118 } : null,
        ]}
      >
        <TouchableOpacity
          style={styles.CartButton}
          onPress={() =>
            navigation.navigate("NovaContaReceber", { id_reg: "0" })
          }
        >
          <Ionicons name="add-outline" size={35} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={abrirModal}
        animationType={"fade"}
        transparent={true}
        onRequestClose={() => setAbrirModal(!abrirModal)}
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

              {tel ? (
                <TouchableOpacity
                  style={styles.Vencimento2}
                  onPress={async () => {
                    const numeroLimpo = tel.replace(/\D/g, "");
                    const mensagem = `Olá, ${forn}. Lembrete de cobrança referente ao título número ${idConta}, com vencimento em ${venc}, no valor de R$ ${valor}. Caso já tenha sido liquidado, favor desconsiderar este aviso.`;
                    await Linking.openURL(
                      `http://api.whatsapp.com/send?1=pt_BR&phone=55${numeroLimpo}&text=${encodeURIComponent(
                        mensagem,
                      )}`,
                    );
                  }}
                >
                  <Image
                    style={{ width: 30, height: 30 }}
                    source={require("../../assets/whats.png")}
                  />
                </TouchableOpacity>
              ) : null}
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

            <TouchableOpacity
              onPress={() => Linking.openURL(urlImgContas + "contas/" + arq)}
            >
              {tumb && tumb !== "sem-foto.jpg" ? (
                tumb == "pdf.png" ? (
                  <View style={styles.viewImg}>
                    <Image
                      style={styles.ImagemModal}
                      source={require("../../assets/pdf.png")}
                    />
                    <Text style={styles.textoAbrir}>(Clique para Abrir)</Text>
                  </View>
                ) : tumb == "rar.png" ? (
                  <View style={styles.viewImg}>
                    <Image
                      style={styles.ImagemModal}
                      source={require("../../assets/rar.png")}
                    />
                    <Text style={styles.textoAbrir}>(Clique para Abrir)</Text>
                  </View>
                ) : (
                  <View style={styles.viewImg}>
                    <Image
                      style={styles.ImagemModal}
                      source={{ uri: urlImgContas + "contas/" + tumb }}
                    />
                    <Text style={styles.textoAbrir}>(Clique para Abrir)</Text>
                  </View>
                )
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.Button, { marginTop: 10, width: "90%" }]}
              onPress={gerarBoletoPixCobrancaPDF}
            >
              <Text style={styles.ButtonText}>Gerar Boleto PIX (PDF)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={abrirModalParc}
        animationType={"fade"}
        transparent={true}
        onRequestClose={() => setAbrirModalParc(!abrirModalParc)}
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
                placeholder="Número de Parcelas "
                onChangeText={(text) => setParcela(text)}
                value={parcela}
                style={styles.TextInput}
                keyboardType="numeric"
              />
            </View>

            <SelectField
              label="Frequência"
              selectedValue={String(frequencia)}
              onChange={(value) => setFrequencia(String(value))}
              options={lista_freq.map((item: any) => ({
                label: String(item?.nome ?? ""),
                value: String(item?.nome ?? ""),
              }))}
              labelStyle={styles.TitleInputs}
              containerStyle={styles.TextInput}
            />

            <TouchableOpacity
              style={styles.Button}
              onPress={() => gerarParcelas()}
            >
              <Text style={styles.ButtonText}>Parcelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default Receber;
