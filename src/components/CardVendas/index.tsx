import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SwipeableRow from "../SwipeableRow/vendas";
import api from "../../services/api";
import { styles } from "./styles";
import { showMessage } from "react-native-flash-message";
import urlRaiz from "../../services/urlRaiz";
import { Ionicons } from "@expo/vector-icons";

const { Linking } = require("react-native");

interface DadosProps {
  data: any;
  onRefresh?: () => void;
}

const CardVendas = ({ data, onRefresh }: DadosProps) => {
  const navigation: any = useNavigation();

  async function excluir(nome: string, id: string) {
    const user = await AsyncStorage.getItem("@user");
    Alert.alert(
      "Cancelar Venda",
      `Você tem certeza que deseja cancelar a venda de R$ ${nome}?`,
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim",
          onPress: async () => {
            try {
              const res = await api.get(
                `vendas/excluir.php?id=${id}&user=${user}`,
              );
              if (res.data.sucesso === false) {
                showMessage({
                  message: "Restrição ao Excluir",
                  description: res.data.mensagem,
                  type: "warning",
                });
                return;
              }
              showMessage({
                message: "Exclusão",
                description: `Venda de R$ ${nome} cancelada com sucesso`,
                type: "info",
              });
              if (onRefresh) onRefresh();
            } catch (error) {
              Alert.alert("Não foi possível cancelar, tente novamente!");
            }
          },
        },
      ],
    );
  }

  if (!data.id) return null;

  return (
    <View>
      <SwipeableRow
        onPressWhatsapp={async () => {
          await Linking.openURL(
            urlRaiz + `relatorios/venda_class.php?id=${data.id}`,
          );
        }}
        onPressDelete={async () => {
          excluir(data.subtotal, data.id);
        }}
      >
        <TouchableOpacity style={styles.box}>
          <View style={{ flexDirection: "column", width: "100%" }}>
            <Text>
              <Ionicons name="square" size={20} color={data.cor} />{" "}
              <Text style={{ color: "#013d10", fontSize: 15 }}>
                R$ {data.subtotal}{" "}
              </Text>
              <Text style={{ color: "#000", fontSize: 10 }}>
                - {data.cliente}
              </Text>
            </Text>
            <Text>
              <Ionicons name="card-outline" size={20} color="#787878" />{" "}
              <Text style={{ color: "#000" }}>
                {data.lancamento} - {data.pagamento} - Venc: {data.data_pgto} (
                {data.parcelas})
              </Text>
            </Text>
            <Text style={{ color: "#000", fontSize: 12 }}>
              Status: {data.status}
            </Text>
          </View>
        </TouchableOpacity>
      </SwipeableRow>
    </View>
  );
};

export default CardVendas;
