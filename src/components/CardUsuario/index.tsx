import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import SwipeableRow from "../SwipeableRow";
import api from "../../services/api";
import { styles } from "./styles";
import { showMessage } from "react-native-flash-message";

const { Linking } = require("react-native");

interface DadosProps {
  data: {
    id: string;
    nome: string;
    telefone: string;
    email: string;
    ativo: string;
  };
}

const CardUsuarios = ({ data }: DadosProps) => {
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
              const response = await api.get(`usuarios/excluir.php?id=${id}`);
              showMessage({
                message: "Exclusão",
                description: "Registro " + nome + " Excluído com Sucesso",
                type: "info",
              });
              navigation.push("Usuarios");
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
      {data.id === undefined &&
      data.nome === undefined &&
      data.telefone === undefined &&
      data.email === undefined ? (
        <></>
      ) : (
        <View>
          <SwipeableRow
            onPressWhatsapp={async () => {
              await Linking.openURL(
                `http://api.whatsapp.com/send?1=pt_BR&phone=55${data.telefone}`,
              );
            }}
            onPressEdit={async () => {
              navigation.push("NovoUsuario", { id_reg: data.id });
            }}
            onPressDelete={async () => {
              excluir(data.nome, data.id);
            }}
          >
            <TouchableOpacity
              style={styles.box}
              onPress={() => Alert.alert("", data.telefone)}
            >
              {(() => {
                if (data.ativo == "Sim") {
                  return (
                    <Text style={{ color: "#000" }}>
                      {data.nome} - Telefone: {data.telefone}
                    </Text>
                  );
                } else {
                  return (
                    <Text style={{ color: "#bfbfbf" }}>
                      {data.nome} - Telefone: {data.telefone}
                    </Text>
                  );
                }
              })()}
            </TouchableOpacity>
          </SwipeableRow>
        </View>
      )}
    </>
  );
};

export default CardUsuarios;
