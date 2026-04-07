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
import { SelectField } from "../../components/SelectField";

type ParamList = {
  Detail: {
    id_reg: string;
  };
};

const NovaCatDespesa: React.FC = () => {
  const navigation: any = useNavigation();

  const route = useRoute<RouteProp<ParamList, "Detail">>();
  const id_reg = route?.params?.id_reg;

  const [nome, setNome] = useState("");
  const [catDespesa, setCatDespesa] = useState("");
  const [catDespesaList, setCatDespesaList] = useState<any[]>([]);
  const [loadingCats, setLoadingCats] = useState<boolean>(false);

  const [sucess, setSucess] = useState(false);
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(false);

  async function saveData() {
    if (nome == "") {
      showMessage({
        message: "Erro ao Salvar",
        description: "Preencha os Campos Obrigatórios!",
        type: "warning",
      });
      return;
    }
    if (catDespesa == "") {
      showMessage({
        message: "Erro ao Salvar",
        description: "Preencha a categoria de despesa (cat_despesa)!",
        type: "warning",
      });
      return;
    }
    setSucess(true);

    try {
      const obj = {
        id: id_reg,
        nome: nome,
        cat_despesa: catDespesa,
      };

      const res = await api.post("catdespesa/salvar.php", obj);

      if (res.data.sucesso === false) {
        showMessage({
          message: "Erro ao Salvar",
          description: res.data.mensagem,
          type: "warning",
        });

        return;
      }

      setNome("");
      setCatDespesa("");

      showMessage({
        message: "Salvo",
        description: "Registro Salvo com Sucesso!!",
        type: "success",
      });

      navigation.push("CatDespesa");
    } catch (error) {
      Alert.alert("Ops", "Alguma coisa deu errado, tente novamente.");
      setSucess(false);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      if (id_reg != "0") {
        const res = await api.get(`catdespesa/listar_id.php?id=${id_reg}`);

        setNome(res.data.dados.nome);
        // preencher cat_despesa vindo da API se existir
        setCatDespesa(res.data.dados.cat_despesa ?? "");

        setEdit(false);
      } else {
        setEdit(true);
      }
    } catch (error) {
      console.log("Error ao carregar os Dados");
    }
  }

  async function loadCatDespesaList() {
    try {
      setLoadingCats(true);
      const res = await api.get("catdespesa/listar.php");
      const list = res?.data?.resultado ?? res?.data?.dados ?? res?.data ?? [];
      setCatDespesaList(Array.isArray(list) ? list : []);
    } catch (err) {
      setCatDespesaList([]);
    } finally {
      setLoadingCats(false);
    }
  }

  useEffect(() => {
    loadData().then(() => setLoading(false));
    loadCatDespesaList();
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

      <ScrollView>
        <View>
          <Text style={styles.TitleInputs}>Nome Categroria *</Text>

          <TextInput
            placeholder="Nome da Categoria"
            onChangeText={(text) => setNome(text)}
            value={nome}
            style={styles.TextInput}
          />
          <Text style={[styles.TitleInputs, { marginTop: 12 }]}>
            cat_despesa *
          </Text>
          {loadingCats ? (
            <ActivityIndicator style={{ marginVertical: 8 }} />
          ) : catDespesaList.length > 0 ? (
            <SelectField
              label="cat_despesa *"
              selectedValue={String(catDespesa)}
              onChange={(val) => setCatDespesa(String(val))}
              options={catDespesaList.map((c: any) => {
                const value = c.cat_despesa ?? c.id ?? c.nome;
                const label = c.nome ? `${c.nome}` : String(value);
                return { label, value: String(value) };
              })}
              labelStyle={styles.TitleInputs}
              containerStyle={styles.TextInput}
            />
          ) : (
            <TextInput
              placeholder="Código / Identificador cat_despesa"
              onChangeText={(text) => setCatDespesa(text)}
              value={catDespesa}
              style={styles.TextInput}
            />
          )}
        </View>
      </ScrollView>

      <RectButton
        style={styles.Button}
        onPress={() => {
          setSucess(true);
          saveData();
          setSucess(false);
        }}
      >
        <Text style={styles.ButtonText}>Salvar Registro</Text>
      </RectButton>

      {/* <NewPacientes /> */}
    </View>
  );
};

export default NovaCatDespesa;
