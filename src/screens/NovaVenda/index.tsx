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

// Tipagem dos parâmetros recebidos pela rota
type ParamList = {
  Detail: {
    id_reg: string;
  };
};

const NovaVenda: React.FC = () => {
  const navigation: any = useNavigation();

  // Recupera parâmetro da rota (id_reg para edição ou novo)
  const route = useRoute<RouteProp<ParamList, "Detail">>();
  const id_reg = route?.params?.id_reg;

  // Estados principais da venda
  const [totalVenda, setTotalVenda] = useState("0");
  const [totalItens, setTotalItens] = useState("0");

  // Estados do cliente e produto selecionados
  const [nomecliente, setNomeCliente] = useState("Escolher Cliente");
  const [idcliente, setIdCliente] = useState("");
  const [nomeproduto, setNomeProduto] = useState("Escolher Produto");
  const [idproduto, setIdProduto] = useState("");

  // Estados para manipulação de quantidade e itens
  const [quant_prod, setQuantProd] = useState("");
  const [id_item, setIdItem] = useState("");
  const [nome_prod, setNomeProd] = useState("");

  // Listas de clientes, produtos e itens da venda
  const [clientes, setclientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [listaItens, setListaItens] = useState<any[]>([]);

  // Estados de controle de modais
  const [modalVisible, setModalVisible] = useState(false);
  const [busca, setBusca] = useState("");
  const [modalVisibleProd, setModalVisibleProd] = useState(false);
  const [modalQuant, setModalQuant] = useState(false);

  // Controle de carregamento e paginação
  const [onEndReachedCalledDuringMomentum, setMT] = useState(true);
  const [sucess, setSucess] = useState(false);
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Função para selecionar cliente
  function escolherCliente(nome: string, id: string) {
    setNomeCliente(nome);
    setIdCliente(id);
    setModalVisible(false);
  }

  // Função para selecionar produto e já inserir na venda
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

      const res = await api.post("vendas/inserir-item.php", obj);

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

  // Abre modal para alterar quantidade de um item
  function abrirModalQuant(id: string, quant: string, nome: string) {
    setIdItem(id);
    setQuantProd(quant);
    setNomeProd(nome);
    setModalQuant(true);
  }

  // Exclui item da venda
  async function excluir(id: string) {
    try {
      const response = await api.get(`vendas/excluir-item.php?id=${id}`);
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

  // Altera quantidade de um item (adiciona, remove ou substitui)
  async function alterarQuant(id: string, quant: string, funcao: string) {
    try {
      const res = await api.get(
        `vendas/definir-quantidade.php?id=${id}&quant=${quant}&funcao=${funcao}`,
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

  // Renderiza cada cliente na lista do modal
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

  // Renderiza cada produto na lista do modal
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
                  {item.categoria} - V.Venda: R$ {item.valor_venda}
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

  // Renderiza cada item já inserido na venda
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

  // Busca clientes para o modal de seleção
  async function listarclientes() {
    try {
      if (loading === true) return;

      //setLoading(true);

      const response = await api.get(
        `clientes/listar.php?pagina=${page}&limite=10`,
      );

      const novos = response.data.resultado || [];
      const merged = [...clientes, ...novos];
      merged.sort((a: any, b: any) =>
        String(a.nome ?? "")
          .toLowerCase()
          .localeCompare(String(b.nome ?? "").toLowerCase(), "pt-BR"),
      );
      setclientes(merged);
      setPage(page + 1);
    } catch (error) {
      console.log(error);
    }
  }

  // Busca produtos para o modal de seleção
  async function listarprodutos() {
    try {
      if (loading === true) return;

      //setLoading(true);

      const response = await api.get(
        `vendas/listar-prod.php?pagina=${page}&limite=10`,
      );

      setProdutos([...produtos, ...response.data.resultado]);
      setPage(page + 1);
    } catch (error) {
      console.log(error);
    }
  }

  // Busca itens já inseridos na venda
  async function listarItens() {
    const user = await AsyncStorage.getItem("@user");
    const response = await api.get(`vendas/listar-itens.php?user=${user}`);
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

  // Função para salvar venda (a implementar)
  async function saveData() {}

  // Carrega dados iniciais ao abrir a tela
  useEffect(() => {
    listarItens()
      .then(() => {
        listarprodutos().then(() => setLoading(false));
      })
      .then(() => {
        listarclientes().then(() => setLoading(false));
      });
  }, []);

  // Busca clientes conforme texto digitado na busca
  async function Search() {
    const response = await api.get(`clientes/buscar.php?buscar=${busca}`);
    const itens = response.data.itens || [];
    const ordenado = [...itens].sort((a: any, b: any) =>
      String(a.nome ?? "")
        .toLowerCase()
        .localeCompare(String(b.nome ?? "").toLowerCase(), "pt-BR"),
    );
    setclientes(ordenado);
  }

  // Busca produtos conforme texto digitado na busca
  async function SearchProd() {
    const response = await api.get(`vendas/buscar-prod.php?buscar=${busca}`);
    setProdutos(response.data.itens);
  }

  // Exibe loading enquanto carrega dados
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

  // Exibe animação de sucesso após salvar
  if (sucess) {
    return <Success />;
  }

  // Renderiza rodapé de loading para listas
  function Footer(load: any) {
    if (!load) return null;

    return (
      <View style={styles.loading}>
        <ActivityIndicator size={25} color="#000" />
      </View>
    );
  }

  async function salvarVenda() {
    if (!idcliente || listaItens.length === 0) {
      showMessage({
        message: "Dados incompletos",
        description: "Selecione um cliente e adicione ao menos um produto.",
        type: "warning",
      });
      console.log("NovaVenda.salvarVenda: dados incompletos", {
        idcliente,
        itens: listaItens.length,
      });
      return;
    }

    setLoading(true);
    try {
      const user = await AsyncStorage.getItem("@user");
      const obj = {
        idcliente,
        itens: listaItens,
        total: totalVenda,
        user,
      };

      console.log("NovaVenda: enviando para API", obj);
      const res = await api.post("vendas/fechar-venda.php", obj);
      console.log("NovaVenda: resposta API", res.data);

      if (res.data && res.data.sucesso) {
        // Se backend retornar ids, fazer lançamentos adicionais (opcional)
        try {
          if (res.data.id_conta_receber) {
            console.log(
              "NovaVenda: lançando conta a receber",
              res.data.id_conta_receber,
            );
            await api.post("contas_receber/lancar.php", {
              id_conta: res.data.id_conta_receber,
              valor: totalVenda,
              cliente: idcliente,
              data: format(new Date(), "yyyy-MM-dd"),
              user,
            });
          }
        } catch (e) {
          console.error("NovaVenda: erro ao lançar conta a receber", e);
        }

        try {
          if (res.data.id_venda) {
            console.log(
              "NovaVenda: confirmando lançamento venda",
              res.data.id_venda,
            );
            await api.post("vendas/lancar.php", {
              id_venda: res.data.id_venda,
              valor: totalVenda,
              cliente: idcliente,
              data: format(new Date(), "yyyy-MM-dd"),
              user,
            });
          }
        } catch (e) {
          console.error("NovaVenda: erro ao lançar venda", e);
        }

        setSucess(true);
        showMessage({
          message: "Venda realizada",
          description: res.data.mensagem || "Venda fechada com sucesso!",
          type: "success",
        });
        setTimeout(() => {
          setSucess(false);
          // Volta para o fluxo principal e abre a aba Vendas
          navigation.navigate("Home", {
            screen: "Vendas",
          });
        }, 1500);
      } else {
        showMessage({
          message: "Erro ao fechar venda",
          description: res.data.mensagem || "Tente novamente.",
          type: "danger",
        });
        console.log("NovaVenda: API retornou erro", res.data);
      }
    } catch (error) {
      showMessage({
        message: "Erro",
        description: "Não foi possível fechar a venda.",
        type: "danger",
      });
      console.error("NovaVenda: exception ao fechar venda", error);
    } finally {
      setLoading(false);
    }
  }

  // Renderização da tela de nova venda
  return (
    <View style={{ flex: 1, marginTop: 20 }}>
      {/* Cabeçalho com botão de voltar e título */}
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
          <Text style={styles.TitleText}>Nova Venda</Text>
        </View>
      </View>

      {/* Seleção de cliente e produto */}
      <View
        style={{
          padding: 10,
          flex: 1,
          flexDirection: "row",
          justifyContent: "space-between",
          width: "100%",
          alignSelf: "center",
        }}
      >
        {/* Botão para escolher cliente */}
        <View style={{ width: "49%" }}>
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

        {/* Botão para escolher produto */}
        <View style={{ width: "49%" }}>
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

      {/* Lista de itens da venda */}
      <View
        style={{ position: "absolute", top: 160, bottom: 145, width: "100%" }}
      >
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

      {/* Totais da venda */}
      <View style={styles.totais}>
        <View style={{ width: "50%", alignItems: "center" }}>
          <Text style={styles.textoTotalValor}>R$ {totalVenda} </Text>
        </View>
        <View style={{ width: "50%", alignItems: "center" }}>
          <Text style={styles.textoTotalItens}>Total Itens: {totalItens} </Text>
        </View>
      </View>

      {/* Botão para fechar venda */}
      <RectButton
        style={styles.Button}
        onPress={() => {
          // abre a tela de fechamento, que fará o POST para vendas/salvar.php
          navigation.navigate("FecharVenda", {
            subTotal: totalVenda,
            clienteId: idcliente,
            clienteNome: nomecliente,
          });
        }}
      >
        <Text style={styles.ButtonText}>Fechar Venda</Text>
      </RectButton>

      {/* Modal de seleção de cliente */}
      <Modal
        visible={modalVisible}
        transparent={true}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalViewcliente}>
            <Text style={styles.titleModal}>Clientes </Text>

            <TouchableOpacity
              style={styles.removeItem}
              onPress={() => setModalVisible(false)}
            >
              <EvilIcons name="close" size={25} color="black" />
            </TouchableOpacity>

            {/* Busca de clientes */}
            <View style={styles.containerSearch}>
              <TextInput
                style={styles.search}
                placeholder="Pesquisar Cliente."
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

            {/* Lista de clientes */}
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

            {/* Botão para adicionar novo cliente */}
            <View style={styles.containerFloat}>
              <TouchableOpacity onPress={() => navigation.push("Pessoas")}>
                <Ionicons name="add" size={40} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de seleção de produto */}
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

            {/* Busca de produtos */}
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

            {/* Lista de produtos */}
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

      {/* Modal para alterar quantidade de um item */}
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

function format(date: Date, mask: string): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "";

  const pad = (n: number, len = 2) => String(n).padStart(len, "0");

  const replacements: { [key: string]: string } = {
    yyyy: String(date.getFullYear()),
    yy: String(date.getFullYear()).slice(-2),
    MM: pad(date.getMonth() + 1),
    M: String(date.getMonth() + 1),
    dd: pad(date.getDate()),
    d: String(date.getDate()),
    HH: pad(date.getHours()),
    H: String(date.getHours()),
    hh: pad(date.getHours() % 12 || 12),
    h: String(date.getHours() % 12 || 12),
    mm: pad(date.getMinutes()),
    m: String(date.getMinutes()),
    ss: pad(date.getSeconds()),
    s: String(date.getSeconds()),
  };

  return mask.replace(
    /yyyy|yy|MM|M|dd|d|HH|H|hh|h|mm|m|ss|s/g,
    (token) => replacements[token] ?? token,
  );
}

export default NovaVenda;
