import { StyleSheet, Dimensions, Platform } from "react-native";

const { width } = Dimensions.get("window");

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fafafa",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.12 : 0.1,
    elevation: Platform.OS === "android" ? 6 : 0,
    shadowRadius: Platform.OS === "ios" ? 18 : 15,
    shadowOffset: { width: 1, height: Platform.OS === "ios" ? 8 : 5 },
    borderBottomRightRadius: Platform.OS === "ios" ? 8 : 5,
    borderBottomLeftRadius: Platform.OS === "ios" ? 8 : 5,
    height: Platform.OS === "ios" ? 95 : 85,
  },
  menu: {
    position: "absolute",
    left: 20,
    alignSelf: "center",
    top: Platform.OS === "ios" ? 48 : 40,
  },
  logo: {
    width: 180,
    height: 60,
    alignSelf: "center",
    marginTop: Platform.OS === "ios" ? 38 : 30,
  },
  containerHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  printButton: {
    backgroundColor: "#28a745",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    flexShrink: 0, // Não reduzir o botão
  },
  printButtonDisabled: {
    backgroundColor: "#6c757d",
    opacity: 0.6,
  },
  debugButton: {
    backgroundColor: "#ffc107",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    flexDirection: "row", // Alterado para coluna
    alignItems: "center", // Alinhado ao centro
    justifyContent: "center",
    minHeight: 44, // Altura mínima para centralizar
  },
  title: {
    fontSize: 16, // Reduzido para dar espaço ao saldo
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "left",
    marginBottom: 2, // Pequeno espaço entre título e saldo
  },
  totalContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1, // Permite reduzir se necessário
    flexWrap: "wrap", // Permite quebra de linha se necessário
  },
  totalText: {
    fontSize: 18, // Aumentado para melhor visibilidade
    fontWeight: "700",
    color: "#FFFFFF",
    includeFontPadding: false,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    flexShrink: 1, // Permite reduzir o texto se necessário
    minWidth: 0, // Permite que o texto se ajuste
  },
  filtersContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  quickDates: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dateButton: {
    backgroundColor: "#DAF2E4",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 90,
    alignItems: "center",
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2B7A4B",
  },
  customDates: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

    checkboxRow: {
      marginTop: 10,
    },

    checkboxTouchable: {
      flexDirection: "row",
      alignItems: "center",
    },

    checkboxLabel: {
      marginLeft: 8,
      color: "#333",
      fontSize: 13,
    },
  datePicker: {
    alignItems: "center",
    backgroundColor: "#fafafa",
    padding: 12,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 8,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#757575",
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
  },
  tabsContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    minHeight: 52,
    justifyContent: "center",
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  tabActive: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1565c0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
  },
  tabInactive: {
    fontSize: 14,
    fontWeight: "500",
    color: "#757575",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tabSeparator: {
    fontSize: 16,
    color: "#e0e0e0",
    marginHorizontal: 4,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  listContent: {
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: "#757575",
    marginTop: 12,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#757575",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#9e9e9e",
    textAlign: "center",
  },
  totaisContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  totalItem: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
  },
  receber: {
    backgroundColor: "#d4edda",
    borderColor: "#c3e6cb",
    borderWidth: 1,
  },
  pagar: {
    backgroundColor: "#f8d7da",
    borderColor: "#f5c6cb",
    borderWidth: 1,
  },
  saldo: {
    backgroundColor: "#d1ecf1",
    borderColor: "#bee5eb",
    borderWidth: 1,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  totalValueReceber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#155724",
  },
  totalValuePagar: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#721c24",
  },
  totalValueSaldo: {
    fontSize: 14,
    fontWeight: "bold",
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
    textAlign: "center",
    marginLeft: 8,
  },
  tabTextActive: {
    color: "#1565c0",
  },
  tabTextInactive: {
    color: "#757575",
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#f0f0f0",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

export default styles;