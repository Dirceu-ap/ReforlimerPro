import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import api from "../../services/api";
import Header from "../../components/Header";
import { styles } from "./styles";

const HeaderWithTitle = Header as React.ComponentType<{
  title?: string;
  backTo?: string;
}>;

interface ServicoObra {
  id: string;
  nome: string;
  descricao?: string;
  unidade_base?: string;
  produtividade_horas_unidade?: string;
  custo_mao_obra?: string;
  ativo?: number;
}

interface MaterialComp {
  id?: string;
  produto_id: string;
  produto_nome?: string;
  consumo_por_unidade: string;
  observacao?: string;
}

export default function ServicosObra() {
  const navigation: any = useNavigation();
  const [lista, setLista] = useState<ServicoObra[]>([]);
  const [listaCompleta, setListaCompleta] = useState<ServicoObra[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");

  const [modalVisivel, setModalVisivel] = useState(false);
  const [idEdit, setIdEdit] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [unidadeBase, setUnidadeBase] = useState("m2");
  const [produtividadeHorasUnidade, setProdutividadeHorasUnidade] =
    useState("");
  const [custoMaoObra, setCustoMaoObra] = useState("");
  const [ativo, setAtivo] = useState(true);

  const [materiais, setMateriais] = useState<MaterialComp[]>([]);
  const [todosProdutos, setTodosProdutos] = useState<any[]>([]);
  const [produtoModalVisivel, setProdutoModalVisivel] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [materialIndexSelecionado, setMaterialIndexSelecionado] = useState<
    number | null
  >(null);

  const loadServicos = async () => {
    try {
      setLoading(true);
      const res = await api.get("servicos_obra/listar.php");
      const dados = res.data?.resultado || [];
      setListaCompleta(dados);
    } catch (e) {
      console.log("loadServicos erro", e);
      setListaCompleta([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProdutos = async () => {
    try {
      const res = await api.get("produtos/listar.php?pagina=1&limite=500");
      setTodosProdutos(res.data?.resultado || []);
    } catch (e) {
      console.log("loadProdutos erro", e);
      setTodosProdutos([]);
    }
  };

  useEffect(() => {
    loadServicos();
    loadProdutos();
  }, []);

  // filtro em memória: deixa a busca mais simples e rápida
  useEffect(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) {
      setLista(listaCompleta);
      return;
    }

    const filtrado = listaCompleta.filter((item) => {
      const nome = String(item.nome ?? "").toLowerCase();
      const desc = String(item.descricao ?? "").toLowerCase();
      return nome.includes(termo) || desc.includes(termo);
    });

    setLista(filtrado);
  }, [busca, listaCompleta]);

  const abrirNovo = () => {
    setIdEdit(null);
    setNome("");
    setDescricao("");
    setUnidadeBase("m2");
    setProdutividadeHorasUnidade("");
    setCustoMaoObra("");
    setAtivo(true);
    // já adiciona uma linha vazia para o usuário saber onde vincular o produto
    setMateriais([{ produto_id: "", consumo_por_unidade: "", observacao: "" }]);
    setModalVisivel(true);
  };

  const editar = async (id: string) => {
    try {
      const res = await api.get(`servicos_obra/listar_id.php?id=${id}`);
      if (res.data?.success && res.data?.dados) {
        const d = res.data.dados;
        console.log("servicos_obra editar dados carregados", d);
        setIdEdit(String(d.id));
        setNome(d.nome || "");
        setDescricao(d.descricao || "");
        setUnidadeBase(d.unidade_base || "m2");
        setProdutividadeHorasUnidade(
          d.produtividade_horas_unidade
            ? String(d.produtividade_horas_unidade)
            : "",
        );
        setCustoMaoObra(String(d.custo_mao_obra || ""));
        setAtivo(d.ativo !== 0);
        const mats: MaterialComp[] = (res.data.materiais || []).map(
          (m: any) => ({
            id: String(m.id),
            produto_id: String(m.produto_id),
            produto_nome: m.produto_nome,
            consumo_por_unidade: String(m.consumo_por_unidade),
            observacao: m.observacao,
          }),
        );
        setMateriais(mats);
        setModalVisivel(true);
      } else {
        Alert.alert("Serviço", res.data?.mensagem || "Não encontrado");
      }
    } catch (e) {
      console.log("editar servico erro", e);
      Alert.alert("Erro", "Não foi possível carregar o serviço");
    }
  };

  const excluir = (id: string, nomeSrv: string) => {
    Alert.alert("Excluir Serviço", `Deseja excluir o serviço ${nomeSrv}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await api.get(`servicos_obra/excluir.php?id=${id}`);
            if (res.data?.success) {
              loadServicos();
            } else {
              Alert.alert("Erro", res.data?.erro || "Não foi possível excluir");
            }
          } catch (e) {
            console.log("excluir erro", e);
            Alert.alert("Erro", "Falha ao excluir serviço");
          }
        },
      },
    ]);
  };

  const adicionarMaterialVazio = () => {
    setMateriais((old) => [
      ...old,
      { produto_id: "", consumo_por_unidade: "", observacao: "" },
    ]);
  };

  const atualizarMaterial = (
    index: number,
    campo: keyof MaterialComp,
    valor: string,
  ) => {
    setMateriais((old) => {
      const clone = [...old];
      clone[index] = { ...clone[index], [campo]: valor } as MaterialComp;
      return clone;
    });
  };

  const removerMaterial = (index: number) => {
    setMateriais((old) => old.filter((_, i) => i !== index));
  };

  const abrirSelecaoProduto = (index: number) => {
    // ao abrir a seleção de produto, escondemos o modal de serviço
    // e mostramos apenas o modal de produtos para evitar sobreposição
    setMaterialIndexSelecionado(index);
    setBuscaProduto("");
    setModalVisivel(false);
    setProdutoModalVisivel(true);
  };

  const produtosFiltrados = todosProdutos
    .filter((p) => {
      const termo = buscaProduto.trim().toLowerCase();
      if (!termo) return true;
      const nome = String(p.nome ?? "").toLowerCase();
      const codigo = String(p.codigo ?? "").toLowerCase();
      const idStr = String(p.id ?? "").toLowerCase();
      const desc = String(p.descricao ?? "").toLowerCase();
      return (
        nome.includes(termo) ||
        codigo.includes(termo) ||
        idStr.includes(termo) ||
        desc.includes(termo)
      );
    })
    .sort((a, b) => String(a.nome ?? "").localeCompare(String(b.nome ?? "")));

  const salvar = async () => {
    if (!nome.trim()) {
      Alert.alert("Validação", "Informe o nome do serviço");
      return;
    }

    try {
      console.log(
        "servicos_obra salvar estado antes",
        idEdit,
        nome,
        unidadeBase,
        produtividadeHorasUnidade,
        custoMaoObra,
      );

      const payload = {
        id: idEdit,
        nome: nome.trim(),
        descricao: descricao.trim(),
        unidade_base: unidadeBase.trim() || "m2",
        produtividade_horas_unidade:
          produtividadeHorasUnidade.replace(",", ".") || "0",
        custo_mao_obra: custoMaoObra.replace(",", "."),
        ativo: ativo ? 1 : 0,
        materiais: materiais
          .filter((m) => m.produto_id && m.consumo_por_unidade)
          .map((m) => ({
            produto_id: m.produto_id,
            consumo_por_unidade: m.consumo_por_unidade.replace(",", "."),
            observacao: m.observacao || "",
          })),
      };

      console.log("servicos_obra salvar payload", payload);
      const res = await api.post("servicos_obra/salvar.php", payload);
      console.log("servicos_obra salvar response", res.data);

      if (res.data?.success) {
        Alert.alert("Serviço", res.data?.mensagem || "Salvo com sucesso");
        setModalVisivel(false);
        loadServicos();
      } else {
        Alert.alert("Erro", res.data?.erro || "Não foi possível salvar");
      }
    } catch (e: any) {
      console.log("salvar servico erro", e?.response?.data ?? e);
      const msg =
        e?.response?.data?.erro || e?.message || "Falha ao salvar serviço";
      Alert.alert("Erro", msg);
    }
  };

  const renderItem = ({ item }: { item: ServicoObra }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => editar(String(item.id))}
      onLongPress={() => excluir(String(item.id), item.nome)}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.cardTitle}>{item.nome}</Text>
        {item.ativo === 0 && (
          <Text style={styles.cardBadgeInativo}>Inativo</Text>
        )}
      </View>
      {item.descricao ? (
        <Text style={styles.cardDesc}>{item.descricao}</Text>
      ) : null}
      <Text style={styles.cardMeta}>
        Unidade: {item.unidade_base || "m2"} | Mão de obra: R${" "}
        {item.custo_mao_obra || "0,00"}
        {item.produtividade_horas_unidade
          ? ` | Produtividade: ${item.produtividade_horas_unidade} h/${
              item.unidade_base || "m2"
            }`
          : ""}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <HeaderWithTitle title="Serviços de Obra" />

      <View style={styles.containerBusca}>
        <TextInput
          placeholder="Buscar serviço (nome ou descrição)"
          value={busca}
          onChangeText={setBusca}
          returnKeyType="search"
          style={styles.inputBusca}
          autoCorrect={false}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.buttonBusca} onPress={loadServicos}>
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.buttonNovo} onPress={abrirNovo}>
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.buttonNovoText}>Novo Serviço</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 10 }}
        />
      )}

      {/* Modal de cadastro/edição */}
      <Modal visible={modalVisivel} animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
            <HeaderWithTitle
              title={idEdit ? "Editar Serviço" : "Novo Serviço"}
            />
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContainer}>
                <Text style={styles.label}>Nome do serviço</Text>
                <TextInput
                  style={styles.input}
                  value={nome}
                  onChangeText={setNome}
                  placeholder="Ex: Reboco, Contrapiso, Alvenaria"
                />

                <Text style={styles.label}>Descrição</Text>
                <TextInput
                  style={[styles.input, { height: 70 }]}
                  value={descricao}
                  onChangeText={setDescricao}
                  multiline
                />

                <Text style={styles.label}>Unidade base</Text>
                <TextInput
                  style={styles.input}
                  value={unidadeBase}
                  onChangeText={setUnidadeBase}
                  placeholder="m2, m, un, kg..."
                />

                <Text style={styles.label}>
                  Produtividade (horas por {unidadeBase || "unidade"})
                </Text>
                <TextInput
                  style={styles.input}
                  value={produtividadeHorasUnidade}
                  onChangeText={(v) => {
                    console.log(
                      "servicos_obra onChange produtividade_horas_unidade",
                      v,
                    );
                    setProdutividadeHorasUnidade(v);
                  }}
                  keyboardType="numeric"
                  placeholder="Ex: 0,50 (meia hora por unidade)"
                />

                <Text style={styles.label}>
                  Custo de mão de obra por unidade
                </Text>
                <TextInput
                  style={styles.input}
                  value={custoMaoObra}
                  onChangeText={setCustoMaoObra}
                  keyboardType="numeric"
                  placeholder="0,00"
                />

                <Text style={[styles.label, { marginTop: 15 }]}>
                  Composição de materiais (por unidade do serviço)
                </Text>

                {materiais.map((m, index) => {
                  const produtoAtual = todosProdutos.find(
                    (p) => String(p.id) === String(m.produto_id),
                  );
                  return (
                    <View key={index} style={styles.materialRow}>
                      <TouchableOpacity
                        style={styles.materialProduto}
                        onPress={() => abrirSelecaoProduto(index)}
                      >
                        <Text style={styles.materialProdutoText}>
                          {produtoAtual
                            ? `${produtoAtual.id} - ${produtoAtual.nome}`
                            : "Toque para escolher o produto"}
                        </Text>
                        <TextInput
                          style={styles.materialIdInput}
                          placeholder="ID"
                          keyboardType="numeric"
                          value={m.produto_id}
                          onChangeText={(v) =>
                            atualizarMaterial(index, "produto_id", v)
                          }
                        />
                      </TouchableOpacity>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 5,
                        }}
                      >
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder="Consumo / rendimento por unidade deste serviço (ex: 0,05)"
                          keyboardType="numeric"
                          value={m.consumo_por_unidade}
                          onChangeText={(v) =>
                            atualizarMaterial(index, "consumo_por_unidade", v)
                          }
                        />
                        <TouchableOpacity
                          style={styles.buttonRemoverMaterial}
                          onPress={() => removerMaterial(index)}
                        >
                          <MaterialIcons name="delete" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>

                      <TextInput
                        style={[styles.input, { marginTop: 4 }]}
                        placeholder="Observação (opcional)"
                        value={m.observacao || ""}
                        onChangeText={(v) =>
                          atualizarMaterial(index, "observacao", v)
                        }
                      />

                      <Text
                        style={{
                          fontSize: 11,
                          color: "#6b7280",
                          marginTop: 2,
                        }}
                      >
                        Informe aqui quanto deste produto é usado em 1 unidade
                        do serviço (por exemplo, por m²). Você pode ter valores
                        diferentes para cada serviço, mesmo usando o mesmo
                        produto.
                      </Text>
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={styles.buttonAddMaterial}
                  onPress={adicionarMaterialVazio}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.buttonAddMaterialText}>
                    Adicionar material
                  </Text>
                </TouchableOpacity>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: "#999" }]}
                    onPress={() => setModalVisivel(false)}
                  >
                    <Text style={styles.modalButtonText}>Fechar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: "#2ecc71" }]}
                    onPress={salvar}
                  >
                    <Text style={styles.modalButtonText}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de seleção de produto para o material */}
      <Modal
        visible={produtoModalVisivel}
        animationType="slide"
        transparent
        onRequestClose={() => setProdutoModalVisivel(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 10,
              padding: 12,
              width: "90%",
              maxHeight: "75%",
            }}
          >
            <Text style={styles.label}>Procurar produto</Text>
            <TextInput
              style={[styles.input, { marginTop: 4 }]}
              placeholder="Nome ou código"
              value={buscaProduto}
              onChangeText={setBuscaProduto}
            />

            <FlatList
              style={{ marginTop: 8 }}
              data={produtosFiltrados}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ paddingVertical: 6 }}
                  onPress={() => {
                    if (materialIndexSelecionado !== null) {
                      // ao escolher o produto, vincula o ID
                      // e, se não houver consumo informado, sugere o rendimento_por_unidade_m2 do produto
                      setMateriais((old) => {
                        const clone = [...old];
                        const idx = materialIndexSelecionado;
                        if (!clone[idx]) return old;

                        const atual = clone[idx];
                        const consumoAtual = atual.consumo_por_unidade || "";
                        const rendimentoSug =
                          item.rendimento_por_unidade_m2 !== undefined &&
                          item.rendimento_por_unidade_m2 !== null
                            ? String(item.rendimento_por_unidade_m2)
                            : "";

                        clone[idx] = {
                          ...atual,
                          produto_id: String(item.id),
                          consumo_por_unidade:
                            consumoAtual.trim() === "" && rendimentoSug !== ""
                              ? rendimentoSug
                              : consumoAtual,
                        };
                        return clone;
                      });
                    }
                    setProdutoModalVisivel(false);
                    setModalVisivel(true);
                  }}
                >
                  <Text style={{ fontFamily: "System", fontSize: 13 }}>
                    {item.id} - {item.nome}
                  </Text>
                  {item.codigo ? (
                    <Text
                      style={{
                        fontFamily: "System",
                        fontSize: 11,
                        color: "#666",
                      }}
                    >
                      Cód: {item.codigo}
                    </Text>
                  ) : null}
                  {item.unidade || item.rendimento_por_unidade_m2 ? (
                    <Text
                      style={{
                        fontFamily: "System",
                        fontSize: 11,
                        color: "#4b5563",
                      }}
                    >
                      {item.unidade ? `Unid.: ${item.unidade}` : ""}
                      {item.unidade && item.rendimento_por_unidade_m2
                        ? " • "
                        : ""}
                      {item.rendimento_por_unidade_m2
                        ? `Rend.: ${item.rendimento_por_unidade_m2} m²/un`
                        : ""}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              )}
            />

            <View style={{ marginTop: 10, alignItems: "flex-end" }}>
              <TouchableOpacity
                onPress={() => {
                  setProdutoModalVisivel(false);
                  setModalVisivel(true);
                }}
              >
                <Text style={{ color: "#e74c3c" }}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
