import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Keyboard,
  ActivityIndicator,
  FlatList,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { RectButton } from "react-native-gesture-handler";
import { format, add, sub, parseISO } from "date-fns";
import { Ionicons, MaterialIcons, EvilIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRoute } from "@react-navigation/core";
import { CommonActions } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import api from "../../services/api";
import fonts from "../../styles/fonts";
import Load from "../../components/Load";
import Header from "../../components/Header";
import { styles } from "./styles";

interface Orcamento {
  id: string;
  cliente: string;
  data_orcamento: string;
  valor_total: string;
  status: string;
  descricao?: string;
  validade?: string;
  tipo_obra?: string;
  area_principal?: string;
}

function Orcamento() {
  const navigation: any = useNavigation();
  const route: any = useRoute();

  const initialModoObra =
    route?.params?.modoObraInicial !== undefined
      ? !!route.params.modoObraInicial
      : false;

  // Estados principais
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [todosOrcamentos, setTodosOrcamentos] = useState<Orcamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modoObra, setModoObra] = useState(initialModoObra);

  // Datas
  const [date, setDate] = useState<Date>(new Date());
  const [date2, setDate2] = useState<Date>(new Date());
  const [showDate1, setShowDate1] = useState(false);
  const [showDate2, setShowDate2] = useState(false);

  // Filtro
  const [searchLocal, setSearchLocal] = useState("");
  const [somenteAprovados, setSomenteAprovados] = useState(false);

  // Modal
  const [abrirModal, setAbrirModal] = useState(false);
  const [orcamentoSelecionado, setOrcamentoSelecionado] =
    useState<Orcamento | null>(null);

  // Helper para obter nome
  const getNomeItem = (it: any) => String(it?.cliente ?? it?.nome ?? "").trim();

  // Busca simples: carrega da API por data/modo e filtra em memória pelo nome
  const fetchData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Garante que a menor data vai como "data" e a maior como "data1"
      const startDate = date <= date2 ? date : date2;
      const endDate = date <= date2 ? date2 : date;

      const date1 = format(startDate, "yyyy-MM-dd");
      const dates2 = format(endDate, "yyyy-MM-dd");
      const basePath = modoObra
        ? "orcamentos_obra/listar.php"
        : "orcamento/listar.php";
      const relUrl = `${basePath}?data=${date1}&data1=${dates2}`;
      console.log("[fetchData] GET ->", relUrl);
      const response = await api.get(relUrl);
      console.log("[fetchData] response ->", response?.data);

      const raw = response?.data?.resultado ?? response?.data ?? [];
      const lista: Orcamento[] = Array.isArray(raw) ? raw : [];
      setTodosOrcamentos(lista);
    } catch (err: any) {
      console.log("Erro fetchData:", err?.response ?? err?.message ?? err);
      setTodosOrcamentos([]);
      setOrcamentos([]);
    } finally {
      setIsLoading(false);
    }
  }, [date, date2, modoObra]);

  // aplica filtro pelo texto digitado (cliente) em memória
  useEffect(() => {
    const termo = searchLocal.trim().toLowerCase();
    if (!termo) {
      setOrcamentos(todosOrcamentos);
      return;
    }

    const filtrado = todosOrcamentos.filter((it) =>
      getNomeItem(it).toLowerCase().includes(termo),
    );
    setOrcamentos(filtrado);
  }, [searchLocal, todosOrcamentos]);

  // Filtro do campo fixo (apenas fecha o teclado e mantém o texto)
  const onPressFiltrarVisivel = () => {
    Keyboard.dismiss();
  };

  const gerarRelatorioPDF = useCallback(async () => {
    try {
      const startDate = date <= date2 ? date : date2;
      const endDate = date <= date2 ? date2 : date;

      const date1 = format(startDate, "yyyy-MM-dd");
      const dates2 = format(endDate, "yyyy-MM-dd");
      const periodo = `${format(startDate, "dd/MM/yyyy")} até ${format(
        endDate,
        "dd/MM/yyyy",
      )}`;

      const basePath = modoObra
        ? "orcamentos_obra/listar.php"
        : "orcamento/listar.php";

      let url = `${basePath}?data=${date1}&data1=${dates2}`;

      const filtro = searchLocal.trim();
      if (filtro) {
        const q = encodeURIComponent(filtro);
        url += `&cliente=${q}&nome=${q}&search=${q}`;
      }

      const response = await api.get(url);
      const dadosApi = response?.data?.resultado ?? response?.data ?? [];
      const dados = Array.isArray(dadosApi) ? dadosApi : [];

      const dadosFiltrados = somenteAprovados
        ? dados.filter(
            (item: any) =>
              String(item.status ?? "").toLowerCase() === "aprovado",
          )
        : dados;

      if (!Array.isArray(dadosFiltrados) || dadosFiltrados.length === 0) {
        Alert.alert("Sem dados", "Nenhum orçamento encontrado no período.");
        return;
      }

      let totalGeral = 0;
      const linhas = dadosFiltrados
        .map((item: any) => {
          const dataOrc = item.data_orcamento
            ? format(parseISO(String(item.data_orcamento)), "dd/MM/yyyy")
            : "";
          const valorNum =
            parseFloat(String(item.valor_total ?? "0").replace(",", ".")) || 0;
          totalGeral += valorNum;

          const valorFormatado = valorNum.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const cliente = String(item.cliente ?? "");
          const descricao = String(item.descricao ?? "");
          const tipoObra = String(item.tipo_obra ?? "");
          const area = item.area_principal ? String(item.area_principal) : "";

          if (modoObra) {
            return `
              <tr>
                <td>${cliente}</td>
                <td>${tipoObra}</td>
                <td>${area}</td>
                <td>${dataOrc}</td>
                <td style="text-align:right;">${valorFormatado}</td>
              </tr>
            `;
          }

          return `
            <tr>
              <td>${cliente}</td>
              <td>${dataOrc}</td>
              <td>${descricao}</td>
              <td style="text-align:right;">${valorFormatado}</td>
            </tr>
          `;
        })
        .join("");

      const titulo = modoObra
        ? "Relatório de Orçamentos de Obra"
        : "Relatório de Orçamentos";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #2c3e50; font-size: 11px; line-height: 1.35; }
              .header { text-align: center; margin-bottom: 16px; }
              .header h1 { color: #32B768; margin: 0; font-size: 17px; font-weight: bold; }
              .info { margin-top: 6px; font-size: 11px; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10px; }
              th { background: #32B768; color: white; padding: 6px; text-align: left; }
              td { padding: 6px; border: 1px solid #ddd; }
              tr:nth-child(even) { background: #f9f9f9; }
              .total { margin-top: 16px; font-weight: bold; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${titulo}</h1>
              <div class="info">
                <div>Período: ${periodo}</div>
                ${filtro ? `<div>Filtro cliente: ${filtro}</div>` : ""}
                <div>Emissão: ${format(
                  new Date(),
                  "dd/MM/yyyy 'às' HH:mm",
                )}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  ${
                    modoObra
                      ? "<th>Tipo Obra</th><th>Área (m²)</th>"
                      : "<th>Data</th><th>Descrição</th>"
                  }
                  ${modoObra ? "<th>Data</th>" : ""}
                  <th>Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                ${linhas}
              </tbody>
            </table>
            <div class="total">
              Total Geral: R$ ${totalGeral.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `${titulo} - ${periodo}`,
        });
      } else {
        await Print.printAsync({ uri });
      }

      Alert.alert("Sucesso", "Relatório gerado com sucesso!");
    } catch (error) {
      console.log("[gerarRelatorioPDF] erro ->", error);
      Alert.alert("Erro", "Falha ao gerar relatório de orçamentos.");
    }
  }, [date, date2, modoObra, searchLocal, somenteAprovados]);

  // Abrir detalhes
  const abrirDetalhes = async (id: string) => {
    try {
      const relUrl = modoObra
        ? `orcamentos_obra/listar_id.php?id=${id}`
        : `orcamento/listar_id.php?id=${id}`;
      console.log("[abrirDetalhes] GET ->", relUrl);
      const response = await api.get(relUrl);
      console.log("[abrirDetalhes] response ->", response?.data);
      if (response.data?.dados) {
        setOrcamentoSelecionado(response.data.dados);
        setAbrirModal(true);
      } else {
        Alert.alert(
          "Erro",
          response.data?.mensagem || "Orçamento não encontrado",
        );
      }
    } catch (error: any) {
      console.log("[abrirDetalhes] erro ->", error?.response ?? error);
      const errMsg = error?.response?.data
        ? typeof error.response.data === "object"
          ? JSON.stringify(error.response.data)
          : String(error.response.data)
        : (error?.message ?? "Erro desconhecido");
      Alert.alert("Erro", `Não foi possível carregar o orçamento: ${errMsg}`);
    }
  };

  // Excluir orçamento (normal ou de obra)
  const excluirOrcamento = (id: string, cliente: string, isObra: boolean) => {
    const endpoint = isObra
      ? "orcamentos_obra/excluir.php"
      : "orcamento/excluir.php";
    const url = `${endpoint}?id=${id}`;

    Alert.alert(
      "Excluir Orçamento",
      `Deseja excluir o orçamento de ${cliente}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("[excluirOrcamento] GET ->", url);
              const response = await api.get(url);
              console.log("[excluirOrcamento] response ->", response?.data);

              // APIs diferentes usam "sucesso" (orcamento) e "success" (orcamentos_obra)
              const ok =
                response?.data?.sucesso === true ||
                response?.data?.success === true;

              if (ok) {
                const msg =
                  response?.data?.mensagem || "Orçamento excluído com sucesso";
                Alert.alert("Sucesso", msg);
                setAbrirModal(false); // fecha modal se estiver aberto
                setOrcamentos((prev) =>
                  prev.filter((o) => String(o.id) !== String(id)),
                );
                setTodosOrcamentos((prev) =>
                  prev.filter((o) => String(o.id) !== String(id)),
                );
                await fetchData(); // atualiza a lista do backend
              } else {
                console.log(
                  "[excluirOrcamento] erro retorno ->",
                  response?.data,
                );
                const msgErro =
                  response?.data?.mensagem ||
                  response?.data?.erro ||
                  "Não foi possível excluir";
                Alert.alert("Erro", msgErro);
              }
            } catch (error: any) {
              console.log("[excluirOrcamento] erro ->", error);
              const detalhe =
                error?.response?.data?.mensagem ||
                error?.response?.data?.erro ||
                error?.message ||
                "Falha ao excluir orçamento";
              Alert.alert("Erro", detalhe);
            }
          },
        },
      ],
    );
  };

  // Header com controles de datas
  const Headers: React.FC = () => {
    const aplicarDatasEAtualizar = (d1: Date, d2: Date) => {
      setDate(d1);
      setDate2(d2);
      fetchData();
    };

    return (
      <View style={{ marginBottom: 10 }}>
        <View style={styles.dates}>
          <RectButton
            style={styles.ButtonDates}
            onPress={() =>
              aplicarDatasEAtualizar(sub(new Date(), { months: 1 }), new Date())
            }
          >
            <Text style={styles.ButtonDatesText}>Mês Passado</Text>
          </RectButton>

          <RectButton
            style={styles.ButtonDates}
            onPress={() => aplicarDatasEAtualizar(new Date(), new Date())}
          >
            <Text style={styles.ButtonDatesText}>Hoje</Text>
          </RectButton>

          <RectButton
            style={styles.ButtonDates}
            onPress={() =>
              aplicarDatasEAtualizar(new Date(), add(new Date(), { months: 1 }))
            }
          >
            <Text style={styles.ButtonDatesText}>Próximo Mês</Text>
          </RectButton>
        </View>

        <View style={styles.Dates}>
          <TouchableOpacity
            style={styles.pickDate}
            onPress={() => setShowDate1(true)}
          >
            <Text style={{ fontFamily: fonts.text, fontSize: 16 }}>DE</Text>
            <Text style={styles.date}>{format(date, "dd/MM/yyyy")}</Text>
          </TouchableOpacity>

          <View style={{ alignSelf: "center" }}>
            <Ionicons name="arrow-forward-outline" size={30} color="#484a4d" />
          </View>

          <TouchableOpacity
            style={styles.pickDate}
            onPress={() => setShowDate2(true)}
          >
            <Text style={{ fontFamily: fonts.text, fontSize: 16 }}>ATÉ</Text>
            <Text style={styles.date}>{format(date2, "dd/MM/yyyy")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Effects
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // se alguém navegar para cá forçando modo obra, atualizar o toggle
  useEffect(() => {
    if (route?.params?.modoObraInicial !== undefined) {
      setModoObra(!!route.params.modoObraInicial);
    }
  }, [route?.params?.modoObraInicial]);

  // Handlers DatePicker
  const onChangeDate1 = (_: any, selected?: Date) => {
    setShowDate1(false);
    if (selected) setDate(selected);
  };
  const onChangeDate2 = (_: any, selected?: Date) => {
    setShowDate2(false);
    if (selected) setDate2(selected);
  };

  // Render item
  const renderItem = ({ item }: { item: Orcamento }) => {
    const valor = String(item.valor_total ?? "0").replace(".", ",");
    const dataOrc = item.data_orcamento
      ? format(parseISO(item.data_orcamento), "dd/MM/yyyy")
      : "";

    const statusColor =
      item.status === "Aprovado"
        ? "#28a745"
        : item.status === "Pendente"
          ? "#ffc107"
          : "#dc3545";

    return (
      <View style={styles.CardContainer}>
        <TouchableOpacity
          onPress={() =>
            modoObra
              ? navigation.navigate("NovoOrcamentoObra", { id_reg: item.id })
              : abrirDetalhes(item.id)
          }
        >
          <View style={styles.CardHeader}>
            <Text style={styles.Cliente}>{item.cliente}</Text>
            <View
              style={[styles.StatusBadge, { backgroundColor: statusColor }]}
            >
              <Text style={styles.StatusText}>{item.status}</Text>
            </View>
          </View>

          <Text style={styles.Valor}>R$ {valor}</Text>

          {modoObra && (
            <>
              {item.tipo_obra ? (
                <Text style={styles.Descricao}>Obra: {item.tipo_obra}</Text>
              ) : null}
              {item.area_principal ? (
                <Text style={styles.Descricao}>
                  Área: {String(item.area_principal)} m²
                </Text>
              ) : null}
            </>
          )}

          <View style={styles.Section}>
            <MaterialIcons
              style={styles.Icon}
              name="date-range"
              size={20}
              color="#666"
            />
            <Text style={styles.InfoText}>{dataOrc}</Text>
          </View>

          {item.descricao && (
            <Text style={styles.Descricao} numberOfLines={2}>
              {item.descricao}
            </Text>
          )}

          <View style={styles.Actions}>
            <TouchableOpacity
              onPress={() => {
                try {
                  if (modoObra) {
                    navigation.navigate("NovoOrcamentoObra", {
                      id_reg: item.id,
                    });
                  } else {
                    navigation.navigate("NovoOrcamento", { id_reg: item.id });
                  }
                } catch (navErr) {
                  console.log("[editar] navigation error:", navErr);
                  Alert.alert(
                    "Erro",
                    "Não foi possível abrir edição. Verifique as rotas.",
                  );
                }
              }}
            >
              <MaterialIcons name="edit" size={24} color="#32B768" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => excluirOrcamento(item.id, item.cliente, modoObra)}
            >
              <MaterialIcons name="delete" size={24} color="#dc3545" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const isEmpty = () => (
    <View style={styles.EmptyContainer}>
      <MaterialIcons name="description" size={60} color="#ccc" />
      <Text style={styles.EmptyText}>Nenhum orçamento encontrado</Text>
    </View>
  );

  return (
    <View style={styles.Container}>
      {/* Debug banner removido */}

      {Platform.OS === "ios" ? (
        <>
          <Modal
            transparent
            visible={showDate1}
            animationType="fade"
            onRequestClose={() => setShowDate1(false)}
          >
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.4)",
              }}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  width: "90%",
                  maxWidth: 360,
                  alignSelf: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.text,
                    fontSize: 16,
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  Selecione a data inicial
                </Text>
                {showDate1 && (
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={date}
                    mode="date"
                    display="inline"
                    onChange={onChangeDate1}
                    locale="pt-BR"
                    themeVariant="light"
                    style={{ width: "100%" }}
                  />
                )}
                <TouchableOpacity
                  onPress={() => setShowDate1(false)}
                  style={{
                    alignSelf: "flex-end",
                    marginTop: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.text,
                      fontSize: 14,
                      color: "#4CAF50",
                      fontWeight: "600",
                    }}
                  >
                    Fechar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            transparent
            visible={showDate2}
            animationType="fade"
            onRequestClose={() => setShowDate2(false)}
          >
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.4)",
              }}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  width: "90%",
                  maxWidth: 360,
                  alignSelf: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.text,
                    fontSize: 16,
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  Selecione a data final
                </Text>
                {showDate2 && (
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={date2}
                    mode="date"
                    display="inline"
                    onChange={onChangeDate2}
                    locale="pt-BR"
                    themeVariant="light"
                    style={{ width: "100%" }}
                  />
                )}
                <TouchableOpacity
                  onPress={() => setShowDate2(false)}
                  style={{
                    alignSelf: "flex-end",
                    marginTop: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.text,
                      fontSize: 14,
                      color: "#4CAF50",
                      fontWeight: "600",
                    }}
                  >
                    Fechar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <>
          {showDate1 && (
            <DateTimePicker
              testID="dateTimePicker"
              value={date}
              mode="date"
              is24Hour={true}
              display="calendar"
              onChange={onChangeDate1}
            />
          )}
          {showDate2 && (
            <DateTimePicker
              testID="dateTimePicker"
              value={date2}
              mode="date"
              is24Hour={true}
              display="calendar"
              onChange={onChangeDate2}
            />
          )}
        </>
      )}

      <Header
        onBackPress={() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Home", params: { screen: "Inicio" } }],
            }),
          );
        }}
      />

      <View style={styles.TitleContainer}>
        <TouchableOpacity
          style={styles.PrintButton}
          onPress={gerarRelatorioPDF}
        >
          <MaterialIcons name="print" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.Title}>
          {modoObra ? "Orçamentos de Obra" : "Orçamentos"}
        </Text>
      </View>

      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}
      >
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center" }}
          onPress={() => setSomenteAprovados((old) => !old)}
        >
          <MaterialIcons
            name={somenteAprovados ? "check-box" : "check-box-outline-blank"}
            size={22}
            color="#32B768"
          />
          <Text
            style={{
              marginLeft: 6,
              fontFamily: fonts.text,
              fontSize: 13,
              color: "#111827",
            }}
          >
            Somente aprovados no relatório
          </Text>
        </TouchableOpacity>
      </View>

      {/* Toggle entre normal e obra */}
      <View style={styles.ToggleModoContainer}>
        <TouchableOpacity
          style={
            !modoObra ? styles.ToggleButtonAtivo : styles.ToggleButtonInativo
          }
          onPress={() => setModoObra(false)}
        >
          <Text
            style={
              !modoObra ? styles.ToggleTextAtivo : styles.ToggleTextInativo
            }
          >
            Normal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={
            modoObra ? styles.ToggleButtonAtivo : styles.ToggleButtonInativo
          }
          onPress={() => setModoObra(true)}
        >
          <Text
            style={modoObra ? styles.ToggleTextAtivo : styles.ToggleTextInativo}
          >
            Obra
          </Text>
        </TouchableOpacity>
      </View>

      {/* Campo de filtro */}
      <View style={styles.FilterContainer}>
        <TextInput
          style={styles.TextInput}
          placeholder="Filtrar por cliente"
          value={searchLocal}
          onChangeText={setSearchLocal}
          returnKeyType="search"
          onSubmitEditing={onPressFiltrarVisivel}
        />
        <RectButton style={styles.FilterButton} onPress={onPressFiltrarVisivel}>
          <Text style={styles.ButtonDatesText}>Filtrar</Text>
        </RectButton>
      </View>

      {isLoading ? (
        <Load />
      ) : (
        <FlatList
          data={orcamentos}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={Headers}
          initialNumToRender={8}
          ListEmptyComponent={isEmpty}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      {/* Botão flutuante adicionar */}
      <View style={styles.FloatContainer}>
        <TouchableOpacity
          style={styles.FloatButton}
          onPress={() => {
            if (modoObra) {
              navigation.navigate("NovoOrcamentoObra", { id_reg: "0" });
            } else {
              navigation.navigate("NovoOrcamento", { id_reg: "0" });
            }
          }}
        >
          <Ionicons name="add-outline" size={35} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modal detalhes */}
      <Modal
        visible={abrirModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAbrirModal(false)}
      >
        <View style={styles.ModalOverlay}>
          <View style={styles.ModalContent}>
            <TouchableOpacity
              style={styles.CloseButton}
              onPress={() => setAbrirModal(false)}
            >
              <EvilIcons name="close" size={30} color="#333" />
            </TouchableOpacity>

            {orcamentoSelecionado && (
              <>
                <Text style={styles.ModalTitle}>
                  {orcamentoSelecionado.cliente}
                </Text>
                <Text style={styles.ModalValor}>
                  R${" "}
                  {String(orcamentoSelecionado.valor_total).replace(".", ",")}
                </Text>

                <View style={styles.ModalSection}>
                  <Text style={styles.ModalLabel}>Data:</Text>
                  <Text style={styles.ModalValue}>
                    {orcamentoSelecionado.data_orcamento
                      ? format(
                          parseISO(orcamentoSelecionado.data_orcamento),
                          "dd/MM/yyyy",
                        )
                      : ""}
                  </Text>
                </View>

                <View style={styles.ModalSection}>
                  <Text style={styles.ModalLabel}>Status:</Text>
                  <Text style={styles.ModalValue}>
                    {orcamentoSelecionado.status}
                  </Text>
                </View>

                {orcamentoSelecionado.validade && (
                  <View style={styles.ModalSection}>
                    <Text style={styles.ModalLabel}>Validade:</Text>
                    <Text style={styles.ModalValue}>
                      {orcamentoSelecionado.validade}
                    </Text>
                  </View>
                )}

                {orcamentoSelecionado.descricao && (
                  <View style={styles.ModalSection}>
                    <Text style={styles.ModalLabel}>Descrição:</Text>
                    <Text style={styles.ModalValue}>
                      {orcamentoSelecionado.descricao}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={{
                    backgroundColor: "#dc3545",
                    padding: 12,
                    borderRadius: 8,
                    marginTop: 20,
                    alignItems: "center",
                  }}
                  onPress={() =>
                    excluirOrcamento(
                      orcamentoSelecionado.id,
                      orcamentoSelecionado.cliente,
                      modoObra,
                    )
                  }
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Excluir Orçamento
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default Orcamento;
