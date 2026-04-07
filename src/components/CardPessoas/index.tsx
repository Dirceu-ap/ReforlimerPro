import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Alert, Linking, Text, TouchableOpacity, View } from "react-native";
import SwipeableRow from "../SwipeableRow";
import api from "../../services/api";
import { styles } from "./styles";
import { showMessage } from "react-native-flash-message";
import ConsultaContasCliente from "../../screens/ConsultaContasCliente";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

interface DadosProps {
  data: {
    id: string;
    nome: string;
    telefone: string;
    email: string;
    ativo: string;
  };
}

const CardClientes = ({ data }: DadosProps) => {
  const navigation: any = useNavigation();

  async function excluir(nome: string, id: string) {
    Alert.alert(
      "Sair",
      `Você tem certeza que deseja excluir o Registro : ` + nome,
      [
        {
          text: "Não",
          style: "cancel",
        },

        {
          text: "Sim",
          onPress: async () => {
            try {
              const response = await api.get(`clientes/excluir.php?id=${id}`);
              showMessage({
                message: "Exclusão",
                description: "Registro " + nome + " Excluído com Sucesso",
                type: "info",
              });
              navigation.push("Pessoas");
            } catch (error) {
              Alert.alert("Não foi possivel excluir, tente novamente!");
            }
          },
        },
      ]
    );
  }

  return (
    <>
      {data.id === undefined &&
      data.nome === undefined &&
      data.telefone === undefined &&
      data.email === undefined ? (
        <></>
      ) : (
        <View>
       
          <View style={styles.cardDados}>
            <Text style={styles.cardNome}>{data.nome}</Text>
            <Text style={styles.cardInfo}>Telefone: {data.telefone}</Text>
            <Text style={styles.cardInfo}>E-mail: {data.email}</Text>
            <Text style={styles.cardInfo}>Ativo: {data.ativo}</Text>
          </View>
          <View style={styles.cardAcoes}>
            <TouchableOpacity
              onPress={() => navigation.push("NovaPessoa", { id_reg: data.id })}
              style={styles.actionButton}
            >
              <MaterialIcons name="edit" size={24} color="#32B76C" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => excluir(data.nome, data.id)}
              style={styles.actionButton}
            >
              <MaterialIcons name="delete" size={24} color="#e74c3c" />
            </TouchableOpacity>
            
          </View>
        </View>
      )}
    </>
  );
};

export default CardClientes;
