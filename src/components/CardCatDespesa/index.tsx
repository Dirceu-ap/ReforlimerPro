import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./styles";
import { useNavigation } from "@react-navigation/native";
import api from "../../services/api";
import { showMessage } from "react-native-flash-message";
import { MaterialIcons } from "@expo/vector-icons";

interface DadosProps {
  data: {
    id?: string;
    nome?: string;
    cat_despesa?: string;
    ativo?: string;
    descricao?: string;
  };
}

const CardCatDespesa: React.FC<DadosProps> = ({ data }) => {
  const navigation: any = useNavigation();

  async function excluir(nome: string, id: string) {
    Alert.alert(
      "Sair",
      `Você tem certeza que deseja excluir o Registro : ` + nome,
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim",
          onPress: async () => {
            try {
              await api.get(`catdespesa/excluir.php?id=${id}`);
              showMessage({
                message: "Exclusão",
                description: "Registro " + nome + " Excluído com Sucesso",
                type: "info",
              });
              navigation.push("CatDespesa");
            } catch (error) {
              Alert.alert("Não foi possivel excluir, tente novamente!");
            }
          },
        },
      ],
    );
  }

  if (!data || (!data.id && !data.nome && !data.cat_despesa)) return null;

  const titulo = data.nome ?? data.cat_despesa ?? "-";

  return (
    <>
      <View>
        <View style={styles.cardDados}>
          <Text style={styles.cardNome}>{titulo}</Text>
          <Text style={styles.cardInfo}>Ativo: {data.ativo ?? "-"}</Text>
        </View>
        <View style={styles.cardAcoes}>
          <TouchableOpacity
            onPress={() =>
              navigation.push("NovaCatDespesa", { id_reg: data.id })
            }
            style={styles.actionButton}
          >
            <MaterialIcons name="edit" size={24} color="#32B76C" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => excluir(String(titulo), String(data.id ?? ""))}
            style={styles.actionButton}
          >
            <MaterialIcons name="delete" size={24} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

export default CardCatDespesa;
