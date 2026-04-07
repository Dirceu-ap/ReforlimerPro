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
  Modal,
} from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
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
import * as SplashScreen from "expo-splash-screen";
import { SelectField } from "../../components/SelectField";
// Tipagem dos parâmetros recebidos pela rota
type ParamList = {
  Detail: {
    id_reg: string;
  };
};

const NovaContaPagar: React.FC = () => {
  const navigation: any = useNavigation();

  // Recupera parâmetro da rota (id_reg para edição ou novo)
  const route = useRoute<RouteProp<ParamList, "Detail">>();
  const id_reg = route?.params?.id_reg;

  // Estados dos campos do formulário
  let [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [lista_forn, setListaForn] = useState<any[]>([]);
  const [forn, setForn] = useState("");
  const [fornNomeLivre, setFornNomeLivre] = useState("");
  const [lista_saida, setListaSaida] = useState<any[]>([]);
  const [saida, setSaida] = useState("Caixa");
  const [lista_colab, setListaColab] = useState<any[]>([]);
  const [doc, setDoc] = useState("Dinheiro");
  const [lista_plano, setListaPlano] = useState<any[]>([]);
  const [plano, setPlano] = useState("");
  const [lista_desp, setListaDesp] = useState<any[]>([]);
  const [desp, setDesp] = useState("");
  const [lista_freq, setListaFreq] = useState<any[]>([]);
  const [freq, setFreq] = useState("");
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
  // Busca lista de colaboradores para também aparecerem no Picker de fornecedor
  async function selectListaColab() {
    try {
      // usar caminho relativo para respeitar a baseURL (apiReforlimer/colaboradores/...)
      const response = await api.get("colaboradores/listar.php");

      const raw = response?.data?.resultado ?? response?.data?.dados ?? [];
      const arr = Array.isArray(raw) ? raw : [];

      const colaboradores = arr
        .map((col: any) => ({
          id: String(col?.id ?? ""),
          nome: String(col?.nome ?? "").trim() || "Sem nome",
        }))
        .filter((c) => c.id !== "");

      colaboradores.sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
      );

      setListaColab(colaboradores);
    } catch (error) {
      console.log("Erro ao carregar colaboradores para contas a pagar", error);
    }
  }
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

  // Estados para imagem/anexo
  const [image, setImage] = useState<any>();
  const [nomeImagem, setNomeImagem] = useState("");
  const data = new FormData();
  const [localConta, setLocalConta] = useState("");

  // Função para tirar foto e anexar à conta
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

    await api.post("pagar/upload.php", formData);
  };

  // Função para escolher arquivo da galeria e anexar à conta
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

    await api.post("pagar/upload.php", formData);
  };

  // Busca lista de fornecedores
  async function selectListaForn() {
    try {
      const response = await api.get("pagar/listar_forn.php");
      const raw =
        response?.data?.resultado ??
        response?.data?.dados ??
        response?.data ??
        [];

      // normalizar e garantir nome como string limpa
      const normalized = (Array.isArray(raw) ? raw : []).map((it: any) => ({
        ...(it ?? {}),
        nome: String(it?.nome ?? "").trim(),
      }));

      // usar Intl.Collator quando disponível, fallback para localeCompare
      const collatorAvailable =
        typeof Intl !== "undefined" && (Intl as any).Collator;
      const compareFn = (a: string, b: string) => {
        const aa = String(a ?? "");
        const bb = String(b ?? "");
        if (collatorAvailable) {
          return new Intl.Collator("pt-BR", {
            sensitivity: "base",
            ignorePunctuation: true,
          }).compare(aa, bb);
        }
        return aa.localeCompare(bb, "pt-BR", { sensitivity: "base" });
      };

      normalized.sort((a: any, b: any) => compareFn(a.nome, b.nome));
      setListaForn(normalized.slice());
    } catch (error) {
      console.log(error);
    }
  }

  // Busca lista de saídas (contas/caixas)
  async function selectListaSaida() {
    try {
      const response = await api.get("pagar/listar_saida.php");
      const raw = response?.data?.resultado ?? [];
      setListaSaida(Array.isArray(raw) ? raw : []);
    } catch (error) {
      console.log(error);
    }
  }

  // Busca lista de planos de contas (ordenada por nome)
  async function selectListaPlano() {
    try {
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

  // Busca lista de despesas conforme plano selecionado (ordenada por nome)
  async function selectListaDesp(pl: string, des: string) {
    if (pl != "" || id_reg == "0") {
      setPlano(pl);
      if (des == "") {
        setDesp("");
      }

      try {
        const response = await api.get(
          `pagar/listar_desp.php?plano=${encodeURIComponent(pl)}&desp=${encodeURIComponent(des)}`,
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

    if (des != "") {
      setDesp(des);
    }
  }

  // Busca lista de frequências de pagamento
  async function selectListaFreq() {
    try {
      const response = await api.get("pagar/listar_freq.php");
      const raw = response?.data?.resultado ?? [];
      setListaFreq(Array.isArray(raw) ? raw : []);
    } catch (error) {
      console.log(error);
    }
  }

  // Função para salvar os dados do formulário (inserir ou editar conta)
  async function saveData() {
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

    try {
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
      };

      const res = await api.post("pagar/salvar.php", obj);

      if (res.data.sucesso === false) {
        setSucess(false);
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

      setSucess(true);
      if (navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate("Pagar");
      }
    } catch (error) {
      Alert.alert("Ops", "Alguma coisa deu errado, tente novamente.");
      setSucess(false);
    }
  }

  // Carrega dados da conta para edição, se necessário
  async function loadData() {
    try {
      setLoading(true);
      if (id_reg != "0") {
        const res = await api.get(`pagar/listar_id.php?id=${id_reg}`);

        const dados = res?.data?.dados ?? {};

        // Trata plano com segurança (pode vir vazio ou em outro formato)
        const planoBruto = String(dados.plano ?? "");
        let codigoDespesa = "";
        let nomePlano = "";

        if (planoBruto.includes(" - ")) {
          const partesPlano = planoBruto.split(" - ");
          codigoDespesa = partesPlano[0] ?? "";
          nomePlano = partesPlano[1] ?? "";
        } else if (planoBruto) {
          // Registros antigos: plano_conta tinha só um texto (ex: "Aluguel")
          // Usamos esse texto como categoria/plano e deixamos a despesa vazia
          nomePlano = planoBruto;
        }

        const descricaoBruta = String(dados.descricao ?? "");
        setValor(dados.valor ?? "");
        setDescricao(descricaoBruta);

        // Se o backend gravou forn como 0 ou vazio, tentamos recuperar
        // o nome do colaborador a partir de outras fontes:
        // 1) início da descrição ("Nome Colaborador - Livro Ponto (...)")
        // 2) descrições antigas tipo "Livro Ponto - Nome Colaborador (...)"
        // 3) campo fornF retornado pela API (limpando qualquer prefixo "Livro Ponto")
        const descLower = descricaoBruta.toLowerCase();
        const marcadorLivroPontoLower = " - livro ponto";
        let fornecedorFromDescricao = "";

        // Padrão novo: "Nome Colaborador - Livro Ponto (...)"
        const idxMarcador = descLower.indexOf(marcadorLivroPontoLower);
        if (idxMarcador > 0) {
          fornecedorFromDescricao = descricaoBruta
            .substring(0, idxMarcador)
            .trim();
        } else if (descLower.startsWith("livro ponto -")) {
          // Padrão antigo: "Livro Ponto - Nome Colaborador (...)"
          const prefixLen = "livro ponto -".length;
          let resto = descricaoBruta.substring(prefixLen).trim();
          let stop = resto.indexOf(" - ");
          if (stop < 0) stop = resto.indexOf("(");
          if (stop < 0) stop = resto.length;
          fornecedorFromDescricao = resto.substring(0, stop).trim();
        }

        const fornFBruto = String(dados.fornF ?? "").trim();
        let fornecedorFromFornF = fornFBruto;
        if (fornFBruto) {
          const fornFLower = fornFBruto.toLowerCase();
          if (fornFLower.includes("livro ponto")) {
            // Tentar extrair apenas o nome do colaborador também de fornF
            let temp = fornFBruto;
            const idxNovo = fornFLower.indexOf(marcadorLivroPontoLower);
            if (idxNovo > 0) {
              temp = fornFBruto.substring(0, idxNovo).trim();
            } else if (fornFLower.startsWith("livro ponto -")) {
              const prefixLen2 = "livro ponto -".length;
              let resto2 = fornFBruto.substring(prefixLen2).trim();
              let stop2 = resto2.indexOf(" - ");
              if (stop2 < 0) stop2 = resto2.indexOf("(");
              if (stop2 < 0) stop2 = resto2.length;
              temp = resto2.substring(0, stop2).trim();
            }
            fornecedorFromFornF = temp;
          }
        }

        // Nome amigável a ser exibido quando não houver fornecedor cadastrado correspondente
        let nomeLivre = "";
        if (fornecedorFromDescricao) {
          nomeLivre = fornecedorFromDescricao;
        } else if (fornecedorFromFornF) {
          nomeLivre = fornecedorFromFornF;
        }

        // Valor efetivo salvo no banco (id de fornecedor/colaborador ou texto antigo)
        let valorForn = String(dados.forn ?? "");
        if (!valorForn || valorForn === "0") {
          // Registros antigos (cliente = 0 ou vazio): usamos o nome livre como valor
          if (nomeLivre) {
            valorForn = nomeLivre;
          }
        }

        setForn(valorForn);
        setFornNomeLivre(nomeLivre);
        setDesp(codigoDespesa);
        setPlano(nomePlano);
        setSaida(dados.saida ?? "");
        setDoc(dados.doc ?? "");
        setLocalConta(String(dados.local ?? ""));

        if (dados.vencimento) {
          setVenc(parseDateFromYMD(String(dados.vencimento)));
        }
        if (dados.emis) {
          setEmissao(parseDateFromYMD(String(dados.emis)));
        }

        setFreq(dados.freq ?? "");

        setDevolucao(String(dados.devolucao ?? "0"));
        setDescontoPadrao(String(dados.desconto ?? "0"));
        setDescontoPercPadrao(String(dados.desconto_perc ?? "0"));
        setAcrescimoPadrao(String(dados.acrescimo ?? "0"));
        setAcrescimoPercPadrao(String(dados.acrescimo_perc ?? "0"));

        // Se já existir arquivo anexado, mantém nome para não perder a foto ao salvar
        if (dados.arq && dados.arq !== "sem-foto.jpg") {
          setNomeImagem(String(dados.arq));
        }

        // Carrega a miniatura/arquivo existente no servidor para exibir na edição
        if (dados.tumb) {
          setImage(urlImgContas + "contas/" + dados.tumb);
        }

        if (nomePlano || codigoDespesa) {
          selectListaDesp(nomePlano, codigoDespesa);
        }
        setEdit(false);
      } else {
        setEdit(true);
      }
    } catch (error) {
      console.log("Error ao carregar os Dados", error);
    }
  }

  // Carrega listas e dados iniciais ao abrir a tela
  useEffect(() => {
    loadData()
      .then(() => {
        selectListaForn().then(() => setLoading(false));
        selectListaColab().then(() => setLoading(false));
      })
      .then(() => {
        selectListaSaida().then(() => setLoading(false));
      })
      .then(() => {
        selectListaPlano().then(() => setLoading(false));
      })
      .then(() => {
        selectListaDesp("", "").then(() => setLoading(false));
      })
      .then(() => {
        selectListaFreq().then(() => setLoading(false));
      });
  }, []);

  // Exibe loading enquanto carrega dados
  if (loading) {
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

  const isLivroPonto = String(plano).toLowerCase().includes("livro ponto");

  // Fonte de dados do Picker de fornecedor/colaborador:
  // - Se for lançamento do Livro Ponto, usamos APENAS colaboradores.
  // - Caso contrário, usamos APENAS fornecedores.
  const fornecedoresListaBase: any[] = [];
  if (isLivroPonto) {
    if (Array.isArray(lista_colab)) {
      fornecedoresListaBase.push(...lista_colab);
    }
  } else {
    if (Array.isArray(lista_forn)) {
      fornecedoresListaBase.push(...lista_forn);
    }
  }

  const fornecedoresLista = fornecedoresListaBase.filter(
    (f: any) => f && f.id !== undefined,
  );

  const deveAdicionarLivre =
    !!forn &&
    !fornecedoresLista.some((f: any) => {
      if (!f || f.id === undefined) return false;
      // Para lançamentos do Livro Ponto, os valores de colaborador são "C-<id>"
      const expectedValue = isLivroPonto ? `C-${String(f.id)}` : String(f.id);
      return expectedValue === String(forn);
    });

  const fornecedorOptions: any[] = [];
  fornecedorOptions.push({ label: "Diversos", value: "" });

  if (deveAdicionarLivre) {
    const labelLivre = fornNomeLivre || String(forn);
    fornecedorOptions.push({ label: labelLivre, value: String(forn) });
  }

  fornecedoresLista.forEach((item: any) => {
    const value = isLivroPonto ? `C-${String(item.id)}` : String(item.id);
    fornecedorOptions.push({ label: item.nome, value });
  });

  // Exibe animação de sucesso após salvar
  if (sucess) {
    return <Success />;
  }

  // Renderização da tela de cadastro/edição de conta a pagar
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
        {/* Fornecedor */}
        <SelectField
          label="Fornecedor"
          selectedValue={String(forn)}
          onChange={(value) => setForn(String(value))}
          options={fornecedorOptions}
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
            keyboardType="numeric"
            style={styles.TextInput}
          />
        </View>

        {/* Descrição */}
        <View>
          <Text style={styles.TitleInputs}>Descrição</Text>
          <TextInput
            placeholder="Descrição Caso Tenha"
            onChangeText={(text) => setDescricao(text)}
            value={descricao}
            style={styles.TextInputArea}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
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

        {/* Saída */}
        <SelectField
          label="Saída"
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
          options={lista_freq.map((item: any) => ({
            label: item.nome,
            value: String(item.nome),
          }))}
          labelStyle={styles.TitleInputs}
          containerStyle={styles.TextInput}
        />

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
              source={{ uri: image }}
              style={{ width: 200, height: 200 }}
            />
          )}
        </View>
      </ScrollView>

      {/* Botão para salvar registro */}
      <RectButton style={styles.Button} onPress={saveData}>
        <Text style={styles.ButtonText}>Salvar Registro</Text>
      </RectButton>

      {/* <NewPacientes /> */}
    </View>
  );
};

export default NovaContaPagar;
