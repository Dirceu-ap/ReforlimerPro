import React, { useState, useEffect } from "react";
import {
  Platform,
  Image,
  Button,
  Alert,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/core";
import { RectButton } from "react-native-gesture-handler";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { add, format } from "date-fns";
import { styles } from "./styles";
import { Success } from "../../lotties/Success";
import { TextInputMask } from "react-native-masked-text";
import { showMessage, hideMessage } from "react-native-flash-message";
import * as ImagePicker from "expo-image-picker";
import api from "../../services/api";
import urlImg from "../../services/urlImg";
import { SelectField } from "../../components/SelectField";

type ParamList = {
  Detail: {
    subTotal: string;
    cliente: string;
    local?: string;
  };
};

const FecharCompra: React.FC = () => {
  const navigation: any = useNavigation();

  const route = useRoute<RouteProp<ParamList, "Detail">>();
  const subTot = route?.params?.subTotal;
  const cliente = route?.params?.cliente;
  const localParam = route?.params?.local ?? "";

  let [subTotal, setSubTotal] = useState(subTot.toString());

  let [parcelas, setParcelas] = useState("1");

  const [lista_saida, setListaSaida] = useState<any[]>([]);
  const [saida, setSaida] = useState("Caixa");

  const [doc, setDoc] = useState("Dinheiro");

  const [dataVenda, setDataVenda] = useState(new Date());
  const [show, setShow] = useState(false);

  const onChange = async (event: any, selectedDate: any) => {
    if (event.type === "set") {
      const currentDate = selectedDate || dataVenda;
      setDataVenda(currentDate);
    }
    setShow(false);
  };

  const showDatepicker = () => {
    setShow(true);
  };

  const [sucess, setSucess] = useState(false);

  const [loading, setLoading] = useState(false);

  const data = new FormData();

  async function parcelar(parcelasOverride?: string, dataOverride?: Date) {
    const user = await AsyncStorage.getItem("@user");

    const dataBase = dataOverride ?? dataVenda;
    const dataVendaF = format(dataBase, "yyyy-MM-dd");

    let parcelasToUse = parcelasOverride ?? parcelas;
    if (!parcelasToUse || parcelasToUse.trim() === "") {
      parcelasToUse = "1";
    }

    try {
      const obj = {
        user: user,
        subtotal: subTotal,
        data: dataVendaF,
        parcelas: parcelasToUse,
      };

      await api.post("compras/parcelar.php", obj);
    } catch (error) {
      Alert.alert("Ops", "Erro no cálculo das parcelas");
      setSucess(false);
    }
  }

  async function selectListaSaida() {
    try {
      const response = await api.get("compras/listar_entradas.php");

      setListaSaida(response.data.resultado);
    } catch (error) {
      console.log(error);
    }
  }

  async function saveData() {
    const user = await AsyncStorage.getItem("@user");
    const dataVendaF = format(dataVenda, "yyyy-MM-dd");

    if (parcelas == "") {
      showMessage({
        message: "Erro ao Salvar",
        description: "Preencha o número de Parcelas!",
        type: "warning",
      });
      setSucess(false);
      return;
    }

    try {
      const obj = {
        subtotal: subTotal,
        entrada: saida,
        parcelas: parcelas,

        dataVenda: dataVendaF,
        pagamento: doc,
        lancamento: saida,
        cliente: cliente,
        user: user,
        local: localParam,
      };

      const res = await api.post("compras/salvar.php", obj);

      if (res.data.sucesso === false) {
        showMessage({
          message: "Erro ao Salvar",
          description: res.data.mensagem,
          type: "warning",
        });
        setSucess(false);
        return;
      }

      showMessage({
        message: "Salvo",
        description: "Registro Salvo com Sucesso!!",
        type: "success",
      });

      setSucess(true);

      setTimeout(() => {
        setSucess(false);
        navigation.navigate("Compras", { refreshKey: Date.now() });
      }, 900);
    } catch (error) {
      Alert.alert("Ops", "Alguma coisa deu errado, tente novamente.");
      setSucess(false);
    }
  }

  useEffect(() => {
    selectListaSaida()
      .then(() => setLoading(false))
      .then(() => parcelar());
  }, []);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f7fa" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1, marginTop: 20 }}>
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
                <Text style={styles.TitleText}>Finalizar Compra</Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: "90%",
                alignSelf: "center",
              }}
            >
              <View style={{ width: "48%" }}>
                <Text style={styles.TitleInputs}>SubTotal</Text>

                <TextInput
                  placeholder="SubTotal "
                  onChangeText={(text) => setSubTotal(text)}
                  value={subTotal}
                  style={styles.TextInput}
                  editable={false}
                />
              </View>

              <View style={{ width: "48%" }}>
                <Text style={styles.TitleInputs}>Parcelas</Text>

                <TextInput
                  placeholder="Parcelas "
                  onChangeText={(text) => {
                    setParcelas(text);
                    parcelar(text);
                  }}
                  value={parcelas}
                  style={styles.TextInput}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View>
              <Text style={styles.TitleInputs}>
                Data Compra{" "}
                <TouchableOpacity
                  onPress={() => {
                    const d = add(new Date(), { days: 30 });
                    setDataVenda(d);
                    parcelar(undefined, d);
                  }}
                >
                  <Text style={{ fontSize: 14 }}>( 30 Dias </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const d = add(new Date(), { days: 60 });
                    setDataVenda(d);
                    parcelar(undefined, d);
                  }}
                >
                  <Text style={{ fontSize: 14 }}>/ 60 Dias </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const d = add(new Date(), { days: 90 });
                    setDataVenda(d);
                    parcelar(undefined, d);
                  }}
                >
                  <Text style={{ fontSize: 14 }}>/ 90 Dias )</Text>
                </TouchableOpacity>
              </Text>

              <TouchableOpacity
                style={styles.pickDate}
                onPress={() => setShow(true)}
              >
                <Text style={styles.date}>
                  {format(dataVenda, "dd/MM/yyyy")}
                </Text>
                <AntDesign
                  style={{
                    alignSelf: "center",
                    position: "absolute",
                    right: 25,
                  }}
                  name="caret-down"
                  size={10}
                  color="gray"
                />
              </TouchableOpacity>
            </View>

            {show && (
              <DateTimePicker
                testID="dateTimePicker"
                value={dataVenda}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={onChange}
                locale="pt-BR"
              />
            )}

            <SelectField
              label="Entrada"
              selectedValue={String(saida)}
              onChange={(value) => setSaida(String(value))}
              options={[
                { label: "Caixa (Movimento)", value: "Caixa" },
                ...lista_saida.map((item: any) => ({
                  label: item.nome,
                  value: String(item.nome),
                })),
              ]}
              labelStyle={styles.TitleInputs}
              containerStyle={styles.TextInput}
            />

            <SelectField
              label="Pagamento"
              selectedValue={String(doc)}
              onChange={(value) => setDoc(String(value))}
              options={[
                { label: "Dinheiro", value: "Dinheiro" },
                { label: "Boleto", value: "Boleto" },
                { label: "Cheque", value: "Cheque" },
                { label: "Conta Corrente", value: "Conta Corrente" },
                { label: "Conta Poupança", value: "Conta Poupança" },
                { label: "Carnê", value: "Carnê" },
                { label: "DARF", value: "DARF" },
                { label: "Depósito", value: "Depósito" },
                { label: "Transferências", value: "Transferências" },
                { label: "Pix", value: "Pix" },
              ]}
              labelStyle={styles.TitleInputs}
              containerStyle={styles.TextInput}
            />

            <RectButton
              style={styles.Button}
              onPress={() => {
                setSucess(true);
                saveData();
                setSucess(false);
              }}
            >
              <Text style={styles.ButtonText}>Finalizar Compra</Text>
            </RectButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default FecharCompra;
