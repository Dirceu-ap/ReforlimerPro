import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Keyboard,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../services/api";
import { showMessage } from "react-native-flash-message";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { format } from "date-fns";
import { AntDesign } from "@expo/vector-icons";
import { RectButton } from "react-native-gesture-handler";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system";
import { shareAsync } from "expo-sharing";
import { SelectField } from "../../components/SelectField";

type ParamList = {
  Detail: {
    subTotal: string;
    clienteId: string;
    clienteNome?: string;
  };
};

const FecharVenda: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ParamList, "Detail">>();
  const subTot = route?.params?.subTotal || "0";
  const clienteId = route?.params?.clienteId || "";
  const clienteNome = route?.params?.clienteNome || "";

  const [subTotal, setSubTotal] = useState(subTot);
  const [desconto, setDesconto] = useState("0");
  const [acrescimo, setAcrescimo] = useState("0");
  const [parcelas, setParcelas] = useState("1");
  const [totalReceb, setTotalReceb] = useState("");
  // status será definido automaticamente pela data de vencimento
  const [statusVenda, setStatusVenda] = useState<string>("Concluída");
  const [loading, setLoading] = useState(false);
  const [sucess, setSucess] = useState(false);

  // data de vencimento
  const [vencimento, setVencimento] = useState<Date>(new Date());
  const [vencimentoTexto, setVencimentoTexto] = useState(
    format(new Date(), "dd/MM/yyyy"),
  );
  const [showVenc, setShowVenc] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("Dinheiro");

  const parseNumber = (val: string | number) => {
    if (val === undefined || val === null || val === "") return 0;
    let s = String(val).trim();
    // remover caracteres que não sejam dígito, ponto, vírgula ou sinal
    s = s.replace(/[^\d\.,-]/g, "");
    if (s === "") return 0;
    // caso tenha vírgula -> tratar vírgula como separador decimal (remover pontos de milhar)
    if (s.indexOf(",") > -1) {
      s = s.replace(/\./g, "").replace(",", ".");
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : 0;
    }
    // sem vírgula: ponto é decimal (ou não há separador) -> parse direto
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  const formatBR = (num: number) =>
    num.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // calcula total final baseado no subtotal recebido + acrescimo - desconto
  const calcularTotalFinal = () => {
    const subNum = parseNumber(subTotal);
    const descNum = parseNumber(desconto);
    const acrNum = parseNumber(acrescimo);
    const finalNum = subNum - descNum + acrNum;
    return finalNum;
  };

  const totalFinal = calcularTotalFinal();

  // converte string dd/MM/yyyy para Date
  const parseDateBr = (value: string): Date | null => {
    const parts = value.split("/");
    if (parts.length !== 3) return null;
    const [dia, mes, ano] = parts.map((p) => parseInt(p, 10));
    if (!dia || !mes || !ano) return null;
    const dt = new Date(ano, mes - 1, dia);
    return isNaN(dt.getTime()) ? null : dt;
  };

  // define automaticamente o status da venda com base na data de vencimento
  // regra desejada: se data > hoje -> Pendente, se data <= hoje -> Concluída
  const atualizarStatusPorVencimento = (dt: Date) => {
    const hoje = new Date();
    const hojeSemHora = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate(),
    ).getTime();
    const dataSemHora = new Date(
      dt.getFullYear(),
      dt.getMonth(),
      dt.getDate(),
    ).getTime();

    if (dataSemHora > hojeSemHora) {
      setStatusVenda("Pendente");
    } else {
      setStatusVenda("Concluída");
    }
  };

  // handler do DateTimePicker nativo (Android e iOS)
  const onChangeVencimento = (event: any, selectedDate?: Date) => {
    // após escolher uma data, fechar o picker em ambas plataformas
    setShowVenc(false);
    if (selectedDate) {
      const currentDate = selectedDate || vencimento;
      setVencimento(currentDate);
      setVencimentoTexto(format(currentDate, "dd/MM/yyyy"));
      atualizarStatusPorVencimento(currentDate);
    }
  };

  async function finalizarVenda() {
    if (!clienteId || !subTotal || parcelas === "") {
      showMessage({
        message: "Dados incompletos",
        description: "Preencha campos obrigatórios.",
        type: "warning",
      });
      console.log("FecharVenda: dados incompletos", {
        clienteId,
        subTotal,
        parcelas,
      });
      return;
    }

    setLoading(true);
    try {
      // usa exatamente o mesmo valor de @user que NovaVenda
      // envia para inserir-item / listar-itens, garantindo que o backend
      // encontre e limpe os itens corretamente ao salvar a venda
      const userId = await AsyncStorage.getItem("@user");

      // enviar para o backend a MESMA data escolhida para vencimento;
      // o PHP usa este campo ($data) para decidir se a venda fica
      // Concluída (data == hoje e parcelas == 1) ou Pendente
      const dataVendaF = format(vencimento, "yyyy-MM-dd");
      const vencimentoIso = format(vencimento, "yyyy-MM-dd");
      const vencimentoBr = format(vencimento, "dd/MM/yyyy");
      const dataVendaBr = format(new Date(), "dd/MM/yyyy");
      const dataVendaFull = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      const vencimentoFull = format(vencimento, "yyyy-MM-dd HH:mm:ss");
      let recebidoNum = parseNumber(totalReceb);

      // se usuário marcar como Concluída e não informar valor recebido,
      // assumir que recebeu o total da venda
      if (statusVenda === "Concluída" && recebidoNum === 0) {
        recebidoNum = Number(totalFinal);
        if (Number(totalFinal) > 0) {
          setTotalReceb(Number(totalFinal).toFixed(2).toString());
        }
      }

      const hasPagamento = recebidoNum > 0;
      const dataPgtoIso = hasPagamento ? format(new Date(), "yyyy-MM-dd") : "";
      const dataPgtoBr = hasPagamento ? format(new Date(), "dd/MM/yyyy") : "";
      const dataPgtoFull = hasPagamento
        ? format(new Date(), "yyyy-MM-dd HH:mm:ss")
        : "";

      // envia múltiplas chaves/formatos para garantir que o backend grave data_lanc, data_pgto e data_venc (colunas reais)
      const obj: any = {
        // identificação / fluxo
        pagamento: paymentMethod,
        pagamento_tipo: paymentMethod,
        lancamento: "Caixa",
        status: statusVenda,

        // data da venda (enviar data_lanc em ISO e BR)
        dataVenda: dataVendaF,
        data_venda: dataVendaF,
        data_lanc: dataVendaF, // chave usada no DB: data_lanc (YYYY-MM-DD)
        data_lanc_br: dataVendaBr,
        data_lanc_h: dataVendaFull,
        data_lanc_iso: dataVendaF,

        // data de pagamento (se houver)
        data_pgto: dataPgtoIso, // coluna no DB: data_pgto (YYYY-MM-DD) ou NULL
        data_pgto_br: dataPgtoBr,
        data_pgto_h: dataPgtoFull,
        pagamento_data: dataPgtoIso,

        // vencimento (enviar para coluna data_venc)
        vencimento: vencimentoIso,
        data_venc: vencimentoIso, // chave usada no DB: data_venc (YYYY-MM-DD)
        data_venc_br: vencimentoBr,
        data_vencimento: vencimentoIso,
        data_vencimento_br: vencimentoBr,
        vencimento_h: vencimentoFull,

        // valores
        desconto: parseNumber(desconto).toFixed(2),
        acrescimo: parseNumber(acrescimo).toFixed(2),
        subtotal: parseNumber(subTotal).toFixed(2),
        valor: totalFinal.toFixed(2),
        total: totalFinal.toFixed(2),
        valor_total: totalFinal.toFixed(2),
        recebido: recebidoNum.toFixed(2),
        totalReceb: recebidoNum.toFixed(2),

        parcelas,
        cliente: clienteId,
        user: userId,
      };

      console.log("FecharVenda: enviando para API", obj);
      const res = await api.post("vendas/salvar.php", obj);
      console.log("FecharVenda: resposta API", res.data);

      if (res.data && res.data.sucesso) {
        showMessage({
          message: "Venda realizada",
          description: res.data.mensagem || "Venda fechada com sucesso!",
          type: "success",
        });
        setSucess(true);

        setTimeout(() => {
          setSucess(false);
          // Volta para o fluxo principal e seleciona a aba Vendas
          navigation.navigate("Home", {
            screen: "Vendas",
            params: { refreshKey: Date.now() },
          });
        }, 900);
      } else {
        showMessage({
          message: "Erro ao fechar venda",
          description: res.data?.mensagem || "Tente novamente.",
          type: "danger",
        });
        console.log("FecharVenda: API retornou erro", res.data);
      }
    } catch (error) {
      console.error("FecharVenda: exception", error);
      showMessage({
        message: "Erro",
        description: "Não foi possível fechar a venda.",
        type: "danger",
      });
    } finally {
      setLoading(false);
    }
  }

  // helper para parsear números em formato BR (aceita "1.234,56" / "1234.56" / number)
  function parseBRNumber(value: any): number {
    if (value === undefined || value === null) return 0;
    if (typeof value === "number") return value;
    let s = String(value).trim();
    if (!s) return 0;
    s = s.replace(/[^0-9.,-]/g, "");
    if (s.indexOf(".") > -1 && s.indexOf(",") > -1) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.indexOf(",") > -1 && s.indexOf(".") === -1) {
      s = s.replace(",", ".");
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  // agrupa um array de itens por data de vencimento e retorna lista { date, total }
  function aggregateByVencimento(items: any[]) {
    const map = new Map<string, number>();
    items.forEach((it) => {
      // suportar nomes diferentes de campo vencimento
      const raw = it.vencimento ?? it.data_venc ?? it.data ?? it.vcto ?? "";
      let key = "Sem Vencimento";
      if (raw) {
        try {
          const d = new Date(raw);
          if (!isNaN(d.getTime())) key = format(d, "yyyy-MM-dd");
        } catch {
          key = String(raw);
        }
      }
      const valor = parseBRNumber(
        it.valor ??
          it.total ??
          it.subtotal ??
          it.valor_total ??
          it.valor_receber ??
          0,
      );
      map.set(key, (map.get(key) || 0) + valor);
    });
    return Array.from(map.entries()).map(([date, total]) => ({ date, total }));
  }

  // gera PDF (ou HTML) com totais por data de vencimento
  async function gerarRelatorioPorVencimento(items: any[]) {
    try {
      const rowsArr = aggregateByVencimento(items).sort((a, b) =>
        a.date < b.date ? -1 : 1,
      );

      const rowsHtml = rowsArr
        .map(
          (r) =>
            `<tr>
               <td style="padding:6px;border:1px solid #ddd">${
                 r.date === "Sem Vencimento"
                   ? r.date
                   : format(new Date(r.date), "dd/MM/yyyy")
               }</td>
               <td style="padding:6px;border:1px solid #ddd;text-align:right">R$ ${r.total.toLocaleString(
                 "pt-BR",
                 { minimumFractionDigits: 2, maximumFractionDigits: 2 },
               )}</td>
             </tr>`,
        )
        .join("");

      const grandTotal = rowsArr.reduce((s, x) => s + x.total, 0);

      const html = `
        <html>
          <head>
            <meta charset="utf-8"/>
            <style>
              body{font-family:Arial,Helvetica,sans-serif;font-size:12px}
              table{width:100%;border-collapse:collapse;margin-top:8px}
              th,td{border:1px solid #ddd;padding:8px}
              th{background:#f3f3f3;text-align:left}
              .right{text-align:right}
            </style>
          </head>
          <body>
            <h3>Relatório por Vencimento</h3>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th style="text-align:right">Total (R$)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr>
                  <td style="padding:6px;border:1px solid #ddd"><strong>Total Geral</strong></td>
                  <td style="padding:6px;border:1px solid #ddd;text-align:right"><strong>R$ ${grandTotal.toLocaleString(
                    "pt-BR",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}</strong></td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const printRes = await Print.printToFileAsync({ html });
      const uri = (printRes && (printRes.uri || (printRes as any))) || "";
      if (!uri) {
        console.warn("Relatório: URI inválida");
        return;
      }

      const basePath =
        ((FileSystem as any).cacheDirectory ??
          (FileSystem as any).documentDirectory) ||
        "";
      const normalizedBase =
        basePath !== "" && !basePath.endsWith("/") ? `${basePath}/` : basePath;
      const filePath = `${normalizedBase}rel_vencimentos_${Date.now()}.pdf`;

      try {
        if (uri.startsWith("data:")) {
          const base64 = uri.split(",")[1] || "";
          await FileSystem.writeAsStringAsync(filePath, base64, {
            encoding: (FileSystem as any).EncodingType?.Base64 ?? "base64",
          });
          await shareAsync(filePath);
        } else {
          await shareAsync(uri);
        }
      } catch (err) {
        console.error("Erro ao salvar/compartilhar relatório:", err);
      }
    } catch (err) {
      console.error("Erro gerarRelatorioPorVencimento:", err);
    }
  }

  // desabilitar edição do campo Total Recebido quando venda está concluída
  const isConcluida = (() => {
    const rec = parseNumber(totalReceb);
    return Number(totalFinal) > 0 && rec >= Number(totalFinal);
  })();

  if (loading) {
    return (
      <View style={localStyles.center}>
        <ActivityIndicator size="large" color="#32B76C" />
      </View>
    );
  }

  if (sucess) {
    return (
      <View style={localStyles.center}>
        <Text style={localStyles.successText}>
          Venda realizada com sucesso!
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={localStyles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={localStyles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={localStyles.header}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Home", {
                  screen: "Vendas",
                })
              }
              style={localStyles.back}
            >
              <AntDesign name="arrow-left" size={22} color="#333" />
            </TouchableOpacity>
            <Text style={localStyles.title}>Finalizar Venda</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={localStyles.card}>
            <Text style={localStyles.cardLabel}>Cliente</Text>
            <Text style={localStyles.cardValue}>
              {clienteNome || "Diversos"}
            </Text>

            <Text style={[localStyles.cardLabel, { marginTop: 12 }]}>
              Subtotal (orig.)
            </Text>
            <Text style={localStyles.cardValue}>R$ {subTotal}</Text>

            <Text style={[localStyles.cardLabel, { marginTop: 12 }]}>
              Total Final
            </Text>
            <Text style={localStyles.totalValue}>
              R$ {formatBR(totalFinal)}
            </Text>

            {/* Status (somente leitura) */}
            <Text style={[localStyles.inputLabel, { marginTop: 16 }]}>
              Status da Venda
            </Text>
            <View
              style={[
                localStyles.input,
                { alignItems: "center", justifyContent: "center" },
              ]}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#000" }}>
                {statusVenda}
              </Text>
            </View>

            {/* Desconto */}
            <Text style={[localStyles.inputLabel, { marginTop: 16 }]}>
              Desconto
            </Text>
            <TextInput
              style={localStyles.input}
              value={desconto}
              onChangeText={setDesconto}
              onFocus={() => {
                console.log("FecharVenda: foco no campo Desconto");
              }}
              keyboardType="numeric"
              placeholder="0,00"
            />

            {/* Data de Vencimento */}
            <Text style={[localStyles.inputLabel, { marginTop: 16 }]}>
              Data de Vencimento
            </Text>
            <TouchableOpacity
              onPress={() => {
                console.log("FecharVenda: toque no campo Data de Vencimento");
                Keyboard.dismiss();
                setShowVenc(true);
              }}
              style={localStyles.dateButton}
              activeOpacity={0.7}
            >
              <Text style={localStyles.dateButtonText}>{vencimentoTexto}</Text>
              <AntDesign name="calendar" size={20} color="#333" />
            </TouchableOpacity>
            {showVenc && (
              <View
                style={{
                  marginTop: 8,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <DateTimePicker
                  testID="dateTimePickerVencimento"
                  value={vencimento}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={onChangeVencimento}
                  locale="pt-BR"
                />
              </View>
            )}

            {/* Forma de Pagamento */}
            <SelectField
              label="Forma de Pagamento"
              selectedValue={paymentMethod}
              onChange={(v) => setPaymentMethod(String(v))}
              options={[
                { label: "Dinheiro", value: "Dinheiro" },
                { label: "PIX", value: "PIX" },
                { label: "Cartão Crédito", value: "Cartão Crédito" },
                { label: "Cartão Débito", value: "Cartão Débito" },
                { label: "Transferência", value: "Transferência" },
                { label: "Cheque", value: "Cheque" },
              ]}
              labelStyle={[localStyles.inputLabel, { marginTop: 16 }]}
              containerStyle={localStyles.input}
            />

            {/* Total Recebido */}
            <Text style={[localStyles.inputLabel, { marginTop: 16 }]}>
              Total Recebido
            </Text>
            <TextInput
              style={[
                localStyles.input,
                isConcluida ? { backgroundColor: "#e9efe9" } : null,
              ]}
              value={totalReceb}
              onChangeText={setTotalReceb}
              keyboardType="numeric"
              placeholder="0,00"
              editable={!isConcluida && !sucess}
            />

            <RectButton
              style={localStyles.buttonPrimary}
              onPress={finalizarVenda}
            >
              <Text style={localStyles.buttonText}>Confirmar e Finalizar</Text>
            </RectButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f7fa" },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    justifyContent: "space-between",
  },
  back: {
    padding: 6,
    width: 40,
    alignItems: "flex-start",
  },
  title: { fontSize: 18, fontWeight: "700", textAlign: "center", flex: 1 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  cardLabel: { fontSize: 12, color: "#666" },
  cardValue: { fontSize: 16, color: "#222", fontWeight: "600" },
  totalValue: {
    fontSize: 22,
    color: "#0a9b55",
    fontWeight: "700",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    flexWrap: "wrap",
  },
  inputGroup: {
    width: "48%",
    minWidth: 140,
  },
  inputLabel: { fontSize: 12, color: "#666", marginBottom: 6 },
  input: {
    backgroundColor: "#f2f3f5",
    padding: 10,
    borderRadius: 8,
  },
  pickerWrapper: {
    backgroundColor: "#f2f3f5",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  pickerContainer: {
    backgroundColor: "#f2f3f5",
    borderRadius: 8,
    paddingHorizontal: 10,
    justifyContent: "center",
    minHeight: 20,
  },
  pickerAndroid: {
    flex: 1,
    width: "100%",
    color: "#000",
  },
  pickerIos: {
    flex: 1,
    width: "100%",
  },
  dateInput: { height: 20, justifyContent: "center" },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f2f3f5",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: "#222",
  },
  buttonPrimary: {
    marginTop: 16,
    backgroundColor: "#32B76C",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  successText: { fontSize: 18, color: "#32B76C", fontWeight: "700" },
});

export default FecharVenda;
