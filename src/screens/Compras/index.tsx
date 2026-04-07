import React from "react";
import { useEffect, useState } from "react";
import fonts from "../../styles/fonts";
import {
  Text,
  Platform,
  ActivityIndicator,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  Modal,
  View,
  Dimensions,
  Alert,
  StyleSheet,
} from "react-native";
import { styles } from "./style";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/core";
import { add, format, parseISO, sub } from "date-fns";
import api from "../../services/api";
import Card from "../../components/CardCompras";
import Header from "../../components/Header";
import Title from "../../components/Title";
import DateTimePicker from "@react-native-community/datetimepicker";
import { RectButton } from "react-native-gesture-handler";
import { jsPDF } from "jspdf";
import * as FileSystem from "expo-file-system/legacy";
import { shareAsync } from "expo-sharing";
import { CommonActions } from "@react-navigation/native";

const Compra: React.FC = () => {
  const navigation: any = useNavigation();

  const [lista, setLista] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [busca, setBusca] = useState("");
  const [onEndReachedCalledDuringMomentum, setMT] = useState(true);

  const [date, setDate] = useState<any>(new Date());
  const [show, setShow] = useState<any>(false);

  const [date2, setDate2] = useState<any>(new Date());
  const [show2, setShow2] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  async function fetchData(startDate?: Date, endDate?: Date) {
    try {
      setIsLoading(true);

      const inicio = startDate ?? date;
      const fim = endDate ?? date2;

      const date1 = format(inicio, "yyyy-MM-dd");
      const dates2 = format(fim, "yyyy-MM-dd");

      // Recebe o texto puro da resposta (incluindo warnings)
      const response = await api.get(
        `compras/listar.php?data=${date1}&data1=${dates2}`,
        { responseType: "text" },
      );

      // Tenta extrair o JSON puro do texto, mesmo com warnings/HTML antes
      let resultado: any[] = [];
      try {
        const jsonStart = response.data.indexOf("{");
        const jsonEnd = response.data.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonString = response.data.substring(jsonStart, jsonEnd + 1);
          const jsonParsed = JSON.parse(jsonString);
          if (Array.isArray(jsonParsed.resultado)) {
            resultado = jsonParsed.resultado;
          } else if (jsonParsed.resultado && jsonParsed.resultado !== "0") {
            resultado = jsonParsed.resultado;
          } else {
            resultado = [];
          }
        }
      } catch (e) {
        console.error("Erro ao extrair JSON do retorno da API:", e);
        resultado = [];
      }

      console.log("Resultado final para setLista (compras):", resultado);

      // aplica filtro de busca local/cliente/pagamento/lancamento, se houver texto
      if (busca && busca.trim() !== "") {
        const termo = busca.trim().toLowerCase();
        const filtrado = resultado.filter((item: any) => {
          const cliente = (item.cliente || "").toString().toLowerCase();
          const local = (item.local || "").toString().toLowerCase();
          const pagamento = (item.pagamento || "").toString().toLowerCase();
          const lancamento = (item.lancamento || "").toString().toLowerCase();
          return (
            cliente.includes(termo) ||
            local.includes(termo) ||
            pagamento.includes(termo) ||
            lancamento.includes(termo)
          );
        });
        setLista(filtrado);
      } else {
        setLista(resultado);
      }

      if (resultado.length !== 0) {
        Alert.alert("Sucesso", "Dados carregados com sucesso!");
      } else {
        Alert.alert("Aviso", "Nenhum registro encontrado.");
      }
    } catch (error) {
      console.log("Erro ao buscar dados da API:", error);
      Alert.alert("Erro", "Falha ao carregar os dados.");
      setLista([]);
    } finally {
      setIsLoading(false);
    }
  }

  const onChange = async (event: any, selectedDate: any) => {
    if (event.type === "set") {
      const currentDate = selectedDate || date;
      setDate(currentDate);
      fetchData(currentDate, date2);
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
      const currentDate = selectedDate || date2;
      setDate2(currentDate);
      fetchData(date, currentDate);
    }
    if (Platform.OS === "android") {
      setShow2(false);
    }
  };

  const showDatepicker1 = () => {
    setShow2(true);
  };

  const renderItem = function ({ item }: any) {
    return (
      <View style={localStyles.cardBorder}>
        <View style={localStyles.cardInner}>
          <Card data={item} />
        </View>
      </View>
    );
  };

  function Footer(load: any) {
    if (!load) return null;

    return (
      <View style={styles.loading}>
        <ActivityIndicator size={25} color="#000" />
      </View>
    );
  }

  const gerarRelatorioPDF = async () => {
    try {
      if (lista.length === 0) {
        Alert.alert("Sem dados", "Nenhum registro encontrado para impressão.");
        return;
      }

      const periodo = `${format(date, "dd/MM/yyyy")} até ${format(
        date2,
        "dd/MM/yyyy",
      )}`;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginLeft = 20;
      const marginRight = 20;
      const marginTop = 30;
      const marginBottom = 40;
      const usableWidth = pageWidth - marginLeft - marginRight;
      let y = marginTop;

      const fmt = (n: number) =>
        n.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

      const parseNumber = (v: any) => {
        if (v === undefined || v === null) return 0;
        const s = String(v).trim().replace(/\./g, "").replace(",", ".");
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : 0;
      };

      const isCanceledStatus = (s: any) => {
        if (!s && s !== 0) return false;
        return String(s).toLowerCase().includes("cancel");
      };

      // resumo mapas (excluir canceladas do totalGeral)
      const map = new Map<string, { total: number; count: number }>();
      const statusMap = new Map<string, { total: number; count: number }>();

      const parseVencKey = (raw: any) => {
        if (!raw && raw !== 0) return "Sem Vencimento";
        const s = String(raw).trim().split(" ")[0];
        if (/\d{2}\/\d{2}\/\d{4}/.test(s)) return s;
        if (/\d{4}-\d{2}-\d{2}/.test(s)) {
          const [yyyy, mm, dd] = s.split("-");
          return `${dd}/${mm}/${yyyy}`;
        }
        try {
          const d = new Date(s);
          if (!isNaN(d.getTime()))
            return `${String(d.getDate()).padStart(2, "0")}/${String(
              d.getMonth() + 1,
            ).padStart(2, "0")}/${d.getFullYear()}`;
        } catch {}
        return "Sem Vencimento";
      };

      lista.forEach((item: any) => {
        const status = item.status ?? "Sem Status";
        const canceled = isCanceledStatus(status);
        const valor = parseNumber(
          item.valor ?? item.subtotal ?? item.recebido ?? 0,
        );

        const vencKey = parseVencKey(
          item.data_pgto ??
            item.data_venc ??
            item.vencimento ??
            item.data_lanc ??
            null,
        );
        if (!canceled) {
          const cur = map.get(vencKey) || { total: 0, count: 0 };
          cur.total += valor;
          cur.count += 1;
          map.set(vencKey, cur);
        }

        const curS = statusMap.get(status) || { total: 0, count: 0 };
        curS.total += canceled ? -Math.abs(valor) : valor;
        curS.count += 1;
        statusMap.set(status, curS);
      });

      const totalGeral = Array.from(map.values()).reduce(
        (s, v) => s + v.total,
        0,
      );

      // layout igual relatório Vendas
      const cols = {
        cliente: Math.floor(usableWidth * 0.3),
        pagamento: Math.floor(usableWidth * 0.14),
        lancamento: Math.floor(usableWidth * 0.16),
        dataLanc: Math.floor(usableWidth * 0.12),
        status: Math.floor(usableWidth * 0.14),
        valor: Math.floor(usableWidth * 0.14),
      };

      // GAP e cálculo de posições absolutas (garante alinhamento)
      const columnGap = 4; // reduzir espaço entre colunas levemente
      const colOrder = [
        cols.cliente,
        cols.pagamento,
        cols.lancamento,
        cols.dataLanc,
        cols.status,
        cols.valor,
      ];
      const colStart: number[] = [];
      colStart[0] = marginLeft;
      for (let i = 1; i <= colOrder.length; i++) {
        colStart[i] = colStart[i - 1] + colOrder[i - 1] + columnGap;
      }
      const tableLeft = colStart[0];
      const tableRight =
        colStart[colOrder.length - 1] + colOrder[colOrder.length - 1];
      const xCliente = colStart[0];
      const xPagamento = colStart[1];
      const xLanc = colStart[2];
      const xData = colStart[3];
      const xStatus = colStart[4];
      const xValorRight = tableRight - 6;

      // header
      doc.setFontSize(14);
      doc.text("Relatório de Compras", marginLeft, y);
      doc.setFontSize(10);
      doc.text(`Período: ${periodo}`, marginLeft, y + 16);
      y += 36;

      const newPageIfNeeded = (requiredHeight: number) => {
        if (y + requiredHeight > pageHeight - marginBottom) {
          doc.addPage();
          y = marginTop;
        }
      };

      // cabeçalho tabela (posições absolutas)
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const headerY = y;
      const headerLineHeight = 12; // reduzir espaço do cabeçalho
      doc.text("Cliente", xCliente, headerY);
      doc.text("Pagamento", xPagamento, headerY);
      doc.text("Lançamento", xLanc, headerY);
      doc.text("Data Lanç.", xData, headerY);
      doc.text("Status", xStatus, headerY);
      doc.text("Valor (R$)", xValorRight, headerY, { align: "right" });
      y += headerLineHeight;
      doc.setFont("helvetica", "normal");

      const fontSize = 9;
      const lineHeight = fontSize * 1.05; // reduzir altura da linha (menos espaçamento entre linhas)

      // linhas da tabela com grade alinhada
      lista.forEach((item: any) => {
        const cliente = item.cliente?.toString().trim() || "N/A";
        const local = item.local?.toString().trim() || "";
        const pagamento = item.pagamento?.toString().trim() || "N/A";
        const lancamento = item.lancamento?.toString().trim() || "N/A";
        const dataLanc = item.data_lanc || item.data || "N/A";
        const status = item.status || "N/A";
        const valorNum = parseNumber(
          item.valor ?? item.subtotal ?? item.recebido ?? 0,
        );
        const canceled = isCanceledStatus(status);
        const valorDisplay = canceled
          ? `-R$ ${fmt(Math.abs(valorNum))}`
          : `R$ ${fmt(valorNum)}`;

        const clienteFull = local ? `${cliente} - ${local}` : cliente;
        const clienteLines = doc.splitTextToSize(clienteFull, cols.cliente - 6);
        const pagamentoLines = doc.splitTextToSize(
          pagamento,
          cols.pagamento - 6,
        );
        const lancLines = doc.splitTextToSize(lancamento, cols.lancamento - 6);
        const dataLines = doc.splitTextToSize(
          String(dataLanc),
          cols.dataLanc - 6,
        );
        const statusLines = doc.splitTextToSize(status, cols.status - 6);
        const maxLines = Math.max(
          clienteLines.length,
          pagamentoLines.length,
          lancLines.length,
          dataLines.length,
          statusLines.length,
          1,
        );
        const blockHeight = Math.max(1, maxLines) * lineHeight + 2; // minimizar padding vertical

        newPageIfNeeded(blockHeight);

        const startY = y + 2; // deslocamento vertical reduzido
        const topY = y + 1;
        const bottomY = y + 1 + Math.max(blockHeight - 2, lineHeight);

        // bordas removidas: não desenhar retângulos/linhas no PDF — apenas texto

        // textos alinhados nas mesmas colunas
        doc.setFontSize(fontSize);
        doc.text(clienteLines, xCliente, startY);
        doc.text(pagamentoLines, xPagamento, startY);
        doc.text(lancLines, xLanc, startY);
        doc.text(dataLines, xData, startY);
        doc.text(statusLines, xStatus, startY);
        doc.text(valorDisplay, xValorRight, startY, { align: "right" });

        y += blockHeight + 2; // reduzir gap entre linhas
      });

      // Resumo por vencimento
      newPageIfNeeded(40);
      y += 10;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo por Data de Vencimento", marginLeft, y);
      y += 14;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Vencimento", marginLeft, y);
      doc.text("Qtd", marginLeft + usableWidth * 0.7, y);
      doc.text("Total (R$)", marginLeft + usableWidth - 2, y, {
        align: "right",
      });
      y += 12;

      const summaryKeys = Array.from(map.keys()).sort((a, b) => {
        if (a === "Sem Vencimento") return 1;
        if (b === "Sem Vencimento") return -1;
        const da = a.split("/").reverse().join("-");
        const db = b.split("/").reverse().join("-");
        return new Date(da).getTime() - new Date(db).getTime();
      });

      summaryKeys.forEach((k) => {
        newPageIfNeeded(16);
        const v = map.get(k)!;
        doc.text(String(k), marginLeft, y);
        doc.text(String(v.count), marginLeft + usableWidth * 0.7, y);
        doc.text(`R$ ${fmt(v.total)}`, marginLeft + usableWidth - 2, y, {
          align: "right",
        });
        y += 14;
      });

      // Resumo por Status
      newPageIfNeeded(40);
      y += 10;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo por Status", marginLeft, y);
      y += 14;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Status", marginLeft, y);
      doc.text("Qtd", marginLeft + usableWidth * 0.7, y);
      doc.text("Total (R$)", marginLeft + usableWidth - 2, y, {
        align: "right",
      });
      y += 12;

      const statusKeys = Array.from(statusMap.keys()).sort((a, b) => {
        const aCancel = isCanceledStatus(a) ? -1 : 0;
        const bCancel = isCanceledStatus(b) ? -1 : 0;
        if (aCancel !== bCancel) return aCancel - bCancel;
        return a.localeCompare(b);
      });

      statusKeys.forEach((k) => {
        newPageIfNeeded(16);
        const v = statusMap.get(k)!;
        const displayTotal =
          v.total < 0 ? `-R$ ${fmt(Math.abs(v.total))}` : `R$ ${fmt(v.total)}`;
        doc.text(String(k), marginLeft, y);
        doc.text(String(v.count), marginLeft + usableWidth * 0.7, y);
        doc.text(displayTotal, marginLeft + usableWidth - 2, y, {
          align: "right",
        });
        y += 14;
      });

      // Total Geral (exclui canceladas)
      newPageIfNeeded(40);
      y += 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Total Geral:", marginLeft, y);
      doc.text(`R$ ${fmt(totalGeral)}`, marginLeft + usableWidth - 2, y, {
        align: "right",
      });

      // salvar e compartilhar
      try {
        const dataUri = doc.output("datauristring");
        const pdfBase64 = dataUri.includes(",")
          ? dataUri.split(",")[1]
          : dataUri;
        const baseDir =
          (FileSystem && (FileSystem as any).documentDirectory) ||
          (FileSystem && (FileSystem as any).cacheDirectory) ||
          "";
        const fileName = `relatorio_compras_${Date.now()}.pdf`;
        const filePath = `${baseDir}${fileName}`;

        console.log(
          "Relatório: totalGeral =",
          totalGeral,
          "salvando em:",
          filePath,
        );

        await FileSystem.writeAsStringAsync(filePath, pdfBase64, {
          encoding: "base64" as any,
        });
        await shareAsync(filePath);
        Alert.alert("Sucesso", "Relatório gerado com sucesso!");
      } catch (err) {
        console.error("Erro ao salvar/compartilhar PDF:", err);
        Alert.alert("Erro", "Falha ao salvar/compartilhar o relatório.");
      }
    } catch (error) {
      console.error("Erro ao gerar relatório PDF:", error);
      Alert.alert("Erro", "Falha ao gerar relatório PDF.");
    }
  };

  useEffect(() => {
    // carrega compras do dia na abertura da tela
    fetchData();
  }, []);

  return (
    <View style={styles.container}>
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
            onPress={() => {
              console.log("Botão de impressão clicado"); // Log para verificar o clique
              gerarRelatorioPDF();
            }}
          >
            <MaterialIcons name="print" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={[styles.Title, { flex: 1, textAlign: "center" }]}>
            {"Lista de Compras"}
          </Text>
          <Text style={{ color: "#850404", marginRight: 10 }}>
            {"R$ " +
              lista
                .reduce((acc: number, item: any) => {
                  const valor = item.valor
                    ? parseFloat(
                        item.valor.replace(/\./g, "").replace(",", "."),
                      )
                    : 0;
                  return acc + valor;
                }, 0)
                .toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: 10 }}>
        <View style={[styles.containerSearch, { paddingHorizontal: 15 }]}>
          <TextInput
            style={styles.search}
            placeholder="Pesquisar por cliente, local, pagamento..."
            placeholderTextColor="gray"
            keyboardType="default"
            value={busca}
            onChangeText={(text) => setBusca(text)}
            returnKeyType="search"
            onSubmitEditing={() => fetchData()}
          />
        </View>

        <View style={styles.dates}>
          <RectButton
            style={styles.ButtonDates}
            onPress={() => {
              const d = sub(new Date(), { days: 1 });
              setDate(d);
              setDate2(d);
              fetchData(d, d);
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
              fetchData(today, today);
            }}
          >
            <Text style={styles.ButtonDatesText}>Hoje</Text>
          </RectButton>

          <RectButton
            style={styles.ButtonDates}
            onPress={() => {
              const tomorrow = add(new Date(), { days: 1 });
              setDate(tomorrow);
              setDate2(tomorrow);
              fetchData(tomorrow, tomorrow);
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

      <View style={{ paddingHorizontal: 15, flex: 1 }}>
        <View style={{ flex: 1, height: Dimensions.get("window").height + 30 }}>
          <FlatList
            data={lista}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            onEndReachedThreshold={0.1}
            removeClippedSubviews
            initialNumToRender={10}
            onEndReached={(distanceFromEnd) => {
              if (!onEndReachedCalledDuringMomentum) {
                fetchData().then(() => setLoading(false));
                setMT(true);
              }
            }}
            ListFooterComponent={(distanceFromEnd) => {
              if (!onEndReachedCalledDuringMomentum) {
                return <Footer load={loading} />;
              } else {
                return <View></View>;
              }
            }}
            onMomentumScrollBegin={() => setMT(false)}
            windowSize={10}
            getItemLayout={(data, index) => ({
              length: 44, // reduzir para refletir menos espaçamento na lista
              offset: 44 * index,
              index,
            })}
          />
        </View>

        <View style={styles.containerFloat}>
          <TouchableOpacity
            style={styles.CartButton}
            onPress={() => navigation.push("NovaCompra", { id_reg: "0" })}
          >
            <Ionicons name="add-outline" size={35} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default Compra;

const localStyles = StyleSheet.create({
  cardBorder: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 0, // padding interno agora na cardInner para evitar gap entre borda e conteúdo
    marginBottom: 6, // reduzir espaço entre cards na lista
    backgroundColor: "#fff",
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardInner: {
    padding: 4, // reduzir padding interno
  },
});
