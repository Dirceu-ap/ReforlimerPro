import React from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MaterialIcons,
  Entypo,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import { styles } from "./styles";
import { DrawerActions, useNavigation } from "@react-navigation/core";

const CustomDrawer: React.FC = () => {
  const navigation: any = useNavigation();

  async function logout() {
    Alert.alert("Sair", `Você tem certeza que quer sair?`, [
      {
        text: "Não",
        style: "cancel",
      },

      {
        text: "Sim",
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            navigation.navigate("Login");
          } catch (error) {
            Alert.alert("Não foi possivel sair, tente novamente!");
          }
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Image style={styles.logo} source={require("../../assets/logo2.png")} />

      <View
        style={{
          width: "90%",
          backgroundColor: "#c1c1c1",
          height: 0.5,
          alignSelf: "center",
          marginBottom: 5,
          marginTop: 20,
        }}
      />

      <ScrollView style={styles.container}>
        <View>
          <TouchableOpacity
            style={styles.Pages}
            onPress={() => {
              navigation.navigate("Movimentacoes");
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <MaterialIcons
              style={styles.iconRegistered}
              name="calendar-today"
              size={30}
              color="gray"
            />

            <Text style={styles.PagesText}>Movimentacões</Text>
          </TouchableOpacity>
        </View>

        <View>
          <TouchableOpacity
            style={styles.Pages}
            onPress={() => {
              navigation.navigate("Pagar");
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <MaterialIcons
              style={styles.iconRegistered}
              name="attach-money"
              size={30}
              color="gray"
            />

            <Text style={styles.PagesText}>Contas à Pagar</Text>
          </TouchableOpacity>
        </View>

        <View>
          <TouchableOpacity
            style={styles.Pages}
            onPress={() => {
              navigation.navigate("Receber");
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <MaterialIcons
              style={styles.iconRegistered}
              name="credit-card"
              size={30}
              color="gray"
            />

            <Text style={styles.PagesText}>Contas à Receber</Text>
          </TouchableOpacity>
        </View>

        <View>
          <TouchableOpacity
            style={styles.Pages}
            onPress={() => {
              navigation.navigate("Vendas");
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <MaterialIcons
              style={styles.iconRegistered}
              name="money"
              size={30}
              color="gray"
            />

            <Text style={styles.PagesText}>Vendas</Text>
          </TouchableOpacity>
        </View>

        <View>
          <TouchableOpacity
            style={styles.Pages}
            onPress={() => {
              navigation.navigate("Compras");
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <MaterialIcons
              style={styles.iconRegistered}
              name="shopping-cart"
              size={30}
              color="gray"
            />

            <Text style={styles.PagesText}>Compras</Text>
          </TouchableOpacity>
        </View>

        <View>
          <TouchableOpacity
            style={styles.Pages}
            onPress={() => {
              navigation.navigate("Pessoas");
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <MaterialIcons
              style={styles.iconRegistered}
              name="people-alt"
              size={30}
              color="gray"
            />

            <Text style={styles.PagesText}>Clientes</Text>
          </TouchableOpacity>
        </View>

        <View>
          <TouchableOpacity
            style={styles.Pages}
            onPress={() => {
              navigation.navigate("Despesas");
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <MaterialIcons
              style={styles.iconRegistered}
              name="people-alt"
              size={30}
              color="gray"
            />

            <Text style={styles.PagesText}>Despesas</Text>
          </TouchableOpacity>
        </View>

        <View>
          <TouchableOpacity
            style={styles.Pages}
            onPress={() => {
              navigation.navigate("Colaboradores");
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <MaterialIcons
              style={styles.iconRegistered}
              name="people-alt"
              size={30}
              color="gray"
            />

            <Text style={styles.PagesText}>Colaboradores</Text>
          </TouchableOpacity>
        </View>

        <View>
          <TouchableOpacity
            style={styles.Pages}
            onPress={() => {
              navigation.navigate("Fornecedores");
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <MaterialIcons
              style={styles.iconRegistered}
              name="people-alt"
              size={30}
              color="gray"
            />

            <Text style={styles.PagesText}>Fornecedores</Text>
          </TouchableOpacity>
        </View>

        <View>
          <TouchableOpacity
            style={styles.Pages}
            onPress={() => {
              navigation.navigate("Categorias");
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <MaterialIcons
              style={styles.iconRegistered}
              name="dashboard"
              size={30}
              color="gray"
            />

            <Text style={styles.PagesText}>Categorias</Text>
          </TouchableOpacity>
        </View>

        <View>
          <TouchableOpacity
            style={styles.Pages}
            onPress={() => {
              navigation.navigate("CatDespesa");
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <MaterialIcons
              style={styles.iconRegistered}
              name="calendar-today"
              size={30}
              color="gray"
            />

            <Text style={styles.PagesText}>CatDespesa</Text>
          </TouchableOpacity>
        </View>

        <View>
          <TouchableOpacity
            style={styles.Pages}
            onPress={() => {
              navigation.navigate("Produtos");
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <MaterialIcons
              style={styles.iconRegistered}
              name="outbox"
              size={30}
              color="gray"
            />

            <Text style={styles.PagesText}>Produtos</Text>
          </TouchableOpacity>
        </View>
        <View>
          <TouchableOpacity
            style={styles.Pages}
            onPress={() => {
              navigation.navigate("LivroPonto");
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <MaterialIcons
              style={styles.iconRegistered}
              name="outbox"
              size={30}
              color="gray"
            />

            <Text style={styles.PagesText}>Livroponto</Text>
          </TouchableOpacity>
        </View>
        {/*
         <View>
          <TouchableOpacity
            style={styles.Pages}
            onPress={() => {
              navigation.navigate("Receber");
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <MaterialCommunityIcons
              name="cash-multiple"
              size={30}
              color="gray"
            />

            <Text style={styles.PagesText}>Receber</Text>
          </TouchableOpacity>
        </View> */}

        {/* <View>
          <TouchableOpacity
            style={styles.Pages}
            onPress={() => {
              navigation.navigate("Estoque");
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <MaterialIcons
              style={styles.iconRegistered}
              name="warning"
              size={30}
              color="gray"
            />

            <Text style={styles.PagesText}>Estoque</Text>
          </TouchableOpacity>
        </View> */}

        <View>
          <TouchableOpacity
            style={styles.Pages}
            onPress={() => {
              navigation.navigate("Orcamento");
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <MaterialCommunityIcons
              name="file-document-outline"
              size={30}
              color="gray"
            />

            <Text style={styles.PagesText}>Orçamento</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => logout()} style={styles.Sair}>
          <MaterialIcons
            name="subdirectory-arrow-left"
            size={25}
            color="gray"
          />
          <Text style={styles.SairText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CustomDrawer;
