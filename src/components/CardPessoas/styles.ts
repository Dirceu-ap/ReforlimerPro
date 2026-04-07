import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  box: {
    backgroundColor: "#fff",
    padding: 10,
    width: "100%",
    height: 60,
    justifyContent: "center",
    marginBottom: 10,
    zIndex: 1,
    borderRadius: 8,
  },
  cardDados: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    elevation: 2,
  },
  cardNome: {
    fontWeight: "bold",
    fontSize: 12,
    marginBottom: 2,
    color: "#333",
  },
  cardInfo: {
    fontSize: 12,
    color: "#555",
    marginBottom: 2,
  },
  cardAcoes: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  actionButton: {
    marginLeft: 12,
    padding: 6,
    borderRadius: 4,
    backgroundColor: "#e0e0e0", 
  },
});