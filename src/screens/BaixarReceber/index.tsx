import React, { useState, useEffect } from "react";
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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/core";
import { RectButton } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./styles";
import { Success } from "../../lotties/Success";
import { showMessage, hideMessage } from "react-native-flash-message";

import api from "../../services/api";
import { SelectField } from "../../components/SelectField";

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

const BaixarReceber: React.FC = () => {
  const navigation: any = useNavigation();

  const route = useRoute<RouteProp<ParamList, "Detail">>();
  const id_reg = route?.params?.id_reg;
  const valor_conta = String(route?.params?.valor_conta ?? "0");
  const devolucaoParam = String(route?.params?.devolucao ?? "0");
  const descontoParam = String(route?.params?.desconto ?? "0");
  const descontoPercParam = String(route?.params?.desconto_perc ?? "0");
  const acrescimoParam = String(route?.params?.acrescimo ?? "0");
  const acrescimoPercParam = String(route?.params?.acrescimo_perc ?? "0");

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

  const [lista_for, setListaFor] = useState<any[]>([]);
  const [valorContaOriginal, setValorContaOriginal] = useState(valor_conta);
  const [diasAtraso, setDiasAtraso] = useState(0);

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

  const [sucess, setSucess] = useState(false);
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);

  async function selectListaForn() {
    try {
      const response = await api.get("receber/listar_saida.php");

      setListaFor(response.data.resultado);
    } catch (error) {
      console.log(error);
    }
  }

  async function loadContaData() {
    if (!id_reg) return;
    try {
      const res = await api.get(`receber/listar_id.php?id=${id_reg}`);
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
      // Juros padronizado: 0,0334% por dia de atraso (mesma regra da cobranca PIX).
      setJuros((parseNum(valorDb) * 0.000334 * dias).toFixed(2));
      setDevolucao(sanitize(dados?.devolucao ?? devolucaoParam));
      setDesconto(descontoDb);
      setDescontoPerc(descontoPercDb);
      setAcrescimo(acrescimoDb);
      setAcrescimoPerc(acrescimoPercDb);
      setSubtotal(sanitize(dados?.subtotal ?? valorDb));
    } catch (error) {
      console.log("Erro ao carregar conta para baixa:", error);
    }
  }

  function parseNum(value: string | number | undefined) {
    return parseFloat(String(value ?? "0").replace(",", ".")) || 0;
  }

  async function calcular() {
    const valorNum = parseNum(valor);
    const jurosNum = parseNum(juros);
    const multaNum = parseNum(multa);
    const devolucaoNum = parseNum(devolucao);
    const descontoNum = parseNum(desconto);
    const acrescimoNum = parseNum(acrescimo);

    try {
      const subtotalCalculado =
        valorNum +
        multaNum +
        jurosNum +
        acrescimoNum -
        descontoNum -
        devolucaoNum;
      setSubtotal(subtotalCalculado.toFixed(2)); // Armazena como string formatada com 2 casas decimais
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

  async function saveData() {
    setButtonDisabled(true); // Desabilita o botão ao iniciar o salvamento
    const user = await AsyncStorage.getItem("@user");

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
      setButtonDisabled(false); // Reabilita o botão após a operação
      return;
    }

    try {
      const obj = {
        id: id_reg,
        id_compra: id_reg,
        valor: parseNum(valor),
        saida: saida,
        multa: parseNum(multa),
        juros: parseNum(juros),
        desconto: parseNum(desconto),
        subtotal: parseNum(subtotal), // Converte o subtotal para número antes de enviar
        devolucao: parseNum(devolucao),
        desconto_perc: parseNum(descontoPerc),
        acrescimo: parseNum(acrescimo),
        acrescimo_perc: parseNum(acrescimoPerc),
        user: user || "default_user",
      };

      console.log("Dados enviados ao backend (receber/baixar.php):", obj);

      const res = await api.post("receber/baixar.php", obj);

      if (!res?.data?.sucesso) {
        showMessage({
          message: "Erro ao Baixar",
          description: res?.data?.mensagem || "Erro desconhecido",
          type: "warning",
        });
        return;
      }

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
      if (navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate("Receber");
      }
    } catch (error) {
      console.error("Erro ao salvar (receber/baixar.php):", error);
      Alert.alert(
        "Ops",
        "Erro ao salvar. Verifique sua conexão ou tente novamente.",
      );
    } finally {
      setButtonDisabled(false); // Reabilita o botão após a operação
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([selectListaForn(), loadContaData()])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    calcular();
  }, [valor, multa, juros, devolucao, desconto, acrescimo]);

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

  if (sucess) {
    return <Success />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
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

          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
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
                <Text style={styles.TitleInputs}>Júros R$ (0,0334% a.d.)</Text>
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

          <RectButton
            style={[styles.Button, buttonDisabled && { opacity: 0.5 }]}
            onPress={() => {
              if (!buttonDisabled) {
                setSucess(true);
                saveData();
                setSucess(false);
              }
            }}
            enabled={!buttonDisabled} // Desabilita o botão enquanto `buttonDisabled` for true
          >
            <Text style={styles.ButtonText}>Dar Baixa</Text>
          </RectButton>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default BaixarReceber;
