import { StyleSheet } from "react-native";
import fonts from "../../styles/fonts";

// Estilos alinhados com a tela de NovoOrcamento,
// mantendo também alguns usados especificamente em obra
export const styles = StyleSheet.create({
  // Layout geral no mesmo modelo do NovoOrcamento
  Container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  TitleContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  Title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  ScrollContent: {
    padding: 15,
    paddingBottom: 40,
  },
  Section: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  SectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  Label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    fontWeight: "500",
  },
  Required: {
    color: "#dc3545",
  },
  ButtonSelect: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 12,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  ButtonSelectText: {
    fontSize: 16,
    color: "#333",
  },
  ButtonSelectPlaceholder: {
    color: "#999",
  },
  Row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  HalfInput: {
    flex: 1,
    marginRight: 10,
  },
  Input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  InputMultiline: {
    height: 200,
    textAlignVertical: "top",
  },
  TotalContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  TotalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
    textAlign: "center",
  },
  TotalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#28a745",
    textAlign: "center",
  },
  SaveButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  SaveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  // Estilos de modal compatíveis com NovoOrcamento
  ModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  ModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  ModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  ModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  SearchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  ListItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  ListItemText: {
    fontSize: 16,
    color: "#333",
  },
  EmptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#999",
    marginTop: 20,
  },
  OptionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  OptionText: {
    fontSize: 16,
    color: "#333",
  },
  OptionTextSelected: {
    color: "#32B768",
    fontWeight: "600",
  },

  // Estilos específicos que já eram usados nesta tela
  label: {
    fontFamily: fonts.text,
    fontSize: 13,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: fonts.text,
    fontSize: 14,
    marginTop: 4,
    backgroundColor: "#ffffff",
  },
  inputFake: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.text,
    fontSize: 14,
    marginTop: 4,
    backgroundColor: "#f8f9f9",
  },
  hint: {
    fontFamily: fonts.text,
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 2,
  },
  servicoRow: {
    borderWidth: 0,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    backgroundColor: "#ffffff",
    elevation: 2,
  },
  servicoNome: {
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  servicoInputsRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  servicoSubtotal: {
    marginTop: 4,
    fontFamily: fonts.text,
    fontSize: 12,
    color: "#34495e",
  },
  totalText: {
    marginTop: 12,
    fontFamily: fonts.heading,
    fontSize: 15,
    color: "#111827",
    textAlign: "right",
  },
  buttonSalvar: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    alignItems: "center",
    elevation: 2,
  },
  buttonSalvarText: {
    color: "#fff",
    fontFamily: fonts.heading,
    fontSize: 15,
  },
   
}); 
