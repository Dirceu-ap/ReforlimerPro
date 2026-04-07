import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import api from "../../services/api";

const ConsultaContasCliente: React.FC = () => {
  const navigation = useNavigation();
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clientes, setClientes] = useState<any[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [jsonDebug, setJsonDebug] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Buscar lista de clientes
  async function buscarContas() {
    if (!buscaCliente.trim()) {
      setErrorMessage("Por favor, digite um nome para buscar");
      return;
    }

    setIsLoading(true);
    setMovimentacoes(null);
    setErrorMessage("");
    
    try {
      const response = await api.get(
        "/api/contas/consulta_cliente.php",
        {
          params: {
            cliente: buscaCliente
          }
        }
      );
      
      console.log("API Response:", response.data);
      
      if (response.data && response.data.resultado) {
        setClientes(response.data.resultado);
      } else {
        setClientes([]);
        setErrorMessage("Nenhum cliente encontrado");
      }
      setJsonDebug(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error("API Error:", {
        message: (error as any)?.message,
        url: (error as any)?.config?.url,
        status: (error as any)?.response?.status,
        data: (error as any)?.response?.data
      });
      
      setClientes([]);
      setJsonDebug("");
      setErrorMessage(`Erro ao buscar dados: ${(error as any).message || "Servidor não encontrado (404)"}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Buscar movimentações do cliente selecionado
  async function buscarMovimentacoesCliente(clienteNome: string) {
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      const response = await api.get(
        "/api/mov/listar.php",
        {
          params: {
            cliente: clienteNome
          }
        }
      );
      
      console.log("Movimentações Response:", response.data);
      
      if (response.data && response.data.resultado) {
        setMovimentacoes(response.data.resultado);
      } else {
        setMovimentacoes([]);
        setErrorMessage("Nenhuma movimentação encontrada");
      }
      setJsonDebug(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error("API Error:", error);
      setMovimentacoes([]);
      setJsonDebug("");
      let message = "Servidor não encontrado (404)";
      if (error && typeof error === "object" && "message" in error) {
        message = (error as any).message;
      }
      setErrorMessage(`Erro ao buscar movimentações: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Renderiza lista de clientes
  const renderClientes = () => (
    <View style={styles.listContainer}>
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
      
      <FlatList
        data={clientes}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.vazio}>Nenhum cliente encontrado.</Text> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => buscarMovimentacoesCliente(item.cliente)}
            activeOpacity={0.7}
          >
            <View style={styles.card}>
              <Text style={styles.cliente}>Cliente: {item.cliente}</Text>
              <Text style={styles.tipo}>
                Tipo: {item.tipo === "receber" ? "A Receber" : "A Pagar"}
              </Text>
              <Text style={styles.valor}>Valor: R$ {item.valor}</Text>
              <Text style={styles.vencimento}>Vencimento: {item.vencimento}</Text>
              <Text style={styles.status}>Status: {item.status}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  // Renderiza movimentações do cliente
  const renderMovimentacoes = () => (
    <View style={styles.listContainer}>
      <TouchableOpacity
        style={styles.voltarButton}
        onPress={() => {
          setMovimentacoes(null);
          setJsonDebug("");
        }}
      >
        <Text style={styles.voltarButtonText}>{"< Voltar para clientes"}</Text>
      </TouchableOpacity>
      
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
      
      <FlatList
        data={movimentacoes || []}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.vazio}>Nenhuma movimentação encontrada.</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cliente}>Cliente: {item.cliente}</Text>
            <Text style={styles.tipo}>
              Tipo: {item.tipo === "receber" ? "A Receber" : "A Pagar"}
            </Text>
            <Text style={styles.valor}>Valor: R$ {item.valor}</Text>
            <Text style={styles.vencimento}>Vencimento: {item.vencimento}</Text>
            <Text style={styles.status}>Status: {item.status}</Text>
            <Text style={styles.descricao}>Descrição: {item.descricao}</Text>
          </View>
        )}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>Consulta Contas de Clientes</Text>
      
      <View style={styles.campoBusca}>
        <TextInput
          style={styles.input}
          placeholder="Digite o nome do cliente"
          value={buscaCliente}
          onChangeText={(text) => {
            setBuscaCliente(text);
            setErrorMessage("");
          }}
          onSubmitEditing={buscarContas}
          returnKeyType="search"
        />
        <TouchableOpacity 
          style={styles.botao} 
          onPress={buscarContas}
          disabled={isLoading}
        >
          <Text style={styles.textoBotao}>
            {isLoading ? "Buscando..." : "Buscar"}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#046b33" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : movimentacoes === null ? (
        renderClientes()
      ) : (
        renderMovimentacoes()
      )}

      {jsonDebug !== "" && (
        <ScrollView style={styles.debugContainer}>
          <Text selectable style={styles.debugText}>
            {jsonDebug}
          </Text>
        </ScrollView>
      )}

      <View style={styles.voltarContainer}>
        <TouchableOpacity
          style={styles.voltarButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.voltarButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  titulo: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  campoBusca: {
    flexDirection: "row",
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  botao: {
    backgroundColor: "#046b33",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    opacity: 1,
  },
  textoBotao: {
    color: "#fff",
    fontWeight: "bold",
  },
  listContainer: {
    flex: 1,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cliente: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  tipo: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  valor: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  vencimento: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  descricao: {
    fontSize: 14,
    color: "#555",
  },
  vazio: {
    textAlign: "center",
    marginTop: 20,
    color: "#777",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#046b33",
  },
  debugContainer: {
    backgroundColor: "#eee",
    margin: 10,
    padding: 8,
    borderRadius: 8,
    maxHeight: 180,
  },
  debugText: {
    fontSize: 12,
    color: "#333",
  },
  voltarContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 32 : 24,
    left: 24,
    right: 24,
  },
  voltarButton: {
    backgroundColor: "#046b33",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  voltarButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  errorText: {
    color: "#d9534f",
    textAlign: "center",
    marginVertical: 10,
    paddingHorizontal: 20,
  },
});

export default ConsultaContasCliente;