import React, { useState } from "react";
import {
  Alert,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { RectButton, ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./styles";
import { showMessage } from "react-native-flash-message";
import api from "../../services/api";
import { JSX } from "react/jsx-runtime";
import { useNavigation } from "@react-navigation/core";

// Componente principal para cadastro de novo usuário
const NovoUsuario: React.FC = (): JSX.Element | null => {
  const navigation: any = useNavigation();
  // Estados dos campos do formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nivel, setNivel] = useState("");
  const [loading, setLoading] = useState(false);

  // Função para salvar os dados do usuário
  async function saveData() {
    // Validação dos campos obrigatórios
    if (nome === "" || email === "" || senha === "") {
      showMessage({
        message: "Erro ao Salvar",
        description: "Preencha os Campos Obrigatórios!",
        type: "warning",
      });
      return;
    }

    setLoading(true);

    try {
      // Monta objeto com dados do usuário
      const obj = {
        nome: nome,
        email: email,
        senha: senha,
        nivel: nivel || "Usuário", // Define um nível padrão se não for preenchido
      };

      // Envia dados para a API
      const res = await api.post("usuarios/salvar.php", obj);

      if (res.data.sucesso) {
        // Exibe mensagem de sucesso e limpa campos
        showMessage({
          message: "Salvo",
          description: "Registro Salvo com Sucesso!",
          type: "success",
        });

        setNome("");
        setEmail("");
        setSenha("");
        setNivel("");

        // Após salvar, volta para a tela anterior (lista de usuários ou login)
        navigation.goBack();
      } else {
        // Exibe mensagem de erro da API
        showMessage({
          message: "Erro ao Salvar",
          description: res.data.mensagem || "Erro desconhecido.",
          type: "danger",
        });
      }
    } catch (error) {
      Alert.alert("Ops", "Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // Renderização da tela de cadastro de usuário
  return (
    <View style={{ flex: 1, marginTop: 20 }}>
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
      </View>
      {/* Título da tela */}
      <View style={styles.Title}>
        <Text style={styles.TitleText}>Inserir Registro</Text>
      </View>

      {/* Formulário de cadastro */}
      <ScrollView>
        {/* Campo Nome */}
        <View>
          <Text style={styles.TitleInputs}>Nome completo *</Text>
          <TextInput
            placeholder="Nome completo"
            onChangeText={(text) => setNome(text)}
            value={nome}
            style={styles.TextInput}
          />
        </View>

        {/* Campo Email */}
        <View>
          <Text style={styles.TitleInputs}>Email *</Text>
          <TextInput
            placeholder="Email"
            onChangeText={(text) => setEmail(text)}
            value={email}
            style={styles.TextInput}
          />
        </View>

        {/* Campo Senha */}
        <View>
          <Text style={styles.TitleInputs}>Senha *</Text>
          <TextInput
            placeholder="Senha"
            onChangeText={(text) => setSenha(text)}
            value={senha}
            secureTextEntry={true}
            style={styles.TextInput}
          />
        </View>

        {/* Campo Nível */}
        <View>
          <Text style={styles.TitleInputs}>Nível</Text>
          <TextInput
            placeholder="Nível"
            onChangeText={(text) => setNivel(text)}
            value={nivel}
            style={styles.TextInput}
          />
        </View>
      </ScrollView>

      {/* Botão para salvar registro */}
      <RectButton
        style={[styles.Button, loading && { opacity: 0.5 }]}
        onPress={!loading ? saveData : undefined}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ButtonText}>Salvar Registro</Text>
        )}
      </RectButton>
    </View>
  );
};

export default NovoUsuario;
