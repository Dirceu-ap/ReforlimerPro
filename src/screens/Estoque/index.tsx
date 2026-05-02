import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Alert,
  Text,
} from "react-native";
import { styles } from "./style";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/core";

import api from "../../services/api";
import Card from "../../components/CardProdutos";

const PAGE_LIMIT = 15;

const Estoque: React.FC = () => {
  const navigation: any = useNavigation();

  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [busca, setBusca] = useState("");
  const [onEndReachedCalledDuringMomentum, setMT] = useState(true);

  // novo: evita repetidas mensagens de erro do servidor
  const [serverError, setServerError] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const parseResponseData = (raw: any) => {
    if (!raw) return {};
    // já é objeto/array
    if (typeof raw === "object") return raw;
    if (typeof raw !== "string") return {};

    const s = String(raw).trim();

    // 1) tentativa direta (caso não haja conteúdo extra)
    try {
      return JSON.parse(s);
    } catch (e) {
      // continua para tentativas de extração
    }

    // 2) extrair primeiro objeto/array JSON via regex
    const objMatch = s.match(/(\{[\s\S]*\})/);
    const arrMatch = s.match(/(\[[\s\S]*\])/);
    const candidate = objMatch?.[1] ?? arrMatch?.[1];
    if (candidate) {
      try {
        return JSON.parse(candidate);
      } catch (e) {
        console.error("parseResponseData candidate parse error", e);
      }
    }

    // 3) fallback: localizar primeiras/últimas chaves e tentar parse
    const firstBrace = s.indexOf("{");
    const lastBrace = s.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonStr = s.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonStr);
      } catch (e) {
        console.error("parseResponseData fallback parse error", e);
      }
    }

    console.warn(
      "parseResponseData: não foi possível extrair JSON. Conteúdo (trim):",
      s.slice(0, 1000),
    );
    return {};
  };

  const loadData = async (opts?: { reset?: boolean }) => {
    try {
      if (loading) return;
      // se já ocorreu erro de servidor, não ficar tentando indefinidamente
      if (serverError && !opts?.reset) return;

      const nextPage = opts?.reset ? 1 : page;

      // se já carregou tudo não tenta carregar mais
      if (!opts?.reset && totalItems > 0 && lista.length >= totalItems) return;

      setLoading(true);
      if (opts?.reset) {
        setServerError(false);
        setServerMessage(null);
      }

      const response = await api.get(
        `produtos/listar_estoque.php?pagina=${nextPage}&limite=${PAGE_LIMIT}`,
      );

      const resp = parseResponseData(response?.data);

      // Se API declarou success=false ou resultado == "0", tratar como vazio e sinalizar erro/alerta
      if (resp.success === false || resp.resultado === "0") {
        // armazena mensagem do servidor (se houver)
        const msg =
          resp.message ?? resp.resultado ?? "Resposta vazia do servidor";
        setServerError(true);
        setServerMessage(String(msg));
        if (nextPage === 1) {
          setLista([]);
          setTotalItems(Number(resp.totalItems ?? 0));
        }
        // mostra alerta apenas uma vez
        if (msg) Alert.alert("Servidor", String(msg));
        setLoading(false);
        return;
      }

      const resultados = Array.isArray(resp.resultado)
        ? resp.resultado
        : Array.isArray(resp.itens)
          ? resp.itens
          : [];

      const total = Number(
        resp.totalItems ?? (nextPage === 1 ? resultados.length : totalItems),
      );

      setLista((prev) =>
        nextPage === 1 ? resultados : [...prev, ...resultados],
      );
      setTotalItems(isNaN(total) ? 0 : total);
      setPage(nextPage + 1);
      setLoading(false);
    } catch (error: any) {
      console.error("listar_estoque error:", error);
      try {
        console.error("error.response?.data:", error?.response?.data);
      } catch {}
      const msg =
        error?.response?.data?.message ??
        error?.response?.data ??
        error?.message ??
        "Erro desconhecido ao conectar com o servidor";
      setServerError(true);
      setServerMessage(String(msg));
      Alert.alert("Erro ao listar estoque", String(msg));
      setLoading(false);
    }
  };

  const Search = async (reset = true) => {
    try {
      if (loading) return;
      setLoading(true);
      if (reset) {
        setServerError(false);
        setServerMessage(null);
      }

      const response = await api.get(
        `produtos/buscar_estoque.php?buscar=${encodeURIComponent(busca)}`,
      );
      const resp = parseResponseData(response?.data);

      if (resp.success === false || resp.resultado === "0") {
        const msg =
          resp.message ?? resp.resultado ?? "Resposta vazia do servidor";
        setServerError(true);
        setServerMessage(String(msg));
        setLista([]);
        setTotalItems(Number(resp.totalItems ?? 0));
        if (msg) Alert.alert("Servidor", String(msg));
        setLoading(false);
        return;
      }

      const resultados = Array.isArray(resp.resultado)
        ? resp.resultado
        : Array.isArray(resp.itens)
          ? resp.itens
          : Array.isArray(resp)
            ? resp
            : [];

      setLista(resultados);
      setTotalItems(Number(resp.totalItems ?? resultados.length));
      setPage(2);
      setLoading(false);
    } catch (error: any) {
      console.error("buscar_estoque error:", error);
      const msg =
        error?.response?.data?.message ??
        error?.message ??
        "Erro desconhecido ao buscar";
      setServerError(true);
      setServerMessage(String(msg));
      Alert.alert("Erro ao buscar estoque", String(msg));
      setLoading(false);
    }
  };

  useEffect(() => {
    // carregar primeira página
    loadData({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getQty = (item: any) => {
    if (!item) return 0;
    const raw = item.estoque ?? item.qtd ?? item.quantidade ?? 0;
    const cleaned = String(raw).replace(/\s/g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  // exibe contagem com base no total informado pela API (se disponível)
  const lowCount =
    Number.isFinite(totalItems) && totalItems > 0
      ? totalItems
      : Array.isArray(lista)
        ? lista.length
        : 0;
  const renderLowStockHeader = () => {
    if (!lowCount) return null;
    return (
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontWeight: "700", marginBottom: 6 }}>
          Produtos com estoque baixo ({lowCount})
        </Text>
        {serverError && serverMessage ? (
          <Text style={{ color: "red", marginTop: 4 }}>{serverMessage}</Text>
        ) : null}
      </View>
    );
  };

  const renderItem = ({ item }: any) => {
    if (!item) return null;
    return <Card data={item} />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.containerHeader}>
          <TouchableOpacity
            style={styles.menu}
            onPress={() => navigation.push("Home")}
          >
            <Ionicons name="arrow-back-circle-outline" size={35} color="#000" />
          </TouchableOpacity>

          <Image
            style={styles.logo}
            source={require("../../assets/logo2.png")}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: 15, flex: 1 }}>
        <View style={styles.containerSearch}>
          <TextInput
            style={styles.search}
            placeholder="Pesquisar Produtos (Nome ou Código)."
            placeholderTextColor="gray"
            keyboardType="default"
            onChangeText={(t) => setBusca(t)}
            value={busca}
            returnKeyType="search"
            onSubmitEditing={() => Search(true)}
          />

          <TouchableOpacity
            style={styles.iconSearch}
            onPress={() => Search(true)}
          >
            <Ionicons name="search-outline" size={28} color="gray" />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, height: Dimensions.get("window").height + 30 }}>
          <FlatList
            data={lista}
            renderItem={renderItem}
            keyExtractor={(item) =>
              String(item?.id ?? item?.codigo ?? Math.random())
            }
            ListHeaderComponent={renderLowStockHeader}
            onEndReachedThreshold={0.1}
            removeClippedSubviews
            initialNumToRender={10}
            onEndReached={() => {
              if (
                !onEndReachedCalledDuringMomentum &&
                !loading &&
                lista.length < totalItems &&
                !serverError
              ) {
                loadData();
                setMT(true);
              }
            }}
            ListFooterComponent={() =>
              loading ? (
                <View style={{ paddingVertical: 12 }}>
                  <ActivityIndicator size="small" color="#000" />
                </View>
              ) : (
                <View />
              )
            }
            onMomentumScrollBegin={() => setMT(false)}
            windowSize={10}
            getItemLayout={(data, index) => ({
              length: 80,
              offset: 80 * index,
              index,
            })}
          />
        </View>

        <View style={styles.containerFloat}>
          <TouchableOpacity
            style={styles.CartButton}
            onPress={() => navigation.push("NovoProduto", { id_reg: "0" })}
          >
            <Ionicons name="add-outline" size={35} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default Estoque;
