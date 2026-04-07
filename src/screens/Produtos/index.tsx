import React, { useEffect, useState } from "react";
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

import api from "../../services/api";
import CardProdutos from "../../components/CardProdutos";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const logoUri = Image.resolveAssetSource(require("../../assets/logo2.png")).uri;

const Produtos: React.FC = () => {
  const navigation: any = useNavigation();

  const [lista, setLista] = useState<any[]>([]);
  const [todosProdutos, setTodosProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [busca, setBusca] = useState("");
  const [onEndReachedCalledDuringMomentum, setMT] = useState(true);

  // Carrega todos os produtos ao abrir a tela
  async function fetchProdutos() {
    setLoading(true);
    try {
      const response = await api.get(
        "produtos/listar.php?pagina=1&limite=10000",
      );
      if (response.data && Array.isArray(response.data.resultado)) {
        const ordenados = [...response.data.resultado].sort(
          (a: any, b: any) => {
            const na = (a.nome || "").toString().toLowerCase();
            const nb = (b.nome || "").toString().toLowerCase();
            if (na < nb) return -1;
            if (na > nb) return 1;
            return 0;
          },
        );
        setLista(ordenados);
        setTodosProdutos(ordenados);
      } else {
        setLista([]);
        setTodosProdutos([]);
      }
    } catch (error) {
      setLista([]);
      setTodosProdutos([]);
    } finally {
      setLoading(false);
    }
  }

  // Pesquisa local nos produtos já carregados
  function pesquisarLocal(texto: string) {
    if (!texto.trim()) {
      setLista(todosProdutos);
      return;
    }
    const termo = texto.trim().toLowerCase();
    const filtrados = todosProdutos.filter((prod) => {
      const nome = (prod.nome || "").toLowerCase();
      const codigo = (prod.codigo || "").toLowerCase();
      return nome.includes(termo) || codigo.includes(termo);
    });
    setLista(filtrados);
  }

  async function loadData() {
    if (loading === true) return;

    try {
      setLoading(true);

      const response = await api.get(
        `produtos/listar.php?pagina=${page}&limite=15`,
      );

      const novos: any[] = Array.isArray(response.data?.resultado)
        ? response.data.resultado
        : [];

      // adiciona apenas produtos com id ainda não presente na lista
      setLista((prev) => {
        const idsExistentes = new Set(prev.map((p: any) => p.id));
        const filtrados = novos.filter(
          (p: any) => p && p.id != null && !idsExistentes.has(p.id),
        );
        const merged = [...prev, ...filtrados];
        merged.sort((a: any, b: any) => {
          const na = (a.nome || "").toString().toLowerCase();
          const nb = (b.nome || "").toString().toLowerCase();
          if (na < nb) return -1;
          if (na > nb) return 1;
          return 0;
        });
        return merged;
      });

      setPage((prev) => prev + 1);
    } catch (error) {
      console.error(error); // Garantir que erros sejam tratados corretamente
    } finally {
      setLoading(false);
    }
  }

  const renderItem = function ({ item }: any) {
    return (
      <CardProdutos
        data={item}
        onComprar={() =>
          navigation.navigate("ComprarProduto", { id_reg: item.id })
        }
        onEdit={() => navigation.navigate("NovoProduto", { id_reg: item.id })}
        onDelete={() => {
          Alert.alert(
            "Excluir Produto",
            `Deseja realmente excluir o produto "${item.nome}"?`,
            [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Excluir",
                style: "destructive",
                onPress: async () => {
                  await api.get(`produtos/excluir.php?id=${item.id}`);
                  fetchProdutos();
                },
              },
            ],
          );
        }}
      />
    );
  };

  function Footer(load: any) {
    if (!load) return null;

    return (
      <View style={styles.loading}>
        <ActivityIndicator size={25} color="#000" />
      </View>
    );
  }

  async function Search(texto: string) {
    const response = await api.get(`produtos/buscar.php?buscar=${texto}`);
    const itens: any[] = Array.isArray(response.data?.itens)
      ? response.data.itens
      : [];
    const ordenados = [...itens].sort((a: any, b: any) => {
      const na = (a.nome || "").toString().toLowerCase();
      const nb = (b.nome || "").toString().toLowerCase();
      if (na < nb) return -1;
      if (na > nb) return 1;
      return 0;
    });
    setLista(ordenados);
  }

  async function generatePDF() {
    // Calcula o valor total de cada produto, total geral de custo e total geral de venda
    let valorTotalGeral = 0;
    let totalCustoGeral = 0;
    let totalVendaGeral = 0;

    const linhasProdutos = lista
      .map((produto: any) => {
        const estoque = Number(produto.estoque) || 0;
        const valorVenda = Number(produto.valor_venda) || 0;
        const valorCusto = Number(produto.valor_compra) || 0;
        const valorTotalProduto = estoque * valorVenda;

        // Soma os totais gerais
        totalCustoGeral += estoque * valorCusto;
        totalVendaGeral += estoque * valorVenda;
        valorTotalGeral += valorTotalProduto;

        return `
        <tr>
          <td>${produto.nome || "N/A"}</td>
          <td>${produto.estoque || "N/A"}</td>
          <td>R$ ${valorCusto.toFixed(2)}</td>
          <td>R$ ${valorVenda.toFixed(2)}</td>
          <td>R$ ${valorTotalProduto.toFixed(2)}</td>
        </tr>
      `;
      })
      .join("");

    const htmlContent = `
    <!DOCTYPE html>
    <html> 
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #2c3e50; font-size: 11px; line-height: 1.35; }
          .header { margin-bottom: 10px; }
          .header-top { display: flex; align-items: center; }
          .header-right { flex: 1; text-align: center; font-size: 10px; }
          .empresa { font-size: 13px; font-weight: bold; }
          .endereco { font-size: 10px; margin-top: 2px; }
          .logo { height: 90px; margin-right: 10px; }
          h1 { color: #32B768; font-size: 17px; font-weight: bold; margin: 6px 0 0 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10px; }
          th { background: #32B768; color: white; padding: 6px; text-align: left; }
          td { padding: 6px; border: 1px solid #ddd; }
          tr:nth-child(even) { background: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-top">
            <img class="logo" src="${logoUri}" alt="Logo" />
            <div class="header-right">
              <div class="empresa">Reforlimer reformas e construções</div>
              <div class="endereco">Avenida Laranjeiras, nº 701</div>
              <h1>Lista de Produtos</h1>
            </div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Estoque</th>
              <th>Preço Custo</th>
              <th>Preço Venda</th>
              <th>Total por Produto</th>
            </tr>
          </thead>
          <tbody>
            ${linhasProdutos}
          </tbody>
        </table>
        <h2 style="margin-top:20px;">
          Valor Total de Todos os Produtos (Venda): R$ ${totalVendaGeral.toFixed(
            2,
          )}<br>
          Valor Total de Todos os Produtos (Custo): R$ ${totalCustoGeral.toFixed(
            2,
          )}
        </h2>
      </body>
    </html>
  `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Lista de Produtos",
        });
      } else {
        await Print.printAsync({ uri });
      }
      Alert.alert("PDF Gerado", "O PDF foi gerado com sucesso!");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível gerar o PDF.");
      console.error(error);
    }
  }

  async function printPDF() {
    const htmlContent = `
          <html>
            <body>
              <h1>Lista de Produtos</h1>
              <table border="1" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Estoque</th>
                    <th>Preço Custo</th>
                    <th>Preço Venda</th>
                  </tr>
                </thead>
                <tbody>
                  ${lista
                    .map(
                      (produto: any) => `
                    <tr>
                      <td>${produto.nome || "N/A"}</td>
                      <td>${produto.estoque || "N/A"}</td>
                      <td>R$ ${
                        produto.valor_compra &&
                        !isNaN(Number(produto.valor_compra))
                          ? Number(produto.valor_compra).toFixed(2)
                          : "0.00"
                      }</td>
                      <td>R$ ${
                        produto.valor_venda &&
                        !isNaN(Number(produto.valor_venda))
                          ? Number(produto.valor_venda).toFixed(2)
                          : "0.00"
                      }</td>
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
      Alert.alert(
        "Impressão Concluída",
        "O PDF foi enviado para impressão com sucesso!",
        [{ text: "OK" }],
        { cancelable: false },
      );
    } catch (error) {
      Alert.alert(
        "Erro",
        "Não foi possível imprimir o PDF.",
        [{ text: "OK" }],
        { cancelable: false },
      );
      console.error(error);
    }
  }

  useEffect(() => {
    fetchProdutos();
    // Se quiser atualizar ao voltar da tela de cadastro:
    const unsubscribe = navigation.addListener("focus", fetchProdutos);
    return unsubscribe;
  }, [navigation]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color="#000" size="large" />
      </View>
    );
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
            placeholder="Pesquisar Produtos (Nome ou Código)."
            placeholderTextColor="gray"
            keyboardType="default"
            value={busca}
            onChangeText={(texto) => {
              setBusca(texto);
              pesquisarLocal(texto);
            }}
            returnKeyType="search"
          />

          <TouchableOpacity
            style={styles.iconSearch}
            onPress={() => pesquisarLocal(busca)}
          >
            <Ionicons name="search-outline" size={28} color="gray" />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          <FlatList
            data={lista}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            initialNumToRender={10}
            onEndReachedThreshold={0.1}
            onEndReached={() => {
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
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 1,
            }}
          />
        </View>

        <View style={styles.containerFloat}>
          <TouchableOpacity
            style={styles.CartButton}
            onPress={() => navigation.navigate("NovoProduto", { id_reg: "0" })}
          >
            <Ionicons name="add-outline" size={35} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default Produtos;
