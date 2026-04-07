import React from "react";
import { Alert, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import SwipeableRow from "../SwipeableRow";
import { useNavigation } from "@react-navigation/native";
import api from "../../services/api";
import { showMessage } from "react-native-flash-message";

interface DadosProps {
  data: {
    id?: string;
    nome?: string;
    descricao?: string;
    ativo?: string;
  };
}

const CardCategoria: React.FC<DadosProps> = ({ data }) => {
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
              await api.get(`categorias/excluir.php?id=${id}`);
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
            } catch (error) {
              Alert.alert("Não foi possivel excluir, tente novamente!");
            }
          },
        },
      ],
    );
  }

  if (!data || (!data.id && !data.nome)) return null;

  const initial = data.nome
    ? String(data.nome).trim().charAt(0).toUpperCase()
    : "?";
  const isActive = String(data.ativo ?? "sim").toLowerCase() === "sim";

  const showDetails = (): void => {
    Alert.alert(
      data.nome ?? "Categoria",
      `${data.nome ?? "-"}\n${data.descricao ?? ""}`,
    );
  };

  return (
    <View>
      <SwipeableRow
        onPressEdit={async () =>
          navigation.navigate("NovaCategoria", { id_reg: data.id })
        }
        onPressDelete={async () =>
          excluir(String(data.nome ?? ""), String(data.id ?? ""))
        }
        onPressWhatsapp={async () => {}}
        onPressParcelar={async () => {}}
      >
        <TouchableOpacity
          style={localStyles.cardContainer}
          onPress={showDetails}
        >
          <View style={localStyles.left}>
            <View
              style={[
                localStyles.initialCircle,
                !isActive && localStyles.initialDisabled,
              ]}
            >
              <Text style={localStyles.initialText}>{initial}</Text>
            </View>
          </View>

          <View style={localStyles.center}>
            <Text
              style={[
                localStyles.nameText,
                !isActive && localStyles.textDisabled,
              ]}
              numberOfLines={1}
            >
              {data.nome ?? "-"}
            </Text>
            <Text
              style={[
                localStyles.subText,
                !isActive && localStyles.textDisabled,
              ]}
              numberOfLines={1}
            >
              {data.descricao ?? ""}
            </Text>
          </View>

          <View style={localStyles.right}>
            <Text
              style={[
                localStyles.statusText,
                isActive ? localStyles.active : localStyles.inactive,
              ]}
            >
              {isActive ? "Ativo" : "Inativo"}
            </Text>
          </View>
        </TouchableOpacity>
      </SwipeableRow>
    </View>
  );
};

export default CardCategoria;

const localStyles = StyleSheet.create({
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "transparent",
  },
  left: { width: 48, alignItems: "center", justifyContent: "center" },
  initialCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#32B76C",
    alignItems: "center",
    justifyContent: "center",
  },
  initialDisabled: { backgroundColor: "#d1d1d1" },
  initialText: { color: "#fff", fontWeight: "700" },
  center: { flex: 1, paddingHorizontal: 10, justifyContent: "center" },
  right: { minWidth: 90, alignItems: "flex-end", justifyContent: "center" },
  nameText: { fontSize: 14, fontWeight: "600", color: "#000" },
  subText: { fontSize: 12, color: "#666", marginTop: 2 },
  statusText: { fontSize: 12 },
  active: { color: "#1b7f3e", fontWeight: "600" },
  inactive: { color: "#9a9a9a" },
  textDisabled: { color: "#bfbfbf" },
});
