import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Alert, Text, TouchableOpacity, View, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SwipeableRow from "../SwipeableRow/vendas";
import api from "../../services/api";
import { styles } from "./styles";
import { showMessage } from "react-native-flash-message";
import urlRaiz from "../../services/urlRaiz";
import { Ionicons } from "@expo/vector-icons";

const { Linking } = require("react-native");

interface DadosProps {
  data: {
    id: string;
    valor: string;
    usuario: string;
    pagamento: string;
    lancamento: string;
    data_lanc: string;
    data_pgto: string;

    parcelas: string;
    status: string;
    cliente: string;
    local?: string;
    cor: string;
  };
}

const CardCompras = ({ data }: DadosProps) => {
  const navigation: any = useNavigation();

  async function excluir(nome: string, id: string) {
    const user = await AsyncStorage.getItem("@user");
    Alert.alert(
      "Sair",
      `Você tem certeza que deseja cancelar a Venda : ` + nome,
      [
        {
          text: "Não",
          style: "cancel",
        },

        {
          text: "Sim",
          onPress: async () => {
            try {
              const res = await api.get(
                `compras/excluir.php?id=${id}}&user=${user}`,
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
                description: "Registro " + nome + " Cancelada com Sucesso",
                type: "info",
              });
              navigation.push("Compras");
            } catch (error) {
              Alert.alert("Não foi possivel cancelar, tente novamente!");
            }
          },
        },
      ],
    );
  }

  return (
    <>
      {data.id === undefined ? (
        <></>
      ) : (
        <View>
          <SwipeableRow
            onPressWhatsapp={async () => {
              await Linking.openURL(
                urlRaiz + `relatorios/compras_class.php?id=${data.id}`,
              );
            }}
            onPressDelete={async () => {
              excluir(data.valor, data.id);
            }}
          >
            <TouchableOpacity
              style={styles.box}
              //onPress={() => }
            >
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ width: "100%", marginTop: 3 }}>
                  <Text>
                    {" "}
                    <Text>
                      <Ionicons name="square" size={20} color={data.cor} />{" "}
                    </Text>{" "}
                    <Text style={{ color: "#013d10", fontSize: 17 }}>
                      R$ {data.valor}{" "}
                    </Text>{" "}
                    <Text style={{ color: "#000", fontSize: 12 }}>
                      - {data.cliente}
                      {data.local ? ` - ${data.local}` : ""}
                    </Text>
                  </Text>
                  <Text>
                    {" "}
                    <Text>
                      <Ionicons
                        name="card-outline"
                        size={20}
                        color="#787878"
                      />{" "}
                    </Text>{" "}
                    <Text style={{ color: "#000", fontSize: 13 }}>
                      {data.lancamento} - {data.pagamento} - Venc:{" "}
                      {data.data_pgto} ({data.parcelas})
                    </Text>
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </SwipeableRow>
        </View>
      )}
    </>
  );
};

export default CardCompras;
