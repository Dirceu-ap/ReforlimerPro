import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { styles } from "./styles";

interface HeaderProps {
  title?: string;
  // rota explícita para onde o botão voltar deve ir
  backTo?: string;
  // ação customizada para o botão voltar (se informada, tem prioridade)
  onBackPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, backTo, onBackPress }) => {
  const navigation: any = useNavigation();

  return (
    <View style={styles.header}>
      <View style={styles.containerHeader}>
        <TouchableOpacity
          style={styles.menu}
          onPress={() => {
            // 0) Se vier uma ação customizada, usar ela primeiro
            if (onBackPress) {
              onBackPress();
              return;
            }

            // 1) Se há histórico no navigator atual (Stack), sempre volta primeiro
            if (navigation.canGoBack && navigation.canGoBack()) {
              navigation.goBack();
              return;
            }

            // 2) Se não há histórico (caso típico da aba Vendas), usa destino explícito se informado
            if (backTo) {
              navigation.navigate(backTo);
              return;
            }

            // 3) Tenta achar rotas conhecidas (Inicio / Home) no navigator atual
            try {
              const state = navigation.getState && navigation.getState();
              const routeNames = state?.routeNames || [];

              if (routeNames.includes("Inicio")) {
                navigation.navigate("Inicio");
                return;
              }

              if (routeNames.includes("Home")) {
                navigation.navigate("Home");
                return;
              }
            } catch (e) {
              // ignora erros de state
            }

            // 4) Se não encontrou no navigator atual, tenta no pai (útil para Tab/Drawer dentro do Stack)
            try {
              const parent = navigation.getParent && navigation.getParent();
              if (parent && parent.getState) {
                const pState = parent.getState();
                const pRouteNames = pState?.routeNames || [];

                if (pRouteNames.includes("Home")) {
                  parent.navigate("Home");
                  return;
                }

                if (pRouteNames.includes("Inicio")) {
                  parent.navigate("Inicio");
                  return;
                }
              }
            } catch (e) {
              // ignora erros de parent
            }

            // 5) Último recurso: tenta a rota "Home" no navigator atual
            navigation.navigate("Home");
          }}
        >
          <Ionicons name="arrow-back-circle-outline" size={35} color="#000" />
        </TouchableOpacity>

        <Image style={styles.logo} source={require("../../assets/logo2.png")} />
      </View>

      {title ? (
        <View style={{ alignItems: "center", marginTop: 4 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>{title}</Text>
        </View>
      ) : null}
    </View>
  );
};

export default Header;
