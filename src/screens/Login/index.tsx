import { useNavigation } from "@react-navigation/core";
import React, { useEffect, useState } from "react";
import { styles } from "./style";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  TouchableOpacity,
  View,
  Text,
  TextInput,
  Image,
  StatusBar,
  Alert,
} from "react-native";

import { Splash } from "../../lotties/Splash";
import api from "../../services/api";

export default function Login() {
  // 0 - carregando, 1 - logado, 2 - deslogado

  const navigation: any = useNavigation();

  const [logged, setLogged] = useState(0);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  async function login() {
    if (!email || !senha) {
      Alert.alert("Atenção", "Informe email e senha.");
      return;
    }

    const obj = { email, senha };

    try {
      const res = await api.post("login/login.php", obj);

      if (res.data?.success === "Dados Incorretos!") {
        Alert.alert("Ops!", "Dados Incorretos!");
        return;
      }

      const userData = res.data?.result?.[0];

      if (!userData) {
        Alert.alert("Erro", "Resposta inesperada do servidor de login.");
        return;
      }

      if (userData.id != null) {
        await AsyncStorage.setItem("@user", JSON.stringify(userData.id));
      }

      if (userData.nome) {
        await AsyncStorage.setItem("@user_name", userData.nome);
      }

      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    } catch (error: any) {
      console.log("Erro ao fazer login", error?.message ?? error);

      // Se o servidor respondeu (ex.: erro 500 na conexão com o banco),
      // mostramos a mensagem retornada pelo PHP.
      if (error?.response) {
        const backendMsg =
          error.response.data?.message ||
          error.response.data?.success ||
          "Erro no servidor ao tentar fazer login.";

        Alert.alert("Erro no servidor", String(backendMsg));
        return;
      }

      // Se não há resposta, é erro real de conexão/rede.
      Alert.alert(
        "Erro de conexão",
        "Não foi possível conectar ao servidor. Verifique se o servidor PHP/MySQL está ligado, se o endereço da API está correto e se o dispositivo está na mesma rede.",
      );
    }
  }

  //
  async function cadas() {
    navigation.navigate("NovoUsuario");
  }

  const checkLogin = async () => {
    const user = await AsyncStorage.getItem("@user");

    if (user) {
      setLogged(1);

      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    } else {
      setLogged(2);
    }
  };

  useEffect(() => {
    checkLogin();
  }, []);

  if (logged === 0) {
    return <Splash />;
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent hidden />

      <Image style={styles.logo} source={require("../../assets/logo.png")} />

      <View style={styles.form}>
        <TextInput
          style={styles.login}
          placeholder="Email"
          value={email}
          onChangeText={(email) => setEmail(email)}
        />

        <TextInput
          secureTextEntry={true}
          style={styles.login}
          placeholder="Senha"
          value={senha}
          onChangeText={(senha) => setSenha(senha)}
        />

        <TouchableOpacity style={styles.loginSave} onPress={login}>
          <Text style={styles.text}>Entrar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginSave} onPress={cadas}>
          <Text style={styles.text}>Novo Cadastro</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
