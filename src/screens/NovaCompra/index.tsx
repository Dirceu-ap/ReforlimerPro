import React, { useState, useEffect } from "react";
import {
  Image,
  Modal,
  FlatList,
  Alert,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/core";
import { RectButton, ScrollView } from "react-native-gesture-handler";
import { EvilIcons, AntDesign, Ionicons } from "@expo/vector-icons";
import { styles } from "./styles";
import { Success } from "../../lotties/Success";
import { TextInputMask } from "react-native-masked-text";
import { showMessage, hideMessage } from "react-native-flash-message";
import Cardclientes from "../../components/CardPessoas";
import urlImg from "../../services/urlImg";
import SwipeableRow from "../../components/SwipeableRow/lista-itens";

import api from "../../services/api";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import * as FileSystem from "expo-file-system";

type ParamList = {
  Detail: {
    id_reg: string;
  };
};

const NovaCcompra: React.FC = () => {
  const navigation: any = useNavigation();

  const route = useRoute<RouteProp<ParamList, "Detail">>();
  const id_reg = route?.params?.id_reg;

  const [totalVenda, setTotalVenda] = useState("0");
  const [totalItens, setTotalItens] = useState("0");

  const [nomecliente, setNomeCliente] = useState("Escolher Fornecedor");
  const [idcliente, setIdCliente] = useState("");

  const [localCompra, setLocalCompra] = useState("");

  const [nomeproduto, setNomeProduto] = useState("Escolher Produto");
  const [idproduto, setIdProduto] = useState("");

  const [quant_prod, setQuantProd] = useState("");
  const [id_item, setIdItem] = useState("");
  const [nome_prod, setNomeProd] = useState("");

  const [clientes, setclientes] = useState<any>([]);
  const [produtos, setProdutos] = useState<any>([]);
  const [listaItens, setListaItens] = useState<any>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [busca, setBusca] = useState("");

  const [modalVisibleProd, setModalVisibleProd] = useState(false);
  const [modalQuant, setModalQuant] = useState(false);

  const [onEndReachedCalledDuringMomentum, setMT] = useState(true);

  const [sucess, setSucess] = useState(false);
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  function escolherCliente(nome: string, id: string) {
    setNomeCliente(nome);
    setIdCliente(id);
    setModalVisible(false);
  }

  async function escolherProduto(nome: string, id: string) {
    const user = await AsyncStorage.getItem("@user");

    setNomeProduto(nome);
    setIdProduto(id);
    setModalVisibleProd(false);

    try {
      const obj = {
        id: id,
        quant: "1",
        user: user,
      };

      const res = await api.post("compras/inserir-item.php", obj);

      listarItens();
      SearchProd();

      if (res.data.sucesso === false) {
        showMessage({
          message: "Erro ao Inserir Produto",
          description: res.data.mensagem,
          type: "warning",
        });

        return;
      }
    } catch (error) {
      Alert.alert("Ops", "Alguma coisa deu errado, tente novamente.");
      setSucess(false);
    }
  }

  function abrirModalQuant(id: string, quant: string, nome: string) {
    setIdItem(id);
    setQuantProd(quant);
    setNomeProd(nome);
    setModalQuant(true);
  }

  async function excluir(id: string) {
    try {
      const response = await api.get(`compras/excluir-item.php?id=${id}`);
      showMessage({
        message: "Exclusão",
        description: "Item excluído com Sucesso",
        type: "info",
      });
      listarItens();
      SearchProd();
    } catch (error) {
      Alert.alert("Não foi possivel excluir o item, tente novamente!");
    }
  }

  async function alterarQuant(id: string, quant: string, funcao: string) {
    try {
      const res = await api.get(
        `compras/definir-quantidade.php?id=${id}&quant=${quant}&funcao=${funcao}`,
      );

      if (res.data.sucesso === false) {
        showMessage({
          message: "Erro ao Inserir Quantidade",
          description: res.data.mensagem,
          type: "warning",
        });

        return;
      }

      if (res.data.mensagem == "0") {
        excluir(id);
        return;
      }
      listarItens();
      setModalQuant(false);
      SearchProd();
    } catch (error) {
      Alert.alert("Não foi possivel alterar o item, tente novamente!");
    }
  }

  const renderItem = function ({ item }: any) {
    if (item.id != undefined) {
      return (
        <View>
          <TouchableOpacity
            style={styles.box}
            onPress={() => escolherCliente(item.nome, item.id)}
          >
            <Text style={{ color: "#000" }}>
              {item.nome} - Telefone: {item.telefone}
            </Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return <></>;
    }
  };

  const renderItemProd = function ({ item }: any) {
    if (item.id != undefined) {
      return (
        <View>
          <TouchableOpacity
            style={styles.box}
            onPress={() => escolherProduto(item.nome, item.id)}
          >
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <View style={{ width: 65 }}>
                <Image
                  style={{ width: 55, height: 55 }}
                  source={{ uri: urlImg + "produtos/" + item.foto }}
                />
              </View>

              <View style={{ width: "100%", marginTop: 3 }}>
                <Text style={{ color: "#000" }}>
                  {item.nome} - Estoque: {item.estoque}
                </Text>
                <Text style={{ color: "#000" }}>
                  {item.categoria} - Valor Venda: R$ {item.valor_venda}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    } else {
      return <></>;
    }
  };

  const renderItemListaItens = function ({ item }: any) {
    if (item.id != undefined) {
      return (
        <View>
          <SwipeableRow
            onPressWhatsapp={async () => {
              alterarQuant(item.id, "1", "remover");
            }}
            onPressEdit={async () => {
              alterarQuant(item.id, "1", "add");
            }}
            onPressDelete={async () => {
              excluir(item.id);
            }}
          >
            <TouchableOpacity
              style={styles.box}
              onPress={() =>
                abrirModalQuant(item.id, item.quantidade, item.nome)
              }
            >
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ width: 65 }}>
                  <Image
                    style={{ width: 55, height: 55 }}
                    source={{ uri: urlImg + "produtos/" + item.foto }}
                  />
                </View>

                <View style={{ width: "100%", marginTop: 3 }}>
                  <Text style={{ color: "#000", fontSize: 16 }}>
                    {item.quantidade} - {item.nome}{" "}
                  </Text>
                  <Text style={{ color: "#000" }}>
                    Total Item: R$ {item.valor}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </SwipeableRow>
        </View>
      );
    } else {
      return <></>;
    }
  };

  async function listarclientes() {
    try {
      if (loading === true) return;

      //setLoading(true);

      const response = await api.get(
        `compras/listar-forn.php?pagina=${page}&limite=10`,
      );

      setclientes([...clientes, ...response.data.resultado]);
      setPage(page + 1);
    } catch (error) {
      console.log(error);
    }
  }

  async function listarprodutos() {
    try {
      if (loading === true) return;

      //setLoading(true);

      const response = await api.get(
        // Carrega até 1000 produtos por página; o backend já ordena por nome
        `compras/listar-prod.php?pagina=${page}&limite=1000`,
      );

      setProdutos([...produtos, ...response.data.resultado]);
      setPage(page + 1);
    } catch (error) {
      console.log(error);
    }
  }

  async function listarItens() {
    const user = await AsyncStorage.getItem("@user");
    const response = await api.get(`compras/listar-itens.php?user=${user}`);
    setListaItens(response.data.resultado);
    if (
      response.data.totalItems == "" ||
      response.data.totalItems == 0 ||
      response.data.totalItems == null
    ) {
      setTotalItens("0");
    } else {
      setTotalItens(response.data.totalItems);
    }

    if (
      response.data.total_venda == "" ||
      response.data.total_venda == 0 ||
      response.data.total_venda == null
    ) {
      setTotalVenda("0");
    } else {
      setTotalVenda(response.data.total_venda);
    }
  }

  async function saveData() {}

  useEffect(() => {
    listarItens()
      .then(() => {
        listarprodutos().then(() => setLoading(false));
      })
      .then(() => {
        listarclientes().then(() => setLoading(false));
      });
  }, []);

  async function Search() {
    const response = await api.get(`compras/buscar.php?buscar=${busca}`);
    setclientes(response.data.itens);
  }

  async function SearchProd() {
    const response = await api.get(`compras/buscar-prod.php?buscar=${busca}`);
    setProdutos(response.data.itens);
  }

  if (loading === true) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <ActivityIndicator
          style={{ marginTop: 100 }}
          color="#000"
          size="large"
        />
      </View>
    );
  }

  if (sucess) {
    return <Success />;
  }

  function Footer(load: any) {
    if (!load) return null;

    return (
      <View style={styles.loading}>
        <ActivityIndicator size={25} color="#000" />
      </View>
    );
  }

  // helper para parsear números no formato pt-BR (aceita "1.234,56", "1234.56", "R$ 1.234,56", etc.)
  function parseBRNumber(value: any): number {
    if (value === undefined || value === null) return 0;
    if (typeof value === "number") return value;
    let s = String(value).trim();
    if (!s) return 0;
    // remove sinais/currency e espaços
    s = s.replace(/[^0-9.,-]/g, "");
    // se tem pontos e vírgulas -> assumir pontos como milhares e vírgula decimal
    if (s.indexOf(".") > -1 && s.indexOf(",") > -1) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.indexOf(",") > -1 && s.indexOf(".") === -1) {
      // apenas vírgula -> decimal
      s = s.replace(",", ".");
    } // caso só pontos -> manter (pode ser decimal em alguns casos)
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  // Gera/compartilha relatório das compras (itens da compra atual) - usa parseBRNumber
  async function gerarRelatorioPDFCompra() {
    try {
      if (!listaItens || listaItens.length === 0) {
        Alert.alert("Sem dados", "Nenhum item para gerar relatório.");
        return;
      }

      const periodo = "";

      // linhas da tabela com valores parseados
      const rows = listaItens
        .map((item: any) => {
          const nome = item.nome || "-";
          const quant = item.quantidade ?? item.quant ?? "0";
          const valorNum = parseBRNumber(
            item.valor ?? item.total ?? item.subtotal ?? 0,
          );
          const valorStr = valorNum.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          return `<tr>
            <td style="padding:6px;border:1px solid #ddd">${nome}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:center">${quant}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:right">${valorStr}</td>
          </tr>`;
        })
        .join("");

      // total a partir do estado totalVenda (se válido) senão soma dos itens
      const totalFromState = parseBRNumber(totalVenda);
      const totalNumFromItems = listaItens.reduce(
        (acc: number, item: any) =>
          acc + parseBRNumber(item.valor ?? item.total ?? item.subtotal ?? 0),
        0,
      );
      const totalNum = totalFromState > 0 ? totalFromState : totalNumFromItems;
      const totalStr = totalNum.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
          body { font-family: Arial, Helvetica, sans-serif; font-size:11px; line-height:1.35; }
          table { width:100%; border-collapse:collapse; margin-top:6px; font-size:10px; }
          th, td { border:1px solid #ddd; padding:4px; }
          th { background:#f3f3f3; text-align:left; }
              .right { text-align:right; }
            </style>
          </head>
          <body>
            <h3>Relatório de Compra</h3>
            <p>${periodo}</p>
            <table>
              <thead><tr><th>Produto</th><th style="text-align:center">Qtd</th><th style="text-align:right">Valor (R$)</th></tr></thead>
              <tbody>${rows}</tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="text-align:right"><strong>Total</strong></td>
                  <td style="text-align:right"><strong>${totalStr}</strong></td>
                </tr>
              </tfoot>
            </table>
          </body>
        </html>
      `;

      console.log("Gerando PDF (expo-print)...");
      const printResult = await Print.printToFileAsync({ html });
      const uri =
        (printResult && (printResult.uri || (printResult as any))) || "";

      console.log("Print result uri:", uri);

      if (!uri) {
        Alert.alert("Erro", "Não foi possível gerar o arquivo PDF.");
        return;
      }

      // data URI (data:application/pdf;base64,...)
      if (typeof uri === "string" && uri.startsWith("data:")) {
        const base64 = uri.split(",")[1] || "";
        const basePath =
          (FileSystem as any).documentDirectory ||
          (FileSystem as any).cacheDirectory ||
          "";
        const filePath = `${basePath}rel_compras_${Date.now()}.pdf`;

        const ok = await safeWriteBase64(filePath, base64);
        if (ok) {
          console.log("Arquivo PDF gravado em:", filePath);
          await shareAsync(filePath);
          return;
        } else {
          Alert.alert("Erro", "Não foi possível salvar o PDF no dispositivo.");
          return;
        }
      }

      // file uri (file://...) ou content uri (content://...)
      if (
        typeof uri === "string" &&
        (uri.startsWith("file://") ||
          uri.startsWith("content://") ||
          uri.startsWith("/"))
      ) {
        try {
          console.log("Compartilhando arquivo:", uri);
          await shareAsync(uri);
          return;
        } catch (shareErr) {
          console.warn("Falha ao compartilhar arquivo direto:", shareErr);
          Alert.alert("Erro", "Não foi possível compartilhar o PDF.");
          return;
        }
      }

      Alert.alert("Erro", "URI do PDF em formato desconhecido.");
    } catch (error) {
      console.error("Erro ao gerar relatório PDF:", error);
      Alert.alert("Erro", "Falha ao gerar relatório.");
    }
  }

  // helper seguro para gravar base64 no FileSystem (compatibilidade com várias versões do expo-file-system)
  async function safeWriteBase64(filePath: string, base64: string) {
    try {
      // sempre usar o encoding string 'base64' diretamente
      await FileSystem.writeAsStringAsync(filePath, base64, {
        encoding: "base64" as any,
      });
      return true;
    } catch (err) {
      console.warn(
        "safeWriteBase64: primeira tentativa falhou, tentando fallback sem encoding option",
        err,
      );
      try {
        // fallback: gravar sem opções
        await FileSystem.writeAsStringAsync(filePath, base64);
        return true;
      } catch (err2) {
        console.error("safeWriteBase64: fallback também falhou", err2);
        return false;
      }
    }
  }

  return (
    <View style={{ flex: 1, marginTop: 8 }}>
      <View style={styles.Header}>
        <TouchableOpacity
          style={styles.BackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back-circle-outline"
            size={35}
            color="#484a4d"
          />
        </TouchableOpacity>

        <View style={styles.Title}>
          <Text style={styles.TitleText}>Nova Compra</Text>
        </View>

        {/* Botão imprimir alinhado à direita com cor do fechar (verde) */}
        <TouchableOpacity
          style={{ position: "absolute", right: 12, top: 8 }}
          onPress={() => gerarRelatorioPDFCompra()}
          accessibilityLabel="Imprimir relatório"
        >
          <Ionicons
            name="print-outline"
            style={{ marginTop: 17, padding: 20, marginLeft: 40 }}
            size={30}
            color="green"
          />
        </TouchableOpacity>
      </View>

      <View
        style={{
          paddingHorizontal: 10,
          paddingBottom: 6,
          flexDirection: "row",
          justifyContent: "space-between",
          width: "100%",
          alignSelf: "center",
        }}
      >
        <View style={{ width: "52%" }}>
          <TouchableOpacity
            style={styles.inputObsHeadercliente}
            onPress={() => {
              setModalVisible(true);
            }}
          >
            <View style={styles.clientesContainer}>
              <Ionicons
                style={styles.iconPeople}
                name="people-outline"
                size={27}
                color="black"
              />
              <Text
                style={styles.textNomecliente}
                ellipsizeMode="tail"
                numberOfLines={1}
              >
                {nomecliente}
              </Text>
              <AntDesign
                style={styles.iconButton}
                name="caret-down"
                size={10}
                color="gray"
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ width: "46%" }}>
          <TouchableOpacity
            style={styles.inputObsHeadercliente}
            onPress={() => {
              setModalVisibleProd(true);
            }}
          >
            <View style={styles.clientesContainer}>
              <Ionicons
                style={styles.iconPeople}
                name="grid"
                size={27}
                color="black"
              />
              <Text
                style={styles.textNomecliente}
                ellipsizeMode="tail"
                numberOfLines={1}
              >
                {nomeproduto}
              </Text>
              <AntDesign
                style={styles.iconButton}
                name="caret-down"
                size={10}
                color="gray"
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: 10, marginTop: 4 }}>
        <Text style={styles.TitleInputsRow}>Local</Text>

        <TextInput
          placeholder="Local"
          onChangeText={(text) => setLocalCompra(text)}
          value={localCompra}
          style={styles.TextInput}
        />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 10, marginTop: 2 }}>
        <FlatList
          data={listaItens}
          renderItem={renderItemListaItens}
          keyExtractor={(item) => String(item.id)}
          onEndReachedThreshold={0.1}
          removeClippedSubviews
          initialNumToRender={10}
          onEndReached={() => {
            if (!onEndReachedCalledDuringMomentum) {
              listarItens().then(() => setLoading(false));
              setMT(true);
            }
          }}
          ListFooterComponent={() =>
            onEndReachedCalledDuringMomentum ? (
              <View />
            ) : (
              <Footer load={loading} />
            )
          }
          onMomentumScrollBegin={() => setMT(false)}
          windowSize={10}
          getItemLayout={(data, index) => ({
            length: 70,
            offset: 70 * index,
            index,
          })}
          contentContainerStyle={{ paddingBottom: 140, paddingTop: 4 }}
        />
      </View>

      <View style={styles.totais}>
        <View style={{ width: "50%", alignItems: "center" }}>
          <Text style={styles.textoTotalValor}>R$ {totalVenda} </Text>
        </View>
        <View style={{ width: "50%", alignItems: "center" }}>
          <Text style={styles.textoTotalItens}>Total Itens: {totalItens} </Text>
        </View>
      </View>

      <RectButton
        style={styles.Button}
        onPress={() => {
          navigation.push("FecharCompra", {
            subTotal: totalVenda,
            cliente: idcliente,
            local: localCompra,
          });
        }}
      >
        <Text style={styles.ButtonText}>Fechar Compra</Text>
      </RectButton>

      {/* <NewPacientes /> */}

      <Modal
        visible={modalVisible}
        transparent={true}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalViewcliente}>
            <Text style={styles.titleModal}>Fornecedores </Text>

            <TouchableOpacity
              style={styles.removeItem}
              onPress={() => setModalVisible(false)}
            >
              <EvilIcons name="close" size={25} color="black" />
            </TouchableOpacity>

            <View style={styles.containerSearch}>
              <TextInput
                style={styles.search}
                placeholder="Pesquisar Fornecedor."
                placeholderTextColor="gray"
                keyboardType="default"
                onChangeText={(text) => setBusca(text)}
                returnKeyType="search"
                onChange={() => Search()}
              />

              <TouchableOpacity
                style={styles.iconSearch}
                onPress={() => Search()}
              >
                <Ionicons name="search-outline" size={30} color="gray" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={clientes}
              renderItem={renderItem}
              keyExtractor={(item) => String(item.id)}
              onEndReachedThreshold={0.1}
              removeClippedSubviews
              initialNumToRender={10}
              onEndReached={(distanceFromEnd) => {
                if (!onEndReachedCalledDuringMomentum) {
                  listarclientes().then(() => setLoading(false));
                  setMT(true);
                }
              }}
              ListFooterComponent={(distanceFromEnd) => {
                if (!onEndReachedCalledDuringMomentum) {
                  return <Footer load={loading} />;
                } else {
                  return <View></View>;
                }
              }}
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
      </Modal>

      <Modal
        visible={modalVisibleProd}
        transparent={true}
        onRequestClose={() => {
          setModalVisibleProd(!modalVisibleProd);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalViewcliente}>
            <Text style={styles.titleModal}>Produtos</Text>

            <TouchableOpacity
              style={styles.removeItem}
              onPress={() => setModalVisibleProd(false)}
            >
              <EvilIcons name="close" size={25} color="black" />
            </TouchableOpacity>

            <View style={styles.containerSearch}>
              <TextInput
                style={styles.search}
                placeholder="Pesquisar Produto."
                placeholderTextColor="gray"
                keyboardType="default"
                onChangeText={(text) => setBusca(text)}
                returnKeyType="search"
                onChange={() => SearchProd()}
              />

              <TouchableOpacity
                style={styles.iconSearch}
                onPress={() => SearchProd()}
              >
                <Ionicons name="search-outline" size={30} color="gray" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={produtos}
              renderItem={renderItemProd}
              keyExtractor={(item) => String(item.id)}
              onEndReachedThreshold={0.1}
              removeClippedSubviews
              initialNumToRender={10}
              onEndReached={(distanceFromEnd) => {
                if (!onEndReachedCalledDuringMomentum) {
                  listarprodutos().then(() => setLoading(false));
                  setMT(true);
                }
              }}
              ListFooterComponent={(distanceFromEnd) => {
                if (!onEndReachedCalledDuringMomentum) {
                  return <Footer load={loading} />;
                } else {
                  return <View></View>;
                }
              }}
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
      </Modal>

      <Modal
        visible={modalQuant}
        transparent={true}
        onRequestClose={() => {
          setModalQuant(!modalQuant);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalViewQuant}>
            <Text style={styles.titleModal}>Quantidade: {nome_prod}</Text>

            <TouchableOpacity
              style={styles.removeItem}
              onPress={() => setModalQuant(false)}
            >
              <EvilIcons name="close" size={25} color="black" />
            </TouchableOpacity>

            <View
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "space-between",
                width: "90%",
                marginTop: 35,
              }}
            >
              <View style={{ width: "80%" }}>
                <TextInput
                  placeholder="Quantidade"
                  onChangeText={(text) => setQuantProd(text)}
                  value={quant_prod}
                  style={styles.TextInput}
                  keyboardType="numeric"
                />
              </View>

              <View style={{ width: "20%" }}>
                <TouchableOpacity
                  style={styles.ButtonQuant}
                  onPress={() => {
                    alterarQuant(id_item, quant_prod, "subst");
                  }}
                >
                  <Text style={styles.ButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default NovaCcompra;
