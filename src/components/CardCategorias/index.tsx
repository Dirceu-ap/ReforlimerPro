import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import api from "../../services/api";
import { styles } from "./styles";
import { showMessage } from "react-native-flash-message";
import { MaterialIcons } from "@expo/vector-icons";

interface DadosProps {
  data: {
    id: string;
    nome: string;
    produtos: string;
  };
}

const CardCategorias = ({ data }: DadosProps) => {
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
              const response = await api.get(`categorias/excluir.php?id=${id}`);

              if (response.data.sucesso === false) {
                showMessage({
                  message: "Erro ao Excluir",
                  description: response.data.mensagem,
                  type: "warning",
                });

                return;
              } else {
                showMessage({
                  message: "Exclusão",
                  description: "Registro " + nome + " Excluído com Sucesso",
                  type: "info",
                });
                if (navigation.canGoBack && navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate("Categorias");
                }
              }
            } catch (error) {
              Alert.alert("Não foi possivel excluir, tente novamente!");
            }
          },
        },
      ],
    );
  }

  return (
    <>
      {data.id === undefined && data.nome === undefined ? (
        <></>
      ) : (
        <View>
          <View style={styles.cardDados}>
            <Text style={styles.cardNome}>{data.nome ?? "-"}</Text>
            <Text style={styles.cardInfo}>
              Produtos: {data.produtos ?? "-"}
            </Text>
          </View>
          <View style={styles.cardAcoes}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("NovaCategoria", { id_reg: data.id })
              }
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

export default CardCategorias;
