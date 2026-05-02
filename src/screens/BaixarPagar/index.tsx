import React, { useState, useEffect, useRef } from "react";
import {
  Alert,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Share,
  Image,
} from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/core";
import { RectButton } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./styles";
import { Success } from "../../lotties/Success";
import { showMessage, hideMessage } from "react-native-flash-message";
import api from "../../services/api";
import * as Print from "expo-print";
import { SelectField } from "../../components/SelectField";

// Tipagem dos parâmetros recebidos pela rota
type ParamList = {
  Detail: {
    id_reg: string;
    valor_conta?: string;
    devolucao?: string;
    desconto?: string;
    desconto_perc?: string;
    acrescimo?: string;
    acrescimo_perc?: string;
  };
};

type ReceiptData = {
  id: string;
  valorOriginal: string;
  valorPago: string;
  multa: string;
  juros: string;
  desconto: string;
  saida: string;
  usuario: string;
  clienteFornecedor: string; // nome do cliente/fornecedor
  saldoTitulo: string; // saldo = valor original - valor pago
};

const BaixarPagar: React.FC = () => {
  const navigation: any = useNavigation();

  const logoUri = Image.resolveAssetSource(
    require("../../assets/logo2.png"),
  ).uri;

  // Recupera os parâmetros da rota
  const route = useRoute<RouteProp<ParamList, "Detail">>();
  const id_reg = route?.params?.id_reg;
  const valor_conta = String(route?.params?.valor_conta ?? "0");
  const devolucaoParam = String(route?.params?.devolucao ?? "0");
  const descontoParam = String(route?.params?.desconto ?? "0");
  const descontoPercParam = String(route?.params?.desconto_perc ?? "0");
  const acrescimoParam = String(route?.params?.acrescimo ?? "0");
  const acrescimoPercParam = String(route?.params?.acrescimo_perc ?? "0");

  // Estados dos campos do formulário e controles
  let [valor, setValor] = useState(valor_conta);
  const [saida, setSaida] = useState("Caixa");
  let [multa, setMulta] = useState("");
  let [juros, setJuros] = useState("");
  let [devolucao, setDevolucao] = useState(devolucaoParam);
  let [desconto, setDesconto] = useState(descontoParam);
  let [descontoPerc, setDescontoPerc] = useState(descontoPercParam);
  let [acrescimo, setAcrescimo] = useState(acrescimoParam);
  let [acrescimoPerc, setAcrescimoPerc] = useState(acrescimoPercParam);
  let [subtotal, setSubtotal] = useState(valor_conta);
  const [valorContaOriginal, setValorContaOriginal] = useState(valor_conta);
  const [diasAtraso, setDiasAtraso] = useState(0);

  const [lista_for, setListaFor] = useState<any[]>([]);

  const [sucess, setSucess] = useState(false);
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const savingRef = useRef(false);

  function parseDateFlexible(value: any): Date | null {
    const raw = String(value ?? "").trim();
    if (!raw) return null;

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const [y, m, d] = raw.substring(0, 10).split("-").map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [d, m, y] = raw.split("/").map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function calcularDiasAtraso(vencimentoValue: any): number {
    const vencDate = parseDateFlexible(vencimentoValue);
    if (!vencDate) return 0;

    const hoje = new Date();
    const hojeSemHora = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate(),
    );
    const vencSemHora = new Date(
      vencDate.getFullYear(),
      vencDate.getMonth(),
      vencDate.getDate(),
    );

    const msDia = 24 * 60 * 60 * 1000;
    return Math.max(
      0,
      Math.floor((hojeSemHora.getTime() - vencSemHora.getTime()) / msDia),
    );
  }

  const formatCurrencyBR = (value: string | number) => {
    const num =
      typeof value === "number"
        ? value
        : parseFloat(String(value).replace(",", "."));

    if (isNaN(num)) {
      return "0,00";
    }

    return num.toFixed(2).replace(".", ",");
  };

  const buildReceiptText = (data: ReceiptData) => {
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, "0");
    const mes = String(now.getMonth() + 1).padStart(2, "0");
    const ano = now.getFullYear();
    const hora = String(now.getHours()).padStart(2, "0");
    const minuto = String(now.getMinutes()).padStart(2, "0");

    const dataHora = `${dia}/${mes}/${ano} ${hora}:${minuto}`;

    return (
      "COMPROVANTE DE PAGAMENTO" +
      "\n" +
      "Pagador: Reforlimer reformas e construção" +
      "\n" +
      (data.clienteFornecedor ? `Recebedor: ${data.clienteFornecedor}\n` : "") +
      "\n" +
      `Número do Título: ${data.id}` +
      "\n" +
      `Data da baixa: ${dataHora}` +
      "\n\n" +
      `Valor original: R$ ${formatCurrencyBR(data.valorOriginal)}` +
      "\n" +
      `Multa: R$ ${formatCurrencyBR(data.multa || "0")}` +
      "\n" +
      `Juros: R$ ${formatCurrencyBR(data.juros || "0")}` +
      "\n" +
      `Desconto: R$ ${formatCurrencyBR(data.desconto || "0")}` +
      "\n" +
      `Valor pago: R$ ${formatCurrencyBR(data.valorPago)}` +
      "\n" +
      `Forma de pagamento: ${data.saida}` +
      "\n" +
      `Saldo do Título: R$ ${formatCurrencyBR(data.saldoTitulo)}` +
      "\n" +
      `Atendido por: ${data.usuario}` +
      "\n\n" +
      "Obrigado pela preferência."
    );
  };

  const buildReceiptHtml = (data: ReceiptData) => {
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, "0");
    const mes = String(now.getMonth() + 1).padStart(2, "0");
    const ano = now.getFullYear();
    const hora = String(now.getHours()).padStart(2, "0");
    const minuto = String(now.getMinutes()).padStart(2, "0");

    const dataHora = `${dia}/${mes}/${ano} ${hora}:${minuto}`;

    const linhaPagador = data.clienteFornecedor
      ? `<div class="linha">Pagador: ${data.clienteFornecedor}</div>`
      : "";

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Comprovante de Pagamento</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 8px; }
            .cupom {
              width: 320px;
              margin: 0 auto;
              border: 1px dashed #000;
              padding: 8px 8px 12px;
            }
            .header {
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 4px;
              margin-bottom: 6px;
            }
            .logo {
              height: 60px;
              margin-bottom: 4px;
            }
            .empresa {
              font-size: 12px;
              font-weight: bold;
            }
            .titulo {
              font-size: 12px;
              margin-top: 2px;
            }
            .linha {
              font-size: 11px;
              line-height: 1.3;
            }
            .linha-centro {
              text-align: center;
              margin-top: 6px;
            }
            .separador {
              border-top: 1px dashed #000;
              margin: 4px 0;
            }
          </style>
        </head>
        <body>
          <div class="cupom">
            <div class="header">
              <img class="logo" src="${logoUri}" alt="Logo" />
              <div class="empresa">Reforlimer reformas e construção</div>
              <div class="titulo">COMPROVANTE DE PAGAMENTO</div>
            </div>
            <div class="linha">Recebedor: Reforlimer reformas e construção</div>
            ${linhaPagador}
            <div class="linha">Nº Título: ${data.id}</div>
            <div class="linha">Data da baixa: ${dataHora}</div>
            <div class="separador"></div>
            <div class="linha">Valor original: R$ ${formatCurrencyBR(
              data.valorOriginal,
            )}</div>
            <div class="linha">Multa: R$ ${formatCurrencyBR(
              data.multa || "0",
            )}</div>
            <div class="linha">Juros: R$ ${formatCurrencyBR(
              data.juros || "0",
            )}</div>
            <div class="linha">Desconto: R$ ${formatCurrencyBR(
              data.desconto || "0",
            )}</div>
            <div class="linha">Valor pago: R$ ${formatCurrencyBR(
              data.valorPago,
            )}</div>
            <div class="linha">Forma de pagamento: ${data.saida}</div>
            <div class="linha">Saldo do Título: R$ ${formatCurrencyBR(
              data.saldoTitulo,
            )}</div>
            <div class="linha">Atendido por: ${data.usuario}</div>
            <div class="linha-centro">Obrigado pela preferência.</div>
          </div>
        </body>
      </html>
    `;
  };

  const gerarComprovanteWhatsApp = async (data: ReceiptData) => {
    try {
      const message = buildReceiptText(data);
      await Share.share({ message });
      if (navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate("Pagar");
      }
    } catch (error) {
      Alert.alert(
        "Ops",
        "Não foi possível compartilhar o comprovante. Tente novamente.",
      );
    }
  };

  const imprimirComprovante = async (data: ReceiptData) => {
    try {
      const html = buildReceiptHtml(data);
      await Print.printAsync({ html });
      if (navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate("Pagar");
      }
    } catch (error) {
      Alert.alert(
        "Ops",
        "Não foi possível imprimir o comprovante. Tente novamente.",
      );
    }
  };

  // Busca as opções de saída (contas/caixas) ao carregar a tela
  async function selectListaForn() {
    try {
      const response = await api.get("pagar/listar_saida.php");
      setListaFor(response.data.resultado);
    } catch (error) {
      // log de teste removido
    }
  }

  async function loadContaData() {
    if (!id_reg) return;
    try {
      const res: any = await api.get(`pagar/listar_id.php?id=${id_reg}`);
      const dados = res?.data?.dados ?? {};

      const sanitize = (v: any) => {
        const t = String(v ?? "").trim();
        if (t === "" || t.toLowerCase() === "null") return "0";
        return t.replace(",", ".");
      };

      const valorDb = sanitize(dados?.valor ?? valor_conta ?? "0");
      const descontoPercDb = sanitize(
        dados?.desconto_perc ?? descontoPercParam,
      );
      const acrescimoPercDb = sanitize(
        dados?.acrescimo_perc ?? acrescimoPercParam,
      );
      let descontoDb = sanitize(dados?.desconto ?? descontoParam);
      let acrescimoDb = sanitize(dados?.acrescimo ?? acrescimoParam);

      // Se veio apenas percentual salvo, calcula o valor em R$ para exibir já preenchido.
      if (parseNum(descontoDb) <= 0 && parseNum(descontoPercDb) > 0) {
        descontoDb = aplicarPercentual(parseNum(valorDb), descontoPercDb);
      }
      if (parseNum(acrescimoDb) <= 0 && parseNum(acrescimoPercDb) > 0) {
        acrescimoDb = aplicarPercentual(parseNum(valorDb), acrescimoPercDb);
      }

      setValorContaOriginal(valorDb);
      setValor(valorDb);
      setSaida(String(dados?.saida ?? "Caixa").trim() || "Caixa");
      const dias = calcularDiasAtraso(dados?.vencimentoF ?? dados?.vencimento);
      setDiasAtraso(dias);
      // Multa padronizada: 2% fixo quando houver atraso.
      setMulta(dias > 0 ? (parseNum(valorDb) * 0.02).toFixed(2) : "0.00");
      // Juros padronizado: 0,0334% por dia de atraso.
      setJuros((parseNum(valorDb) * 0.000334 * dias).toFixed(2));
      setDevolucao(sanitize(dados?.devolucao ?? devolucaoParam));
      setDesconto(descontoDb);
      setDescontoPerc(descontoPercDb);
      setAcrescimo(acrescimoDb);
      setAcrescimoPerc(acrescimoPercDb);
      setSubtotal(sanitize(dados?.subtotal ?? valorDb));
    } catch (error) {
      console.log("Erro ao carregar conta para baixa (pagar):", error);
    }
  }

  function parseNum(value: string | number | undefined) {
    return parseFloat(String(value ?? "0").replace(",", ".")) || 0;
  }

  // Busca o nome do cliente/fornecedor para o título
  async function carregarNomeClienteFornecedor(
    idConta: string,
  ): Promise<string> {
    try {
      const res: any = await api.get(`pagar/listar_id.php?id=${idConta}`);
      if (res.data && res.data.dados) {
        const dados = res.data.dados;
        return dados.fornF || dados.descricao || "";
      }
      return "";
    } catch (error) {
      return "";
    }
  }

  // Calcula o subtotal sempre que algum campo de valor é alterado
  async function calcular() {
    const valorNum = parseNum(valor);
    const jurosNum = parseNum(juros);
    const multaNum = parseNum(multa);
    const descontoNum = parseNum(desconto);
    const devolucaoNum = parseNum(devolucao);
    const acrescimoNum = parseNum(acrescimo);

    try {
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
      setSubtotal(subtotalCalculado.toFixed(2)); // Formata para 2 casas decimais
    } catch (error) {
      Alert.alert("Ops", "Erro no cálculo do subtotal");
    }
  }

  function aplicarPercentual(base: number, percTexto: string) {
    const perc = parseNum(percTexto);
    if (!base || !perc) return "0";
    return ((base * perc) / 100).toFixed(2);
  }

  function calcularPercentual(base: number, valorTexto: string) {
    const valorNum = parseNum(valorTexto);
    if (!base || !valorNum) return "0";
    return ((valorNum * 100) / base).toFixed(2);
  }

  // Função para salvar os dados (dar baixa na conta)
  async function saveData() {
    if (savingRef.current) return;
    savingRef.current = true;
    setButtonDisabled(true);
    const user = await AsyncStorage.getItem("@user");
    const userName = (await AsyncStorage.getItem("@user_name")) || "";

    if (
      valor === "" ||
      valor === "0" ||
      parseFloat(valor.replace(",", ".")) >
        parseFloat(valorContaOriginal.replace(",", "."))
    ) {
      showMessage({
        message: "Erro ao Salvar",
        description: "Preencha os Valores Corretamente!",
        type: "warning",
      });
      setButtonDisabled(false);
      return;
    }

    try {
      const obj = {
        id: id_reg,
        valor: parseNum(valor),
        saida: saida,
        multa: parseNum(multa),
        juros: parseNum(juros),
        desconto: parseNum(desconto),
        subtotal: parseNum(subtotal),
        devolucao: parseNum(devolucao),
        desconto_perc: parseNum(descontoPerc),
        acrescimo: parseNum(acrescimo),
        acrescimo_perc: parseNum(acrescimoPerc),
        user: user || "default_user",
      };

      const res = await api.post("pagar/baixar.php", obj);

      if (!res.data.sucesso) {
        showMessage({
          message: "Erro ao Baixar",
          description: res.data.mensagem || "Erro desconhecido",
          type: "warning",
        });
        setButtonDisabled(false);
        return;
      }

      // Limpa os campos após sucesso
      setValor(valorContaOriginal);
      setMulta("");
      setJuros("");
      setDevolucao("0");
      setDesconto("0");
      setDescontoPerc("0");
      setAcrescimo("0");
      setAcrescimoPerc("0");
      setSubtotal(valorContaOriginal);

      showMessage({
        message: "Salvo",
        description: "Registro Salvo com Sucesso!",
        type: "success",
      });

      // Buscar nome do cliente/fornecedor para exibir no comprovante
      const nomeClienteFornecedor = await carregarNomeClienteFornecedor(
        String(id_reg),
      );

      // Calcular saldo do título = valor original - valor pago
      const valorOriginalNum =
        parseFloat(String(valorContaOriginal).replace(",", ".")) || 0;
      const valorPagoNum = parseFloat(String(subtotal).replace(",", ".")) || 0;

      // Se o valor pago for maior que o valor original,
      // o saldo do título deve ser 0 (nunca negativo).
      const bruto = valorOriginalNum - valorPagoNum;
      const saldoCalc = bruto <= 0 ? 0 : Math.round(bruto * 100) / 100;
      const saldoTitulo = saldoCalc.toFixed(2);

      const receiptData: ReceiptData = {
        id: String(id_reg),
        valorOriginal: String(valorContaOriginal),
        valorPago: String(subtotal),
        multa: multa || "0",
        juros: juros || "0",
        desconto: desconto || "0",
        saida,
        usuario: userName || "Usuário não informado",
        clienteFornecedor: nomeClienteFornecedor,
        saldoTitulo,
      };

      Alert.alert(
        "Baixa realizada",
        "Deseja gerar um comprovante de pagamento?",
        [
          {
            text: "WhatsApp",
            onPress: () => gerarComprovanteWhatsApp(receiptData),
          },
          {
            text: "Imprimir",
            onPress: () => imprimirComprovante(receiptData),
          },
          {
            text: "Fechar",
            style: "cancel",
            onPress: () => {
              if (navigation.canGoBack && navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("Pagar");
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Ops",
        "Erro ao salvar. Verifique sua conexão ou tente novamente.",
      );
    } finally {
      setButtonDisabled(false);
      savingRef.current = false;
    }
  }

  // Executa ao montar o componente: busca saídas e calcula subtotal inicial
  useEffect(() => {
    setLoading(true);
    Promise.all([selectListaForn(), loadContaData()])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    calcular();
  }, [valor, multa, juros, desconto, devolucao, acrescimo]);

  // Exibe loading enquanto carrega
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

  // Exibe animação de sucesso se necessário
  if (sucess) {
    return <Success />;
  }

  // Renderização da tela
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          {/* Cabeçalho com botão de voltar */}
          <View style={styles.Header}>
            <TouchableOpacity
              style={styles.BackButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons
                name="arrow-back-circle-outline"
                size={35}
                color="#484a4d"
              />
            </TouchableOpacity>

            <View style={styles.Title}>
              <Text style={styles.TitleText}>
                Baixar Conta - R$ {valorContaOriginal}
              </Text>
            </View>
          </View>

          {/* Formulário de baixa */}
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Campo Valor */}
            <View>
              <Text style={styles.TitleInputs}>Valor *</Text>
              <TextInput
                value={valor}
                onChangeText={(text) => {
                  setValor(text);
                  calcular();
                }}
                style={styles.TextInput}
                keyboardType="numeric"
              />
            </View>

            {/* Campo Saída (conta/caixa) */}
            <SelectField
              label="Saída"
              selectedValue={String(saida)}
              onChange={(value) => setSaida(String(value))}
              options={[
                { label: "Caixa (Movimento)", value: "Caixa" },
                ...lista_for.map((item: any) => ({
                  label: item.nome,
                  value: String(item.nome),
                })),
              ]}
              labelStyle={styles.TitleInputs}
              containerStyle={styles.TextInput}
            />

            {/* Campos Multa e Juros */}
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "space-between",
                width: "90%",
                alignSelf: "center",
              }}
            >
              <View style={{ width: "50%" }}>
                <Text style={styles.TitleInputs}>Multa R$ (2% no atraso)</Text>
                <TextInput
                  value={multa}
                  onChangeText={(text) => {
                    setMulta(text);
                    calcular();
                  }}
                  style={styles.TextInput}
                  keyboardType="numeric"
                />
                {diasAtraso > 0 ? (
                  <Text style={{ fontSize: 11, color: "#666", marginLeft: 4 }}>
                    Atraso: {diasAtraso} dia(s)
                  </Text>
                ) : null}
              </View>

              <View style={{ width: "50%" }}>
                <Text style={styles.TitleInputs}>Júros R$ (0,33% a.d.)</Text>
                <TextInput
                  value={juros}
                  onChangeText={(text) => {
                    setJuros(text);
                    calcular();
                  }}
                  style={styles.TextInput}
                  keyboardType="numeric"
                />
                {diasAtraso > 0 ? (
                  <Text style={{ fontSize: 11, color: "#666", marginLeft: 4 }}>
                    Atraso: {diasAtraso} dia(s)
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Campos Desconto e Subtotal */}
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "space-between",
                width: "90%",
                alignSelf: "center",
              }}
            >
              <View style={{ width: "50%" }}>
                <Text style={styles.TitleInputs}>Devolução R$</Text>
                <TextInput
                  value={devolucao}
                  onChangeText={(text) => {
                    setDevolucao(text.replace(",", "."));
                  }}
                  style={styles.TextInput}
                  keyboardType="numeric"
                />
              </View>

              <View style={{ width: "50%" }}>
                <Text style={styles.TitleInputs}>Desconto R$</Text>
                <TextInput
                  value={desconto}
                  onChangeText={(text) => {
                    setDesconto(text.replace(",", "."));
                    setDescontoPerc(
                      calcularPercentual(
                        parseNum(valor),
                        text.replace(",", "."),
                      ),
                    );
                  }}
                  style={styles.TextInput}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "space-between",
                width: "90%",
                alignSelf: "center",
              }}
            >
              <View style={{ width: "50%" }}>
                <Text style={styles.TitleInputs}>Desconto %</Text>
                <TextInput
                  value={descontoPerc}
                  onChangeText={(text) => {
                    const perc = text.replace(",", ".");
                    setDescontoPerc(perc);
                    setDesconto(aplicarPercentual(parseNum(valor), perc));
                  }}
                  style={styles.TextInput}
                  keyboardType="numeric"
                />
              </View>

              <View style={{ width: "50%" }}>
                <Text style={styles.TitleInputs}>Acréscimo R$</Text>
                <TextInput
                  value={acrescimo}
                  onChangeText={(text) => {
                    setAcrescimo(text.replace(",", "."));
                    setAcrescimoPerc(
                      calcularPercentual(
                        parseNum(valor),
                        text.replace(",", "."),
                      ),
                    );
                  }}
                  style={styles.TextInput}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "space-between",
                width: "90%",
                alignSelf: "center",
              }}
            >
              <View style={{ width: "50%" }}>
                <Text style={styles.TitleInputs}>Acréscimo %</Text>
                <TextInput
                  value={acrescimoPerc}
                  onChangeText={(text) => {
                    const perc = text.replace(",", ".");
                    setAcrescimoPerc(perc);
                    setAcrescimo(aplicarPercentual(parseNum(valor), perc));
                  }}
                  style={styles.TextInput}
                  keyboardType="numeric"
                />
              </View>

              <View style={{ width: "50%" }}>
                <Text style={styles.TitleInputs}>SubTotal</Text>
                <TextInput
                  value={subtotal}
                  style={styles.TextInput}
                  editable={false}
                />
              </View>
            </View>
          </ScrollView>

          {/* Botão de dar baixa */}
          <RectButton
            style={[styles.Button, buttonDisabled && { opacity: 0.5 }]}
            onPress={() => {
              if (!buttonDisabled && !savingRef.current) {
                setSucess(true);
                saveData();
                setSucess(false);
              }
            }}
            enabled={!buttonDisabled} // Desabilita o botão enquanto `buttonDisabled` for true
          >
            <Text style={styles.ButtonText}>
              {buttonDisabled ? "Salvando..." : "Dar Baixa"}
            </Text>
          </RectButton>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default BaixarPagar;
