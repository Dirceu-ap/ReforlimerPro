import React, { useState, useEffect, useRef } from "react";
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
  Modal,
} from "react-native";
// import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/core";
import { RectButton, ScrollView } from "react-native-gesture-handler";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { styles } from "./styles";
import { Success } from "../../lotties/Success";
import { TextInputMask, TextMaskMethods } from "react-native-masked-text";
import { showMessage, hideMessage } from "react-native-flash-message";
import * as ImagePicker from "expo-image-picker";
import api from "../../services/api";
import urlImgContas from "../../services/urlImgContas";
import datas from "../../components/Datas";
import { SelectField } from "../../components/SelectField";

// Tipagem dos parâmetros recebidos pela rota
type ParamList = {
  Detail: {
    id_reg: string;
    nome: string;
  };
};

const NovaContaReceber: React.FC = () => {
  const navigation: any = useNavigation();

  // Estados para campos do formulário e seleção de opções

  // Recupera parâmetro da rota (id_reg para edição ou novo)
  const route = useRoute<RouteProp<ParamList, "Detail">>();
  const id_reg = route?.params?.id_reg;

  // Estados dos campos principais
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [lista_forn, setListaForn] = useState<any[]>([]);
  const [forn, setForn] = useState("");
  const [localConta, setLocalConta] = useState("");
  const [lista_saida, setListaSaida] = useState<any[]>([]);
  const [saida, setSaida] = useState("Caixa");
  const [doc, setDoc] = useState("Dinheiro");
  const [lista_plano, setListaPlano] = useState<any[]>([]);
  const [plano, setPlano] = useState("");
  const [lista_desp, setListaDesp] = useState<any[]>([]);
  const [desp, setDesp] = useState("");
  const [lista_freq, setListaFreq] = useState<any[]>([]);
  const [freq, setFreq] = useState("");
  const [repeticoesRecorrencia, setRepeticoesRecorrencia] = useState("1");
  const [devolucao, setDevolucao] = useState("0");
  const [descontoPadrao, setDescontoPadrao] = useState("0");
  const [descontoPercPadrao, setDescontoPercPadrao] = useState("0");
  const [acrescimoPadrao, setAcrescimoPadrao] = useState("0");
  const [acrescimoPercPadrao, setAcrescimoPercPadrao] = useState("0");
  const [emissao, setEmissao] = useState(new Date());
  const [show, setShow] = useState(false);
  const [venc, setVenc] = useState(new Date());
  const [show2, setShow2] = useState(false);

  // Garante que datas vindas do backend (yyyy-MM-dd) não mudem de dia por causa de fuso horário
  function parseDateFromYMD(ymd: string | undefined | null): Date {
    if (!ymd) return new Date();
    const parts = String(ymd).split("-");
    if (parts.length !== 3) return new Date();
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!year || !month || !day) return new Date();
    // cria data no meio do dia para evitar qualquer ajuste de fuso
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  // Manipuladores de datas de emissão e vencimento
  const onChange = async (event: any, selectedDate: any) => {
    if (event.type === "set") {
      const currentDate = selectedDate || emissao;
      setEmissao(currentDate);
    }
    setShow(false);
  };
  const showDatepicker = () => {
    setShow(true);
  };
  const onChange2 = async (event: any, selectedDate: any) => {
    if (event.type === "set") {
      const currentDate = selectedDate || venc;
      setVenc(currentDate);
    }
    setShow2(false);
  };
  const showDatepicker1 = () => {
    setShow2(true);
  };

  // Estados de controle de tela
  const [sucess, setSucess] = useState(false); // Exibe animação de sucesso
  const [edit, setEdit] = useState(false); // Define se está editando ou inserindo
  const [loading, setLoading] = useState(false); // Loading da tela
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const savingRef = useRef(false);

  // Estados para imagem/anexo
  const [image, setImage] = useState<any>();
  const [nomeImagem, setNomeImagem] = useState("");
  const [anexoTipo, setAnexoTipo] = useState<"img" | "pdf" | "rar">("img");
  // Função para tirar foto e anexar ao registro
  const pickImage = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled) {
      return;
    }

    let localUri = result.assets[0].uri;
    let filename: any = localUri.split("/").pop();
    setNomeImagem(filename);

    let match = /\.(\w+)$/.exec(filename);
    let type = match ? `image/${match[1]}` : `image`;

    let formData = new FormData();
    const photo = {
      uri: localUri,
      type: type,
      name: filename,
    } as any;
    formData.append("photo", photo);
    setImage(result.assets[0].uri);
    setAnexoTipo("img");

    try {
      const res = await api.post("receber/upload.php", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("Upload receber OK", res.data);
    } catch (error: any) {
      console.log(
        "Erro upload receber",
        error?.response?.data || error?.message || error,
      );
      showMessage({
        message: "Erro no upload",
        description: "Não foi possível enviar o anexo (receber)",
        type: "danger",
      });
    }
  };

  // Função para escolher arquivo da galeria e anexar ao registro
  const pickImageArquivos = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled) {
      return;
    }

    let localUri = result.assets[0].uri;
    let filename: any = localUri.split("/").pop();
    setNomeImagem(filename);

    let match = /\.(\w+)$/.exec(filename);
    let type = match ? `image/${match[1]}` : `image`;

    let formData = new FormData();
    const photo = {
      uri: localUri,
      type: type,
      name: filename,
    } as any;
    formData.append("photo", photo);
    setImage(result.assets[0].uri);
    setAnexoTipo("img");

    try {
      const res = await api.post("receber/upload.php", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("Upload receber OK (galeria)", res.data);
    } catch (error: any) {
      console.log(
        "Erro upload receber (galeria)",
        error?.response?.data || error?.message || error,
      );
      showMessage({
        message: "Erro no upload",
        description: "Não foi possível enviar o anexo (receber)",
        type: "danger",
      });
    }
  };

  // Busca lista de clientes/fornecedores
  async function selectListaForn() {
    try {
      const response = await api.get("receber/listar_forn.php");
      const raw =
        response?.data?.resultado ??
        response?.data?.dados ??
        response?.data ??
        [];

      // normalizar cada item e garantir nome como string
      const normalized = (Array.isArray(raw) ? raw : []).map((it: any) => {
        const nome = String(it?.nome ?? "").trim();
        return { ...(it ?? {}), nome };
      });

      // usar Intl.Collator para ordenação correta em pt-BR (acento/maiúsculas)
      const collator = new Intl.Collator("pt-BR", {
        sensitivity: "base",
        ignorePunctuation: true,
      });
      normalized.sort((a: any, b: any) => collator.compare(a.nome, b.nome));

      setListaForn(normalized);
    } catch (error) {
      console.log(error);
    }
  }

  // Busca lista de entradas (contas/caixas)
  async function selectListaSaida() {
    try {
      const response = await api.get("receber/listar_saida.php");
      setListaSaida(response.data.resultado);
    } catch (error) {
      console.log(error);
    }
  }

  // Busca lista de frequências de recebimento
  async function selectListaFreq() {
    try {
      const response = await api.get("receber/listar_freq.php");
      setListaFreq(response.data.resultado);
    } catch (error) {
      console.log(error);
    }
  }

  // Busca lista de planos de contas (categorias de despesa) ordenada por nome
  async function selectListaPlano() {
    try {
      // reutiliza o mesmo endpoint de categorias usado em contas a pagar
      const response = await api.get("pagar/listar_plano.php");
      const raw = response?.data?.resultado ?? [];
      const arr = Array.isArray(raw) ? raw : [];

      const sorted = [...arr].sort((a: any, b: any) => {
        const nomeA = String(a?.nome ?? "").trim();
        const nomeB = String(b?.nome ?? "").trim();
        return nomeA.localeCompare(nomeB, "pt-BR", { sensitivity: "base" });
      });

      setListaPlano(sorted);
    } catch (error) {
      console.log(error);
    }
  }

  // Busca lista de despesas conforme plano (categoria) selecionado, ordenada por nome
  async function selectListaDesp(pl: string, des: string) {
    if (pl !== "" || id_reg === "0") {
      setPlano(pl);

      try {
        const response = await api.get(
          `receber/listar_desp.php?plano=${pl}&desp=${des}`,
        );
        const raw = response?.data?.resultado ?? [];
        const arr = Array.isArray(raw) ? raw : [];

        const sorted = [...arr].sort((a: any, b: any) => {
          const nomeA = String(a?.nome ?? "").trim();
          const nomeB = String(b?.nome ?? "").trim();
          return nomeA.localeCompare(nomeB, "pt-BR", { sensitivity: "base" });
        });

        setListaDesp(sorted);
      } catch (error) {
        console.log(error);
      }
    }

    if (des !== "") {
      setDesp(des);
    }
  }

  // Salva os dados do formulário (inserir ou editar conta a receber)
  async function saveData() {
    if (savingRef.current) return;
    savingRef.current = true;
    setButtonDisabled(true);

    try {
      const user = await AsyncStorage.getItem("@user");
      const emissaoF = format(emissao, "yyyy-MM-dd");
      const vencF = format(venc, "yyyy-MM-dd");

      // Validação dos campos obrigatórios
      if (valor == "") {
        showMessage({
          message: "Erro ao Salvar",
          description: "Preencha o campo valor!",
          type: "warning",
        });
        return;
      }

      if (forn == "" && descricao == "") {
        showMessage({
          message: "Erro ao Salvar",
          description: "Selecione um Fornecedor ou Coloque uma descrição!",
          type: "warning",
        });
        return;
      }

      const repeticoesNum = Number(String(repeticoesRecorrencia || "1"));
      if (repeticoesNum > 1 && !String(freq || "").trim()) {
        showMessage({
          message: "Erro ao Salvar",
          description:
            "Para lançamentos recorrentes, selecione uma frequência de recebimento.",
          type: "warning",
        });
        return;
      }

      const norm = (v: string) =>
        String(v ?? "0")
          .replace(",", ".")
          .trim();

      const obj = {
        id: id_reg,
        descricao: descricao,
        valor: valor,
        forn: forn,
        saida: saida,
        doc: doc,
        plano: plano,
        desp: desp,
        freq: freq,
        emissao: emissaoF,
        venc: vencF,
        foto: nomeImagem,
        user: user,
        local: localConta,
        devolucao: norm(devolucao),
        desconto: norm(descontoPadrao),
        desconto_perc: norm(descontoPercPadrao),
        acrescimo: norm(acrescimoPadrao),
        acrescimo_perc: norm(acrescimoPercPadrao),
        repeticoes: String(repeticoesRecorrencia || "1"),
      };

      const res = await api.post("receber/salvar.php", obj);

      if (res.data.sucesso === false) {
        showMessage({
          message: "Erro ao Salvar",
          description: res.data.mensagem,
          type: "warning",
        });

        return;
      }

      setValor("");
      setDescricao("");
      setNomeImagem("");
      setImage(null);

      showMessage({
        message: "Salvo",
        description: "Registro Salvo com Sucesso!!",
        type: "success",
      });
      if (navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate("Receber");
      }
    } catch (error) {
      Alert.alert("Ops", "Alguma coisa deu errado, tente novamente.");
      setSucess(false);
    } finally {
      setButtonDisabled(false);
      savingRef.current = false;
    }
  }

  // Carrega dados da conta para edição, se necessário
  async function loadData() {
    try {
      setLoading(true);
      if (id_reg != "0") {
        const res = await api.get(`receber/listar_id.php?id=${id_reg}`);

        setValor(res.data.dados.valor);
        setDescricao(res.data.dados.descricao);
        setForn(String(res.data.dados.forn ?? ""));
        setLocalConta(String(res.data.dados.local ?? ""));

        const planoBruto = String(res.data.dados.plano ?? "");
        let codigoDespesa = "";
        let nomePlano = "";

        if (planoBruto.includes(" - ")) {
          const partesPlano = planoBruto.split(" - ");
          codigoDespesa = partesPlano[0] ?? "";
          nomePlano = partesPlano[1] ?? "";
          setDesp(codigoDespesa);
          setPlano(nomePlano);
        } else if (planoBruto) {
          // Registros antigos: só havia um texto em plano_conta (ex: "Venda")
          // Usamos esse texto como categoria e deixamos a despesa em branco
          setPlano(planoBruto);
          setDesp("");
        }

        setSaida(String(res.data.dados.saida ?? "Caixa"));
        setDoc(res.data.dados.doc);
        setVenc(parseDateFromYMD(String(res.data.dados.vencimento)));
        setEmissao(parseDateFromYMD(String(res.data.dados.emis)));
        setFreq(res.data.dados.freq);
        setRepeticoesRecorrencia("1");

        const devolucaoConta = String(res.data.dados.devolucao ?? "0");
        const descontoConta = String(res.data.dados.desconto ?? "0");
        const descontoPercConta = String(res.data.dados.desconto_perc ?? "0");
        const acrescimoConta = String(res.data.dados.acrescimo ?? "0");
        const acrescimoPercConta = String(res.data.dados.acrescimo_perc ?? "0");

        setDevolucao(devolucaoConta);
        setDescontoPadrao(descontoConta);
        setDescontoPercPadrao(descontoPercConta);
        setAcrescimoPadrao(acrescimoConta);
        setAcrescimoPercPadrao(acrescimoPercConta);

        if (res.data.dados.arq && res.data.dados.arq !== "sem-foto.jpg") {
          setNomeImagem(String(res.data.dados.arq));
        }

        const thumb = String(res.data.dados.tumb ?? "").toLowerCase();
        const arq = String(res.data.dados.arq ?? "").toLowerCase();
        if (thumb === "pdf.png" || arq.endsWith(".pdf")) {
          setAnexoTipo("pdf");
          setImage("pdf-local");
        } else if (
          thumb === "rar.png" ||
          arq.endsWith(".rar") ||
          arq.endsWith(".zip")
        ) {
          setAnexoTipo("rar");
          setImage("rar-local");
        } else if (res.data.dados.tumb || res.data.dados.arq) {
          setAnexoTipo("img");
          setImage(
            urlImgContas +
              "contas/" +
              String(res.data.dados.tumb ?? res.data.dados.arq),
          );
        }

        if (nomePlano || codigoDespesa) {
          // Registros novos: conseguimos puxar a lista de despesas e marcar a correta
          selectListaDesp(nomePlano, codigoDespesa);
        }

        setEdit(false);
      } else {
        setEdit(true);
        setRepeticoesRecorrencia("1");
      }
    } catch (error) {
      console.log("Error ao carregar os Dados");
    }
  }

  // Carrega listas e dados iniciais ao abrir a tela
  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadData(),
      selectListaForn(),
      selectListaSaida(),
      selectListaPlano(),
      selectListaFreq(),
    ])
      .catch((error) => {
        console.log(
          "Erro ao carregar dados iniciais da conta a receber:",
          error,
        );
      })
      .finally(() => setLoading(false));
  }, []);

  // Exibe loading enquanto carrega dados
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

  // Exibe animação de sucesso após salvar
  if (sucess) {
    return <Success />;
  }

  // Renderização da tela de cadastro/edição de conta a receber
  return (
    <View style={{ flex: 1, marginTop: 20 }}>
      {/* Cabeçalho com botão de voltar e título */}
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
        {edit ? (
          <View style={styles.Title}>
            <Text style={styles.TitleText}>Inserir Registro</Text>
          </View>
        ) : (
          <View style={styles.Title}>
            <Text style={styles.TitleText}>Editar Registro</Text>
          </View>
        )}
      </View>

      {/* Formulário de cadastro/edição */}
      <ScrollView>
        {/* Cliente */}
        <SelectField
          label="Cliente"
          selectedValue={forn}
          onChange={(value) => setForn(value)}
          options={[
            { label: "Diversos", value: "" },
            ...lista_forn.map((item: any) => ({
              label: item.nome,
              value: String(item.id),
            })),
          ]}
          labelStyle={styles.TitleInputs}
          containerStyle={styles.TextInput}
        />

        {/* Valor */}
        <View>
          <Text style={styles.TitleInputs}>Valor *</Text>
          <TextInput
            placeholder="Valor "
            onChangeText={(text) => setValor(text)}
            value={valor}
            style={styles.TextInput}
            keyboardType="numeric"
          />
        </View>

        {/* Descrição */}
        <View>
          <Text style={styles.TitleInputs}>Descrição</Text>
          <TextInput
            placeholder="Descrição Caso Tenha"
            onChangeText={(text) => setDescricao(text)}
            value={descricao}
            style={styles.TextInput}
          />
        </View>

        {/* Local */}
        <View>
          <Text style={styles.TitleInputs}>Local</Text>
          <TextInput
            placeholder="Local (obra / endereço / setor)"
            onChangeText={(text) => setLocalConta(text)}
            value={localConta}
            style={styles.TextInput}
          />
        </View>

        {/* Entrada */}
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

        {/* Documento */}
        <SelectField
          label="Documento"
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

        {/* Categoria / Plano de Conta */}
        <SelectField
          label="Categoria / Plano de Conta"
          selectedValue={String(plano)}
          onChange={(value) => selectListaDesp(String(value), "")}
          options={lista_plano.map((item: any) => ({
            label: item.nome,
            value: String(item.nome),
          }))}
          labelStyle={styles.TitleInputs}
          containerStyle={styles.TextInput}
        />

        {/* Despesa */}
        <SelectField
          label="Despesa"
          selectedValue={String(desp)}
          onChange={(value) => setDesp(String(value))}
          options={lista_desp.map((item: any) => ({
            label: item.nome,
            value: String(item.nome),
          }))}
          labelStyle={styles.TitleInputs}
          containerStyle={styles.TextInput}
        />

        {/* Datas de emissão e vencimento */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            width: "90%",
            alignSelf: "center",
            marginTop: 17,
          }}
        >
          {/* Emissão */}
          <View style={{ width: "50%" }}>
            <View>
              <Text style={styles.titleInputHeader}>Emissão</Text>
              <TouchableOpacity
                style={styles.pickDate}
                onPress={() => setShow(true)}
              >
                <Text style={styles.date}>{format(emissao, "dd/MM/yyyy")}</Text>
                <AntDesign
                  style={{ alignSelf: "center", marginLeft: 15 }}
                  name="caret-down"
                  size={10}
                  color="gray"
                />
              </TouchableOpacity>
            </View>
            {Platform.OS === "ios" ? (
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
                      Selecionar emissão
                    </Text>
                    {show && (
                      <DateTimePicker
                        testID="dateTimePicker"
                        value={emissao}
                        mode="date"
                        display="inline"
                        onChange={onChange}
                        locale="pt-BR"
                        themeVariant="light"
                        style={{ width: "100%" }}
                      />
                    )}
                    <TouchableOpacity
                      style={{
                        marginTop: 10,
                        alignSelf: "flex-end",
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                      }}
                      onPress={() => setShow(false)}
                    >
                      <Text style={{ color: "#4CAF50", fontWeight: "600" }}>
                        Fechar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            ) : (
              show && (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={emissao}
                  mode="date"
                  is24Hour={true}
                  display="calendar"
                  onChange={onChange}
                />
              )
            )}
          </View>

          {/* Vencimento */}
          <View style={{ width: "50%" }}>
            <View>
              <Text style={styles.titleInputHeader}>Vencimento</Text>
              <TouchableOpacity
                style={styles.pickDate}
                onPress={() => setShow2(true)}
              >
                <Text style={styles.date}>{format(venc, "dd/MM/yyyy")}</Text>
                <AntDesign
                  style={{ alignSelf: "center", marginLeft: 15 }}
                  name="caret-down"
                  size={10}
                  color="gray"
                />
              </TouchableOpacity>
            </View>
            {Platform.OS === "ios" ? (
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
                      Selecionar vencimento
                    </Text>
                    {show2 && (
                      <DateTimePicker
                        testID="dateTimePicker"
                        value={venc}
                        mode="date"
                        display="inline"
                        onChange={onChange2}
                        locale="pt-BR"
                        themeVariant="light"
                        style={{ width: "100%" }}
                      />
                    )}
                    <TouchableOpacity
                      style={{
                        marginTop: 10,
                        alignSelf: "flex-end",
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                      }}
                      onPress={() => setShow2(false)}
                    >
                      <Text style={{ color: "#4CAF50", fontWeight: "600" }}>
                        Fechar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            ) : (
              show2 && (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={venc}
                  mode="date"
                  is24Hour={true}
                  display="calendar"
                  onChange={onChange2}
                />
              )
            )}
          </View>
        </View>

        {/* Frequência */}
        <SelectField
          label="Frequência"
          selectedValue={String(freq)}
          onChange={(value) => setFreq(String(value))}
          options={[
            { label: "Recorrente (Mensal)", value: "Recorrente" },
            ...lista_freq.map((item: any) => ({
              label: item.nome,
              value: String(item.nome),
            })),
          ]}
          labelStyle={styles.TitleInputs}
          containerStyle={styles.TextInput}
        />

        <View style={{ width: "90%", alignSelf: "center" }}>
          <Text style={styles.TitleInputs}>Repetições</Text>
          <TextInput
            value={repeticoesRecorrencia}
            onChangeText={(text) => {
              const somenteNumeros = String(text ?? "").replace(/\D/g, "");
              setRepeticoesRecorrencia(
                somenteNumeros === "" ? "" : String(Number(somenteNumeros)),
              );
            }}
            placeholder="Total de lançamentos (ex: 1, 2, 3...)"
            style={styles.TextInput}
            keyboardType="numeric"
          />
        </View>

        <View
          style={{
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
              onChangeText={setDevolucao}
              style={styles.TextInput}
              keyboardType="numeric"
            />
          </View>
          <View style={{ width: "50%" }}>
            <Text style={styles.TitleInputs}>Desconto R$</Text>
            <TextInput
              value={descontoPadrao}
              onChangeText={setDescontoPadrao}
              style={styles.TextInput}
              keyboardType="numeric"
            />
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
          <View style={{ width: "50%" }}>
            <Text style={styles.TitleInputs}>Desconto %</Text>
            <TextInput
              value={descontoPercPadrao}
              onChangeText={setDescontoPercPadrao}
              style={styles.TextInput}
              keyboardType="numeric"
            />
          </View>
          <View style={{ width: "50%" }}>
            <Text style={styles.TitleInputs}>Acréscimo R$</Text>
            <TextInput
              value={acrescimoPadrao}
              onChangeText={setAcrescimoPadrao}
              style={styles.TextInput}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={{ width: "90%", alignSelf: "center" }}>
          <Text style={styles.TitleInputs}>Acréscimo %</Text>
          <TextInput
            value={acrescimoPercPadrao}
            onChangeText={setAcrescimoPercPadrao}
            style={styles.TextInput}
            keyboardType="numeric"
          />
        </View>

        {/* Botões para anexar foto ou arquivo */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            width: "90%",
            alignSelf: "center",
            marginTop: 20,
          }}
        >
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <TouchableOpacity onPress={pickImage}>
              <Ionicons name="camera" size={80} color="#706f6f" />
            </TouchableOpacity>
          </View>
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <TouchableOpacity onPress={pickImageArquivos}>
              <Ionicons name="archive" size={80} color="#706f6f" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Exibe imagem anexada, se houver */}
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 10,
          }}
        >
          {image && (
            <Image
              source={
                anexoTipo === "pdf"
                  ? require("../../assets/pdf.png")
                  : anexoTipo === "rar"
                    ? require("../../assets/rar.png")
                    : { uri: image }
              }
              style={{ width: 200, height: 200 }}
            />
          )}
        </View>
      </ScrollView>

      {/* Botão para salvar registro */}
      <RectButton
        style={[styles.Button, buttonDisabled && { opacity: 0.5 }]}
        onPress={saveData}
        enabled={!buttonDisabled}
      >
        <Text style={styles.ButtonText}>
          {buttonDisabled ? "Salvando..." : "Salvar Registro"}
        </Text>
      </RectButton>

      {/* <NewPacientes /> */}
    </View>
  );
};

export default NovaContaReceber;
