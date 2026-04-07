import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Image } from "react-native";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DateTimePicker from "@react-native-community/datetimepicker";
import { styles } from "./styles";
import api from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";

interface Lancamento {
  id: string;
  data: Date;
  entrada: string;
  saida: string;
  totalHoras: string;
  observacao?: string;
  colaborador_id: string;
  colaborador_nome: string;
  almocoSaida?: string;
  almocoRetorno?: string;
  local?: string;
}

interface Colaborador {
  id: string;
  nome: string;
  ativo?: string;
  salario_diario?: string | null;
  telefone?: string | null;
  email?: string | null;
  funcao?: string | null;
  cpf?: string | null;
  endereco?: string | null;
}

export default function LivroPonto() {
  const logoUri = Image.resolveAssetSource(
    require("../../assets/logo2.png"),
  ).uri;
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(false);
  const [mesAtual, setMesAtual] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);

  const [pesquisaColaborador, setPesquisaColaborador] = useState("");
  const [colaboradorFiltro, setColaboradorFiltro] = useState("");
  const [showFiltroPicker, setShowFiltroPicker] = useState(false);

  const [filtroDataInicio, setFiltroDataInicio] = useState<Date | null>(null);
  const [filtroDataFim, setFiltroDataFim] = useState<Date | null>(null);
  const [showFiltroDataInicio, setShowFiltroDataInicio] = useState(false);
  const [showFiltroDataFim, setShowFiltroDataFim] = useState(false);
  const [tempFiltroDataInicio, setTempFiltroDataInicio] = useState<Date | null>(
    null,
  );
  const [tempFiltroDataFim, setTempFiltroDataFim] = useState<Date | null>(null);

  const [colaboradorSelecionado, setColaboradorSelecionado] = useState("");
  const [dataLancamento, setDataLancamento] = useState(new Date());
  const [tempDataLancamento, setTempDataLancamento] = useState<Date | null>(
    null,
  );
  const [horaEntrada, setHoraEntrada] = useState("");
  const [horaSaida, setHoraSaida] = useState("");
  const [horaSaidaAlmoco, setHoraSaidaAlmoco] = useState("");
  const [horaVoltaAlmoco, setHoraVoltaAlmoco] = useState("");
  const [observacao, setObservacao] = useState("");
  const [observacaoEditadaManual, setObservacaoEditadaManual] = useState(false);
  const [valorAdiantamentoTextoLanc, setValorAdiantamentoTextoLanc] =
    useState("");
  const [localLancamento, setLocalLancamento] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showColaboradorPicker, setShowColaboradorPicker] = useState(false);
  const isFocused = useIsFocused();
  const [mostrarModalDesconto, setMostrarModalDesconto] = useState(false);
  const [valorDescontoTexto, setValorDescontoTexto] = useState("");
  const [infoHolerite, setInfoHolerite] = useState<{
    periodo: string;
    total: number;
  } | null>(null);
  const [ultimoHolerite, setUltimoHolerite] = useState<{
    periodo: string;
    totalBruto: number;
    desconto: number;
  } | null>(null);

  const normalizarTexto = (texto: string) => {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  useEffect(() => {
    if (!isFocused) return;
    carregarColaboradores();
    carregarLancamentos();
  }, [mesAtual, filtroDataInicio, filtroDataFim, isFocused]);

  const formatCurrencyBR = (value: number) => {
    if (!isFinite(value)) return "0,00";
    return value.toFixed(2).replace(".", ",");
  };

  const parseValorBR = (texto: string): number => {
    if (!texto) return 0;
    const limpo = texto.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(limpo);
    return isNaN(n) ? 0 : n;
  };

  const carregarColaboradores = async () => {
    try {
      const response = await api.get("/colaboradores/listar.php");

      if (!response.data.success) {
        setColaboradores([]);
        Alert.alert("Aviso", "Nenhum colaborador encontrado no banco");
        return;
      }

      const dados = response.data.resultado || [];

      if (!Array.isArray(dados)) {
        setColaboradores([]);
        Alert.alert("Erro", "Formato de dados inválido");
        return;
      }

      const colaboradoresFormatados = dados.map((col: any) => ({
        id: String(col.id),
        nome: col.nome || "Sem nome",
        ativo: col.ativo,
        salario_diario: col.salario_diario ?? null,
        telefone: col.telefone ?? null,
        email: col.email ?? null,
        funcao: col.funcao ?? null,
        // tenta pegar CPF/doc de qualquer uma das chaves possíveis
        cpf: col.cpf ?? col.doc ?? null,
        endereco: col.endereco ?? null,
      }));

      // ordenar colaboradores por nome (ordem alfabética)
      const colaboradoresOrdenados = [...colaboradoresFormatados].sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
      );

      setColaboradores(colaboradoresOrdenados);

      if (colaboradoresFormatados.length === 0) {
        Alert.alert("Aviso", "Nenhum colaborador encontrado no banco de dados");
      }
    } catch (error: any) {
      setColaboradores([]);
      Alert.alert("Erro", `Erro ao carregar colaboradores: ${error.message}`);
    }
  };

  const carregarLancamentos = async () => {
    setLoading(true);
    try {
      const params: string[] = [];

      if (filtroDataInicio || filtroDataFim) {
        if (filtroDataInicio) {
          params.push(`data_inicio=${format(filtroDataInicio, "yyyy-MM-dd")}`);
        }

        if (filtroDataFim) {
          params.push(`data_fim=${format(filtroDataFim, "yyyy-MM-dd")}`);
        }
      } else {
        const mesFormatado = format(mesAtual, "yyyy-MM");
        params.push(`mes=${mesFormatado}`);
      }

      const query = params.join("&");
      const response = await api.get(`/livro-ponto/listar.php?${query}`);

      if (response.data.success && Array.isArray(response.data.resultado)) {
        const dadosFormatados = response.data.resultado.map((item: any) => {
          let dataFormatada;
          if (item.data) {
            if (typeof item.data === "string") {
              const partes = item.data.split("-");
              dataFormatada = new Date(
                parseInt(partes[0]),
                parseInt(partes[1]) - 1,
                parseInt(partes[2]),
              );
            } else {
              dataFormatada = new Date(item.data);
            }
          } else {
            dataFormatada = new Date();
          }

          return {
            id: String(item.id),
            data: dataFormatada,
            entrada: item.entrada,
            saida: item.saida,
            totalHoras: item.total_horas || "0h 0min",
            observacao: item.observacao || "",
            colaborador_id: String(item.colaborador_id),
            colaborador_nome: item.colaborador_nome || "Sem nome",
            almocoSaida:
              item.almoco_saida ||
              item.intervalo_saida ||
              item.almocoSaida ||
              "",
            almocoRetorno:
              item.almoco_retorno ||
              item.intervalo_retorno ||
              item.almocoRetorno ||
              "",
            local: item.local || "",
          };
        });

        setLancamentos(dadosFormatados);
      } else {
        setLancamentos([]);
      }
    } catch (error: any) {
      Alert.alert("Erro", "Erro ao carregar lançamentos");
      setLancamentos([]);
    } finally {
      setLoading(false);
    }
  };

  // Calcula o valor proporcional da diária para um lançamento (número)
  // usando diária do colaborador / 7h30 * total de horas trabalhadas
  const calcularValorNumericoDiariaLancamento = (lanc: Lancamento): number => {
    const colaborador = colaboradores.find((c) => c.id === lanc.colaborador_id);

    if (!colaborador || !colaborador.salario_diario) {
      return 0;
    }

    const diariaNum = parseFloat(
      String(colaborador.salario_diario).replace(",", "."),
    );

    if (!isFinite(diariaNum) || diariaNum <= 0) {
      return 0;
    }

    // totalHoras no formato "8h 30min"
    if (!lanc.totalHoras) {
      return 0;
    }

    const [horas, minutos] = lanc.totalHoras
      .replace("h", "")
      .replace("min", "")
      .split(" ")
      .map((str) => parseInt(str) || 0);

    const totalMinutos = horas * 60 + minutos;
    if (totalMinutos <= 0) {
      return 0;
    }

    const minutosJornadaPadrao = 7 * 60 + 30; // 07:30 = 450 minutos
    const valorProporcional = (diariaNum / minutosJornadaPadrao) * totalMinutos;

    return valorProporcional;
  };

  // Versão formatada em texto para exibição
  const calcularValorDiariaLancamento = (lanc: Lancamento): string | null => {
    const valor = calcularValorNumericoDiariaLancamento(lanc);
    if (!isFinite(valor) || valor <= 0) {
      return null;
    }
    return `R$ ${formatCurrencyBR(valor)} `;
  };

  const calcularHoras = (
    entrada: string,
    saida: string,
    almocoSaida?: string,
    almocoRetorno?: string,
  ) => {
    const [horaE, minE] = entrada.split(":").map(Number);
    const [horaS, minS] = saida.split(":").map(Number);

    let totalMinutos = horaS * 60 + minS - (horaE * 60 + minE);

    if (totalMinutos < 0) {
      totalMinutos += 24 * 60;
    }

    if (almocoSaida && almocoRetorno) {
      const [horaAS, minAS] = almocoSaida.split(":").map(Number);
      const [horaAR, minAR] = almocoRetorno.split(":").map(Number);

      let intervaloMinutos = horaAR * 60 + minAR - (horaAS * 60 + minAS);

      if (intervaloMinutos < 0) {
        intervaloMinutos += 24 * 60;
      }

      totalMinutos -= intervaloMinutos;
      if (totalMinutos < 0) {
        totalMinutos = 0;
      }
    }

    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;

    return `${horas}h ${minutos}min`;
  };

  const formatarHorario = (texto: string) => {
    const apenasNumeros = texto.replace(/\D/g, "");

    if (apenasNumeros.length <= 2) {
      return apenasNumeros;
    } else if (apenasNumeros.length <= 4) {
      return `${apenasNumeros.slice(0, 2)}:${apenasNumeros.slice(2)}`;
    } else {
      return `${apenasNumeros.slice(0, 2)}:${apenasNumeros.slice(2, 4)}`;
    }
  };

  const validarHorario = (hora: string) => {
    const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

    if (!regex.test(hora)) {
      return false;
    }

    const [horas, minutos] = hora.split(":").map(Number);
    return horas >= 0 && horas <= 23 && minutos >= 0 && minutos <= 59;
  };

  const adicionarLancamento = async () => {
    if (!colaboradorSelecionado) {
      Alert.alert("Atenção", "Selecione um colaborador");
      return;
    }

    if (!validarHorario(horaEntrada) || !validarHorario(horaSaida)) {
      Alert.alert(
        "Atenção",
        "Horários devem estar no formato HH:MM (ex: 08:00)",
      );
      return;
    }

    if (
      (horaSaidaAlmoco || horaVoltaAlmoco) &&
      (!validarHorario(horaSaidaAlmoco) || !validarHorario(horaVoltaAlmoco))
    ) {
      Alert.alert(
        "Atenção",
        "Horário de almoço deve estar completo e no formato HH:MM (ex: 12:00 / 13:00)",
      );
      return;
    }

    try {
      setLoading(true);

      const totalHoras = calcularHoras(
        horaEntrada,
        horaSaida,
        horaSaidaAlmoco || undefined,
        horaVoltaAlmoco || undefined,
      );

      const valorAdiantamentoNumero = parseValorBR(valorAdiantamentoTextoLanc);

      let observacaoFinal = observacao || "";

      const localTexto = (localLancamento || "").trim();
      if (localTexto) {
        const observacaoLocal = `Diárias no ${localTexto}`;
        const observacaoJaContemLocal = normalizarTexto(
          observacaoFinal,
        ).includes(normalizarTexto(observacaoLocal));

        if (!observacaoJaContemLocal) {
          observacaoFinal = observacaoFinal
            ? `${observacaoLocal} - ${observacaoFinal}`
            : observacaoLocal;
        }
      }

      if (valorAdiantamentoNumero > 0 && isFinite(valorAdiantamentoNumero)) {
        const textoAdiantamento = `ADIANTAMENTO DIÁRIA: R$ ${formatCurrencyBR(
          valorAdiantamentoNumero,
        )}`;

        observacaoFinal = observacaoFinal
          ? `${observacaoFinal} | ${textoAdiantamento}`
          : textoAdiantamento;
      }

      const dados = {
        colaborador_id: colaboradorSelecionado,
        data: format(dataLancamento, "yyyy-MM-dd"),
        entrada: horaEntrada,
        saida: horaSaida,
        total_horas: totalHoras,
        almoco_saida: horaSaidaAlmoco || null,
        almoco_retorno: horaVoltaAlmoco || null,
        observacao: observacaoFinal,
        local: localLancamento || null,
      };

      const response = await api.post("/livro-ponto/criar.php", dados);

      if (response.data.success) {
        Alert.alert("Sucesso", "Lançamento adicionado com sucesso!");
        limparFormulario();
        setModalVisible(false);
        carregarLancamentos();
      } else {
        Alert.alert(
          "Erro",
          response.data.message || "Erro ao adicionar lançamento",
        );
      }
    } catch (error: any) {
      const mensagemErro =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Erro ao adicionar lançamento";

      Alert.alert("Erro", mensagemErro);
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = () => {
    setColaboradorSelecionado("");
    setDataLancamento(new Date());
    setHoraEntrada("");
    setHoraSaida("");
    setHoraSaidaAlmoco("");
    setHoraVoltaAlmoco("");
    setObservacao("");
    setObservacaoEditadaManual(false);
    setValorAdiantamentoTextoLanc("");
    setLocalLancamento("");
  };

  const excluirLancamento = async (id: string) => {
    Alert.alert(
      "Confirmar Exclusão",
      "Deseja realmente excluir este lançamento?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await api.get(
                `/livro-ponto/excluir.php?id=${id}`,
              );

              if (response.data?.success) {
                Alert.alert("Sucesso", "Lançamento excluído!");
                carregarLancamentos();
              } else {
                Alert.alert(
                  "Erro",
                  response.data?.message || "Erro ao excluir lançamento",
                );
              }
            } catch (error: any) {
              const mensagemErro =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                "Erro ao excluir lançamento";

              Alert.alert("Erro", mensagemErro);
            }
          },
        },
      ],
    );
  };

  const lancamentosFiltrados = lancamentos
    .filter((lanc) => {
      if (colaboradorFiltro && colaboradorFiltro !== "todos") {
        return lanc.colaborador_id === colaboradorFiltro;
      }
      return true;
    })
    .filter((lanc) => {
      if (pesquisaColaborador.trim() !== "") {
        const termo = normalizarTexto(pesquisaColaborador);
        const nome = normalizarTexto(lanc.colaborador_nome || "");
        const local = normalizarTexto(lanc.local || "");
        const observacao = normalizarTexto(lanc.observacao || "");

        return (
          nome.includes(termo) ||
          local.includes(termo) ||
          observacao.includes(termo)
        );
      }
      return true;
    })
    .filter((lanc) => {
      // filtro por período (entre data início e data fim)
      if (!filtroDataInicio && !filtroDataFim) return true;

      const dataLanc = new Date(
        lanc.data.getFullYear(),
        lanc.data.getMonth(),
        lanc.data.getDate(),
        0,
        0,
        0,
        0,
      ).getTime();

      if (filtroDataInicio) {
        const ini = new Date(
          filtroDataInicio.getFullYear(),
          filtroDataInicio.getMonth(),
          filtroDataInicio.getDate(),
          0,
          0,
          0,
          0,
        ).getTime();
        if (dataLanc < ini) return false;
      }

      if (filtroDataFim) {
        const fim = new Date(
          filtroDataFim.getFullYear(),
          filtroDataFim.getMonth(),
          filtroDataFim.getDate(),
          23,
          59,
          59,
          999,
        ).getTime();
        if (dataLanc > fim) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dataCompare = a.data.getTime() - b.data.getTime();
      if (dataCompare !== 0) return dataCompare;
      return (a.colaborador_nome || "").localeCompare(b.colaborador_nome || "");
    });

  const calcularTotalHoras = () => {
    let totalMinutos = 0;
    lancamentosFiltrados.forEach((lanc) => {
      if (lanc.totalHoras) {
        const [horas, minutos] = lanc.totalHoras
          .replace("h", "")
          .replace("min", "")
          .split(" ")
          .map((str) => parseInt(str) || 0);
        totalMinutos += horas * 60 + minutos;
      }
    });
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return `${horas}h ${minutos}min`;
  };

  const gerarRelatorioHTML = () => {
    const lancamentosPorColaborador: { [key: string]: Lancamento[] } = {};
    const totalPorColaborador: { [key: string]: number } = {};
    const totalPorData: { [key: string]: number } = {};
    let totalValorGeral = 0;

    const lancamentosOrdenados = [...lancamentosFiltrados].sort((a, b) => {
      const dataCompare = a.data.getTime() - b.data.getTime();
      if (dataCompare !== 0) return dataCompare;
      return (a.colaborador_nome || "").localeCompare(b.colaborador_nome || "");
    });

    lancamentosOrdenados.forEach((lanc) => {
      const nomeColab = lanc.colaborador_nome;

      if (!lancamentosPorColaborador[nomeColab]) {
        lancamentosPorColaborador[nomeColab] = [];
        totalPorColaborador[nomeColab] = 0;
      }
      lancamentosPorColaborador[nomeColab].push(lanc);

      const [horas, minutos] = lanc.totalHoras
        .replace("h", "")
        .replace("min", "")
        .split(" ")
        .map((str) => parseInt(str) || 0);
      totalPorColaborador[nomeColab] += horas * 60 + minutos;

      // Somar valor proporcional da diária deste lançamento ao total geral
      const valorNum = calcularValorNumericoDiariaLancamento(lanc);
      if (isFinite(valorNum) && valorNum > 0) {
        totalValorGeral += valorNum;
      }

      const dataKey = format(lanc.data, "dd/MM/yyyy");
      if (!totalPorData[dataKey]) {
        totalPorData[dataKey] = 0;
      }
      totalPorData[dataKey] += horas * 60 + minutos;
    });

    const minutosParaHoras = (totalMinutos: number) => {
      const horas = Math.floor(totalMinutos / 60);
      const minutos = totalMinutos % 60;
      return `${horas}h ${minutos}min`;
    };

    const lancamentosPorData: { [key: string]: Lancamento[] } = {};
    lancamentosOrdenados.forEach((lanc) => {
      const dataKey = format(lanc.data, "dd/MM/yyyy");
      if (!lancamentosPorData[dataKey]) {
        lancamentosPorData[dataKey] = [];
      }
      lancamentosPorData[dataKey].push(lanc);
    });

    const totalHoras = calcularTotalHoras();
    const mesAno = format(mesAtual, "MMMM yyyy", { locale: ptBR });

    let filtroInfo = "";
    if (colaboradorFiltro && colaboradorFiltro !== "todos") {
      const nomeColaborador = colaboradores.find(
        (c) => c.id === colaboradorFiltro,
      )?.nome;
      filtroInfo = `<p style="text-align: center; color: #666; margin: 10px 0;">Filtrado por: ${nomeColaborador}</p>`;
    }
    if (pesquisaColaborador.trim() !== "") {
      filtroInfo += `<p style="text-align: center; color: #666; margin: 10px 0;">Pesquisa: "${pesquisaColaborador}"</p>`;
    }
    if (filtroDataInicio || filtroDataFim) {
      const iniTxt = filtroDataInicio
        ? format(filtroDataInicio, "dd/MM/yyyy")
        : "(início)";
      const fimTxt = filtroDataFim
        ? format(filtroDataFim, "dd/MM/yyyy")
        : "(fim)";
      filtroInfo += `<p style="text-align: center; color: #666; margin: 10px 0;">Período: ${iniTxt} até ${fimTxt}</p>`;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 8px;
              font-size: 11px;
            }
            h1 {
              text-align: center;
              color: #333;
              text-transform: capitalize;
              font-size: 16px;
              margin: 4px 0 8px 0;
            }
            h2 {
              color: #4CAF50;
              margin-top: 10px;
              margin-bottom: 6px;
              border-bottom: 1px solid #4CAF50;
              padding-bottom: 3px;
              font-size: 13px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 6px 0;
              page-break-inside: avoid;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 4px 6px;
              text-align: left;
              font-size: 10px;
            }
            th {
              background-color: #4CAF50;
              color: white;
            }
            tr:nth-child(even) {
              background-color: #f2f2f2;
            }
            .subtotal-row {
              background-color: #e8f5e9 !important;
              font-weight: bold;
            }
            .total-colaborador {
              background-color: #c8e6c9 !important;
              font-weight: bold;
              font-size: 11px;
            }
            .total {
              font-weight: bold;
              background-color: #4CAF50;
              color: white;
              text-align: right;
              padding: 8px;
              margin-top: 10px;
              font-size: 12px;
            }
            .footer {
              text-align: center;
              margin-top: 10px;
              font-size: 10px;
              color: #666;
            }
            .data-header {
              background-color: #81c784 !important;
              color: white;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h1>Livro Ponto - ${mesAno}</h1>
          ${filtroInfo}
          
          <h2>Relatório por Data</h2>
          ${Object.entries(lancamentosPorData)
            .map(([data, lancamentosData]) => {
              const totalData = totalPorData[data];
              return `
                <table>
                  <thead>
                    <tr class="data-header">
                      <th colspan="7">Data: ${data}</th>
                    </tr>
                    <tr>
                      <th>Colaborador</th>
                      <th>Local</th>
                      <th>Entrada</th>
                      <th>Saída</th>
                      <th>Almoço</th>
                      <th>Total Horas</th>
                      <th>Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${lancamentosData
                      .map(
                        (lanc) => `
                      <tr>
                        <td>${lanc.colaborador_nome}</td>
                        <td>${lanc.local || "-"}</td>
                        <td>${lanc.entrada}</td>
                        <td>${lanc.saida}</td>
                        <td>${
                          lanc.almocoSaida && lanc.almocoRetorno
                            ? `${lanc.almocoSaida} - ${lanc.almocoRetorno}`
                            : "-"
                        }</td>
                        <td>${lanc.totalHoras}</td>
                        <td>${(() => {
                          const valor = calcularValorDiariaLancamento(
                            lanc as any,
                          );
                          const obs = lanc.observacao || "";
                          if (valor) {
                            return `${valor}${obs ? " - " + obs : ""}`;
                          }
                          return obs || "-";
                        })()}</td>
                      </tr>
                    `,
                      )
                      .join("")}
                    <tr class="subtotal-row">
                      <td colspan="5" style="text-align: right;">Subtotal do dia:</td>
                      <td colspan="2">${minutosParaHoras(totalData)}</td>
                    </tr>
                  </tbody>
                </table>
              `;
            })
            .join("")}
              <h2>Resumo por Colaborador</h2>
              <table>
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Total Horas</th>
                    <th>Dias Trabalhados</th>
                    <th>Valor Diária</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.keys(lancamentosPorColaborador)
                    .map((nome) => {
                      const lancamentosColab = lancamentosPorColaborador[nome];
                      let diariaTexto = "-";

                      if (lancamentosColab.length > 0) {
                        const colaborador = colaboradores.find(
                          (c) => c.nome === nome,
                        );
                        if (colaborador?.salario_diario) {
                          const diariaNum = parseFloat(
                            String(colaborador.salario_diario).replace(
                              ",",
                              ".",
                            ),
                          );
                          if (isFinite(diariaNum) && diariaNum > 0) {
                            diariaTexto = `R$ ${formatCurrencyBR(diariaNum)}`;
                          }
                        }
                      }

                      return `
                    <tr>
                      <td>${nome}</td>
                      <td>${minutosParaHoras(totalPorColaborador[nome])}</td>
                      <td>${lancamentosColab.length}</td>
                      <td>${diariaTexto}</td>
                    </tr>
                  `;
                    })
                    .join("")}
              <tr class="total-colaborador">
                <td>TOTAL GERAL</td>
                <td>${totalHoras}</td>
                <td>${lancamentosOrdenados.length} registro(s)</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>

          <div class="total">
            Total de Horas no Período: ${totalHoras}<br/>
            Total em Valores no Período: R$ ${formatCurrencyBR(totalValorGeral)}
          </div>
          <div class="footer">
            Relatório gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}
          </div>
        </body>
      </html>
    `;
  };

  const imprimirRelatorio = async () => {
    try {
      setLoading(true);

      // calcula o total com base nos mesmos lançamentos usados no relatório
      const totalValorGeral = lancamentosFiltrados.reduce((acc, lanc) => {
        const v = calcularValorNumericoDiariaLancamento(lanc as any);
        return acc + (isFinite(v) && v > 0 ? v : 0);
      }, 0);

      const periodoTexto = (() => {
        if (filtroDataInicio || filtroDataFim) {
          const iniTxt = filtroDataInicio
            ? format(filtroDataInicio, "dd/MM/yyyy")
            : "início";
          const fimTxt = filtroDataFim
            ? format(filtroDataFim, "dd/MM/yyyy")
            : "fim";
          return `${iniTxt} a ${fimTxt}`;
        }
        // período padrão: mês atual inteiro
        const inicioMes = new Date(
          mesAtual.getFullYear(),
          mesAtual.getMonth(),
          1,
        );
        const fimMes = new Date(
          mesAtual.getFullYear(),
          mesAtual.getMonth() + 1,
          0,
        );
        return `${format(inicioMes, "dd/MM/yyyy")} a ${format(
          fimMes,
          "dd/MM/yyyy",
        )}`;
      })();

      // gera o PDF do relatório
      const html = gerarRelatorioHTML();
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("Sucesso", "Relatório gerado com sucesso!");
      }

      // depois de gerar o PDF, pergunta sobre o lançamento
      Alert.alert(
        "Lançar em Contas a Pagar",
        `Total do período: R$ ${formatCurrencyBR(
          totalValorGeral,
        )}.\n\nDeseja lançar este valor em contas a pagar?`,
        [
          {
            text: "Não",
            style: "cancel",
            onPress: () => {
              if (totalValorGeral > 0) {
                gerarReciboPagamento(periodoTexto, totalValorGeral);
              }
            },
          },
          {
            text: "Sim",
            onPress: async () => {
              if (totalValorGeral <= 0) return;
              await lancarContasPagar(periodoTexto, totalValorGeral);
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert("Erro", "Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  const gerarReciboPagamento = async (
    periodoTexto: string,
    totalValor: number,
  ) => {
    try {
      const valorTexto = formatCurrencyBR(totalValor);
      const colaboradorTexto =
        colaboradorFiltro && colaboradorFiltro !== "todos"
          ? colaboradores.find((c) => c.id === colaboradorFiltro)?.nome || "-"
          : "Vários Colaboradores";

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; padding: 16px; font-size: 12px; }
              h2 { text-align: center; margin-bottom: 16px; }
              p { margin: 4px 0; }
              .valor { font-size: 16px; font-weight: bold; margin-top: 10px; }
            </style>
          </head>
          <body>
            <h2>Recibo de Pagamento</h2>
            <p><strong>Colaborador(es):</strong> ${colaboradorTexto}</p>
            <p><strong>Período:</strong> ${periodoTexto}</p>
            <p class="valor">Valor Total: R$ ${valorTexto}</p>
            <p style="margin-top: 24px;">___________________________________________</p>
            <p>Assinatura</p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("Sucesso", "Recibo gerado com sucesso!");
      }
    } catch (error) {
      Alert.alert("Erro", "Erro ao gerar recibo de pagamento");
    }
  };

  const gerarHolerite = async (
    periodoTexto: string,
    totalBruto: number,
    desconto: number = 0,
  ) => {
    try {
      if (!colaboradorFiltro || colaboradorFiltro === "todos") {
        Alert.alert(
          "Aviso",
          "Selecione um colaborador específico para gerar o holerite.",
        );
        return;
      }

      // Tenta buscar os dados completos do colaborador diretamente na API (garante CPF/CNPJ e endereço)
      let dadosColab: any = {};
      try {
        const detalhadoRes = await api.get(
          `/colaboradores/listar_id.php?id=${colaboradorFiltro}`,
        );
        if (detalhadoRes.data?.success) {
          dadosColab = detalhadoRes.data.dados || {};
        }
      } catch (e) {
        // se der erro na API, continua usando apenas os dados já carregados em memória
        dadosColab = {};
      }

      const nomeColab =
        dadosColab.nome ||
        colaboradores.find((c) => c.id === colaboradorFiltro)?.nome ||
        "-";
      const documentoColab = dadosColab.cpf || dadosColab.doc || "-";
      const funcaoColab =
        dadosColab.funcao ||
        colaboradores.find((c) => c.id === colaboradorFiltro)?.funcao ||
        "-";
      const enderecoColab =
        dadosColab.endereco ||
        colaboradores.find((c) => c.id === colaboradorFiltro)?.endereco ||
        "-";
      const telefoneColab =
        dadosColab.telefone ||
        colaboradores.find((c) => c.id === colaboradorFiltro)?.telefone ||
        "-";
      const emailColab =
        dadosColab.email ||
        colaboradores.find((c) => c.id === colaboradorFiltro)?.email ||
        "-";

      const colaborador = colaboradores.find((c) => c.id === colaboradorFiltro);

      const lancamentosColaborador = lancamentosFiltrados.filter(
        (l) => l.colaborador_id === colaboradorFiltro,
      );

      if (lancamentosColaborador.length === 0) {
        Alert.alert(
          "Aviso",
          "Nenhum lançamento encontrado para este colaborador no período.",
        );
        return;
      }

      const regexAdiantamento = /ADIANTAMENTO DI[ÁA]RIA:\s*R?\$?\s*([\d.,]+)/i;

      let totalAdiantamentos = 0;
      lancamentosColaborador.forEach((lanc) => {
        if (lanc.observacao) {
          const match = lanc.observacao.match(regexAdiantamento);
          if (match && match[1]) {
            const v = parseValorBR(match[1]);
            if (isFinite(v) && v > 0) {
              totalAdiantamentos += v;
            }
          }
        }
      });

      const totalProventosTexto = formatCurrencyBR(totalBruto);
      const descontoManual = desconto > 0 ? desconto : 0;
      const descontoTotal = descontoManual + totalAdiantamentos;
      const descontoTexto = formatCurrencyBR(descontoTotal);
      const totalLiquido = Math.max(totalBruto - descontoTotal, 0);
      const totalLiquidoTexto = formatCurrencyBR(totalLiquido);
      const diariaTexto = (() => {
        if (!colaborador?.salario_diario) return "-";
        const diariaNum = parseFloat(
          String(colaborador.salario_diario).replace(",", "."),
        );
        if (!isFinite(diariaNum) || diariaNum <= 0) return "-";
        return `R$ ${formatCurrencyBR(diariaNum)}`;
      })();

      const dataAssinatura = format(new Date(), "dd/MM/yyyy", {
        locale: ptBR,
      });

      // Quebra lançamentos em proventos/descontos simples, para lembrar o modelo da imagem
      const linhasDias = lancamentosColaborador
        .map((lanc) => {
          const valorDiaNum = calcularValorNumericoDiariaLancamento(
            lanc as any,
          );
          const valorDiaTexto =
            isFinite(valorDiaNum) && valorDiaNum > 0
              ? formatCurrencyBR(valorDiaNum)
              : "0,00";
          const obs = lanc.observacao || "";
          const horas = lanc.totalHoras || "";

          let valorDescontoDiaTexto = "0,00";
          if (obs) {
            const match = obs.match(regexAdiantamento);
            if (match && match[1]) {
              const v = parseValorBR(match[1]);
              if (isFinite(v) && v > 0) {
                valorDescontoDiaTexto = formatCurrencyBR(v);
              }
            }
          }

          return `
            <tr>
              <td style="width: 20%;">${format(lanc.data, "dd/MM/yyyy")}</td>
              <td style="width: 55%; text-align: left;">Diária trabalhada${
                horas ? ` - ${horas}` : ""
              }${obs ? ` - ${obs}` : ""}</td>
              <td style="width: 12.5%; text-align: right;">${valorDiaTexto}</td>
              <td style="width: 12.5%; text-align: right;">${valorDescontoDiaTexto}</td>
            </tr>
          `;
        })
        .join("");

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; padding: 12px; font-size: 11px; }
              .cabecalho-box {
                border: 1px solid #000;
                padding: 8px 10px;
                margin-bottom: 8px;
              }
              .cabecalho-duas-colunas {
                display: flex;
                justify-content: space-between;
                font-size: 10px;
                margin-bottom: 4px;
              }
              .cabecalho-duas-colunas .col-esq,
              .cabecalho-duas-colunas .col-dir {
                display: flex;
                flex-direction: column;
                gap: 4px;
              }
              .linha-colab {
                font-size: 9px;
              }
              .label { font-weight: bold; }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
              }
              th, td {
                border: 1px solid #000;
                padding: 4px 6px;
                font-size: 10px;
              }
              th {
                background-color: #f2f2f2;
                text-align: center;
              }
              .totais {
                margin-top: 8px;
                text-align: right;
                font-size: 11px;
              }
              .valor-liquido {
                margin-top: 14px;
                font-weight: bold;
                text-align: center;
                font-size: 12px;
              }
              .assinatura {
                margin-top: 28px;
                font-size: 11px;
              }
              .linha-assinatura {
                margin-top: 30px;
                border-top: 1px solid #000;
                width: 55%;
              }
            </style>
          </head>
          <body>
            <div class="cabecalho-box">
              <div style="margin-bottom:8px;display:flex;align-items:center;">
                <img src="${logoUri}" style="height:80px;margin-right:10px;" />
                <div>
                  <div><span class="label">EMPRESA:</span> <strong>Reforlimer reformas e construções</strong></div>
                  <div><span class="label">ENDEREÇO:</span> <strong>Av.Laranjeiras  n 701</strong></div>
                  <div><span class="label">CNPJ:</span> <strong>30.768.359/0001-74</strong></div>
                </div>
              </div>
              <div class="cabecalho-duas-colunas">
                <div class="col-esq"></div>
                <div class="col-dir">
                  <div><span class="label">PERÍODO:</span> <strong> ${periodoTexto}</div>
                  <div><span class="label">DATA CRÉDITO:</span> <strong>${dataAssinatura}</div>
                </div>
              </div>
              <hr style="margin: 8px 0; border: 0; border-top: 1px solid #000;" />
              <div class="cabecalho-duas-colunas linha-colab" style="margin-top: 2px;">
                <div class="col-esq">
                  <div><span class="label">FUNCIONÁRIO:</span> ${nomeColab}</div>
                  <div><span class="label">FUNÇÃO:</span> ${funcaoColab}</div>
                </div>
                <div class="col-dir">
                  <div><span class="label">TIPO:</span> Diarista</div>
                </div>
              </div>
              <div class="cabecalho-duas-colunas linha-colab">
                <div class="col-esq">
                  <div><span class="label">ENDEREÇO:</span> ${enderecoColab}</div>
                  <div><span class="label">TELEFONE:</span> ${telefoneColab}</div>
                </div>
                <div class="col-dir">
                  <div><span class="label">E-MAIL:</span> ${emailColab}</div>
                  <div><span class="label">VALOR DIÁRIA:</span> ${diariaTexto}</div>
                </div>
              </div>
              <div class="cabecalho-duas-colunas linha-colab">
                <div class="col-esq">
                  <div><span class="label">CPF/CNPJ:</span> ${documentoColab}</div>
                </div>
                <div class="col-dir">
                  <div><span class="label">DIAS TRABALHADOS:</span> ${lancamentosColaborador.length}</div>
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 20%;">CÓDIGO / DATA</th>
                  <th style="width: 55%;">DESCRIÇÃO</th>
                  <th style="width: 12.5%;">PROVENTOS</th>
                  <th style="width: 12.5%;">DESCONTOS</th>
                </tr>
              </thead>
              <tbody>
                ${linhasDias}
              </tbody>
            </table>

            <div class="totais">
              <div><span class="label">TOT. PROVENTOS:</span> R$ ${totalProventosTexto}</div>
              <div><span class="label">TOT. DESCONTOS:</span> R$ ${descontoTexto}</div>
            </div>

            <div class="valor-liquido">
              VALOR LÍQUIDO R$ ${totalLiquidoTexto}
            </div>

            <div class="assinatura">
              <div style="margin-top: 18px;">RECEBI O VALOR LÍQUIDO ACIMA EM: ____ / ____ / ______</div>
              <div class="linha-assinatura"></div>
              <div>${nomeColab}</div>
              <div>CPF/CNPJ: ${documentoColab}</div>
            </div>
          </body>
        </html>
      `;
      // gera PDF do holerite e abre a tela de compartilhamento (mesmo fluxo do relatório)
      try {
        const { uri } = await Print.printToFileAsync({ html });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert("Sucesso", "Holerite gerado com sucesso!");
        }
      } catch (errorPrint: any) {
        const msg =
          errorPrint?.message ||
          "Erro ao gerar/compartilhar o holerite para impressão";
        Alert.alert("Erro", msg);
      }
    } catch (error: any) {
      const msg = error?.message || "Erro ao gerar holerite/impressão";
      Alert.alert("Erro", msg);
    }
  };

  const confirmarDescontoHolerite = async () => {
    if (!infoHolerite) {
      setMostrarModalDesconto(false);
      return;
    }

    const desconto = parseValorBR(valorDescontoTexto);

    // guarda os dados do holerite para o botão dedicado abrir depois
    setUltimoHolerite({
      periodo: infoHolerite.periodo,
      totalBruto: infoHolerite.total,
      desconto,
    });

    setMostrarModalDesconto(false);
    setInfoHolerite(null);

    Alert.alert(
      "Pronto",
      "Holerite preparado. Toque no botão 'Holerite' no topo para abrir.",
    );
  };

  const abrirHoleritePreparado = () => {
    if (!ultimoHolerite) {
      Alert.alert(
        "Aviso",
        "Nenhum holerite preparado. Lance em contas a pagar e informe o desconto primeiro.",
      );
      return;
    }

    if (!colaboradorFiltro || colaboradorFiltro === "todos") {
      Alert.alert(
        "Aviso",
        "Selecione um colaborador específico para abrir o holerite.",
      );
      return;
    }

    gerarHolerite(
      ultimoHolerite.periodo,
      ultimoHolerite.totalBruto,
      ultimoHolerite.desconto,
    );
  };

  const lancarContasPagar = async (
    periodoTexto: string,
    totalValor: number,
  ) => {
    try {
      const userId = await AsyncStorage.getItem("@user");
      const hojeIso = format(new Date(), "yyyy-MM-dd");

      const colaboradorNome =
        colaboradorFiltro && colaboradorFiltro !== "todos"
          ? colaboradores.find((c) => c.id === colaboradorFiltro)?.nome || ""
          : "Vários Colaboradores";

      // código do colaborador na coluna "cliente": usamos prefixo "C-" para
      // diferenciar de fornecedores (que usam apenas o id numérico)
      const colaboradorCodigo =
        colaboradorFiltro && colaboradorFiltro !== "todos"
          ? `C-${String(colaboradorFiltro)}`
          : "0";
      const colabInfo =
        colaboradorFiltro && colaboradorFiltro !== "todos"
          ? colaboradores.find((c) => c.id === colaboradorFiltro)
          : null;

      const docTexto = colabInfo?.cpf ? ` - CPF/CNPJ: ${colabInfo.cpf}` : "";
      const funcaoTexto = colabInfo?.funcao
        ? ` - Função: ${colabInfo.funcao}`
        : "";

      // consolida os locais dos lançamentos usados para este período
      const locaisPeriodo = Array.from(
        new Set(
          lancamentosFiltrados
            .filter((l) =>
              colaboradorFiltro && colaboradorFiltro !== "todos"
                ? l.colaborador_id === colaboradorFiltro
                : true,
            )
            .map((l) => (l.local || "").trim())
            .filter((loc) => loc.length > 0),
        ),
      );

      const localConta =
        locaisPeriodo.length === 0
          ? ""
          : locaisPeriodo.length === 1
            ? locaisPeriodo[0]
            : locaisPeriodo.join(" / ");

      // monta um resumo de horas por dia e observação para a descrição
      const detalhesDias = lancamentosFiltrados
        .filter((l) =>
          colaboradorFiltro && colaboradorFiltro !== "todos"
            ? l.colaborador_id === colaboradorFiltro
            : true,
        )
        .map((l) => {
          const dataTxt = format(l.data, "dd/MM");
          const obs = l.observacao ? ` - ${l.observacao}` : "";
          return `${dataTxt}: ${l.totalHoras}${obs}`;
        })
        .join(" | ");

      const detalhesTexto =
        detalhesDias.trim().length > 0 ? ` - Dias/Horas: ${detalhesDias}` : "";

      // descrição começa com o nome do colaborador, para aparecer corretamente no Contas a Pagar
      const descricao = `${colaboradorNome} - Livro Ponto (${periodoTexto})${docTexto}${funcaoTexto}${detalhesTexto}`;

      // Busca uma combinação válida de plano + despesa para evitar
      // rejeição no backend quando a configuração do banco varia entre ambientes.
      const planosRes = await api.get("/pagar/listar_plano.php");
      const planosDisponiveis: string[] = Array.isArray(
        planosRes.data?.resultado,
      )
        ? planosRes.data.resultado
            .map((p: any) => String(p?.nome || "").trim())
            .filter((p: string) => p.length > 0)
        : [];

      if (planosDisponiveis.length === 0) {
        Alert.alert(
          "Aviso",
          "Nenhum plano/categoria encontrado no Contas a Pagar. Cadastre um plano e uma despesa antes de lançar.",
        );
        return;
      }

      const escolherPreferido = (itens: string[], preferencias: string[]) => {
        return (
          preferencias.find((pref) =>
            itens.some(
              (item) => normalizarTexto(item) === normalizarTexto(pref),
            ),
          ) || ""
        );
      };

      const planoPreferido = escolherPreferido(planosDisponiveis, [
        "Empresa",
        "Livro Ponto",
        "Folha de Pagamento",
        "Pessoal",
        "Funcionários",
        "Funcionarios",
      ]);
      const planoSelecionado = planoPreferido || planosDisponiveis[0];

      const despesasRes = await api.get(
        `/pagar/listar_desp.php?plano=${encodeURIComponent(planoSelecionado)}`,
      );
      const despesasDisponiveis: string[] = Array.isArray(
        despesasRes.data?.resultado,
      )
        ? despesasRes.data.resultado
            .map((d: any) => String(d?.nome || "").trim())
            .filter((d: string) => d.length > 0)
        : [];

      if (despesasDisponiveis.length === 0) {
        Alert.alert(
          "Aviso",
          `O plano/categoria "${planoSelecionado}" não possui despesas cadastradas no Contas a Pagar.`,
        );
        return;
      }

      const despPreferida = escolherPreferido(despesasDisponiveis, [
        "Folha de Pagamento",
        "Folha Pagamento",
        "Livro Ponto",
        "Diária",
        "Diaria",
        "Mão de Obra",
        "Mao de Obra",
        "Salário",
        "Salario",
      ]);
      const despSelecionada = despPreferida || despesasDisponiveis[0];

      const payload = {
        id: "0",
        valor: totalValor.toFixed(2),
        descricao,
        // Gravamos na coluna "cliente" o código do colaborador com prefixo C-
        // (campo forn na API), não o nome.
        forn: colaboradorCodigo,
        saida: "Caixa",
        doc:
          colabInfo?.cpf && colaboradorNome
            ? `${colaboradorNome} - CPF/CNPJ: ${colabInfo.cpf}`
            : "Livro Ponto",
        plano: planoSelecionado,
        desp: despSelecionada,
        freq: "Uma Vez",
        emissao: hojeIso,
        venc: filtroDataFim ? format(filtroDataFim, "yyyy-MM-dd") : hojeIso,
        foto: "",
        user: userId,
        local: localConta,
      };

      const res = await api.post("/pagar/salvar.php", payload);

      if (!res.data?.sucesso) {
        Alert.alert(
          "Aviso",
          res.data?.mensagem || "Não foi possível lançar em contas a pagar.",
        );
        return;
      }
      setInfoHolerite({ periodo: periodoTexto, total: totalValor });
      setValorDescontoTexto("");
      setMostrarModalDesconto(true);

      Alert.alert(
        "Lançado",
        "Lançamento criado em contas a pagar com sucesso!",
      );
    } catch (error: any) {
      const msg =
        error?.response?.data?.mensagem ||
        error?.message ||
        "Erro ao lançar em contas a pagar";
      Alert.alert("Erro", msg);
    }
  };

  const mudarMes = (direcao: "anterior" | "proximo") => {
    const novaData = new Date(mesAtual);
    if (direcao === "anterior") {
      novaData.setMonth(novaData.getMonth() - 1);
    } else {
      novaData.setMonth(novaData.getMonth() + 1);
    }
    setMesAtual(novaData);
  };

  const renderLancamento = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.colaboradorNome}>
          {item.colaborador_nome || "Sem nome"}
        </Text>
        <Text style={styles.cardDate}>
          {item.data &&
            format(new Date(item.data), "dd/MM/yyyy", { locale: ptBR })}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.horarioRow}>
          <Text style={styles.label}>Entrada:</Text>
          <Text style={styles.timeValue}>{item.entrada || "--:--"}</Text>
        </View>
        <View style={styles.horarioRow}>
          <Text style={styles.label}>Saída:</Text>
          <Text style={styles.timeValue}>{item.saida || "--:--"}</Text>
        </View>
        <View style={styles.horarioRow}>
          <Text style={styles.label}>Total:</Text>
          <Text style={styles.timeValue}>{item.total_horas || "0h 0min"}</Text>
        </View>
        {item.observacao && (
          <Text style={styles.observacao}>{item.observacao}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Livro Ponto</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.printButton}
            onPress={imprimirRelatorio}
          >
            <Ionicons name="print" size={24} color="#fff" />
            <Text style={styles.printButtonText}>Imprimir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.printButton, { marginLeft: 8 }]}
            onPress={abrirHoleritePreparado}
          >
            <Ionicons name="document-text" size={24} color="#fff" />
            <Text style={styles.printButtonText}>Holerite</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => mudarMes("anterior")}>
          <Ionicons name="chevron-back" size={28} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {format(mesAtual, "MMMM yyyy", { locale: ptBR }).toUpperCase()}
        </Text>
        <TouchableOpacity onPress={() => mudarMes("proximo")}>
          <Ionicons name="chevron-forward" size={28} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar por colaborador ou local..."
            value={pesquisaColaborador}
            onChangeText={setPesquisaColaborador}
          />
          {pesquisaColaborador.length > 0 && (
            <TouchableOpacity onPress={() => setPesquisaColaborador("")}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFiltroPicker(!showFiltroPicker)}
        >
          <Ionicons name="filter" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {showFiltroPicker && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterTitle}>Filtrar por Colaborador:</Text>
          <ScrollView style={styles.filterScroll}>
            <TouchableOpacity
              style={[
                colaboradorFiltro === "todos" && styles.filterOptionSelected,
              ]}
              onPress={() => {
                setColaboradorFiltro("todos");
                setShowFiltroPicker(false);
              }}
            >
              <Text style={styles.filterOptionText}>Todos</Text>
              {colaboradorFiltro === "todos" && (
                <Ionicons name="checkmark" size={20} color="#4CAF50" />
              )}
            </TouchableOpacity>
            {colaboradores
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map((col) => (
                <TouchableOpacity
                  key={col.id}
                  style={[
                    colaboradorFiltro === col.id && styles.filterOptionSelected,
                  ]}
                  onPress={() => {
                    setColaboradorFiltro(col.id);
                    setShowFiltroPicker(false);
                  }}
                >
                  <Text style={styles.filterOptionText}>{col.nome}</Text>
                  {colaboradorFiltro === col.id && (
                    <Ionicons name="checkmark" size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      )}

      {colaboradorFiltro && colaboradorFiltro !== "todos" && (
        <View style={styles.filterBadge}>
          <Text style={styles.filterBadgeText}>
            Filtro:{" "}
            {colaboradores.find((c) => c.id === colaboradorFiltro)?.nome}
          </Text>
          <TouchableOpacity
            onPress={() => setColaboradorFiltro("todos")}
            style={styles.filterBadgeClose}
          >
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Filtro de período (sempre visível, independente do painel de colaboradores) */}
      <View
        style={{
          marginHorizontal: 15,
          marginBottom: 10,
          marginTop: 5,
        }}
      >
        <Text style={styles.filterTitle}>Período:</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
          <TouchableOpacity
            style={[styles.selectButton, { flex: 1 }]}
            onPress={() => {
              setTempFiltroDataInicio(filtroDataInicio || new Date());
              setShowFiltroDataInicio(true);
            }}
          >
            <Text style={styles.selectButtonText}>
              {filtroDataInicio
                ? format(filtroDataInicio, "dd/MM/yyyy")
                : "Data início"}
            </Text>
            <Ionicons name="calendar" size={18} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.selectButton, { flex: 1 }]}
            onPress={() => {
              setTempFiltroDataFim(filtroDataFim || new Date());
              setShowFiltroDataFim(true);
            }}
          >
            <Text style={styles.selectButtonText}>
              {filtroDataFim ? format(filtroDataFim, "dd/MM/yyyy") : "Data fim"}
            </Text>
            <Ionicons name="calendar" size={18} color="#666" />
          </TouchableOpacity>
        </View>

        {(filtroDataInicio || filtroDataFim) && (
          <TouchableOpacity
            onPress={() => {
              setFiltroDataInicio(null);
              setFiltroDataFim(null);
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: "#4CAF50",
                textAlign: "right",
                marginTop: 4,
              }}
            >
              Limpar período
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
      ) : (
        <ScrollView style={styles.content}>
          {lancamentosFiltrados.length > 0 ? (
            lancamentosFiltrados.map((lancamento) => (
              <View key={lancamento.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.colaboradorNome}>
                      {lancamento.colaborador_nome}
                    </Text>
                    <Text style={styles.cardDate}>
                      {format(lancamento.data, "dd/MM/yyyy")}
                    </Text>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    <Text style={styles.cardTotal}>
                      {lancamento.totalHoras}
                    </Text>
                    <TouchableOpacity
                      onPress={() => excluirLancamento(lancamento.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#f44336"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.timeRow}>
                    <Ionicons name="enter-outline" size={20} color="#4CAF50" />
                    <Text style={styles.timeLabel}>Entrada:</Text>
                    <Text style={styles.timeValue}>{lancamento.entrada}</Text>
                  </View>
                  <View style={styles.timeRow}>
                    <Ionicons name="exit-outline" size={20} color="#f44336" />
                    <Text style={styles.timeLabel}>Saída:</Text>
                    <Text style={styles.timeValue}>{lancamento.saida}</Text>
                  </View>
                  {lancamento.almocoSaida && lancamento.almocoRetorno && (
                    <View style={styles.timeRow}>
                      <Ionicons
                        name="restaurant-outline"
                        size={20}
                        color="#FF9800"
                      />
                      <Text style={styles.timeLabel}>Almoço:</Text>
                      <Text style={styles.timeValue}>
                        {lancamento.almocoSaida} - {lancamento.almocoRetorno}
                      </Text>
                    </View>
                  )}
                  {lancamento.local ? (
                    <View style={styles.timeRow}>
                      <Ionicons
                        name="location-outline"
                        size={20}
                        color="#2196F3"
                      />
                      <Text style={styles.timeLabel}>Local:</Text>
                      <Text style={styles.timeValue}>{lancamento.local}</Text>
                    </View>
                  ) : null}
                </View>
                {(lancamento.observacao ||
                  calcularValorDiariaLancamento(lancamento)) && (
                  <View style={styles.cardFooter}>
                    <Text style={styles.observacao}>
                      {(() => {
                        const valor = calcularValorDiariaLancamento(lancamento);
                        const obs = lancamento.observacao || "";
                        if (valor) {
                          return `${valor}${obs ? " - " + obs : ""}`;
                        }
                        return obs;
                      })()}
                    </Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Nenhum lançamento encontrado</Text>
            </View>
          )}
        </ScrollView>
      )}

      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total do Período:</Text>
        <Text style={styles.totalValue}>{calcularTotalHoras()}</Text>
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {Platform.OS === "ios" ? (
        <>
          <Modal
            transparent
            visible={showFiltroDataInicio}
            animationType="fade"
            onRequestClose={() => setShowFiltroDataInicio(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Selecione a data inicial</Text>
                {showFiltroDataInicio && (
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={
                      tempFiltroDataInicio || filtroDataInicio || new Date()
                    }
                    mode="date"
                    display="inline"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        setTempFiltroDataInicio(selectedDate);
                      }
                    }}
                    locale="pt-BR"
                    themeVariant="light"
                    style={{ width: "100%" }}
                  />
                )}
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.modalButtonSecondary}
                    onPress={() => setShowFiltroDataInicio(false)}
                  >
                    <Text style={styles.modalButtonSecondaryText}>
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalButtonPrimary}
                    onPress={() => {
                      const dataParaAplicar =
                        tempFiltroDataInicio || filtroDataInicio || new Date();
                      setFiltroDataInicio(dataParaAplicar);
                      setShowFiltroDataInicio(false);
                    }}
                  >
                    <Text style={styles.modalButtonPrimaryText}>Confirmar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <Modal
            transparent
            visible={showFiltroDataFim}
            animationType="fade"
            onRequestClose={() => setShowFiltroDataFim(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Selecione a data final</Text>
                {showFiltroDataFim && (
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={tempFiltroDataFim || filtroDataFim || new Date()}
                    mode="date"
                    display="inline"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        setTempFiltroDataFim(selectedDate);
                      }
                    }}
                    locale="pt-BR"
                    themeVariant="light"
                    style={{ width: "100%" }}
                  />
                )}
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.modalButtonSecondary}
                    onPress={() => setShowFiltroDataFim(false)}
                  >
                    <Text style={styles.modalButtonSecondaryText}>
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalButtonPrimary}
                    onPress={() => {
                      const dataParaAplicar =
                        tempFiltroDataFim || filtroDataFim || new Date();
                      setFiltroDataFim(dataParaAplicar);
                      setShowFiltroDataFim(false);
                    }}
                  >
                    <Text style={styles.modalButtonPrimaryText}>Confirmar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <>
          {showFiltroDataInicio && (
            <DateTimePicker
              testID="dateTimePicker"
              value={filtroDataInicio || new Date()}
              mode="date"
              is24Hour={true}
              display="calendar"
              onChange={(event, selectedDate) => {
                setShowFiltroDataInicio(false);
                if (selectedDate) {
                  setFiltroDataInicio(selectedDate);
                }
              }}
            />
          )}

          {showFiltroDataFim && (
            <DateTimePicker
              testID="dateTimePicker"
              value={filtroDataFim || new Date()}
              mode="date"
              is24Hour={true}
              display="calendar"
              onChange={(event, selectedDate) => {
                setShowFiltroDataFim(false);
                if (selectedDate) {
                  setFiltroDataFim(selectedDate);
                }
              }}
            />
          )}
        </>
      )}

      <Modal
        animationType="fade"
        transparent
        visible={mostrarModalDesconto}
        onRequestClose={() => setMostrarModalDesconto(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Desconto no Holerite</Text>
              <TouchableOpacity onPress={() => setMostrarModalDesconto(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalBody, { paddingBottom: 20 }]}>
              <Text style={styles.label}>
                Valor para abater do total (opcional)
              </Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                keyboardType="numeric"
                value={valorDescontoTexto}
                onChangeText={setValorDescontoTexto}
              />

              {infoHolerite && (
                <Text style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
                  Total bruto: R$ {formatCurrencyBR(infoHolerite.total)}
                </Text>
              )}

              <TouchableOpacity
                style={[styles.saveButton, { marginTop: 16 }]}
                onPress={confirmarDescontoHolerite}
              >
                <Text style={styles.saveButtonText}>Gerar Holerite</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Lançamento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Colaborador *</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowColaboradorPicker(!showColaboradorPicker)}
              >
                <Text style={styles.selectButtonText}>
                  {colaboradorSelecionado
                    ? colaboradores.find((c) => c.id === colaboradorSelecionado)
                        ?.nome
                    : "Selecione um colaborador"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              {showColaboradorPicker && (
                <View style={styles.optionsList}>
                  <ScrollView style={styles.optionsScroll}>
                    {colaboradores.map((col) => (
                      <TouchableOpacity
                        key={col.id}
                        style={styles.optionItem}
                        onPress={() => {
                          setColaboradorSelecionado(col.id);
                          setShowColaboradorPicker(false);
                        }}
                      >
                        <Text style={styles.optionText}>{col.nome}</Text>
                        {colaboradorSelecionado === col.id && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color="#4CAF50"
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={{ fontSize: 12, color: "#666", marginBottom: 15 }}>
                {colaboradores.length} colaboradores disponíveis
              </Text>

              <Text style={styles.label}>Data *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => {
                  setTempDataLancamento(dataLancamento || new Date());
                  setShowDatePicker(true);
                }}
              >
                <Text>{format(dataLancamento, "dd/MM/yyyy")}</Text>
              </TouchableOpacity>

              {Platform.OS === "ios" ? (
                <Modal
                  transparent
                  visible={showDatePicker}
                  animationType="fade"
                  onRequestClose={() => setShowDatePicker(false)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>Selecione a data</Text>
                      {showDatePicker && (
                        <DateTimePicker
                          testID="dateTimePicker"
                          value={
                            tempDataLancamento || dataLancamento || new Date()
                          }
                          mode="date"
                          display="inline"
                          onChange={(event, selectedDate) => {
                            if (selectedDate) {
                              setTempDataLancamento(selectedDate);
                            }
                          }}
                          locale="pt-BR"
                          themeVariant="light"
                          style={{ width: "100%" }}
                        />
                      )}
                      <View style={styles.modalActionsRow}>
                        <TouchableOpacity
                          style={styles.modalButtonSecondary}
                          onPress={() => setShowDatePicker(false)}
                        >
                          <Text style={styles.modalButtonSecondaryText}>
                            Cancelar
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.modalButtonPrimary}
                          onPress={() => {
                            const dataParaAplicar =
                              tempDataLancamento ||
                              dataLancamento ||
                              new Date();
                            setDataLancamento(dataParaAplicar);
                            setShowDatePicker(false);
                          }}
                        >
                          <Text style={styles.modalButtonPrimaryText}>
                            Confirmar
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>
              ) : (
                showDatePicker && (
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={dataLancamento}
                    mode="date"
                    is24Hour={true}
                    display="calendar"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        setDataLancamento(selectedDate);
                      }
                    }}
                  />
                )
              )}

              <Text style={styles.label}>Local</Text>
              <TextInput
                style={styles.input}
                value={localLancamento}
                onChangeText={(texto) => {
                  setLocalLancamento(texto);

                  if (!observacaoEditadaManual) {
                    const localTexto = texto.trim();
                    const observacaoLocal = localTexto
                      ? `Diárias no ${localTexto}`
                      : "";
                    setObservacao(observacaoLocal);
                  }
                }}
                placeholder="Ex: Obra Centro, Escritório"
              />

              <Text style={styles.label}>Hora Entrada (HH:MM) *</Text>
              <TextInput
                style={styles.input}
                value={horaEntrada}
                onChangeText={(texto) => {
                  const horaFormatada = formatarHorario(texto);
                  setHoraEntrada(horaFormatada);
                }}
                placeholder="08:00"
                keyboardType="numeric"
                maxLength={5}
              />

              <Text style={styles.label}>Hora Saída (HH:MM) *</Text>
              <TextInput
                style={styles.input}
                value={horaSaida}
                onChangeText={(texto) => {
                  const horaFormatada = formatarHorario(texto);
                  setHoraSaida(horaFormatada);
                }}
                placeholder="17:00"
                keyboardType="numeric"
                maxLength={5}
              />

              <Text style={styles.label}>Saída para Almoço (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={horaSaidaAlmoco}
                onChangeText={(texto) => {
                  const horaFormatada = formatarHorario(texto);
                  setHoraSaidaAlmoco(horaFormatada);
                }}
                placeholder="12:00"
                keyboardType="numeric"
                maxLength={5}
              />

              <Text style={styles.label}>Retorno do Almoço (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={horaVoltaAlmoco}
                onChangeText={(texto) => {
                  const horaFormatada = formatarHorario(texto);
                  setHoraVoltaAlmoco(horaFormatada);
                }}
                placeholder="13:00"
                keyboardType="numeric"
                maxLength={5}
              />

              <Text style={styles.label}>
                Adiantamento de diária (desconto) R$
              </Text>
              <TextInput
                style={styles.input}
                value={valorAdiantamentoTextoLanc}
                onChangeText={setValorAdiantamentoTextoLanc}
                placeholder="0,00"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Observação</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={observacao}
                onChangeText={(texto) => {
                  setObservacao(texto);

                  const localTexto = (localLancamento || "").trim();
                  const observacaoAutomatica = localTexto
                    ? `Diárias no ${localTexto}`
                    : "";

                  setObservacaoEditadaManual(texto !== observacaoAutomatica);
                }}
                placeholder="Digite uma observação (opcional)"
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={adicionarLancamento}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Salvar Lançamento</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
