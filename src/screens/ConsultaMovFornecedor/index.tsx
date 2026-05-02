import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import api from "../../services/api";

interface FornecedorResumo {
  id: number;
  nome: string;
  total_compras: string;
  total_pagar: string;
  total_pago: string;
  total_pendente: string;
}

interface MovimentoItem {
  id: number;
  tipo: "entrada" | "saida";
  descricao: string;
  valor: string;
  data: string;
  status: string;
  pagamento?: string;
  plano_conta?: string;
  local?: string;
}

interface FornecedorDetalhe extends FornecedorResumo {
  compras: MovimentoItem[];
  contas_pagar: MovimentoItem[];
}

const ConsultaMovFornecedor: React.FC = () => {
  const navigation = useNavigation();

  const [busca, setBusca] = useState("");
  const [fornecedores, setFornecedores] = useState<FornecedorResumo[]>([]);
  const [detalhe, setDetalhe] = useState<FornecedorDetalhe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<"compras" | "pagar">("compras");

  async function buscarFornecedores() {
    setIsLoading(true);
    setDetalhe(null);
    setErrorMessage("");

    try {
      const response = await api.get("fornecedores/consulta_movimentacoes.php", {
        params: { busca: busca.trim() },
      });

      if (response.data?.success && Array.isArray(response.data.resultado)) {
        setFornecedores(response.data.resultado);
        if (response.data.resultado.length === 0) {
          setErrorMessage("Nenhum fornecedor com movimentações encontrado.");
        }
      } else {
        setFornecedores([]);
        setErrorMessage(response.data?.mensagem || "Nenhum fornecedor encontrado.");
      }
    } catch (error) {
      setFornecedores([]);
      setErrorMessage("Erro ao buscar fornecedores. Verifique a conexão.");
    } finally {
      setIsLoading(false);
    }
  }

  async function buscarDetalhe(id: number) {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await api.get("fornecedores/consulta_movimentacoes.php", {
        params: { id },
      });

      if (response.data?.success && response.data.fornecedor) {
        setDetalhe(response.data.fornecedor);
        setAbaAtiva("compras");
      } else {
        setErrorMessage("Erro ao carregar movimentações do fornecedor.");
      }
    } catch (error) {
      setErrorMessage("Erro ao carregar movimentações. Verifique a conexão.");
    } finally {
      setIsLoading(false);
    }
  }

  const renderFornecedores = () => (
    <View style={{ flex: 1 }}>
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <FlatList
        data={fornecedores}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.vazio}>
              {busca ? "Nenhum resultado encontrado." : "Digite um nome e toque em Buscar."}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => buscarDetalhe(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="business" size={20} color="#046b33" />
                <Text style={styles.nomeFornecedor}>{item.nome}</Text>
              </View>

              <View style={styles.totaisRow}>
                <View style={[styles.totalBox, styles.entradaBox]}>
                  <Text style={styles.totalBoxLabel}>Compras</Text>
                  <Text style={[styles.totalBoxValor, styles.entradaValor]}>
                    R$ {item.total_compras}
                  </Text>
                </View>

                <View style={[styles.totalBox, styles.saidaBox]}>
                  <Text style={styles.totalBoxLabel}>A Pagar</Text>
                  <Text style={[styles.totalBoxValor, styles.saidaValor]}>
                    R$ {item.total_pagar}
                  </Text>
                </View>

                <View style={[styles.totalBox, styles.pendenteBox]}>
                  <Text style={styles.totalBoxLabel}>Pendente</Text>
                  <Text style={[styles.totalBoxValor, styles.pendenteValor]}>
                    R$ {item.total_pendente}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderMovimentoItem = ({ item }: { item: MovimentoItem }) => (
    <View style={[styles.movCard, item.tipo === "entrada" ? styles.movEntrada : styles.movSaida]}>
      <View style={styles.movHeader}>
        <MaterialIcons
          name={item.tipo === "entrada" ? "arrow-downward" : "arrow-upward"}
          size={16}
          color={item.tipo === "entrada" ? "#155724" : "#721c24"}
        />
        <Text style={styles.movDescricao}>{item.descricao}</Text>
        <Text
          style={[
            styles.movValor,
            item.tipo === "entrada" ? styles.entradaValor : styles.saidaValor,
          ]}
        >
          R$ {item.valor}
        </Text>
      </View>

      <View style={styles.movInfo}>
        <Text style={styles.movData}>{item.data}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "Concluída" || item.status === "Paga"
              ? styles.statusPago
              : styles.statusPendente,
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      {!!item.local && (
        <Text style={styles.movLocal}>📍 {item.local}</Text>
      )}
    </View>
  );

  const renderDetalhe = () => {
    if (!detalhe) return null;

    const movimentos = abaAtiva === "compras" ? detalhe.compras : detalhe.contas_pagar;

    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={styles.voltarLink}
          onPress={() => {
            setDetalhe(null);
            setErrorMessage("");
          }}
        >
          <Ionicons name="arrow-back" size={16} color="#046b33" />
          <Text style={styles.voltarLinkText}> Voltar para lista</Text>
        </TouchableOpacity>

        <View style={styles.detalheHeader}>
          <MaterialIcons name="business" size={22} color="#046b33" />
          <Text style={styles.detalheNome}>{detalhe.nome}</Text>
        </View>

        <View style={styles.totaisRow}>
          <View style={[styles.totalBox, styles.entradaBox]}>
            <Text style={styles.totalBoxLabel}>Compras</Text>
            <Text style={[styles.totalBoxValor, styles.entradaValor]}>
              R$ {detalhe.total_compras}
            </Text>
          </View>

          <View style={[styles.totalBox, styles.saidaBox]}>
            <Text style={styles.totalBoxLabel}>A Pagar</Text>
            <Text style={[styles.totalBoxValor, styles.saidaValor]}>
              R$ {detalhe.total_pagar}
            </Text>
          </View>

          <View style={[styles.totalBox, styles.pendenteBox]}>
            <Text style={styles.totalBoxLabel}>Pendente</Text>
            <Text style={[styles.totalBoxValor, styles.pendenteValor]}>
              R$ {detalhe.total_pendente}
            </Text>
          </View>
        </View>

        {/* Abas */}
        <View style={styles.abas}>
          <TouchableOpacity
            style={[styles.aba, abaAtiva === "compras" && styles.abaAtiva]}
            onPress={() => setAbaAtiva("compras")}
          >
            <Text style={[styles.abaTexto, abaAtiva === "compras" && styles.abaTextoAtivo]}>
              Compras ({detalhe.compras.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.aba, abaAtiva === "pagar" && styles.abaAtiva]}
            onPress={() => setAbaAtiva("pagar")}
          >
            <Text style={[styles.abaTexto, abaAtiva === "pagar" && styles.abaTextoAtivo]}>
              Contas a Pagar ({detalhe.contas_pagar.length})
            </Text>
          </TouchableOpacity>
        </View>

        {movimentos.length === 0 ? (
          <Text style={styles.vazio}>Nenhuma movimentação registrada.</Text>
        ) : (
          <FlatList
            data={movimentos}
            keyExtractor={(item) => `${item.tipo}-${item.id}`}
            renderItem={renderMovimentoItem}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Mov. por Fornecedor</Text>
      </View>

      {/* Campo de busca */}
      <View style={styles.campoBusca}>
        <TextInput
          style={styles.input}
          placeholder="Digite o nome do fornecedor"
          value={busca}
          onChangeText={(text) => {
            setBusca(text);
            setErrorMessage("");
          }}
          onSubmitEditing={buscarFornecedores}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.botao}
          onPress={buscarFornecedores}
          disabled={isLoading}
        >
          <Text style={styles.textoBotao}>
            {isLoading ? "..." : "Buscar"}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#046b33" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : detalhe ? (
        renderDetalhe()
      ) : (
        renderFornecedores()
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "ios" ? 0 : 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerBack: {
    marginRight: 12,
    padding: 4,
  },
  titulo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  campoBusca: {
    flexDirection: "row",
    margin: 12,
  },
  input: {
    flex: 1,
    height: 44,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    backgroundColor: "#fff",
    fontSize: 15,
  },
  botao: {
    backgroundColor: "#046b33",
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  textoBotao: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  nomeFornecedor: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#222",
    marginLeft: 8,
    flex: 1,
  },
  totaisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalBox: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 2,
    alignItems: "center",
  },
  entradaBox: {
    backgroundColor: "#d4edda",
  },
  saidaBox: {
    backgroundColor: "#f8d7da",
  },
  pendenteBox: {
    backgroundColor: "#fff3cd",
  },
  totalBoxLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#555",
    marginBottom: 3,
  },
  totalBoxValor: {
    fontSize: 12,
    fontWeight: "bold",
  },
  entradaValor: {
    color: "#155724",
  },
  saidaValor: {
    color: "#721c24",
  },
  pendenteValor: {
    color: "#856404",
  },
  vazio: {
    textAlign: "center",
    marginTop: 30,
    color: "#777",
    fontSize: 14,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#046b33",
    fontSize: 14,
  },
  errorText: {
    color: "#d9534f",
    textAlign: "center",
    marginVertical: 10,
    paddingHorizontal: 20,
    fontSize: 14,
  },
  voltarLink: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  voltarLinkText: {
    color: "#046b33",
    fontWeight: "600",
    fontSize: 14,
  },
  detalheHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 10,
  },
  detalheNome: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#222",
    marginLeft: 8,
    flex: 1,
  },
  abas: {
    flexDirection: "row",
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  aba: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  abaAtiva: {
    backgroundColor: "#046b33",
  },
  abaTexto: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
  abaTextoAtivo: {
    color: "#fff",
  },
  movCard: {
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  movEntrada: {
    backgroundColor: "#f0fff4",
    borderLeftWidth: 3,
    borderLeftColor: "#28a745",
  },
  movSaida: {
    backgroundColor: "#fff5f5",
    borderLeftWidth: 3,
    borderLeftColor: "#dc3545",
  },
  movHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  movDescricao: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginLeft: 6,
  },
  movValor: {
    fontSize: 14,
    fontWeight: "bold",
  },
  movInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  movData: {
    fontSize: 12,
    color: "#666",
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusPago: {
    backgroundColor: "#d4edda",
  },
  statusPendente: {
    backgroundColor: "#fff3cd",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
  },
  movLocal: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },
});

export default ConsultaMovFornecedor;
