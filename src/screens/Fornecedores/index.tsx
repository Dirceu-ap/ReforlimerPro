import React from "react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Alert,
} from "react-native";
import { styles } from "./style";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/core";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const logoUri = Image.resolveAssetSource(require("../../assets/logo2.png")).uri;

import api from "../../services/api";
import CardFornecedor from "../../components/CardFornecedor";
import SwipeableRow from "../../components/SwipeableRow";

const Fornecedores: React.FC = () => {
  const navigation: any = useNavigation();

  const [lista, setLista] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [busca, setBusca] = useState("");
  const [onEndReachedCalledDuringMomentum, setMT] = useState(true);

  async function loadData() {
    try {
      const response = await api.get(
        `fornecedores/listar.php?pagina=${page}&limite=15`,
      );

      if (lista.length >= response.data.totalItems) return;

      if (loading === true) return;

      setLoading(true);
      const novos = response.data.resultado || [];
      const merged = [...lista, ...novos];
      merged.sort((a: any, b: any) =>
        String(a.nome ?? "")
          .toLowerCase()
          .localeCompare(String(b.nome ?? "").toLowerCase(), "pt-BR"),
      );
      setLista(merged);
      setPage(page + 1);
    } catch (error) {
      console.log(error);
    }
  }

  const handleEdit = (id: string) => {
    navigation.navigate("NovoFornecedor", { id_reg: id });
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Excluir", "Deseja realmente excluir este cliente?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await api.get(`fornecedores/excluir.php?id=${id}`);
          setLista(lista.filter((item: any) => item.id !== id));
        },
      },
    ]);
  };

  const handleParcelar = (id: string) => {
    navigation.navigate("ParcelarPessoa", { id_reg: id });
  };

  const renderItem = ({ item }: any) => (
    <CardFornecedor
      data={{
        ...item,
        onEdit: () => handleEdit(item.id),
        onDelete: () => handleDelete(item.id),
        onParcelar: () => handleParcelar(item.id),
      }}
    />
  );

  function Footer(load: any) {
    if (!load) return null;

    return (
      <View style={styles.loading}>
        <ActivityIndicator size={25} color="#000" />
      </View>
    );
  }

  async function Search() {
    const response = await api.get(`fornecedores/buscar.php?buscar=${busca}`);
    const itens = response.data.itens || [];
    const ordenado = [...itens].sort((a: any, b: any) =>
      String(a.nome ?? "")
        .toLowerCase()
        .localeCompare(String(b.nome ?? "").toLowerCase(), "pt-BR"),
    );
    setLista(ordenado);
  }

  useEffect(() => {
    loadData();
  }, [page, totalItems, lista]);

  async function generatePDF() {
    const htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            @page { size: A4; margin: 20mm; }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 12px 8px;
            font-size: 11px;
            line-height: 1.35;
            }
            .header { margin-bottom: 12px; }
            .header-top { display: flex; align-items: center; }
            .header-right { flex: 1; text-align: center; font-size: 11px; }
            .empresa { font-size: 14px; font-weight: bold; }
            .endereco { font-size: 11px; margin-top: 2px; }
            .logo { height: 100px; margin-right: 10px; }
            table {
              width: 100%;
              border-collapse: collapse;
            font-size: 10px;
            }
            th, td {
              border: 1px solid #000;
              padding: 4px 6px;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-top">
              <img class="logo" src="${logoUri}" alt="Logo" />
              <div class="header-right">
                <div class="empresa">Reforlimer reformas e construções</div>
                <div class="endereco">Avenida Laranjeiras, nº 701</div>
                <h1>Lista de Fornecedores</h1>
              </div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              ${lista
                .map(
                  (fornecedor: any) => `
                <tr>
                  <td>${fornecedor.nome}</td>
                  <td>${fornecedor.telefone || "N/A"}</td>
                  <td>${fornecedor.email || "N/A"}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (uri) {
        Alert.alert("PDF Gerado", "O PDF foi gerado com sucesso!");
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível gerar o PDF.");
      console.error(error);
    }
  }

  async function printPDF() {
    const htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            @page { size: A4; margin: 20mm; }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 12px 8px;
            font-size: 11px;
            line-height: 1.35;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            font-size: 10px;
            }
            th, td {
              border: 1px solid #000;
              padding: 4px 6px;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <h1>Lista de Fornecedores</h1>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              ${lista
                .map(
                  (fornecedor: any) => `
                <tr>
                  <td>${fornecedor.nome}</td>
                  <td>${fornecedor.telefone || "N/A"}</td>
                  <td>${fornecedor.email || "N/A"}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      await Print.printAsync({ html: htmlContent });
    } catch (error) {
      Alert.alert("Erro", "Não foi possível imprimir o PDF.");
      console.error(error);
    }
  }

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
          <TouchableOpacity
            style={styles.printButton}
            onPress={async () => {
              await generatePDF();
            }}
          >
            <MaterialIcons name="print" size={24} color="#FFF" />
          </TouchableOpacity>

          <TextInput
            style={styles.search}
            placeholder="Pesquisar Fornecedores."
            placeholderTextColor="gray"
            keyboardType="default"
            onChangeText={(busca) => setBusca(busca)}
            returnKeyType="search"
            onChange={() => Search()}
          />

          <TouchableOpacity style={styles.iconSearch} onPress={() => Search()}>
            <Ionicons name="search-outline" size={28} color="gray" />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, height: Dimensions.get("window").height + 30 }}>
          <FlatList
            data={lista}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            onEndReachedThreshold={0.1}
            removeClippedSubviews
            initialNumToRender={10}
            onEndReached={(distanceFromEnd) => {
              if (!onEndReachedCalledDuringMomentum) {
                loadData().then(() => setLoading(false));
                setMT(true);
              }
            }}
            ListFooterComponent={<Footer load={loading} />}
            onMomentumScrollBegin={() => setMT(false)}
            windowSize={10}
            getItemLayout={(data, index) => ({
              length: 50,
              offset: 50 * index,
              index,
            })}
          />
        </View>
      </View>

      <View style={styles.containerFloat}>
        <TouchableOpacity
          style={styles.CartButton}
          onPress={() => navigation.navigate("NovoFornecedor", { id_reg: "0" })}
        >
          <Ionicons name="add-outline" size={35} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Fornecedores;
