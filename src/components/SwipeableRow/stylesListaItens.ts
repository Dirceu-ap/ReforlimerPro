import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  SwipeableWhatsapp: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: "#f7ca6a",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  whatsapp: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  SwipeableEdit: {
    position: "absolute",
    left: 60,
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: "#b7eacb",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  edit: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  SwipeableDelete: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: "#f7b7b7",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  delete: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});