import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  TextInput,
  Dimensions,
  Alert,
  StyleSheet,
  Platform,
  Button,
  Modal,
} from "react-native";
import {
  useNavigation,
  useRoute,
  RouteProp,
  CommonActions,
} from "@react-navigation/native";
import { format, sub, add, parseISO, startOfDay, endOfDay } from "date-fns";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { RectButton } from "react-native-gesture-handler";
import api from "../../services/api";
import CardVendas from "../../components/CardVendas";
import Header from "../../components/Header";
import fonts from "../../styles/fonts";
import { styles } from "./style";

import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";

const logoUri = Image.resolveAssetSource(require("../../assets/logo2.png")).uri;

type RouteParams = {
  refreshKey?: number;
};

const Venda: React.FC = () => {
  const navigation: any = useNavigation();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();

  const [lista, setLista] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [date, setDate] = useState<Date>(new Date());
  const [date2, setDate2] = useState<Date>(new Date());
  const [show, setShow] = useState<boolean>(false);
  const [show2, setShow2] = useState<boolean>(false);
  const [total, setTotal] = useState<string>("0,00");

  const formatValueToNumber = (v: any) => {
    if (v === undefined || v === null) return 0;
    const s = String(v).trim();
    const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const fetchVendas = useCallback(
    async (start?: Date, end?: Date) => {
      setIsLoading(true);
      try {
        let s = start ?? date;
        let e = end ?? date2;

        if (s.getTime() > e.getTime()) {
          const tmp = s;
          s = e;
          e = tmp;
        }

        // normalizar início / fim do dia (local midnight)
        const sDay = startOfDay(s);
        const eDay = endOfDay(e);

        // formatos que o backend pode esperar
        const isoStartDate = format(sDay, "yyyy-MM-dd");
        const isoEndDate = format(eDay, "yyyy-MM-dd");
        const isoStartFull = `${isoStartDate} 00:00:00`;
        const isoEndFull = `${isoEndDate} 23:59:59`;
        const brStart = format(sDay, "dd/MM/yyyy");
        const brEnd = format(eDay, "dd/MM/yyyy");

        // montar parâmetros enfatizando data_lanc (datas com horário completo)
        const paramsIso: any = {
          data_lanc_inicio: isoStartFull,
          data_lanc_fim: isoEndFull,
          data_inicio_h: isoStartFull,
          data_fim_h: isoEndFull,
          dataInicio: isoStartFull,
          dataFim: isoEndFull,
        };

        const paramsBr: any = {
          data_lanc_inicio: `${brStart} 00:00:00`,
          data_lanc_fim: `${brEnd} 23:59:59`,
          data_inicio_h: `${brStart} 00:00:00`,
          data_fim_h: `${brEnd} 23:59:59`,
          dataInicio: brStart,
          dataFim: brEnd,
        };

        const normalize = (data: any): any[] => {
          if (!data) return [];
          if (Array.isArray(data)) return data;
          if (Array.isArray(data.resultado)) return data.resultado;
          if (Array.isArray(data.data)) return data.data;
          if (Array.isArray(data.rows)) return data.rows;
          return [];
        };

        let items: any[] = [];
        let lastResponse: any = null;

        // helper para tentar um request e retornar itens normalizados e guardar resposta
        const tryRequest = async (fn: () => Promise<any>) => {
          try {
            const r = await fn();
            lastResponse = r;
            const xs = normalize(r.data);
            if (xs && xs.length > 0) return xs;
            // se servidor retornou array vazio, ainda devolve [] (não erro)
          } catch (err) {
            console.warn("Vendas: tentativa falhou", err);
          }
          return [];
        };

        // Tentar POST form-urlencoded com foco em data_lanc (provavelmente aceito pela API)
        try {
          const bodyIso = new URLSearchParams(paramsIso).toString();
          items = await tryRequest(() =>
            api.post("vendas/listar.php", bodyIso, {
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }),
          );
        } catch (err) {
          console.warn("Vendas: POST form ISO falhou", err);
        }

        // GET com ISO se ainda vazio
        if ((items || []).length === 0) {
          items = await tryRequest(() =>
            api.get("vendas/listar.php", { params: paramsIso }),
          );
        }

        // POST JSON ISO
        if ((items || []).length === 0) {
          items = await tryRequest(() =>
            api.post("vendas/listar.php", paramsIso),
          );
        }

        // tentar variantes BR
        if ((items || []).length === 0) {
          try {
            const bodyBr = new URLSearchParams(paramsBr).toString();
            items = await tryRequest(() =>
              api.post("vendas/listar.php", bodyBr, {
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
              }),
            );
          } catch (err) {
            console.warn("Vendas: POST form BR falhou", err);
          }
        }
        if ((items || []).length === 0) {
          items = await tryRequest(() =>
            api.get("vendas/listar.php", { params: paramsBr }),
          );
        }

        // fallback: buscar todos (se necessário)
        let usedServerFiltering = (items || []).length > 0;
        if (!usedServerFiltering) {
          console.warn(
            "Vendas: servidor não filtrou — buscando todos para filtro local.",
          );
          const resAll = await api.get("vendas/listar.php");
          lastResponse = resAll;
          const all = normalize(resAll.data);
          items = all;
        }

        // sempre aplicar filtro local final usando os campos retornados pela API
        // converte várias formas de data para número YYYYMMDD para comparação simples
        const toYmdNumber = (d: Date) =>
          d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

        const parseToYmd = (raw: any): number | null => {
          if (raw === undefined || raw === null) return null;
          const s = String(raw).trim().split(" ")[0];
          // dd/MM/yyyy
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
            const [dd, mm, yyyy] = s.split("/");
            return Number(
              `${yyyy}${mm.padStart(2, "0")}${dd.padStart(2, "0")}`,
            );
          }
          // yyyy-mm-dd
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const [yyyy, mm, dd] = s.split("-");
            return Number(`${yyyy}${mm}${dd}`);
          }
          // tentar ISO ou timestamp
          try {
            const tmp = new Date(s);
            if (!isNaN(tmp.getTime())) return toYmdNumber(tmp);
          } catch {}
          return null;
        };

        const startYmd = toYmdNumber(sDay);
        const endYmd = toYmdNumber(eDay);

        const finalItems = (items || []).filter((it: any) => {
          const candidates = [
            it.data_lanc,
            it.data_lanc_iso,
            it.data_lanc_br,
            it.data_lanc_h,
            it.data_pgto,
            it.data_venc,
            it.vencimento,
            it.data,
            it.created_at,
          ];
          let matched = false;
          for (const c of candidates) {
            const ymd = parseToYmd(c);
            if (ymd === null) continue;
            if (ymd >= startYmd && ymd <= endYmd) {
              matched = true;
              break;
            }
            // encontrou data válida mas fora do intervalo -> testar próximas datas
          }
          return matched;
        });

        setLista(finalItems || []);

        // calcular total mostrando corretamente valores com pontos/vírgulas
        // Somar somente vendas que NÃO são canceladas
        const totalNum = (finalItems || []).reduce((acc: number, item: any) => {
          const candidates = [
            item.subtotal,
            item.valor,
            item.total,
            item.valor_total,
            item.recebido,
            item.totalReceb,
          ];
          const found = candidates.find((c) => c !== undefined && c !== null);
          const value = formatValueToNumber(found ?? 0);
          const status = item.status ?? "";
          const canceled = String(status).toLowerCase().includes("cancel");
          if (canceled) return acc; // ignorar totalmente valores cancelados
          return acc + value;
        }, 0);

        setTotal(
          totalNum.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        );
      } catch (err: any) {
        console.error("Vendas: erro ao buscar", err?.response?.data ?? err);
        setLista([]);
        setTotal("0,00");
      } finally {
        setIsLoading(false);
      }
    },
    [date, date2],
  );

  // helpers locais para normalizar sem efeitos de timezone
  const toStartLocal = (dt: Date) =>
    new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
  const toEndLocal = (dt: Date) =>
    new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59, 999);

  useEffect(() => {
    // configurar datas iniciais e buscar vendas para hoje (local start/end)
    const today = new Date();
    const s = toStartLocal(today);
    const e = toEndLocal(today);
    setDate(s);
    setDate2(e);
    fetchVendas(s, e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // atualiza ao focar na tela (usa as datas atuais do estado)
    const unsub = navigation.addListener("focus", () => {
      fetchVendas(date, date2);
    });
    // também busca quando date/date2 mudam
    fetchVendas(date, date2);
    return unsub;
  }, [navigation, fetchVendas, date, date2]);

  useEffect(() => {
    const key = (route.params as any)?.refreshKey;
    if (key) {
      fetchVendas(date, date2);
      navigation.setParams({ refreshKey: undefined });
    }
  }, [route.params, fetchVendas, date, date2, navigation]);

  const onChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      const d = toStartLocal(selectedDate);
      setDate(d);
      fetchVendas(d, date2);
    }
    if (Platform.OS === "android") {
      setShow(false);
    }
  };

  const onChange2 = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      const d2 = toEndLocal(selectedDate);
      setDate2(d2);
      fetchVendas(date, d2);
    }
    if (Platform.OS === "android") {
      setShow2(false);
    }
  };

  const ListHeader = useMemo(() => {
    return (
      <View>
        <Header
          backTo="Inicio"
          onBackPress={() => {
            const parent = navigation.getParent?.();
            if (parent) {
              parent.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "Home", params: { screen: "Inicio" } }],
                }),
              );
              return;
            }

            navigation.navigate("Inicio");
          }}
        />

        {/* Modais de data para iOS / DatePicker inline para Android */}
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
                    Selecione a data final
                  </Text>
                  {show2 && (
                    <DateTimePicker
                      testID="dateTimePicker"
                      value={date2}
                      mode="date"
                      display="inline"
                      onChange={onChange2}
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
                display="calendar"
                onChange={onChange}
              />
            )}
            {show2 && (
              <DateTimePicker
                testID="dateTimePicker"
                value={date2}
                mode="date"
                display="calendar"
                onChange={onChange2}
              />
            )}
          </>
        )}

        {/* Botões rápidos e seleção de período */}
        <View style={{ marginBottom: 10 }}>
          <View style={styles.dates}>
            <RectButton
              style={styles.ButtonDates}
              onPress={() => {
                const d = sub(new Date(), { days: 1 });
                setDate(d);
                setDate2(d);
                fetchVendas(d, d);
              }}
            >
              <Text style={styles.ButtonDatesText}>Ontem</Text>
            </RectButton>

            <RectButton
              style={styles.ButtonDates}
              onPress={() => {
                const today = new Date();
                setDate(today);
                setDate2(today);
                fetchVendas(today, today);
              }}
            >
              <Text style={styles.ButtonDatesText}>Hoje</Text>
            </RectButton>

            <RectButton
              style={styles.ButtonDates}
              onPress={() => {
                const rawStart = sub(new Date(), { days: 29 });
                const start = toStartLocal(rawStart);
                const end = toEndLocal(new Date());
                setDate(start);
                setDate2(end);
                fetchVendas(start, end);
              }}
            >
              <Text style={styles.ButtonDatesText}>30 Dias</Text>
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
              <Ionicons
                name="arrow-forward-outline"
                size={30}
                color="#484a4d"
              />
            </View>

            <TouchableOpacity
              style={styles.pickDate}
              onPress={() => setShow2(true)}
            >
              <Text style={{ fontFamily: fonts.text, fontSize: 16 }}>ATÉ</Text>
              <Text style={styles.date}>{format(date2, "dd/MM/yyyy")}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={localStyles.nfButton}
            onPress={() => navigation.push("NotaFiscal")}
          >
            <MaterialIcons name="receipt-long" size={20} color="#fff" />
            <Text style={localStyles.nfButtonText}>Emitir Nota Fiscal</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [show, show2, date, date2, total, navigation]);

  async function gerarRelatorioPDF() {
    try {
      if (!lista || lista.length === 0) {
        Alert.alert("Sem dados", "Nenhuma venda para gerar relatório.");
        return;
      }

      const periodo = `${format(date, "dd/MM/yyyy")} até ${format(
        date2,
        "dd/MM/yyyy",
      )}`;

      // helper: formata número
      const fmt = (n: number) =>
        n.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

      // helper para detectar se o status é cancelado
      const isCanceledStatus = (s: any) => {
        if (!s && s !== 0) return false;
        return String(s).toLowerCase().includes("cancel");
      };

      // detalhado: linhas por venda (REMOVIDA coluna Vencimento)
      const rowsDetalhado = (lista || [])
        .map((item: any) => {
          const cliente = item.cliente || item.nome_cli || "-";
          const id = item.id ?? "-";
          const data = item.data_lanc ?? item.data_pgto ?? "-";
          const pagamento = item.pagamento ?? "-";
          const status = item.status ?? "-";
          const valorNum = formatValueToNumber(
            item.valor ?? item.subtotal ?? item.recebido ?? 0,
          );
          // mostrar valor com sinal negativo se cancelado
          const valorDisplay = isCanceledStatus(status)
            ? `-R$ ${fmt(Math.abs(valorNum))}`
            : `R$ ${fmt(valorNum)}`;
          return `<tr>
            <td style="padding:6px;border:1px solid #ddd">${id}</td>
            <td style="padding:6px;border:1px solid #ddd">${cliente}</td>
            <td style="padding:6px;border:1px solid #ddd">${data}</td>
            <td style="padding:6px;border:1px solid #ddd">${pagamento}</td>
            <td style="padding:6px;border:1px solid #ddd">${status}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:right">${valorDisplay}</td>
          </tr>`;
        })
        .join("");

      // resumo: agrupa por data de vencimento (ou "Sem Vencimento")
      const map = new Map<string, { total: number; count: number }>();
      const statusMap = new Map<string, { total: number; count: number }>();

      const parseVencKey = (raw: any) => {
        if (!raw && raw !== 0) return "Sem Vencimento";
        const s = String(raw).trim().split(" ")[0];
        if (/\d{2}\/\d{2}\/\d{4}/.test(s)) return s; // já dd/MM/yyyy
        if (/\d{4}-\d{2}-\d{2}/.test(s)) {
          const [yyyy, mm, dd] = s.split("-");
          return `${dd}/${mm}/${yyyy}`;
        }
        try {
          const d = new Date(s);
          if (!isNaN(d.getTime()))
            return format(
              new Date(d.getFullYear(), d.getMonth(), d.getDate()),
              "dd/MM/yyyy",
            );
        } catch {}
        return "Sem Vencimento";
      };

      (lista || []).forEach((item: any) => {
        const status = item.status ?? "Sem Status";
        const canceled = isCanceledStatus(status);
        const valor = formatValueToNumber(
          item.valor ?? item.subtotal ?? item.recebido ?? 0,
        );
        const signedValor = canceled ? -Math.abs(valor) : valor;

        // somente incluir no resumo por vencimento se NÃO for cancelada
        if (!canceled) {
          const vencKey = parseVencKey(
            item.vencimento ??
              item.data_venc ??
              item.data_vencimento ??
              item.vencimento_br ??
              item.data_pgto ??
              item.data_lanc ??
              null,
          );
          const curV = map.get(vencKey) || { total: 0, count: 0 };
          curV.total += valor;
          curV.count += 1;
          map.set(vencKey, curV);
        }

        // status map: manter para mostrar canceladas separadamente (usar signedValor para indicar impacto)
        const curS = statusMap.get(status) || { total: 0, count: 0 };
        curS.total += signedValor;
        curS.count += 1;
        statusMap.set(status, curS);
      });

      const summaryKeys = Array.from(map.keys()).sort((a, b) => {
        if (a === "Sem Vencimento") return 1;
        if (b === "Sem Vencimento") return -1;
        const da = a.split("/").reverse().join("-");
        const db = b.split("/").reverse().join("-");
        return new Date(da).getTime() - new Date(db).getTime();
      });

      const rowsResumo = summaryKeys
        .map((k) => {
          const v = map.get(k)!;
          return `<tr>
            <td style="padding:6px;border:1px solid #ddd">${k}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:center">${
              v.count
            }</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:right">R$ ${fmt(
              v.total,
            )}</td>
          </tr>`;
        })
        .join("");

      const statusKeys = Array.from(statusMap.keys()).sort((a, b) => {
        // priorizar Cancelada no topo
        const aCancel = isCanceledStatus(a) ? -1 : 0;
        const bCancel = isCanceledStatus(b) ? -1 : 0;
        if (aCancel !== bCancel) return aCancel - bCancel;
        return a.localeCompare(b);
      });

      const rowsStatus = statusKeys
        .map((k) => {
          const v = statusMap.get(k)!;
          const displayTotal =
            v.total < 0
              ? `-R$ ${fmt(Math.abs(v.total))}`
              : `R$ ${fmt(v.total)}`;
          return `<tr>
            <td style="padding:6px;border:1px solid #ddd">${k}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:center">${v.count}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:right">${displayTotal}</td>
          </tr>`;
        })
        .join("");

      // total geral já considera canceladas (pois usamos valores assinados)
      const totalGeral = Array.from(map.values()).reduce(
        (s, v) => s + v.total,
        0,
      );

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, Helvetica, sans-serif; font-size:11px; line-height:1.35; color:#222 }
              table { width:100%; border-collapse:collapse; margin-top:6px; font-size:10px; }
              th, td { border:1px solid #ddd; padding:4px; }
              th { background:#f3f3f3; text-align:left; }
              .right { text-align:right; }
              h3 { margin-bottom:4px; }
            </style>
          </head>
          <body>
            <h3>Relatório de Vendas - Detalhado</h3>
            <p>Período: ${periodo}</p>

            <h4>Vendas (detalhado)</h4>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th>Pagamento</th>
                  <th>Status</th>
                  <th style="text-align:right">Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsDetalhado}
              </tbody>
            </table>

            <h4>Resumo por Data de Venda</h4>
            <table>
              <thead>
                <tr>
                  <th>Data Lançamento</th>
                  <th style="text-align:center">Qtd</th>
                  <th style="text-align:right">Total (R$)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsResumo}
              </tbody>
            </table>

            <h4>Resumo por Status (Cancelada diminui do total)</h4>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th style="text-align:center">Qtd</th>
                  <th style="text-align:right">Total (R$)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsStatus}
              </tbody>
            </table>

            <h4 style="margin-top:12px">Totais</h4>
            <table>
              <tbody>
                <tr>
                  <td style="padding:6px;border:1px solid #ddd"><strong>Total Geral</strong></td>
                  <td style="padding:6px;border:1px solid #ddd;text-align:right"><strong>R$ ${fmt(
                    totalGeral,
                  )}</strong></td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await shareAsync(uri);
    } catch (error) {
      console.error("Erro gerarRelatorioPDF:", error);
      Alert.alert("Erro", "Falha ao gerar relatório.");
    }
  }

  async function handlePrintSale(item: any) {
    try {
      const cliente = item.cliente || item.nome_cli || "-";
      const data = item.data_lanc || item.data_pgto || "-";
      const valorNum = formatValueToNumber(
        item.valor ?? item.subtotal ?? item.recebido ?? 0,
      );
      const itensHtml = Array.isArray(item.itens)
        ? item.itens
            .map(
              (it: any) =>
                `<tr><td style="padding:6px;border:1px solid #ddd">${
                  it.nome
                }</td><td style="padding:6px;border:1px solid #ddd">${
                  it.quantidade
                }</td><td style="padding:6px;border:1px solid #ddd;text-align:right">${formatValueToNumber(
                  it.total ?? it.valor ?? it.preco,
                ).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}</td></tr>`,
            )
            .join("")
        : "";

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, Helvetica, sans-serif; font-size:12px; }
              .header { margin-bottom: 8px; }
              .header-top { display: flex; align-items: center; }
              .header-right { flex: 1; text-align: center; font-size: 11px; }
              .empresa { font-size: 14px; font-weight: bold; }
              .endereco { font-size: 11px; margin-top: 2px; }
              .logo { height: 80px; margin-right: 10px; }
              table { width:100%; border-collapse:collapse; margin-top:8px; }
              th, td { border:1px solid #ddd; padding:6px; }
              th { background:#f3f3f3; text-align:left; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-top">
                <img class="logo" src="${logoUri}" alt="Logo" />
                <div class="header-right">
                  <div class="empresa">Reforlimer reformas e construções</div>
                  <div class="endereco">Avenida Laranjeiras, nº 701</div>
                  <h3>Venda</h3>
                </div>
              </div>
            </div>
            <p>Cliente: ${cliente}</p>
            <p>Data: ${data}</p>
            <p>Valor: R$ ${valorNum.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}</p>
            ${
              itensHtml
                ? `<h4>Itens</h4><table><thead><tr><th>Nome</th><th>Qtd</th><th style="text-align:right">Total</th></tr></thead><tbody>${itensHtml}</tbody></table>`
                : ""
            }
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await shareAsync(uri);
    } catch (error) {
      console.error("handlePrintSale error:", error);
      Alert.alert("Erro", "Não foi possível imprimir a venda.");
    }
  }

  const renderItem = function ({ item }: any) {
    return (
      <View style={localStyles.cardBorder}>
        <View style={localStyles.cardInner}>
          <CardVendas data={item} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={lista}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          ) : (
            <View style={localStyles.empty}>
              <Text>
                {isLoading
                  ? "Carregando..."
                  : "Sem vendas no período selecionado"}
              </Text>
              <Button
                title="Recarregar"
                onPress={() => fetchVendas(date, date2)}
              />
            </View>
          )
        }
        contentContainerStyle={
          lista.length === 0 ? styles.emptyContainer : { paddingBottom: 120 }
        }
      />

      <View style={styles.containerFloat}>
        <TouchableOpacity
          style={styles.CartButton}
          onPress={() => navigation.push("NovaVenda", { id_reg: "0" })}
        >
          <Ionicons name="add-outline" size={35} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  cardBorder: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 0,
    marginBottom: 6,
    backgroundColor: "#fff",
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardInner: {
    padding: 4,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  nfButton: {
    marginTop: 12,
    backgroundColor: "#1f8d4d",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  nfButtonText: {
    color: "#fff",
    fontFamily: fonts.text,
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },
});

export default Venda;
