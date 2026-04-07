import { useNavigation } from "@react-navigation/native";
import React from "react";
import {
  Alert,
  Linking,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SwipeableRow from "../SwipeableRow/vendas";
import api from "../../services/api";
import { styles } from "./styles";
import { showMessage } from "react-native-flash-message";
import urlRaiz from "../../services/urlRaiz";
import { Ionicons } from "@expo/vector-icons";

interface DadosProps {
  data: {
    id: string;
    data: string;
    classe: string;
    movimento: string;
    descricao: string;
    empresa: string;
    fornecedor: string;
    usuario: string;
    documento: string;
    plano_conta: string;
    valor: string;
    saldo_geral: string;
    classe_saldo: string;
    classe_valor: string;
    classe_periodo: string;
    saldo_periodo: string;
    tipo: string;
    categoria: string;
    centro_custo: string;
    historico: string;
    parcela: string;
    total_parcela: string;
    forma_pagamento: string;
    banco: string;
    conta: string;
    obs: string;
    imagem: string;
    imagem_url: string;
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
        <Text style={{ color: "#595858", fontSize: 14 }}>
          Nenhum Registro Existente nessa data!
        </Text>
      ) : (
        <View>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                width: "100%",
                marginTop: 3,
                backgroundColor: "#f9f9f9",
                padding: 2,
              }}
            >
              <View style={{ flex: 1, flexDirection: "row" }}>
                <Text
                  style={{ color: data.classe, fontSize: 12, marginRight: 10 }}
                >
                  {data.data}{" "}
                </Text>
                <Text style={{ color: data.classe_valor, fontSize: 12 }}>
                  R$ {data.valor}{" "}
                </Text>
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    position: "absolute",
                    right: 5,
                  }}
                >
                  <Text style={{ color: "#595858", fontSize: 12 }}>
                    Total: R$
                  </Text>
                  <Text style={{ color: data.classe_periodo, fontSize: 12 }}>
                    {" "}
                    {data.saldo_periodo}
                  </Text>
                </View>
              </View>

              <Text>
                {" "}
                <Text>
                  <Ionicons
                    name="card-outline"
                    size={20}
                    color="#787878"
                  />{" "}
                </Text>{" "}
                <Text style={{ color: "#000" }}>
                  {"  "}
                  {data.documento}
                  {"  "}
                  <Text style={{ color: "#787878" }}> {data.descricao}</Text>
                </Text>
              </Text>
            </View>
          </View>
        </View>
      )}
    </>
  );
};

export default CardCompras;
