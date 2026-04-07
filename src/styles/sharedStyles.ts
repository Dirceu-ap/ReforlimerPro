import { StyleSheet } from "react-native";
import fonts from "./fonts"; // ajusta caminho se necessário

export const colors = {
  background: "#fafafa",
  primary: "#32B76C",
  text: "#000",
  muted: "gray",
  border: "#e0e0e0",
  cardBg: "#fff",
};

export default StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 40,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
  },
  header: {
    backgroundColor: colors.background,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOpacity: 0.1,
    elevation: 6,
    shadowRadius: 15,
    shadowOffset: { width: 1, height: 5 },
    borderBottomRightRadius: 5,
    borderBottomLeftRadius: 5,
    height: 85,
  },
  box: {
    backgroundColor: colors.background,
    padding: 5,
    width: "100%",
    height: 50,
    justifyContent: "center",
    marginBottom: 10,
    borderRadius: 10,
  },
  title: {
    fontFamily: fonts.text,
    fontSize: 20,
    color: colors.text,
    textAlign: "center",
  },
  card: {
    width: "100%",
    minHeight: 64,
    backgroundColor: colors.cardBg,
    borderRadius: 8,
    marginVertical: 6,
  },
  cardBorder: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 6,
    marginBottom: 10,
    backgroundColor: colors.cardBg,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  pickDate: {
    padding: 10,
    width: 120,
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#c1c1c1",
    marginHorizontal: 5,
    height: 62,
  },
  dateText: {
    fontFamily: fonts.text,
    fontSize: 14,
    color: colors.muted,
  },
  printButton: {
    backgroundColor: "green",
    padding: 10,
    borderRadius: 5,
    marginRight: 5,
  },
});