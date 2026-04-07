import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Platform,
  Modal,
  Image,
} from "react-native";
import { styles } from "./style";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  useNavigation,
  DrawerActions,
  CommonActions,
} from "@react-navigation/native";
import { format, sub, isValid } from "date-fns";
import api from "../../services/api";
import Header from "../../components/Header";
import DateTimePicker from "@react-native-community/datetimepicker";
import { RectButton } from "react-native-gesture-handler";
import { showMessage } from "react-native-flash-message";
import * as SplashScreen from "expo-splash-screen";
import Card from "../../components/CardMovimentacoes";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const logoUri = Image.resolveAssetSource(require("../../assets/logo2.png")).uri;

// Interfaces
interface MovimentoItem {
  id: string;
  data: string;
  descricao: string;
  movimento: string;
  valor: string;
  valor_baixa: number;
  saldo_geral: string;
  classe: string;
  plano_conta: string;
  tipo: string;
  empresa?: string;
  fornecedor?: string;
  usuario?: string;
  documento?: string;
  // Adicionando propriedades esperadas pelo CardMovimentacoes
  classe_saldo?: string;
  classe_valor?: string;
  classe_periodo?: string;
  saldo_periodo?: string;
  valor_periodo?: string;
  categoria?: string;
  centro_custo?: string;
  observacao?: string;
  imagem_url?: string;
  status?: string;
  data_baixa?: string;
  data_vencimento?: string;
  data_emissao?: string;
  conta_bancaria?: string;
  tipo_documento?: string;
  numero_documento?: string;
  [key: string]: any;
}

interface Lancamento {
  id: string;
  nome: string;
}

