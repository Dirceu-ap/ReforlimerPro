import React, { useState, useEffect } from "react";
import {
  Alert,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
// import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/core";
import { RectButton, ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./styles";
import { Success } from "../../lotties/Success";
import { TextInputMask } from "react-native-masked-text";
import { showMessage, hideMessage } from "react-native-flash-message";
import api from "../../services/api";
import { View as RNView } from "react-native";
import { SelectField } from "../../components/SelectField";

// Tipagem dos parâmetros recebidos pela rota
type ParamList = {
  Detail: {
    id_reg: string;
  };
};

const NovaDespesa: React.FC = () => {
  const navigation: any = useNavigation();

  // Recupera parâmetro da rota (id_reg para edição ou novo)
  const route = useRoute<RouteProp<ParamList, "Detail">>();
  const id_reg = route?.params?.id_reg;

  // Estado do campo nome da despesa
  const [nome, setNome] = useState("");

  // campo cat_despesa selecionável
  const [catDespesa, setCatDespesa] = useState<string>("");
  const [catDespesaList, setCatDespesaList] = useState<any[]>([]);
  const [loadingCats, setLoadingCats] = useState<boolean>(false);

  // Estados de controle de tela
  const [sucess, setSucess] = useState(false); // Exibe animação de sucesso
  const [edit, setEdit] = useState(false); // Define se está editando ou inserindo
  const [loading, setLoading] = useState(false); // Loading da tela

  // Função para salvar a despesa (inserir ou editar)
  async function saveData() {
    if (nome == "") {
      showMessage({
        message: "Erro ao Salvar",
        description: "Preencha os Campos Obrigatórios!",
        type: "warning",
      });
      return;
    }

    try {
      const obj = {
        // enviar id numérico quando possível
        id: isNaN(Number(id_reg)) ? 0 : Number(id_reg),
        nome: nome,
      };

      // enviar cat_despesa como number ou null
      const catVal =
        catDespesa === ""
          ? null
          : isNaN(Number(catDespesa))
            ? null
            : Number(catDespesa);
      // criar payload explicitamente (evita {...undefined} que causa TypeError)
      const payload = {
        id: typeof obj?.id === "number" ? obj.id : Number(id_reg || 0),
        nome: obj?.nome ?? nome ?? "",
        cat_despesa: catVal,
      };

      // usar URL absoluta do api.defaults.baseURL para evitar problemas de base path
      const base = String(api?.defaults?.baseURL ?? "").replace(/\/$/, "");
      const absoluteUrl = `${base}/despesas/salvar.php`;

      // DEBUG: log do URL e payload para confirmar envio
      const resp = await fetch(absoluteUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      console.log("DEBUG -> response status:", resp.status);
      console.log("DEBUG -> response text:", text);
      let body: any = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }

      if (resp.ok && body?.sucesso === true) {
        const dados = body.dados ?? {};
        setNome(dados.nome ?? "");
        setCatDespesa(String(dados.cat_despesa ?? dados.id_cat_despesa ?? ""));
        setSucess(true);
        showMessage({
          message: "Salvo",
          description: body.mensagem ?? "Registro Salvo com Sucesso!!",
          type: "success",
        });
        navigation.push("Despesas");
      } else {
        // mostrar erro detalhado que o servidor retorna (inclui debug info: dados_recebidos, debug_saved)
        const msg = body?.mensagem ?? `Erro HTTP ${resp.status}`;
        const debug =
          body?.dados_recebidos ??
          body?.debug_saved ??
          body?.erro ??
          body?.raw ??
          "";
        showMessage({
          message: "Erro ao Salvar",
          description: `${msg}${
            debug ? ` — debug: ${JSON.stringify(debug)}` : ""
          }`,
          type: "danger",
        });
      }
    } catch (error: any) {
      const resp = error?.response;
      const body = resp?.data ?? error?.message ?? String(error);
      Alert.alert("Erro servidor", String(body));
    } finally {
      // resetar sucesso apenas se for necessário visualmente
      setTimeout(() => setSucess(false), 800);
    }
  }

  // Carrega dados da despesa para edição, se necessário
  async function loadData() {
    try {
      setLoading(true);
      if (id_reg != "0") {
        const res = await api.get(`despesas/listar_id.php?id=${id_reg}`);
        const body = res?.data ?? {};
        const dados = body.dados ?? body ?? {};
        setNome(dados.nome ?? "");
        setCatDespesa(String(dados.cat_despesa ?? dados.id_cat_despesa ?? ""));
        setEdit(false);
      } else {
        setEdit(true);
      }
    } catch (error) {
      console.log("Error ao carregar os Dados");
    }
  }

  // carregar lista de categorias de despesa para seleção (ordenada por nome)
  async function loadCatDespesaList() {
    try {
      setLoadingCats(true);
      const res = await api.get("catdespesa/listar.php");
      const list = res?.data?.resultado ?? res?.data?.dados ?? res?.data ?? [];
      const arr = Array.isArray(list) ? list : [];

      const sorted = [...arr].sort((a: any, b: any) => {
        const nomeA = String(a?.nome ?? "").trim();
        const nomeB = String(b?.nome ?? "").trim();
        return nomeA.localeCompare(nomeB, "pt-BR", { sensitivity: "base" });
      });

      // garantir que o Picker forneça o id da categoria como value
      setCatDespesaList(sorted);
    } catch (err) {
      setCatDespesaList([]);
    } finally {
      setLoadingCats(false);
    }
  }

  // Carrega dados iniciais ao abrir a tela
  useEffect(() => {
    loadData().then(() => setLoading(false));
    loadCatDespesaList();
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

  // Renderização da tela de cadastro/edição de despesa
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
        <View>
          <Text style={styles.TitleInputs}>Nome Despesa *</Text>
          <TextInput
            placeholder="Nome da Despesa"
            onChangeText={(text) => setNome(text)}
            value={nome}
            style={styles.TextInput}
          />

          <Text style={[styles.TitleInputs, { marginTop: 12 }]}>
            Categoria de Despesa
          </Text>
          {loadingCats ? (
            <ActivityIndicator style={{ marginVertical: 8 }} />
          ) : catDespesaList.length > 0 ? (
            <SelectField
              label="Categoria de Despesa"
              selectedValue={String(catDespesa)}
              onChange={(val) => setCatDespesa(String(val ?? ""))}
              options={(Array.isArray(catDespesaList)
                ? catDespesaList
                : []
              ).map((c: any) => {
                if (!c) return { label: "", value: "" };
                const value = c.id ?? c.cat_despesa ?? c.nome ?? "";
                const label = c.nome ?? String(value);
                return { label: String(label), value: String(value) };
              })}
              labelStyle={styles.TitleInputs}
              containerStyle={styles.TextInput}
            />
          ) : (
            <TextInput
              placeholder="Código / Identificador cat_despesa (manual)"
              onChangeText={(text) => setCatDespesa(text)}
              value={catDespesa}
              style={styles.TextInput}
            />
          )}
        </View>
      </ScrollView>

      {/* Botão para salvar registro */}
      <RectButton
        style={styles.Button}
        onPress={() => {
          saveData();
        }}
      >
        <Text style={styles.ButtonText}>Salvar Registro</Text>
      </RectButton>

      {/* <NewPacientes /> */}
    </View>
  );
};

export default NovaDespesa;
