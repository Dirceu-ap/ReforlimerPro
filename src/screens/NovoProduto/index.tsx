import React, { useState, useEffect } from "react";
import {
  Image,
  Button,
  Alert,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/core";
import { RectButton, ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./styles";
import { Success } from "../../lotties/Success";
import { TextInputMask } from "react-native-masked-text";
import { showMessage, hideMessage } from "react-native-flash-message";
import * as ImagePicker from "expo-image-picker";
import api from "../../services/api";
import urlImg from "../../services/urlImg";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { SelectField } from "../../components/SelectField";

// Tipagem dos parâmetros recebidos pela rota
type ParamList = {
  Detail: {
    id_reg: string;
  };
};

const NovoProduto: React.FC = () => {
  const navigation: any = useNavigation();

  // Recupera parâmetro da rota (id_reg para edição ou novo)
  const route = useRoute<RouteProp<ParamList, "Detail">>();
  const id_reg = route?.params?.id_reg;

  // Estados dos campos do formulário
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [unidade, setUnidade] = useState("");
  const [rendimentoM2, setRendimentoM2] = useState("");
  const [valor_venda, setValorVenda] = useState("");
  const [valor_custo, setValorCusto] = useState("");
  const [ativo, setAtivo] = useState("Sim");
  const [lucro, setLucro] = useState("");

  // Lista de categorias e categoria selecionada
  const [lista_cat, setListaCat] = useState<any[]>([]);
  const [cat, setCat] = useState("");

  // Estados de controle de tela
  const [sucess, setSucess] = useState(false); // Exibe animação de sucesso
  const [edit, setEdit] = useState(false); // Define se está editando ou inserindo
  const [loading, setLoading] = useState(false); // Loading da tela

  // Estados para imagem/anexo
  const [image, setImage] = useState<any>();
  const [nomeImagem, setNomeImagem] = useState("");
  const data = new FormData();

  // normaliza string numérica considerando último separador como decimal
  const normalizeNumber = (v: string) => {
    if (v === null || v === undefined) return NaN;
    let s = String(v).trim();
    if (s === "") return NaN;
    s = s.replace(/\s/g, "");
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");

    if (lastDot === -1 && lastComma === -1) {
      // apenas dígitos
      const n = parseFloat(s);
      return isNaN(n) ? NaN : n;
    }

    if (lastDot > lastComma) {
      // ponto é separador decimal -> remover vírgulas como milhares
      s = s.replace(/,/g, "");
      const n = parseFloat(s);
      return isNaN(n) ? NaN : n;
    }

    // vírgula é separador decimal -> remover pontos de milhares e trocar vírgula por ponto
    s = s.replace(/\./g, "").replace(/,/g, ".");
    const n = parseFloat(s);
    return isNaN(n) ? NaN : n;
  };

  const formatToTwoDecimals = (v: string) => {
    const n = normalizeNumber(v);
    if (isNaN(n)) return "";
    return n.toFixed(2).toString();
  };

  // recalcula valor_venda quando o usuário altera o lucro ou o valor de custo
  useEffect(() => {
    const custo = normalizeNumber(valor_custo);
    const pct = normalizeNumber(lucro);

    if (!isNaN(custo) && !isNaN(pct)) {
      const venda = custo * (1 + pct / 100);
      setValorVenda(formatToTwoDecimals(String(venda)));
    }
  }, [valor_custo, lucro]);

  // helper: envia imagem e retorna filename do servidor (ou null)
  const uploadFile = async (localUri: string) => {
    try {
      const filenameGuess =
        localUri.split("/").pop() ?? `img_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(String(filenameGuess));
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      const formData = new FormData();
      formData.append("photo", {
        uri:
          Platform.OS === "android"
            ? localUri
            : localUri.replace("file://", ""),
        name: filenameGuess,
        type,
      } as any);

      // NÃO setar Content-Type manualmente
      const uploadRes = await api.post("produtos/upload.php", formData);
      console.log("upload.php response:", uploadRes?.status, uploadRes?.data);

      // aceitar várias formas de retorno
      const filename =
        uploadRes?.data?.filename ??
        uploadRes?.data?.nome ??
        (uploadRes?.data?.success && uploadRes?.data?.filename
          ? uploadRes.data.filename
          : null) ??
        (typeof uploadRes?.data === "string"
          ? (() => {
              const m = uploadRes.data.match(
                /([a-zA-Z0-9_\-]+\.(?:jpg|jpeg|png|gif))/i,
              );
              return m ? m[1] : null;
            })()
          : null);

      if (filename) {
        setNomeImagem(String(filename));
        // exibe imagem remota se urlImg definido
        try {
          if (typeof urlImg === "string" && urlImg.length > 0) {
            const base = urlImg.endsWith("/") ? urlImg : urlImg + "/";
            setImage(base + String(filename));
          } else {
            setImage(localUri);
          }
        } catch {
          setImage(localUri);
        }
        return String(filename);
      }

      console.warn(
        "uploadFile: servidor não retornou filename",
        uploadRes?.data,
      );
      return null;
    } catch (err) {
      console.error("uploadFile error:", err);
      return null;
    }
  };

  // Função para tirar foto e anexar ao produto
  const pickImage = async () => {
    try {
      const p: any = await ImagePicker.requestCameraPermissionsAsync();
      const granted = p?.granted ?? p?.status === "granted";
      if (!granted) {
        Alert.alert(
          "Permissão negada",
          "Você precisa permitir acesso à câmera.",
        );
        return;
      }

      const mediaTypes =
        (ImagePicker as any).MediaType?.Images ??
        (ImagePicker as any).MediaTypeOptions?.Images ??
        "Images";

      const result: any = await ImagePicker.launchCameraAsync({
        mediaTypes,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      let localUri: string | undefined;
      if (
        result &&
        result.canceled === false &&
        Array.isArray(result.assets) &&
        result.assets.length > 0
      ) {
        localUri = result.assets[0].uri;
      } else if ((result as any)?.uri) {
        localUri = (result as any).uri;
      }

      if (!localUri) return;

      // exibe localmente enquanto faz upload
      setImage(localUri);

      const uploaded = await uploadFile(localUri);
      if (!uploaded) {
        Alert.alert(
          "Erro",
          "Falha ao enviar foto. Verifique upload.php no servidor.",
        );
      }
    } catch (e) {
      console.error("pickImage error:", e);
      Alert.alert("Erro", "Não foi possível abrir a câmera.");
    }
  };

  // Função para escolher arquivo da galeria e anexar ao produto
  const pickImageArquivos = async () => {
    try {
      const mediaTypes =
        (ImagePicker as any).MediaType?.Images ??
        (ImagePicker as any).MediaTypeOptions?.Images ??
        "Images";

      const result: any = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (result?.canceled) return;

      const localUri: string | undefined =
        result.assets?.[0]?.uri ?? (result as any).uri;
      if (!localUri) return;

      setImage(localUri);

      const uploaded = await uploadFile(localUri);
      if (!uploaded) {
        Alert.alert(
          "Erro",
          "Falha ao enviar arquivo. Verifique upload.php no servidor.",
        );
      }
    } catch (e) {
      console.error("pickImageArquivos error:", e);
      Alert.alert("Erro", "Não foi possível abrir a galeria.");
    }
  };

  // Busca lista de categorias de produtos (ordenada por nome)
  async function selectListaBancos() {
    try {
      const response = await api.get("produtos/listar_cat.php");
      console.log("listar_cat response status:", response?.status);
      console.log("listar_cat response data:", response?.data);
      // Garante que resultado é sempre array
      let resultado = response.data?.resultado;
      if (!Array.isArray(resultado)) {
        resultado = [];
      }

      const sorted = [...resultado].sort((a: any, b: any) => {
        const nomeA = String(a?.nome ?? "").trim();
        const nomeB = String(b?.nome ?? "").trim();
        return nomeA.localeCompare(nomeB, "pt-BR", { sensitivity: "base" });
      });

      setListaCat(sorted);
    } catch (error) {
      console.error("listar_cat error:", error);
      console.log(error);
      setListaCat([]); // Garante que não será undefined
    }
  }

  // Função para salvar os dados do formulário (inserir ou editar produto)
  async function saveData() {
    if (nome === "" || codigo === "" || ativo === "") {
      showMessage({
        message: "Erro ao Salvar",
        description: "Preencha os Campos Obrigatórios!",
        type: "warning",
      });
      return false;
    }
    setLoading(true);

    try {
      // garante upload se houver imagem local e ainda não tiver nome retornado
      if (image && !nomeImagem) {
        const uploaded = await uploadFile(image);
        if (!uploaded) {
          setLoading(false);
          Alert.alert(
            "Erro",
            "Falha no upload da imagem. Salvamento cancelado.",
          );
          return false;
        }
      }

      // enviar apenas o filename da imagem (sem prefixo de categoria)
      const fotoValue = nomeImagem ?? "";

      const obj = {
        id: id_reg,
        nome,
        descricao,
        unidade,
        rendimento_por_unidade_m2: rendimentoM2,
        lucro,
        codigo,
        valor_venda,
        valor_custo,
        ativo,
        cat,
        foto: fotoValue,
      };

      console.log("salvar.php request payload:", obj);
      const res = await api.post("produtos/salvar.php", obj);
      console.log("salvar.php response status:", res?.status);
      console.log("salvar.php response data:", res?.data);

      if (res.data?.sucesso === false) {
        showMessage({
          message: "Erro ao Salvar",
          description: res.data.mensagem ?? res.data.message,
          type: "warning",
        });
        setLoading(false);
        return false;
      }

      setNome("");
      setDescricao("");
      setValorVenda("");
      setValorCusto("");
      setCodigo("");
      setNomeImagem("");
      setImage(null);

      showMessage({
        message: "Salvo",
        description: "Registro Salvo com Sucesso!!",
        type: "success",
      });

      return true;
    } catch (error) {
      console.error("saveData error:", error);
      Alert.alert("Ops", "Alguma coisa deu errado, tente novamente.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  // Carrega dados do produto para edição, se necessário
  async function loadData() {
    try {
      setLoading(true);
      if (id_reg != "0") {
        const res = await api.get(`produtos/listar_id.php?id=${id_reg}`);
        console.log("listar_id response status:", res?.status);
        console.log("listar_id response data:", res?.data);

        setNome(res.data.dados.nome);
        setDescricao(res.data.dados.descricao);
        setUnidade(res.data.dados.unidade || "");
        setRendimentoM2(
          res.data.dados.rendimento_por_unidade_m2
            ? String(res.data.dados.rendimento_por_unidade_m2)
            : "",
        );
        setValorVenda(res.data.dados.valor_venda);
        setValorCusto(res.data.dados.valor_compra);
        setCodigo(res.data.dados.codigo);
        setAtivo(res.data.dados.ativo);
        setLucro(res.data.dados.lucro);

        // extrai filename se foto estiver no formato "CAT\nFILENAME"
        const fotoRaw = res.data.dados.foto ?? "";
        const parts = String(fotoRaw).split(/\r?\n/).filter(Boolean);
        const filename = parts.length > 0 ? parts[parts.length - 1] : "";
        if (filename) {
          setNomeImagem(filename);
          const base =
            typeof urlImg === "string" && urlImg.length > 0
              ? urlImg.endsWith("/")
                ? urlImg
                : urlImg + "/"
              : "";
          setImage(base ? base + filename : filename);
        } else {
          setImage(null);
          setNomeImagem("");
        }

        setCat(res.data.dados.categoria);

        setEdit(false);
      } else {
        // Novo registro
        setEdit(true);

        // Gerar código automático para novo produto
        try {
          const resCod = await api.get("produtos/gerar_codigo.php");
          console.log("gerar_codigo response status:", resCod?.status);
          console.log("gerar_codigo response data:", resCod?.data);

          const novoCodigo =
            resCod?.data?.codigo ?? resCod?.data?.resultado?.codigo ?? null;

          if (novoCodigo !== null && novoCodigo !== undefined) {
            setCodigo(String(novoCodigo));
          }
        } catch (error) {
          console.error("gerar_codigo error:", error);
        }
      }
    } catch (error) {
      console.error("listar_id error:", error);
      console.log("Error ao carregar os Dados");
    }
  }

  // Carrega dados iniciais ao abrir a tela
  useEffect(() => {
    loadData().then(() => {
      selectListaBancos().then(() => setLoading(false));
    });
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

  // Renderização da tela de cadastro/edição de produto
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
        {/* Código do produto */}
        <View>
          <Text style={styles.TitleInputs}>Código do Produto *</Text>
          <TextInput
            placeholder="Código do Produto"
            onChangeText={(text) => setCodigo(text)}
            value={codigo}
            style={styles.TextInput}
            keyboardType="numeric"
          />
        </View>

        {/* Nome do produto */}
        <View>
          <Text style={styles.TitleInputs}>Nome *</Text>
          <TextInput
            placeholder="Nome"
            onChangeText={(text) => setNome(text)}
            value={nome}
            style={styles.TextInput}
          />
        </View>

        {/* Descrição */}
        <View>
          <Text style={styles.TitleInputs}>Descrição</Text>
          <TextInput
            placeholder="Descrição"
            onChangeText={(text) => setDescricao(text)}
            value={descricao}
            style={styles.TextInput}
          />
        </View>

        {/* Unidade e rendimento por m² */}
        <View>
          <Text style={styles.TitleInputs}>Unidade (UN, M2, M, KG...)</Text>
          <TextInput
            placeholder="Unidade"
            onChangeText={(text) => setUnidade(text)}
            value={unidade}
            style={styles.TextInput}
          />
        </View>

        <View>
          <Text style={styles.TitleInputs}>Rendimento por unidade (m²)</Text>
          <TextInput
            placeholder="Ex: 3 (m² por saco)"
            onChangeText={(text) => setRendimentoM2(text)}
            value={rendimentoM2}
            style={styles.TextInput}
            keyboardType="numeric"
          />
        </View>

        {/* Lucro */}
        <View>
          <Text style={styles.TitleInputs}>Lucro % (Opcional)</Text>
          <TextInput
            placeholder="Lucro"
            onChangeText={(text) => setLucro(text)}
            value={lucro}
            style={styles.TextInput}
            keyboardType="numeric"
          />
        </View>

        {/* Valores de custo e venda */}
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
            <Text style={styles.TitleInputs}>V.Custo</Text>
            <TextInput
              placeholder="Valor Custo "
              onChangeText={(text) => setValorCusto(text)}
              value={valor_custo}
              style={styles.TextInput}
              keyboardType="numeric"
            />
          </View>

          <View style={{ width: "50%" }}>
            <Text style={styles.TitleInputs}>V.Venda</Text>
            <TextInput
              placeholder="Valor Venda "
              onChangeText={(text) => setValorVenda(text)}
              value={valor_venda}
              style={styles.TextInput}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Ativo */}
        <SelectField
          label="Ativo *"
          selectedValue={ativo}
          onChange={(value) => setAtivo(String(value))}
          options={[
            { label: "Sim", value: "Sim" },
            { label: "Não", value: "Não" },
          ]}
          labelStyle={styles.TitleInputs}
          containerStyle={styles.TextInput}
        />

        {/* Categoria */}
        <SelectField
          label="Categoria"
          selectedValue={String(cat)}
          onChange={(value) => setCat(String(value))}
          options={
            Array.isArray(lista_cat) && lista_cat.length > 0
              ? [
                  { label: "Selecione uma categoria", value: "" },
                  ...lista_cat.map((item: any) => ({
                    label: String(item.nome),
                    value: String(item.id),
                  })),
                ]
              : [{ label: "Nenhuma categoria encontrada", value: "" }]
          }
          labelStyle={styles.TitleInputs}
          containerStyle={styles.TextInput}
        />

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
      <RectButton
        style={styles.Button}
        onPress={async () => {
          setLoading(true);
          const result = await saveData();
          if (result === true) {
            setSucess(true);
            setTimeout(() => {
              setSucess(false);
              navigation.navigate("Produtos");
            }, 1200);
          }
          setLoading(false);
        }}
      >
        <Text style={styles.ButtonText}>Salvar Registro</Text>
      </RectButton>

      {/* <NewPacientes /> */}
    </View>
  );
};

export default NovoProduto;
