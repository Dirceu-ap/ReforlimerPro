import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginVertical: 10,
    marginHorizontal: 16,
    borderRadius: 12,
    borderLeftWidth: 6,
    borderLeftColor: "#32B76C",
    paddingVertical: 18,
    paddingHorizontal: 18,
    elevation: 2,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  cardDados: {
    flex: 1,
  },
  cardAcoes: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 10, // espaço abaixo do campo Ativo
  },
  actionButton: {
    marginLeft: 12,
    padding: 6,
    borderRadius: 4,
    backgroundColor: "#e0e0e0",
  },
  cardNome: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
    color: "#32B76C",
  },
  cardInfo: {
    fontSize: 14,
    color: "#555",
    marginBottom: 2,
  },
});