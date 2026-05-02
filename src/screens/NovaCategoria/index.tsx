import React, { useState, useEffect, useRef } from "react";
import {
  Alert,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/core";
import { RectButton, ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./styles";
import { Success } from "../../lotties/Success";
import { showMessage } from "react-native-flash-message";

import api from "../../services/api";

type ParamList = {
  Detail: {
    id_reg: string;
  };
};

const NovaCategoria: React.FC = () => {
  const navigation: any = useNavigation();

  const route = useRoute<RouteProp<ParamList, "Detail">>();
  const id_reg = route?.params?.id_reg;

  const [nome, setNome] = useState("");

  const [sucess, setSucess] = useState(false);
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const savingRef = useRef(false);

  async function saveData() {
    if (savingRef.current) return;
    savingRef.current = true;
    setButtonDisabled(true);
    if (nome == "") {
      showMessage({
        message: "Erro ao Salvar",
        description: "Preencha os Campos Obrigatórios!",
        type: "warning",
      });
      setButtonDisabled(false);
      savingRef.current = false;
      return;
    }
    setSucess(true);

    try {
      const obj = {
        id: id_reg,
        nome: nome,
      };

      const res = await api.post("categorias/salvar.php", obj);

      if (res.data.sucesso === false) {
        showMessage({
          message: "Erro ao Salvar",
          description: res.data.mensagem,
          type: "warning",
        });

        return;
      }

      setNome("");

      showMessage({
        message: "Salvo",
        description: "Registro Salvo com Sucesso!!",
        type: "success",
      });

      navigation.push("Categorias");
    } catch (error) {
      Alert.alert("Ops", "Alguma coisa deu errado, tente novamente.");
      setSucess(false);
    } finally {
      setButtonDisabled(false);
      savingRef.current = false;
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      if (id_reg != "0") {
        const res = await api.get(`categorias/listar_id.php?id=${id_reg}`);

        setNome(res.data.dados.nome);

        setEdit(false);
      } else {
        setEdit(true);
      }
    } catch (error) {
      console.log("Error ao carregar os Dados");
    }
  }

  useEffect(() => {
    loadData().then(() => setLoading(false));
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
        </View>
      </ScrollView>

      <RectButton
        style={[styles.Button, buttonDisabled && { opacity: 0.5 }]}
        onPress={() => {
          if (!buttonDisabled && !savingRef.current) {
            setSucess(true);
            saveData();
            setSucess(false);
          }
        }}
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

export default NovaCategoria;
