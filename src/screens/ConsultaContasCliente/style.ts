import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 16 },
  titulo: { fontSize: 20, fontWeight: "bold", marginBottom: 16, padding:16 },
  campoBusca: { flexDirection: "row", marginBottom: 16 ,padding: 16},
  input: { flex: 1, backgroundColor: "#fff", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#ccc" },
  botao: { backgroundColor: "#046b33", borderRadius: 8, padding: 10, marginLeft: 8, justifyContent: "center" },
  textoBotao: { color: "#fff", fontWeight: "bold" },
  vazio: { textAlign: "center", color: "#888", marginTop: 20 },
  card: { backgroundColor: "#fff", borderRadius: 8, padding: 12, marginBottom: 10, elevation: 2 },
  cliente: { fontWeight: "bold" },
  tipo: { color: "#046b33" },
  valor: { color: "#333" },
  vencimento: { color: "#333" },
  status: { color: "#888" },
});