// Componente principal
const Movimento: React.FC = () => {
  const navigation: any = useNavigation();

  // Estados
  const [lista, setLista] = useState<MovimentoItem[]>([]);
  const [lista_lanc, setListaLanc] = useState<Lancamento[]>([]);
  const [lanc, setLanc] = useState<string>("Caixa");
  const [total, setTotal] = useState<string>("0,00");
  const [corTotal, setCorTotal] = useState<string>("#000000");
  const [saldoNumerico, setSaldoNumerico] = useState<number>(0);
  const [date, setDate] = useState<Date>(new Date());
  const [date2, setDate2] = useState<Date>(new Date());
  const [show, setShow] = useState<boolean>(false);
  const [show2, setShow2] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredLista, setFilteredLista] = useState<MovimentoItem[]>([]);
  const [includeContas, setIncludeContas] = useState<boolean>(false);
  const [relatorioTitulosPendentes, setRelatorioTitulosPendentes] =
    useState<boolean>(false);

  // Efeito inicial
  useEffect(() => {
    const prepare = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
        await Promise.all([fetchData(), selectListaLanc()]);
      } catch (e) {
        console.warn("Erro no prepare:", e);
        showMessage({
          message: "Erro",
          description: "Falha ao carregar dados iniciais",
          type: "danger",
        });
      } finally {
        setTimeout(async () => {
          await SplashScreen.hideAsync();
        }, 1000);
      }
    };
    prepare();
  }, []);

  // Função robusta para converter valores monetários
  const converterValor = (valorString: string | number): number => {
    if (!valorString) return 0;

    try {
      // Se já for número, confia nele (evita aplicar heurísticas duas vezes)
      if (typeof valorString === "number") {
        const n = Number(valorString);
        return isNaN(n) ? 0 : n;
      }

      const strValor = valorString.toString().trim();
      // Verificar se é negativo
      const isNegative = strValor.includes("(") || strValor.startsWith("-");

      // Remover caracteres não numéricos exceto vírgula, ponto e sinal
      const valorLimpo = strValor.replace(/[^\d,.-]/g, "");

      const temVirgula = valorLimpo.includes(",");
      const temPonto = valorLimpo.includes(".");
      const somenteDigitosESinal = valorLimpo.replace(/[^\d-]/g, "");

      // Heurística: alguns endpoints retornam valores em centavos, ex: "115000" = 1.150,00
      if (!temVirgula && !temPonto && /^-?\d{4,}$/.test(somenteDigitosESinal)) {
        const centavos = parseInt(somenteDigitosESinal, 10);
        if (isNaN(centavos)) return 0;
        const valorNumerico = centavos / 100;
        return isNegative ? -Math.abs(valorNumerico) : Math.abs(valorNumerico);
      }

      // Caso estilo EUA: apenas ponto como separador decimal ("6690.50")
      if (temPonto && !temVirgula) {
        const n = parseFloat(valorLimpo);
        if (isNaN(n)) return 0;
        return isNegative ? -Math.abs(n) : Math.abs(n);
      }

      // Formato brasileiro: vírgula como decimal e ponto (opcional) como milhar
      const partes = valorLimpo.split(",");
      let parteInteira = partes[0].replace(/\./g, "");
      const parteDecimal = partes[1] || "00";

      const numeroStr = `${parteInteira}.${parteDecimal.substring(0, 2)}`;
      const valorNumerico = parseFloat(numeroStr);

      return isNaN(valorNumerico)
        ? 0
        : isNegative
          ? -Math.abs(valorNumerico)
          : Math.abs(valorNumerico);
    } catch (error) {
      console.error("Erro ao converter valor:", valorString, error);
      return 0;
    }
  };

  // Determinar tipo baseado em múltiplos critérios
  const determinarTipoMovimento = (item: any): string => {
    const movimento = (item.movimento || item.lancamento || "").toLowerCase();
    const descricao = (item.descricao || "").toLowerCase();
    const valor = converterValor(item.valor);

    // Critérios para SAÍDA
    const criteriosSaida = [
      movimento.includes("pagamento") || movimento.includes("pagto"),
      movimento.includes("compra") || movimento.includes("despesa"),
      movimento.includes("debito") || movimento.includes("débito"),
      movimento.includes("retirada") || movimento.includes("saque"),
      movimento.includes("transferencia") ||
        movimento.includes("transferência"),
      movimento.includes("pago") || movimento.includes("boleto"),
      movimento.includes("imposto") || movimento.includes("taxa"),
      movimento.includes("aluguel") || movimento.includes("conta"),
      movimento.includes("fornecedor") || movimento.includes("salario"),
      movimento.includes("salário") || movimento.includes("investimento"),
      movimento.includes("aplicacao") || movimento.includes("aplicação"),
      movimento.includes("saída") || movimento.includes("saida"),
      movimento.includes("gasto") || movimento.includes("desembolso"),
      movimento.includes("desconto") || movimento.includes("juros"),

      descricao.includes("pagamento") || descricao.includes("pagto"),
      descricao.includes("compra") || descricao.includes("despesa"),
      descricao.includes("debito") || descricao.includes("débito"),
      descricao.includes("retirada") || descricao.includes("saque"),

      valor < 0,
    ];

    // Critérios para ENTRADA
    const criteriosEntrada = [
      movimento.includes("recebimento") || movimento.includes("receb"),
      movimento.includes("venda") || movimento.includes("receita"),
      movimento.includes("credito") || movimento.includes("crédito"),
      movimento.includes("deposito") || movimento.includes("depósito"),
      movimento.includes("entrada") || movimento.includes("rendimento"),
      movimento.includes("reembolso") || movimento.includes("clientes"),
      movimento.includes("cliente") || movimento.includes("adiantamento"),
      movimento.includes("emprestimo") || movimento.includes("empréstimo"),
      movimento.includes("acrescimo") || movimento.includes("acréscimo"),

      descricao.includes("recebimento") || descricao.includes("receb"),
      descricao.includes("venda") || descricao.includes("receita"),
      descricao.includes("credito") || descricao.includes("crédito"),
      descricao.includes("deposito") || descricao.includes("depósito"),

      valor > 0,
    ];

    const pontosSaida = criteriosSaida.filter(Boolean).length;
    const pontosEntrada = criteriosEntrada.filter(Boolean).length;

    return pontosSaida >= pontosEntrada ? "saida" : "entrada";
  };

  // Calcular saldo automático baseado na lista
  const calcularSaldoAutomatico = (movimentos: MovimentoItem[]): number => {
    return movimentos.reduce((saldo, item) => {
      // Usar sempre o valor numérico interno quando disponível para evitar erros de casas decimais
      const valorBase =
        typeof item.valor_baixa === "number"
          ? item.valor_baixa
          : converterValor(item.valor);
      const valor = isNaN(valorBase) ? 0 : valorBase;
      const valorAbsoluto = Math.abs(valor);

      if (item.tipo === "entrada") {
        return saldo + valorAbsoluto;
      } else if (item.tipo === "saida") {
        return saldo - valorAbsoluto;
      }
      return saldo;
    }, 0);
  };

  // Filtrar lista e atualizar totais SEMPRE com base no que está visível
  useEffect(() => {
    const q = (searchQuery || "").trim().toLowerCase();

    let base: MovimentoItem[];
    if (!q) {
      base = lista;
    } else {
      base = lista.filter((item) => {
        const campos = [
          item.cliente,
          item.fornecedor,
          item.descricao,
          item.local,
          item.empresa,
          item.usuario,
          item.plano_conta,
          item.categoria,
          item.cat_despesa,
          item.fornecedor_cliente,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return campos.includes(q);
      });
    }

    // calcula saldo ACUMULADO apenas com base no que está visível
    if (base.length > 0) {
      let saldoAcumulado = 0;

      const baseComSaldo = base.map((item) => {
        const valorBase =
          typeof item.valor_baixa === "number"
            ? item.valor_baixa
            : converterValor(item.valor);
        const valor = isNaN(valorBase) ? 0 : valorBase;
        const valorAbsoluto = Math.abs(valor);

        if (item.tipo === "entrada") {
          saldoAcumulado += valorAbsoluto;
        } else if (item.tipo === "saida") {
          saldoAcumulado -= valorAbsoluto;
        }

        const saldoFormatadoLinha = formatarValor(Math.abs(saldoAcumulado));
        const classeLinha = saldoAcumulado >= 0 ? "#006400" : "#8B0000";

        return {
          ...item,
          saldo_periodo: saldoFormatadoLinha,
          classe_periodo: classeLinha,
        };
      });

      // saldo final (para o cabeçalho) é o saldo da última linha
      const saldoFinal = saldoAcumulado;
      const saldoFinalFormatado = formatarValor(Math.abs(saldoFinal));
      const classeFinal = saldoFinal >= 0 ? "#006400" : "#8B0000";

      setFilteredLista(baseComSaldo);
      setTotal(saldoFinalFormatado);
      setCorTotal(classeFinal);
      setSaldoNumerico(saldoFinal);
    } else {
      setFilteredLista([]);
      setTotal("0,00");
      setCorTotal("#000000");
      setSaldoNumerico(0);
    }
  }, [lista, searchQuery]);

  // Processar dados da API
  const processApiData = (apiData: any[]): MovimentoItem[] => {
    if (!apiData || !Array.isArray(apiData)) return [];

    return apiData.map((item, index) => {
      const valorNumerico = converterValor(item.valor);

      // Respeitar o tipo já definido (entrada/saida) quando vier da API/mapeamentos auxiliares
      const tipoNormalizado = (item.tipo || "").toString().toLowerCase().trim();
      const tipo =
        tipoNormalizado === "entrada" || tipoNormalizado === "saida"
          ? tipoNormalizado
          : determinarTipoMovimento(item);

      // Normalizar valor para string sempre no formato brasileiro (corrige casos 115000 -> 1.150,00)
      const valorFormatadoStr = formatarValor(Math.abs(valorNumerico));

      // Tentar extrair o nome completo do cliente/fornecedor a partir de vários campos possíveis
      const parceiroNome =
        (item.cliente_full && String(item.cliente_full).trim()) ||
        (item.cliente_nome && String(item.cliente_nome).trim()) ||
        (item.nome && String(item.nome).trim()) ||
        (item.nome_cliente && String(item.nome_cliente).trim()) ||
        (item.cliente && String(item.cliente).trim()) ||
        (item.fornecedor_nome && String(item.fornecedor_nome).trim()) ||
        (item.nome_fornecedor && String(item.nome_fornecedor).trim()) ||
        (item.fornecedor && String(item.fornecedor).trim()) ||
        (item.empresa && String(item.empresa).trim()) ||
        "";

      return {
        id: item.id?.toString() || `item-${index}-${Date.now()}`,
        data: item.data || "",
        descricao: item.descricao || "Sem descrição",
        movimento: item.movimento || item.lancamento || "Desconhecido",
        // guardar o valor já formatado para exibição em cartões e listas
        valor: valorFormatadoStr,
        // normalizar sempre o valor numérico interno a partir da string tratada,
        // ignorando possíveis campos em centavos vindos da API
        valor_baixa: valorNumerico,
        saldo_geral: item.saldo_geral || "0",
        classe: item.classe || "",
        plano_conta: item.plano_conta || "Outras",
        lancamento: item.lancamento || item.movimento || "Desconhecido",
        tipo: tipo,
        empresa: item.empresa || "",
        usuario: item.usuario || "",
        parceiro: parceiroNome,
        // garantir que campos de cliente/fornecedor mais específicos estejam presentes
        cliente:
          item.cliente ||
          item.cliente_nome ||
          item.nome ||
          item.nome_cliente ||
          item.cliente_full ||
          undefined,
        fornecedor:
          item.fornecedor ||
          item.fornecedor_nome ||
          item.nome_fornecedor ||
          undefined,
        documento: item.documento || "",
        ...item,
      };
    });
  };

  // Buscar dados
  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Para a tela de Movimentações, sempre respeitar o período
      // selecionado (DE / ATÉ) e o tipo de lançamento.
      const dateStartFull = format(date, "yyyy-MM-dd");
      const dateEndFull = format(date2, "yyyy-MM-dd");

      // helper: normaliza resultado de mov/listar.php
      const normalizeResultado = (data: any) => {
        if (!data) return [];
        const r = data.resultado ?? data;
        if (r === 0 || r === "0" || r === false) return [];
        if (Array.isArray(r)) return r;
        if (typeof r === "object") return Object.values(r);
        return [];
      };

      const resp = await api.get(
        `mov/listar.php?data=${encodeURIComponent(
          dateStartFull,
        )}&data1=${encodeURIComponent(dateEndFull)}&lanc=${encodeURIComponent(
          lanc,
        )}`,
      );
      let resultsA = normalizeResultado(resp.data);
      console.log("fetchData resultsA normalized:", resultsA.length);

      let finalResults = resultsA.slice();

      // fallback sem lanc se não retornou nada
      if (finalResults.length === 0) {
        try {
          const respB = await api.get(
            `mov/listar.php?data=${encodeURIComponent(
              dateStartFull,
            )}&data1=${encodeURIComponent(dateEndFull)}`,
          );
          const resultsB = normalizeResultado(respB.data);
          const map = new Map<string, any>();
          resultsA.forEach((it: any) => map.set(String(it.id), it));
          resultsB.forEach((it: any) => map.set(String(it.id), it));
          finalResults = Array.from(map.values());
          console.log("fetchData merged final length:", finalResults.length);
        } catch (err) {
          console.warn("fetchData fallback sem lanc falhou:", err);
        }
      }

      // --- buscar vendas concluídas e com vencimento OU data de lançamento igual à data selecionada ---
      try {
        const vendasResp = await api.get(
          `vendas/listar.php?data=${encodeURIComponent(
            dateStartFull,
          )}&data1=${encodeURIComponent(dateEndFull)}&status=Concluida`,
        );
        const vendasRaw = vendasResp?.data ?? null;
        console.log("fetchData vendasResp.raw:", vendasRaw);
        const vendasArr =
          vendasRaw && Array.isArray(vendasRaw.resultado)
            ? vendasRaw.resultado
            : Array.isArray(vendasRaw)
              ? vendasRaw
              : [];

        const parseAnyDate = (s: any) => {
          if (!s) return null;
          const str = String(s).trim();
          const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/); // dd/MM/yyyy
          if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
          const iso = str.match(/^(\d{4}-\d{2}-\d{2})/); // yyyy-MM-dd
          if (iso) return new Date(iso[1]);
          const d = new Date(str);
          return isNaN(d.getTime()) ? null : d;
        };

        const isSameDay = (a: Date, b: Date) =>
          a.getFullYear() === b.getFullYear() &&
          a.getMonth() === b.getMonth() &&
          a.getDate() === b.getDate();

        // usar data selecionada (date) como referência
        const selectedDay = new Date(format(date, "yyyy-MM-dd") + "T00:00:00");

        const vendasFiltradas = vendasArr.filter((v: any) => {
          const status = String(
            (v.status ?? v.situacao ?? v.estado ?? "").toString(),
          ).toLowerCase();
          if (!status) return false;
          if (status.includes("cancel")) return false;
          if (!status.includes("conclu")) return false;

          // verificar data de vencimento e data de lançamento (aceita qualquer um dos dois)
          const venc =
            v.data_vencimento ?? v.vencimento ?? v.data_venc ?? v.data ?? "";
          const lanc =
            v.data_lancamento ?? v.data_lanc ?? v.data_emissao ?? v.data ?? "";

          const vencDate = parseAnyDate(venc);
          const lancDate = parseAnyDate(lanc);

          // considerar todo o intervalo [date, date2]
          const inicio = new Date(format(date, "yyyy-MM-dd") + "T00:00:00");
          const fim = new Date(format(date2, "yyyy-MM-dd") + "T23:59:59");

          const inRange = (d: Date | null) =>
            d
              ? d.getTime() >= inicio.getTime() && d.getTime() <= fim.getTime()
              : false;

          const matchVenc = inRange(vencDate);
          const matchLanc = inRange(lancDate);

          return matchVenc || matchLanc;
        });

        if (vendasFiltradas.length > 0) {
          const vendasMapped = vendasFiltradas.map((v: any) => {
            const vid = String(v.id ?? v.id_venda ?? v.codigo ?? Math.random());
            // exibir preferencialmente a data de lançamento, senão a de vencimento
            const dataField =
              v.data_lancamento ||
              v.data_lanc ||
              v.data_emissao ||
              v.data_vencimento ||
              v.data_baixa ||
              v.data ||
              "";
            const cliente =
              v.cliente || v.nome || v.destinatario || v.cliente_nome || "";
            const valor = v.total ?? v.valor_total ?? v.valor ?? "0";
            return {
              id: `venda-${vid}`,
              data: dataField, // exibir data de lançamento quando disponível
              data_lancamento: v.data_lancamento || v.data_lanc || null,
              descricao: `Venda - ${cliente}`.trim(),
              movimento: "Venda",
              valor: valor,
              plano_conta: "Venda",
              lancamento: "Venda",
              origem: "venda",
              raw: v,
              cliente: cliente,
              parceiro: cliente,
            };
          });

          const map2 = new Map<string, any>();
          finalResults.forEach((it: any) => map2.set(String(it.id), it));
          vendasMapped.forEach((it: any) => map2.set(String(it.id), it));
          finalResults = Array.from(map2.values());
          // ordenar por data (mais recente primeiro)
          finalResults.sort((a: any, b: any) => {
            const da =
              new Date(
                a.data || a.data_lancamento || a.data_vencimento || 0,
              ).getTime() || 0;
            const db =
              new Date(
                b.data || b.data_lancamento || b.data_vencimento || 0,
              ).getTime() || 0;
            return (
              db - da ||
              Number(b.id?.toString().replace(/\D/g, "")) -
                Number(a.id?.toString().replace(/\D/g, ""))
            );
          });
          console.log(
            "fetchData after merging vendas length:",
            finalResults.length,
          );
        } else {
          console.log(
            "fetchData: nenhuma venda concluída com vencimento na data selecionada",
          );
        }
      } catch (err) {
        console.warn("fetchData: erro ao buscar vendas concluídas:", err);
      }

      // incluir opcionalmente Contas a Receber e a Pagar dentro do mesmo período
      if (includeContas) {
        try {
          // Contas a Receber (entradas futuras no período)
          const recResp = await api.get(
            `receber/listar.php?data=${encodeURIComponent(
              dateStartFull,
            )}&data1=${encodeURIComponent(dateEndFull)}`,
          );
          const recRaw = recResp?.data?.resultado ?? recResp?.data ?? [];
          const recArr = Array.isArray(recRaw) ? recRaw : [];

          const recMapped = recArr.map((r: any, idx: number) => {
            const idBase = r.id ?? r.id_conta ?? idx;
            const dataCampo =
              r.vencimento || r.vencF || r.vencimentoF || r.data || "";
            const cliente =
              r.cliente || r.nome || r.nome_cliente || r.fornF || "";
            const valor = r.valor ?? "0";

            return {
              id: `receber-${String(idBase)}`,
              data: dataCampo,
              descricao: `Conta a Receber - ${String(cliente).trim()}`,
              movimento: "Conta a Receber",
              valor: valor,
              plano_conta: "Contas a Receber",
              lancamento: "Contas a Receber",
              origem: "receber",
              tipo: "entrada",
              cliente: cliente,
              parceiro: cliente,
              local: r.local || "",
            };
          });

          // Contas a Pagar (saídas futuras no período)
          const pagResp = await api.get(
            `pagar/listar.php?data=${encodeURIComponent(
              dateStartFull,
            )}&data1=${encodeURIComponent(dateEndFull)}`,
          );
          const pagRaw = pagResp?.data?.resultado ?? pagResp?.data ?? [];
          const pagArr = Array.isArray(pagRaw) ? pagRaw : [];

          const pagMapped = pagArr.map((p: any, idx: number) => {
            const idBase = p.id ?? p.id_conta ?? idx;
            const dataCampo = p.vencimento || p.vencF || p.data || "";
            const fornecedor =
              p.cliente || p.fornecedor || p.nome || p.fornF || "";
            const valor = p.valor ?? "0";

            return {
              id: `pagar-${String(idBase)}`,
              data: dataCampo,
              descricao: `Conta a Pagar - ${String(fornecedor).trim()}`,
              movimento: "Conta a Pagar",
              valor: valor,
              plano_conta: "Contas a Pagar",
              lancamento: "Contas a Pagar",
              origem: "pagar",
              tipo: "saida",
              fornecedor: fornecedor,
              parceiro: fornecedor,
              local: p.local || "",
            };
          });

          if (recMapped.length > 0 || pagMapped.length > 0) {
            const map3 = new Map<string, any>();
            finalResults.forEach((it: any) => map3.set(String(it.id), it));
            recMapped.forEach((it: any) => map3.set(String(it.id), it));
            pagMapped.forEach((it: any) => map3.set(String(it.id), it));
            finalResults = Array.from(map3.values());

            // ordenar por data (mais recente primeiro), mantendo critério atual
            finalResults.sort((a: any, b: any) => {
              const da =
                new Date(
                  a.data || a.data_lancamento || a.data_vencimento || 0,
                ).getTime() || 0;
              const db =
                new Date(
                  b.data || b.data_lancamento || b.data_vencimento || 0,
                ).getTime() || 0;
              return (
                db - da ||
                Number(b.id?.toString().replace(/\D/g, "")) -
                  Number(a.id?.toString().replace(/\D/g, ""))
              );
            });
          }
        } catch (err) {
          console.warn(
            "fetchData: erro ao buscar contas a pagar/receber para movimentações:",
            err,
          );
        }
      }

      if (finalResults && finalResults.length > 0) {
        const processedData = processApiData(finalResults);
        setLista(processedData);
      } else {
        setLista([]);
        showMessage({
          message: "Sem Dados",
          description: "Nenhum Registro Encontrado no Período!",
          type: "warning",
        });
      }
    } catch (error: any) {
      console.error("Erro ao buscar dados:", error);
      showMessage({
        message: "Erro",
        description: error.message || "Falha ao carregar dados",
        type: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar lista de lançamentos
  const selectListaLanc = async () => {
    try {
      const response = await api.get("mov/listar_lanc.php");
      if (response.data?.resultado) {
        setListaLanc(response.data.resultado);
      } else {
        setListaLanc([]);
      }
    } catch (error: any) {
      console.error("Erro ao buscar lista de lançamentos:", error);
      setListaLanc([]);
    }
  };

  // Trocar lançamento
  const handleLancamentoChange = (lan: string) => {
    if (navigation.dispatch) {
      navigation.dispatch(DrawerActions.closeDrawer());
    }
    setLanc(lan);
  };

  // Atualizar quando parâmetros mudam
  useEffect(() => {
    fetchData();
  }, [lanc, date, date2, includeContas]);

  // Date pickers
  const onChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setDate(currentDate);
    if (Platform.OS === "android") {
      setShow(false);
    }
  };

  const onChange2 = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date2;
    setDate2(currentDate);
    if (Platform.OS === "android") {
      setShow2(false);
    }
  };

  // Renderizar item
  const renderItem = ({ item }: { item: MovimentoItem }) => (
    <Card data={item as any} key={item.id} />
  );

  // Formatar data
  // Corrigir a função formatarData
  const formatarData = (dataString: string): string => {
    if (!dataString) return "N/A";

    try {
      let dataObj: Date;

      // Removemos a verificação instanceof Date porque dataString é string
      if (dataString.match(/^\d{4}-\d{2}-\d{2}/)) {
        dataObj = new Date(dataString);
      } else if (dataString.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        const [day, month, year] = dataString.split("/");
        dataObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        dataObj = new Date(dataString);
      }

      return isValid(dataObj) ? format(dataObj, "dd/MM/yyyy") : "N/A";
    } catch (error) {
      return "N/A";
    }
  };
  // Formatar valor
  const formatarValor = (valor: number): string => {
    return valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Obter sinal para exibição do saldo
  const getSinalSaldo = (): string => {
    return saldoNumerico >= 0 ? "+" : "-";
  };

  // Relatório específico: títulos a baixar / com resíduo (Receber e Pagar)
  const gerarRelatorioTitulosPendentes = async () => {
    try {
      setIsPrinting(true);

      // Para este relatório, considerar TODOS os títulos pendentes,
      // independente do período selecionado na tela. Chamamos os endpoints
      // sem data/data1 para acionar o modo "todos pendentes" no PHP.

      const [recResp, pagResp] = await Promise.all([
        api.get("receber/listar.php"),
        api.get("pagar/listar.php"),
      ]);

      const recRaw = recResp?.data?.resultado ?? recResp?.data ?? [];
      const pagRaw = pagResp?.data?.resultado ?? pagResp?.data ?? [];

      const recArr = Array.isArray(recRaw) ? recRaw : [];
      const pagArr = Array.isArray(pagRaw) ? pagRaw : [];

      type Titulo = {
        id: string;
        tipo: "receber" | "pagar";
        nome: string;
        vencimento: string;
        descricao: string;
        valor: string | number;
        valor_antigo?: string | number | null;
        status?: string;
        local?: string;
      };

      const titulosReceber: Titulo[] = recArr.map((r: any, idx: number) => ({
        id: `rec-${r.id ?? idx}`,
        tipo: "receber",
        // o backend já retorna "(Resíduo) - Nome" quando há resíduo
        nome: r.cliente ?? "",
        vencimento: r.vencimento ?? "",
        descricao: r.descricao ?? "",
        valor: r.valor ?? "0",
        valor_antigo: r.valor_antigo ?? null,
        status: r.status ?? "Pendente",
        local: r.local ?? "",
      }));

      const titulosPagar: Titulo[] = pagArr.map((p: any, idx: number) => ({
        id: `pag-${p.id ?? idx}`,
        tipo: "pagar",
        nome: p.cliente ?? "",
        vencimento: p.vencimento ?? "",
        descricao: p.descricao ?? "",
        valor: p.valor ?? "0",
        valor_antigo: p.valor_antigo ?? null,
        status: p.status ?? "Pendente",
        local: p.local ?? "",
      }));

      let todosTitulos: Titulo[] = [...titulosReceber, ...titulosPagar];

      if (!todosTitulos.length) {
        Alert.alert(
          "Sem Títulos",
          "Não há títulos pendentes (a baixar ou com resíduo) no período informado.",
        );
        return;
      }

      // Aplicar filtro de pesquisa (cliente/fornecedor/descrição/local)
      const termoBusca = (searchQuery || "").trim().toLowerCase();
      if (termoBusca) {
        todosTitulos = todosTitulos.filter((t) => {
          const campos = [t.nome, t.descricao, t.local]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return campos.includes(termoBusca);
        });

        if (!todosTitulos.length) {
          Alert.alert(
            "Sem Títulos",
            "Nenhum título pendente encontrado para o filtro informado (cliente/fornecedor/descrição/local).",
          );
          return;
        }
      }

      const parseVenc = (v: string) => {
        if (!v) return new Date(8640000000000000); // data bem futura para não quebrar ordenação
        if (v.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(v);
        const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        const d = new Date(v);
        return isNaN(d.getTime()) ? new Date(8640000000000000) : d;
      };

      todosTitulos.sort((a, b) => {
        return (
          parseVenc(a.vencimento).getTime() - parseVenc(b.vencimento).getTime()
        );
      });

      let totalReceber = 0;
      let totalPagar = 0;

      todosTitulos.forEach((t) => {
        const v = Math.abs(converterValor(t.valor));
        if (t.tipo === "receber") totalReceber += v;
        else totalPagar += v;
      });

      const saldo = totalReceber - totalPagar;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <style>
              @page {
                size: A4;
                margin: 20mm;
              }
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 10px 8px;
                color: #2c3e50;
                font-size: 10px;
                line-height: 1.2;
              }
              .header {
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 2px solid #32B768;
              }
              .header-top {
                display: flex;
                align-items: center;
              }
              .header-right {
                flex: 1;
                text-align: center;
                font-size: 11px;
              }
              .empresa {
                font-size: 13px;
                font-weight: bold;
              }
              .endereco {
                font-size: 10px;
                margin-top: 2px;
              }
              .logo {
                height: 70px;
                margin-right: 10px;
              }
              h1 {
                color: #32B768;
                margin: 6px 0 0 0;
                font-size: 16px;
                font-weight: bold;
              }
              .info-box {
                background: #f8f9fa;
                padding: 10px;
                border-radius: 6px;
                margin-bottom: 12px;
                border-left: 4px solid #32B768;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 8px;
                font-size: 10px;
              }
              th {
                background: #32B768;
                color: #fff;
                padding: 6px;
                border: 1px solid #2c3e50;
                text-align: left;
              }
              td {
                padding: 5px;
                border: 1px solid #ddd;
              }
              tr:nth-child(even) {
                background: #f9f9f9;
              }
              .tipo-receber {
                color: #155724;
                font-weight: bold;
              }
              .tipo-pagar {
                color: #721c24;
                font-weight: bold;
              }
              .valor-receber {
                text-align: right;
                color: #155724;
                font-weight: bold;
              }
              .valor-pagar {
                text-align: right;
                color: #721c24;
                font-weight: bold;
              }
              .resumo {
                margin-top: 12px;
                padding: 10px;
                border-radius: 6px;
                background: #f5f5f5;
                border: 1px solid #ddd;
              }
              .resumo-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
              }
              .saldo-positivo { color: #155724; font-weight: bold; }
              .saldo-negativo { color: #721c24; font-weight: bold; }
              .footer {
                text-align: center;
                margin-top: 15px;
                padding-top: 8px;
                border-top: 1px solid #ddd;
                color: #666;
                font-size: 10px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-top">
                <img class="logo" src="${logoUri}" alt="Logo" />
                <div class="header-right">
                  <div class="empresa">Reforlimer reformas e construções</div>
                  <div class="endereco">Avenida Laranjeiras, nº 701</div>
                  <h1>TÍTULOS A BAIXAR / COM RESÍDUO</h1>
                </div>
              </div>
            </div>

            <div class="info-box">
              <div class="info-row">
                <span><strong>Período:</strong> Todos os títulos pendentes</span>
                <span><strong>Total de títulos:</strong> ${
                  todosTitulos.length
                }</span>
              </div>
              <div class="info-row">
                <span><strong>Emissão:</strong> ${format(
                  new Date(),
                  "dd/MM/yyyy 'às' HH:mm",
                )}</span>
                <span><strong>Origem:</strong> Contas a Receber e Pagar (pendentes)</span>
              </div>
              ${
                termoBusca
                  ? `<div class="info-row"><span><strong>Filtro:</strong> ${searchQuery}</span></div>`
                  : ""
              }
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 10%;">Tipo</th>
                  <th style="width: 15%;">Vencimento</th>
                  <th style="width: 35%;">Cliente / Fornecedor</th>
                  <th style="width: 25%;">Descrição</th>
                  <th style="width: 15%; text-align:right;">Valor Atual (R$)</th>
                </tr>
              </thead>
              <tbody>
                ${todosTitulos
                  .map((t) => {
                    const dataVenc = formatarData(t.vencimento);
                    const valorNum = Math.abs(converterValor(t.valor));
                    const valorStr = formatarValor(valorNum);
                    const tipoClasse =
                      t.tipo === "receber" ? "tipo-receber" : "tipo-pagar";
                    const valorClasse =
                      t.tipo === "receber" ? "valor-receber" : "valor-pagar";

                    const tipoLabel =
                      t.tipo === "receber" ? "Receber" : "Pagar";

                    return `
                      <tr>
                        <td class="${tipoClasse}">${tipoLabel}</td>
                        <td>${dataVenc}</td>
                        <td>${
                          (t.nome || "").toString().trim() || "(Sem nome)"
                        }</td>
                        <td>${(t.descricao || "").toString().trim() || "-"}</td>
                        <td class="${valorClasse}">R$ ${valorStr}</td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>

            <div class="resumo">
              <div class="resumo-item">
                <span><strong>Total a Receber:</strong></span>
                <span class="saldo-positivo">R$ ${formatarValor(
                  totalReceber,
                )}</span>
              </div>
              <div class="resumo-item">
                <span><strong>Total a Pagar:</strong></span>
                <span class="saldo-negativo">R$ ${formatarValor(
                  totalPagar,
                )}</span>
              </div>
              <div class="resumo-item" style="margin-top:6px;border-top:1px solid #ccc;padding-top:4px;">
                <span><strong>Saldo entre Receber e Pagar:</strong></span>
                <span class="${
                  saldo >= 0 ? "saldo-positivo" : "saldo-negativo"
                }">
                  ${saldo >= 0 ? "+" : "-"} R$ ${formatarValor(Math.abs(saldo))}
                </span>
              </div>
            </div>

            <div class="footer">
              <p>Relatório de títulos pendentes (a baixar ou com resíduo)</p>
              <p>Período: todos os títulos pendentes cadastrados</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 595,
        height: 842,
        margins: { left: 20, top: 20, right: 20, bottom: 20 },
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Relatório Títulos Pendentes - ${format(
            date,
            "dd/MM/yyyy",
          )} à ${format(date2, "dd/MM/yyyy")}`,
        });
      } else {
        await Print.printAsync({ uri });
      }

      Alert.alert(
        "Sucesso",
        "Relatório de títulos pendentes gerado com sucesso!",
      );
    } catch (error: any) {
      console.error("Erro ao gerar relatório de títulos pendentes:", error);
      Alert.alert(
        "Erro",
        error?.message || "Falha ao gerar relatório de títulos pendentes",
      );
    } finally {
      setIsPrinting(false);
    }
  };

  // Gerar relatório PDF
  const gerarRelatorio = async () => {
    if (relatorioTitulosPendentes) {
      await gerarRelatorioTitulosPendentes();
      return;
    }

    try {
      setIsPrinting(true);

      const sourceList =
        Array.isArray(filteredLista) && filteredLista.length > 0
          ? filteredLista
          : [];

      if (sourceList.length === 0) {
        Alert.alert(
          "Sem Dados",
          "Não há dados visíveis para gerar o relatório",
        );
        return;
      }

      // Cálculos automáticos usando somente os itens exibidos
      let totalEntradas = 0;
      let totalSaidas = 0;

      sourceList.forEach((item) => {
        const valorBase =
          typeof item.valor_baixa === "number"
            ? item.valor_baixa
            : converterValor(item.valor);
        const valor = isNaN(valorBase) ? 0 : valorBase;
        const valorAbsoluto = Math.abs(valor);

        if (item.tipo === "entrada") {
          totalEntradas += valorAbsoluto;
        } else if (item.tipo === "saida") {
          totalSaidas += valorAbsoluto;
        }
      });

      const saldoFinal = totalEntradas - totalSaidas;

      // HTML do PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @page {
                size: A4;
                margin: 20mm;
              }
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 10px 8px; 
                color: #2c3e50;
                font-size: 11px;
                line-height: 1.3;
              }
              .header { 
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 2px solid #32B768;
              }
              .header-top { display: flex; align-items: center; }
              .header-right { flex: 1; text-align: center; font-size: 11px; }
              .empresa { font-size: 13px; font-weight: bold; }
              .endereco { font-size: 10px; margin-top: 2px; }
              .logo { height: 70px; margin-right: 10px; }
              .header h1 { 
                color: #32B768; 
                margin: 6px 0 0 0;
                font-size: 15px;
                font-weight: bold;
              }
              .info-box {
                background: #f8f9fa;
                padding: 8px;
                border-radius: 6px;
                margin-bottom: 10px;
                border-left: 4px solid #32B768;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 3px;
              }
              .lancamento-title {
                text-align: center;
                font-size: 13px;
                font-weight: bold;
                margin: 8px 0;
                color: #2c3e50;
                padding: 5px;
                background: #e9ecef;
                border-radius: 4px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 8px 0;
                font-size: 9px;
              }
              th {
                background: #32B768;
                color: white;
                padding: 5px;
                text-align: left;
                font-weight: bold;
                border: 1px solid #2c3e50;
              }
              td {
                padding: 4px;
                border: 1px solid #ddd;
                text-align: left;
              }
              tr:nth-child(even) {
                background: #f9f9f9;
              }
              .valor-entrada {
                color: #006400;
                font-weight: bold;
                text-align: right;
              }
              .valor-saida {
                color: #8B0000;
                font-weight: bold;
                text-align: right;
              }
              .data-col {
                width: 15%;
                color: #666;
              }
              .descricao-col {
                width: 40%;
              }
              .movimento-col {
                width: 25%;
              }
              .valor-col {
                width: 20%;
                text-align: right;
              }
              .resumo {
                background: #f5f5f5;
                padding: 8px;
                border-radius: 6px;
                margin-top: 10px;
                border: 1px solid #ddd;
              }
              .resumo-title {
                font-weight: bold;
                font-size: 12px;
                color: #2c3e50;
                text-align: center;
                margin-bottom: 6px;
                border-bottom: 1px solid #ccc;
                padding-bottom: 4px;
              }
              .resumo-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 3px;
                padding: 2px 0;
              }
              .resumo-label {
                font-weight: bold;
                color: #555;
              }
              .resumo-total {
                border-top: 2px solid #ccc;
                padding-top: 4px;
                margin-top: 4px;
                font-size: 11px;
                font-weight: bold;
              }
              .saldo-positivo {
                color: #006400;
              }
              .saldo-negativo {
                color: #8B0000;
              }
              .footer {
                text-align: center;
                margin-top: 12px;
                padding-top: 6px;
                border-top: 1px solid #ddd;
                color: #666;
                font-size: 9px;
              }
              .empty-state {
                text-align: center;
                padding: 30px;
                color: #666;
                font-style: italic;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-top">
                <img class="logo" src="${logoUri}" alt="Logo" />
                <div class="header-right">
                  <div class="empresa">Reforlimer reformas e construções</div>
                  <div class="endereco">Avenida Laranjeiras, nº 701</div>
                  <h1>RELATÓRIO FINANCEIRO</h1>
                </div>
              </div>
            
            <div class="info-box">
              <div class="info-row">
                <span><strong>Período:</strong> ${format(
                  date,
                  "dd/MM/yyyy",
                )} à ${format(date2, "dd/MM/yyyy")}</span>
                <span><strong>Registros:</strong> ${sourceList.length}</span>
              </div>
              <div class="info-row">
                <span><strong>Emissão:</strong> ${format(
                  new Date(),
                  "dd/MM/yyyy 'às' HH:mm",
                )}</span>
                <span><strong>Lançamento:</strong> ${lanc}</span>
              </div>
              ${
                searchQuery
                  ? `<div class="info-row"><span><strong>Filtro:</strong> ${searchQuery}</span></div>`
                  : ""
              }
            </div>

            <div class="lancamento-title">
              EXTRATO - ${lanc.toUpperCase()}${
                searchQuery ? ` - ${searchQuery}` : ""
              }
            </div>

            <table>
              <thead>
                <tr>
                  <th class="data-col">DATA</th>
                  <th class="descricao-col">DESCRIÇÃO</th>
                  <th class="movimento-col">MOVIMENTO</th>
                  <th class="valor-col">VALOR (R$)</th>
                </tr>
              </thead>
              <tbody>
                ${sourceList
                  .map((item) => {
                    const dataFormatada = formatarData(item.data);

                    // Valor já vem formatado em pt-BR em item.valor (absoluto) pelo processApiData
                    const valorStr =
                      (item.valor && item.valor.toString().trim()) ||
                      formatarValor(
                        Math.abs(converterValor(item.valor ?? "0")),
                      );
                    const sinal =
                      (item.tipo || "").toString().toLowerCase() === "saida"
                        ? "-"
                        : "+";

                    const parceiro = (
                      item.parceiro ||
                      item.cliente ||
                      item.fornecedor ||
                      item.empresa ||
                      ""
                    )
                      .toString()
                      .trim();
                    const descricaoBase =
                      item.descricao && item.descricao !== "Sem descrição"
                        ? item.descricao
                        : "";
                    const descricaoExibir = descricaoBase
                      ? `${descricaoBase}${parceiro ? " - " + parceiro : ""}`
                      : parceiro || "-";

                    return `
                    <tr>
                      <td class="data-col">${dataFormatada}</td>
                      <td class="descricao-col">${descricaoExibir}</td>
                      <td class="movimento-col">${item.movimento || "-"}</td>
                      <td class="${
                        item.tipo === "entrada"
                          ? "valor-entrada"
                          : "valor-saida"
                      }">
                        ${sinal} R$ ${valorStr}
                      </td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>

            <div class="resumo">
              <div class="resumo-title">RESUMO FINANCEIRO</div>
              
              <div class="resumo-item">
                <span class="resumo-label">Total de Entradas:</span>
                <span class="valor-entrada">+ R$ ${formatarValor(
                  totalEntradas,
                )}</span>
              </div>
              
              <div class="resumo-item">
                <span class="resumo-label">Total de Saídas:</span>
                <span class="valor-saida">- R$ ${formatarValor(
                  totalSaidas,
                )}</span>
              </div>
              
              <div class="resumo-item resumo-total">
                <span class="resumo-label">Saldo do Período:</span>
                <span class="${
                  saldoFinal >= 0 ? "saldo-positivo" : "saldo-negativo"
                }">
                  ${saldoFinal >= 0 ? "+" : "-"} R$ ${formatarValor(
                    Math.abs(saldoFinal),
                  )}
                </span>
              </div>
              
                <div class="resumo-item">
                <span class="resumo-label">Movimentações:</span>
                <span>${sourceList.length} registros</span>
              </div>
            </div>

            <div class="footer">
              <p>Sistema Financeiro - Relatório gerado automaticamente</p>
              <p>Período de ${format(date, "dd/MM/yyyy")} à ${format(
                date2,
                "dd/MM/yyyy",
              )}</p>
            </div>
          </body>
        </html>
      `;

      // Gerar PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        // A4 em pontos (8.27 x 11.69 pol. * 72)
        width: 595,
        height: 842,
        margins: { left: 20, top: 20, right: 20, bottom: 20 },
      });

      // Compartilhar
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Relatório ${lanc}${
            searchQuery ? " - " + searchQuery : ""
          } - ${format(date, "dd/MM/yyyy")} à ${format(date2, "dd/MM/yyyy")}`,
        });
      } else {
        await Print.printAsync({ uri });
      }

      Alert.alert("Sucesso", "Relatório gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar relatório:", error);
      Alert.alert("Erro", error.message || "Falha ao gerar relatório");
    } finally {
      setIsPrinting(false);
    }
  };

  // Relatório por despesa (categoria) com subtotais e total geral
  const gerarRelatorioPorDespesa = async () => {
    try {
      setIsPrinting(true);

      const sourceList =
        Array.isArray(filteredLista) && filteredLista.length > 0
          ? filteredLista
          : [];

      if (sourceList.length === 0) {
        Alert.alert(
          "Sem Dados",
          "Não há dados visíveis para gerar o relatório por despesa",
        );
        return;
      }

      // Considerar apenas saídas (despesas)
      const itensDespesa = sourceList.filter(
        (item) => String(item.tipo).toLowerCase() === "saida",
      );

      if (itensDespesa.length === 0) {
        Alert.alert(
          "Sem Despesas",
          "Não há movimentações de saída (despesas) para o período/filto atual.",
        );
        return;
      }

      type GrupoDespesa = {
        nome: string;
        itens: MovimentoItem[];
        subtotal: number;
      };

      const gruposMap = new Map<string, GrupoDespesa>();

      itensDespesa.forEach((item) => {
        const chaveBruta =
          item.cat_despesa || item.categoria || item.plano_conta || "Outras";
        const chave = String(chaveBruta).trim() || "Outras";
        const valor = Math.abs(converterValor(item.valor));
        if (!gruposMap.has(chave)) {
          gruposMap.set(chave, { nome: chave, itens: [], subtotal: 0 });
        }
        const grupo = gruposMap.get(chave)!;
        grupo.itens.push(item);
        grupo.subtotal += valor;
      });

      const grupos = Array.from(gruposMap.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR"),
      );

      const totalGeral = grupos.reduce(
        (acc, g) => acc + (isFinite(g.subtotal) ? g.subtotal : 0),
        0,
      );

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @page {
                size: A4;
                margin: 20mm;
              }
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 12px 8px;
                color: #2c3e50;
                font-size: 11px;
                line-height: 1.25;
              }
              .header {
                margin-bottom: 14px;
                padding-bottom: 10px;
                border-bottom: 2px solid #32B768;
              }
              .header-top {
                display: flex;
                align-items: center;
              }
              .header-right {
                flex: 1;
                text-align: center;
                font-size: 11px;
              }
              .empresa {
                font-size: 13px;
                font-weight: bold;
              }
              .endereco {
                font-size: 10px;
                margin-top: 2px;
              }
              .logo {
                height: 70px;
                width: auto;
                margin-right: 10px;
                object-fit: contain;
              }
              .header h1 {
                color: #32B768;
                margin: 0;
                font-size: 16px;
                font-weight: bold;
              }
              .info-box {
                background: #f8f9fa;
                padding: 10px;
                border-radius: 8px;
                margin-bottom: 14px;
                border-left: 4px solid #32B768;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 3px;
              }
              .grupo {
                margin-bottom: 14px;
                border: 1px solid #ddd;
                border-radius: 8px;
                overflow: hidden;
              }
              .grupo-title {
                background: #e9ecef;
                padding: 6px 8px;
                font-weight: bold;
                font-size: 10px;
                color: #2c3e50;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 8px;
              }
              th {
                background: #32B768;
                color: white;
                padding: 4px;
                text-align: left;
                font-weight: bold;
                border: 1px solid #2c3e50;
              }
              td {
                padding: 4px;
                border: 1px solid #ddd;
                text-align: left;
              }
              tr:nth-child(even) {
                background: #f9f9f9;
              }
              .valor-saida {
                color: #8B0000;
                font-weight: bold;
                text-align: right;
              }
              .subtotal {
                text-align: right;
                font-weight: bold;
                padding: 6px 8px;
                background: #f5f5f5;
                border-top: 1px solid #ddd;
              }
              .resumo-geral {
                margin-top: 18px;
                padding: 10px;
                border-radius: 8px;
                background: #f5f5f5;
                border: 1px solid #ddd;
                font-size: 10px;
                font-weight: bold;
                text-align: right;
              }
              .footer {
                text-align: center;
                margin-top: 15px;
                padding-top: 10px;
                border-top: 1px solid #ddd;
                color: #666;
                font-size: 8px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-top">
                <img class="logo" src="${logoUri}" alt="Logo" />
                <div class="header-right">
                  <div class="empresa">Reforlimer reformas e construções</div>
                  <div class="endereco">Avenida Laranjeiras, nº 701</div>
                  <h1>RELATÓRIO DE DESPESAS POR CATEGORIA</h1>
                </div>
              </div>
            </div>

            <div class="info-box">
              <div class="info-row">
                <span><strong>Período:</strong> ${format(
                  date,
                  "dd/MM/yyyy",
                )} à ${format(date2, "dd/MM/yyyy")}</span>
                <span><strong>Registros (saídas):</strong> ${
                  itensDespesa.length
                }</span>
              </div>
              <div class="info-row">
                <span><strong>Emissão:</strong> ${format(
                  new Date(),
                  "dd/MM/yyyy 'às' HH:mm",
                )}</span>
                <span><strong>Lançamento:</strong> ${lanc}</span>
              </div>
              ${
                {
                  hasFilter: Boolean(searchQuery),
                }.hasFilter
                  ? `<div class="info-row"><span><strong>Filtro:</strong> ${searchQuery}</span></div>`
                  : ""
              }
            </div>

            ${grupos
              .map((grupo) => {
                const linhas = grupo.itens
                  .map((item) => {
                    const dataFormatada = formatarData(item.data);
                    const valor = Math.abs(converterValor(item.valor));
                    const valorFormatado = formatarValor(valor);
                    const parceiro = (
                      item.parceiro ||
                      item.cliente ||
                      item.fornecedor ||
                      item.empresa ||
                      ""
                    )
                      .toString()
                      .trim();
                    const descricaoBase =
                      item.descricao && item.descricao !== "Sem descrição"
                        ? item.descricao
                        : "";
                    const descricaoExibir = descricaoBase
                      ? `${descricaoBase}${parceiro ? " - " + parceiro : ""}`
                      : parceiro || "-";

                    return `
                      <tr>
                        <td style="width: 18%; color:#666;">${dataFormatada}</td>
                        <td style="width: 52%;">${descricaoExibir}</td>
                        <td style="width: 30%;" class="valor-saida">- R$ ${valorFormatado}</td>
                      </tr>
                    `;
                  })
                  .join("");

                return `
                  <div class="grupo">
                    <div class="grupo-title">Despesa: ${
                      grupo.nome || "Outras"
                    }</div>
                    <table>
                      <thead>
                        <tr>
                          <th style="width:18%;">DATA</th>
                          <th style="width:52%;">DESCRIÇÃO / PARCEIRO</th>
                          <th style="width:30%; text-align:right;">VALOR (R$)</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${linhas}
                      </tbody>
                    </table>
                    <div class="subtotal">Subtotal ${
                      grupo.nome || "Outras"
                    }: - R$ ${formatarValor(grupo.subtotal)}</div>
                  </div>
                `;
              })
              .join("")}

            <div class="resumo-geral">
              Total geral das despesas: - R$ ${formatarValor(totalGeral)}
            </div>

            <div class="footer">
              <p>Sistema Financeiro - Relatório de despesas por categoria</p>
              <p>Período de ${format(date, "dd/MM/yyyy")} à ${format(
                date2,
                "dd/MM/yyyy",
              )}</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 595,
        height: 842,
        margins: { left: 20, top: 20, right: 20, bottom: 20 },
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Relatório Despesas por Categoria - ${format(
            date,
            "dd/MM/yyyy",
          )} à ${format(date2, "dd/MM/yyyy")}`,
        });
      } else {
        await Print.printAsync({ uri });
      }

      Alert.alert("Sucesso", "Relatório por despesa gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar relatório por despesa:", error);
      Alert.alert(
        "Erro",
        error.message || "Falha ao gerar relatório por despesa",
      );
    } finally {
      setIsPrinting(false);
    }
  };

  // Componente de abas
  const LancamentoTabs = () => {
    const tabs = [
      "Caixa",
      "Cartão de Débito",
      "Cartão de Crédito",
      ...lista_lanc.map((l) => l.nome),
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScrollContent}
      >
        {tabs.map((nome, index, array) => (
          <View key={nome} style={styles.tabItem}>
            <TouchableOpacity onPress={() => handleLancamentoChange(nome)}>
              <Text
                style={lanc === nome ? styles.tabActive : styles.tabInactive}
              >
                {nome}
              </Text>
            </TouchableOpacity>
            {index < array.length - 1 && (
              <Text style={styles.tabSeparator}>/</Text>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Date Pickers */}
      {Platform.OS === "ios" ? (
        <>
          <Modal
            transparent
            visible={show}
            animationType="fade"
            onRequestClose={() => setShow(false)}
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
                    fontSize: 16,
                    fontWeight: "600",
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
                    fontSize: 16,
                    fontWeight: "600",
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

      <View
        style={{
          marginHorizontal: 12,
          marginTop: 8,
          marginBottom: 8,
          backgroundColor: "#fff",
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={[
              styles.printButton,
              isPrinting ? styles.printButtonDisabled : null,
            ]}
            onPress={gerarRelatorio}
            disabled={isPrinting}
            activeOpacity={0.8}
          >
            <MaterialIcons name="print" size={22} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.printButton,
              isPrinting ? styles.printButtonDisabled : null,
              { marginLeft: 8 },
            ]}
            onPress={gerarRelatorioPorDespesa}
            disabled={isPrinting}
            activeOpacity={0.8}
          >
            <MaterialIcons name="category" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 12, color: "#666", textAlign: "right" }}>
            Total da Movimentacao
          </Text>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: corTotal,
              textAlign: "right",
            }}
          >
            {getSinalSaldo()} R$ {total}
          </Text>
        </View>
      </View>

      {/* Filtros de data */}
      <View style={styles.filtersContainer}>
        <View style={styles.quickDates}>
          <RectButton
            style={styles.dateButton}
            onPress={() => {
              const newDate = sub(new Date(), { days: 1 });
              setDate(newDate);
              setDate2(newDate);
            }}
          >
            <Text style={styles.dateButtonText}>Ontem</Text>
          </RectButton>

          <RectButton
            style={styles.dateButton}
            onPress={() => {
              const today = new Date();
              setDate(today);
              setDate2(today);
            }}
          >
            <Text style={styles.dateButtonText}>Hoje</Text>
          </RectButton>

          <RectButton
            style={styles.dateButton}
            onPress={() => {
              setDate(sub(new Date(), { days: 30 }));
              setDate2(new Date());
            }}
          >
            <Text style={styles.dateButtonText}>30 Dias</Text>
          </RectButton>
        </View>

        <View style={styles.customDates}>
          <TouchableOpacity
            style={styles.datePicker}
            onPress={() => setShow(true)}
          >
            <Text style={styles.dateLabel}>DE</Text>
            <Text style={styles.dateValue}>{format(date, "dd/MM/yyyy")}</Text>
          </TouchableOpacity>

          <Ionicons name="arrow-forward" size={20} color="#484a4d" />

          <TouchableOpacity
            style={styles.datePicker}
            onPress={() => setShow2(true)}
          >
            <Text style={styles.dateLabel}>ATÉ</Text>
            <Text style={styles.dateValue}>{format(date2, "dd/MM/yyyy")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.checkboxRow}>
          <TouchableOpacity
            style={styles.checkboxTouchable}
            onPress={() => setIncludeContas((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={includeContas ? "checkbox-outline" : "square-outline"}
              size={20}
              color="#2B7A4B"
            />
            <Text style={styles.checkboxLabel}>
              Fluxo de caixa a Pagar/Receber
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.checkboxRow}>
          <TouchableOpacity
            style={styles.checkboxTouchable}
            onPress={() =>
              setRelatorioTitulosPendentes((previous) => !previous)
            }
            activeOpacity={0.7}
          >
            <Ionicons
              name={
                relatorioTitulosPendentes
                  ? "checkbox-outline"
                  : "square-outline"
              }
              size={20}
              color="#2B7A4B"
            />
            <Text style={styles.checkboxLabel}>
              Relatório títulos a baixar / resíduo
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Abas de lançamentos */}
      {/* Campo de pesquisa por cliente/fornecedor */}
      <View
        style={{
          paddingHorizontal: 12,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TextInput
          placeholder="Pesquisar por cliente, fornecedor ou categoria"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{
            flex: 1,
            backgroundColor: "#fff",
            borderColor: "#ccc",
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 10,
            height: 40,
          }}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={{ marginLeft: 8 }}
          >
            <Ionicons name="close-circle" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabsContainer}>
        <LancamentoTabs />
      </View>

      {/* Lista */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#32B768" />
            <Text style={styles.loadingText}>Carregando movimentações...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredLista}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Nenhuma movimentação encontrada
                </Text>
                <Text style={styles.emptySubText}>
                  Verifique o período selecionado ou o tipo de lançamento
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              lista.length === 0
                ? styles.emptyListContainer
                : styles.listContent
            }
          />
        )}
      </View>
    </View>
  );
};

export default Movimento;
