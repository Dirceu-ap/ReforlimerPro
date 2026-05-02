import React, { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SafeAreaView,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
} from "react-native";

import { MaterialIcons } from "@expo/vector-icons";
import { styles } from "./style";
import { DrawerActions, useNavigation } from "@react-navigation/core";
import { AnimatedCircularProgress } from "react-native-circular-progress";

import api from "../../services/api";
import Load from "../../components/Load";
import { useIsFocused } from "@react-navigation/native";

export default function Home() {
  const navigation: any = useNavigation();
  const isFocused = useIsFocused();

  const [dados, setDados] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [usu, setUsu] = React.useState("");
  const loadingRef = useRef(false);
  const lastLoadedAtRef = useRef(0);

  const HOME_REFRESH_INTERVAL_MS = 15000;
  const HOME_CACHE_KEY = "@home_cards_cache";
  const HOME_CACHE_TTL_MS = 60000;

  async function carregarCacheHome() {
    try {
      const raw = await AsyncStorage.getItem(HOME_CACHE_KEY);
      if (!raw) return false;

      const parsed = JSON.parse(raw);
      const updatedAt = Number(parsed?.updatedAt ?? 0);
      const cacheDados = parsed?.dados;

      if (!cacheDados || !updatedAt) return false;

      const expired = Date.now() - updatedAt > HOME_CACHE_TTL_MS;
      if (expired) return false;

      setDados(cacheDados);
      setIsLoading(false);
      lastLoadedAtRef.current = updatedAt;
      return true;
    } catch {
      return false;
    }
  }

  async function listarDados(options?: {
    force?: boolean;
    showLoader?: boolean;
  }) {
    const force = options?.force === true;
    const showLoader = options?.showLoader === true;

    if (loadingRef.current && !force) return;

    const now = Date.now();
    if (!force && now - lastLoadedAtRef.current < HOME_REFRESH_INTERVAL_MS) {
      return;
    }

    loadingRef.current = true;
    if (showLoader && !refreshing) {
      setIsLoading(true);
    }

    try {
      const [dashRes, estoqueRes] = await Promise.allSettled([
        api.get("dashboard/ListAllCards.php"),
        api.get("produtos/listar_estoque.php?pagina=1&limite=1000"),
      ]);

      const base =
        dashRes.status === "fulfilled" && dashRes.value?.data
          ? dashRes.value.data
          : {};

      // tenta garantir que o número de produtos com estoque baixo
      // esteja sempre correto, mesmo que o backend não envie o campo
      let estoqueBaixo: number | undefined =
        typeof base.estoque_baixo === "number" ? base.estoque_baixo : undefined;

      if (estoqueRes.status === "fulfilled") {
        const d = estoqueRes.value?.data ?? {};
        const arr = Array.isArray(d.resultado)
          ? d.resultado
          : Array.isArray(d.itens)
            ? d.itens
            : [];
        estoqueBaixo = arr.length;
      }

      setDados({
        ...base,
        estoque_baixo: estoqueBaixo ?? 0,
      });

      const nowTs = Date.now();
      lastLoadedAtRef.current = nowTs;

      await AsyncStorage.setItem(
        HOME_CACHE_KEY,
        JSON.stringify({
          updatedAt: nowTs,
          dados: {
            ...base,
            estoque_baixo: estoqueBaixo ?? 0,
          },
        }),
      );
    } catch (error) {
      console.log("Error");
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  async function carregarUsuario() {
    try {
      const nomeArmazenado = await AsyncStorage.getItem("@user_name");
      if (nomeArmazenado) {
        setUsu(nomeArmazenado);
        return;
      }

      const userRaw = await AsyncStorage.getItem("@user");
      if (!userRaw) return;

      let userId: any = userRaw;
      try {
        const parsed = JSON.parse(userRaw);
        userId = parsed?.id ?? parsed?.user ?? parsed ?? userRaw;
      } catch {
        userId = userRaw;
      }

      if (!userId) return;

      const res = await api.get(`usuarios/listar_id.php?id=${userId}`);
      if (res.data && res.data.dados && res.data.dados.nome) {
        setUsu(res.data.dados.nome);
        await AsyncStorage.setItem("@user_name", res.data.dados.nome);
      }
    } catch (error) {
      console.log("Erro ao carregar usuário", error);
    }
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      carregarUsuario();
      const temCacheValido = await carregarCacheHome();
      if (!mounted) return;

      if (temCacheValido) {
        listarDados({ force: false, showLoader: false });
      } else {
        listarDados({ force: true, showLoader: true });
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isFocused) {
      listarDados({ force: false, showLoader: false });
    }
  }, [isFocused]);

  const onRefresh = () => {
    setRefreshing(true);
    listarDados({ force: true, showLoader: false });
  };

  const contasRecebidas = Number(dados?.contasRecebidas ?? 0);
  const contasaReceber = Number(dados?.contasaReceber ?? 0);
  const porcent =
    contasaReceber > 0
      ? Math.min(100, Math.max(0, (contasRecebidas / contasaReceber) * 100))
      : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1 }}>
        {/* HEADER ORIGINAL */}
        <View style={styles.header}>
          <View style={styles.containerHeader}>
            <TouchableOpacity
              style={styles.menu}
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            >
              <MaterialIcons name="menu" size={35} color="black" />
            </TouchableOpacity>

            <Image
              style={styles.logo}
              source={require("../../assets/logo2.png")}
            />
          </View>
        </View>

        {isLoading ? (
          <Load />
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View style={{ padding: 16 }}>
              {/* TÍTULO / BOAS-VINDAS */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "600",
                    color: "#111827",
                    marginBottom: 4,
                  }}
                >
                  Olá, bem-vindo(a) {usu}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#6b7280",
                  }}
                >
                  Veja um resumo rápido do seu financeiro hoje.
                </Text>
              </View>

              {/* CARD DO PROGRESSO */}
              <View
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 18,
                  padding: 16,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#111827",
                      marginBottom: 4,
                    }}
                  >
                    Recebimentos de Hoje
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#6b7280",
                    }}
                  >
                    Recebidas{" "}
                    <Text style={{ fontWeight: "600", color: "#111827" }}>
                      {contasRecebidas}
                    </Text>{" "}
                    de{" "}
                    <Text style={{ fontWeight: "600", color: "#111827" }}>
                      {contasaReceber}
                    </Text>{" "}
                    Receber
                  </Text>
                </View>

                <AnimatedCircularProgress
                  size={100}
                  width={10}
                  fill={porcent}
                  tintColor="#05a30de8"
                  backgroundColor="#e5e7eb"
                  lineCap={"round"}
                >
                  {(fill: number) => (
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#111827",
                      }}
                    >
                      {contasaReceber === 0 || contasRecebidas === 0
                        ? "0%"
                        : `${Math.round(fill)}%`}
                    </Text>
                  )}
                </AnimatedCircularProgress>
              </View>

              {/* GRID DE CARDS */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                }}
              >
                {/* RECEBER HOJE */}
                <View style={{ width: "48%", marginBottom: 16 }}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Receber")}
                  >
                    <View
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: 18,
                        padding: 14,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <MaterialIcons
                          name="monetization-on"
                          size={34}
                          color="#22c55e"
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: "#111827",
                            flexShrink: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          Receber Hoje
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "700",
                          color: "#111827",
                          marginBottom: 4,
                          textAlign: "center",
                        }}
                      >
                        {dados.contasaReceberPendentes}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6b7280" }}>
                        Contas à receber hoje
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* PAGAR HOJE */}
                <View style={{ width: "48%", marginBottom: 16 }}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Pagar")}
                  >
                    <View
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: 18,
                        padding: 14,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <MaterialIcons
                          name="money-off"
                          size={34}
                          color="#ef4444"
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: "#111827",
                            flexShrink: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          Pagar Hoje
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "600",
                          color: "#111827",
                          marginBottom: 4,
                          textAlign: "center",
                        }}
                      >
                        {dados.contasaPagarHoje}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6b7280" }}>
                        Contas à pagar hoje
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* RECEBER VENCIDAS */}
                <View style={{ width: "48%", marginBottom: 16 }}>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate("Receber", { modo: "vencidas" })
                    }
                  >
                    <View
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: 18,
                        padding: 14,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <MaterialIcons
                          name="date-range"
                          size={28}
                          color="#f97316"
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: "#111827",
                            flexShrink: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          Receber vencidas
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "600",
                          color: "#111827",
                          marginBottom: 4,
                          textAlign: "center",
                        }}
                      >
                        {dados.contasaReceberVencidas}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6b7280" }}>
                        Contas em atraso
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* PAGAR VENCIDAS */}
                <View style={{ width: "48%", marginBottom: 16 }}>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate("Pagar", { modo: "vencidas" })
                    }
                  >
                    <View
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: 18,
                        padding: 14,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <MaterialIcons
                          name="calendar-view-day"
                          size={28}
                          color="#f97316"
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#111827",
                            flexShrink: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          Pagar vencidas
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "600",
                          color: "#111827",
                          marginBottom: 4,
                          textAlign: "center",
                        }}
                      >
                        {dados.contasaPagarVencidas}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6b7280" }}>
                        Contas em atraso
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* LUCRO DA EMPRESA */}
                <View style={{ width: "48%", marginBottom: 16 }}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("LancamentosCustos")}
                  >
                    <View
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: 18,
                        padding: 14,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <MaterialIcons
                          name="analytics"
                          size={30}
                          color="#16a34a"
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#111827",
                            flexShrink: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          Lucro da empresa
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          minHeight: 34,
                        }}
                      >
                        Lancar encargos e custos para calcular resultado
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* ESTOQUE BAIXO */}
                <View style={{ width: "48%", marginBottom: 16 }}>
                  <TouchableOpacity onPress={() => navigation.push("Estoque")}>
                    <View
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: 18,
                        padding: 14,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <MaterialIcons
                          name="info-outline"
                          size={30}
                          color="#ef4444"
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#111827",
                            flexShrink: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          Estoque baixo
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "600",
                          color: "#111827",
                          marginBottom: 4,
                          textAlign: "center",
                        }}
                      >
                        {dados.estoque_baixo ?? 0}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6b7280" }}>
                        Produtos com alerta
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* CLIENTES */}
                <View style={{ width: "48%", marginBottom: 16 }}>
                  <TouchableOpacity onPress={() => navigation.push("Pessoas")}>
                    <View
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: 18,
                        padding: 14,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <MaterialIcons
                          name="people-alt"
                          size={34}
                          color="#32B768"
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#111827",
                            flexShrink: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          Clientes
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "600",
                          color: "#111827",
                          marginBottom: 4,
                          textAlign: "center",
                        }}
                      >
                        {dados.quantidade_clientes}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6b7280" }}>
                        Clientes cadastrados
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* PRODUTOS */}
                <View style={{ width: "48%", marginBottom: 16 }}>
                  <TouchableOpacity onPress={() => navigation.push("Produtos")}>
                    <View
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: 18,
                        padding: 14,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <MaterialIcons
                          name="laptop"
                          size={34}
                          color="#22c55e"
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#111827",
                            flexShrink: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          Produtos
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "600",
                          color: "#111827",
                          marginBottom: 4,
                          textAlign: "center",
                        }}
                      >
                        {dados.quantidade_produtos}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6b7280" }}>
                        Produtos cadastrados
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* FORNECEDORES */}
                <View style={{ width: "48%", marginBottom: 16 }}>
                  <TouchableOpacity
                    onPress={() => navigation.push("Fornecedores")}
                  >
                    <View
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: 18,
                        padding: 14,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <MaterialIcons
                          name="people-alt"
                          size={30}
                          color="#6b7280"
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#111827",
                            flexShrink: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          Fornecedores
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "600",
                          color: "#111827",
                          marginBottom: 4,
                          textAlign: "center",
                        }}
                      >
                        {dados.quantidade_fornecedores}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6b7280" }}>
                        Fornecedores cadastrados
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
