import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/core";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { format } from "date-fns";
import { SelectField } from "../../components/SelectField";
import api from "../../services/api";
import { styles } from "./style";

interface CategoriaPlano {
  id: string;
  nome: string;
}

interface DespesaCategoria {
  id: string;
  nome: string;
}

interface DespesaLancadaPeriodo {
  nome: string;
  plano: string;
  plano_conta?: string;
}

interface FiltroSelecionado {
  key: string;
  planoId: string;
  planoNome: string;
  despesaId: string;
  despesaNome: string;
}

interface MovimentoResumo {
  id: string;
  fonte: "pagar" | "receber";
  descricao: string;
  valor: number;
  vencimento: string;
  statusLabel: string;
  planoConta: string;
  filtroLabel: string;
  local?: string;
  grupoCusto: GrupoCusto;
}

interface ResumoPeriodo {
  aPagar: number;
  pago: number;
  aReceber: number;
  recebido: number;
  resultadoProjetado: number;
  itens: MovimentoResumo[];
}

interface PersistedState {
  categoriaSelecionada: string;
  despesaSelecionada: string;
  filtrosSelecionados: FiltroSelecionado[];
  dataInicio: string;
  dataFim: string;
  localSelecionado: string;
}

const STORAGE_KEY = "@lancamentos_custos_state_v3";
const LOCAL_TODOS = "__todos_locais__";

type GrupoCusto = "Custos fixos" | "Custos variaveis" | "Custo da obra";

const DESPESAS_CUSTO_FIXO = [
  "Folha de pagamento",
  "Guia de arrecadacao",
  "Aluguel",
  "IPTU",
];

const DESPESAS_CUSTO_VARIAVEL = [
  "Elektro",
  "BRK",
  "Gasolina",
  "Diesel",
  "Manutencao de veiculo",
];

function normalizeText(value: any): string {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeHtml(value: any): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number): string {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function uniqueDespesas(items: DespesaCategoria[]): DespesaCategoria[] {
  const map = new Map<string, DespesaCategoria>();

  items.forEach((item) => {
    const key = normalizeText(item.id || item.nome);
    if (!key || map.has(key)) return;
    map.set(key, item);
  });

  return Array.from(map.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
  );
}

function resumoVazio(): ResumoPeriodo {
  return {
    aPagar: 0,
    pago: 0,
    aReceber: 0,
    recebido: 0,
    resultadoProjetado: 0,
    itens: [],
  };
}

function parseAmount(value: any): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCompact(value: any): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function parsePlanoConta(planoContaRaw: any): { left: string; right: string } {
  const planoConta = String(planoContaRaw ?? "").trim();
  if (!planoConta) return { left: "", right: "" };

  const match = planoConta.match(/^(.*?)\s*-\s*(.*)$/);
  if (!match) {
    return { left: planoConta, right: "" };
  }

  return {
    left: String(match[1] ?? "").trim(),
    right: String(match[2] ?? "").trim(),
  };
}

function planoCombina(
  planoContaRaw: any,
  planoNomeSelecionado: string,
): boolean {
  const { left, right } = parsePlanoConta(planoContaRaw);
  const planoNorm = normalizeText(planoNomeSelecionado);
  const rightNorm = normalizeText(right);
  const leftNorm = normalizeText(left);
  const fullNorm = normalizeText(planoContaRaw);

  if (rightNorm && rightNorm.includes(planoNorm)) return true;
  if (fullNorm.includes(planoNorm)) return true;

  // Quando o plano_conta vem sem " - " (ex: Venda), permite aparecer.
  if (!rightNorm && leftNorm) return true;

  // Caso comum de receita sem separador no plano_conta
  if (leftNorm === "venda" && normalizeText(planoNomeSelecionado) === "venda") {
    return true;
  }

  return false;
}

function despesaCombinaLancamento(
  despesa: DespesaCategoria,
  tokensLancados: Set<string>,
): boolean {
  const nomeNorm = normalizeText(despesa.nome);
  const idNorm = normalizeText(despesa.id);
  const nomeCompact = normalizeCompact(despesa.nome);

  if (tokensLancados.has(nomeNorm)) return true;
  if (tokensLancados.has(idNorm)) return true;
  if (tokensLancados.has(nomeCompact)) return true;

  for (const token of tokensLancados) {
    if (!token) continue;
    if (nomeNorm.includes(token) || token.includes(nomeNorm)) return true;
    if (nomeCompact.includes(token) || token.includes(nomeCompact)) return true;
    if (idNorm && (idNorm === token || token.includes(idNorm))) return true;
  }

  return false;
}

function inferirCategoriasPorTexto(textoRaw: any): string[] {
  const texto = normalizeText(textoRaw);
  if (!texto) return [];

  const categorias: string[] = [];

  if (/folha|salario|holerite|pro-?labore|fgts|inss/.test(texto)) {
    categorias.push("Folha de pagamento");
  }

  if (
    /impost|tribut|iptu|darf|das\b|icms|iss\b|pis\b|cofins|simples nacional/.test(
      texto,
    )
  ) {
    categorias.push("Impostos");
  }

  if (/\biptu\b/.test(texto)) {
    categorias.push("IPTU");
  }

  if (/guia.*arrecad|arrecadacao|arrecada\w*/.test(texto)) {
    categorias.push("Guia de arrecadacao");
  }

  if (/aluguel/.test(texto)) {
    categorias.push("Aluguel");
  }

  if (/venda/.test(texto)) {
    categorias.push("Venda");
  }

  return categorias;
}

function extrairTermosDetectadosDeLista(textos: Iterable<string>): string[] {
  const termos = new Set<string>();

  for (const texto of textos) {
    inferirCategoriasPorTexto(texto).forEach((item) => termos.add(item));
  }

  const prioridade = [
    "Folha de pagamento",
    "Impostos",
    "IPTU",
    "Guia de arrecadacao",
    "Aluguel",
    "Venda",
  ];

  return prioridade.filter((item) => termos.has(item));
}

function classificarGrupoCustoPorTexto(textoRaw: any): GrupoCusto {
  const texto = normalizeText(textoRaw);
  if (!texto) return "Custo da obra";

  if (
    /folha|salario|holerite|pro-?labore|fgts|inss|guia.*arrecad|arrecadacao|iptu|aluguel/.test(
      texto,
    )
  ) {
    return "Custos fixos";
  }

  if (
    /elektro|energia|luz|brk|agua|esgoto|gasolina|diesel|combustivel|manutencao.*veicul|mecanica/.test(
      texto,
    )
  ) {
    return "Custos variaveis";
  }

  return "Custo da obra";
}

function classificarGrupoCusto(...textos: any[]): GrupoCusto {
  for (const texto of textos) {
    const grupo = classificarGrupoCustoPorTexto(texto);
    if (grupo !== "Custo da obra") return grupo;
  }

  return "Custo da obra";
}

function normalizarNomeDespesaAutomatica(nomeRaw: string): string {
  const nome = String(nomeRaw ?? "").trim();
  if (!nome) return "";

  if (normalizeText(nome) === normalizeText("folha de pagamento")) {
    return "Folha de pagamento";
  }
  if (normalizeText(nome) === normalizeText("guia de arrecadacao")) {
    return "Guia de arrecadacao";
  }
  if (normalizeText(nome) === normalizeText("aluguel")) {
    return "Aluguel";
  }
  if (normalizeText(nome) === normalizeText("iptu")) {
    return "IPTU";
  }
  if (normalizeText(nome) === normalizeText("elektro")) {
    return "Elektro";
  }
  if (normalizeText(nome) === normalizeText("brk")) {
    return "BRK";
  }
  if (normalizeText(nome) === normalizeText("gasolina")) {
    return "Gasolina";
  }
  if (normalizeText(nome) === normalizeText("diesel")) {
    return "Diesel";
  }
  if (/manutencao.*veicul/.test(normalizeText(nome))) {
    return "Manutencao de veiculo";
  }

  return nome;
}

function montarFiltrosAutomaticosPorNomes(
  nomes: Iterable<string>,
): FiltroSelecionado[] {
  const map = new Map<string, FiltroSelecionado>();

  function registrar(nomeRaw: string) {
    const nome = normalizarNomeDespesaAutomatica(nomeRaw);
    if (!nome) return;

    const grupo = classificarGrupoCusto(nome);
    const key = `auto-${normalizeCompact(nome)}-${normalizeCompact(grupo)}`;
    if (map.has(key)) return;

    map.set(key, {
      key,
      planoId: `auto-${normalizeCompact(grupo)}`,
      planoNome: grupo,
      despesaId: `auto-${normalizeCompact(nome)}`,
      despesaNome: nome,
    });
  }

  DESPESAS_CUSTO_FIXO.forEach(registrar);
  DESPESAS_CUSTO_VARIAVEL.forEach(registrar);
  Array.from(nomes).forEach(registrar);

  return Array.from(map.values()).sort((a, b) =>
    `${a.planoNome}-${a.despesaNome}`.localeCompare(
      `${b.planoNome}-${b.despesaNome}`,
      "pt-BR",
      { sensitivity: "base" },
    ),
  );
}

async function buscarDespesasComLancamentos(
  dataInicio: string,
  dataFim: string,
  planoNome?: string,
): Promise<{ tokens: Set<string>; nomes: Set<string> }> {
  const tokens = new Set<string>();
  const nomes = new Set<string>();
  const planoFiltro = normalizeText(planoNome ?? "");
  const filtrarPorPlano = planoFiltro !== "";

  const [pagarResponse, receberResponse, bancosResponse] = await Promise.all([
    api.get(`pagar/listar.php?data=${dataInicio}&data1=${dataFim}&status=all`),
    api.get(
      `receber/listar.php?data=${dataInicio}&data1=${dataFim}&status=all`,
    ),
    api.get("mov/listar_lanc.php"),
  ]);

  const pendenciasPagar = Array.isArray(pagarResponse?.data?.resultado)
    ? pagarResponse.data.resultado
    : [];
  const pendenciasReceber = Array.isArray(receberResponse?.data?.resultado)
    ? receberResponse.data.resultado
    : [];
  const bancos = Array.isArray(bancosResponse?.data?.resultado)
    ? bancosResponse.data.resultado
    : [];

  const detalhesPagar = await Promise.allSettled(
    pendenciasPagar.map((item: any) =>
      api.get(
        `pagar/listar_id.php?id=${encodeURIComponent(String(item?.id ?? ""))}`,
      ),
    ),
  );

  detalhesPagar.forEach((result) => {
    if (result.status !== "fulfilled") return;
    const dados = result.value?.data?.dados;
    const planoConta = String(dados?.plano ?? "").trim();
    const descricao = String(dados?.descricao ?? "").trim();
    if (filtrarPorPlano && !planoCombina(planoConta, String(planoNome ?? ""))) {
      return;
    }

    const { left } = parsePlanoConta(planoConta);
    if (left) {
      tokens.add(normalizeText(left));
      tokens.add(normalizeCompact(left));
      nomes.add(left);
    }

    inferirCategoriasPorTexto(`${planoConta} ${descricao}`).forEach((nome) => {
      tokens.add(normalizeText(nome));
      tokens.add(normalizeCompact(nome));
      nomes.add(nome);
    });
  });

  const detalhesReceber = await Promise.allSettled(
    pendenciasReceber.map((item: any) =>
      api.get(
        `receber/listar_id.php?id=${encodeURIComponent(String(item?.id ?? ""))}`,
      ),
    ),
  );

  detalhesReceber.forEach((result) => {
    if (result.status !== "fulfilled") return;
    const dados = result.value?.data?.dados;
    const planoConta = String(dados?.plano ?? "").trim();
    const descricao = String(dados?.descricao ?? "").trim();
    if (filtrarPorPlano && !planoCombina(planoConta, String(planoNome ?? ""))) {
      return;
    }

    const { left } = parsePlanoConta(planoConta);
    if (left) {
      tokens.add(normalizeText(left));
      tokens.add(normalizeCompact(left));
      nomes.add(left);
    }

    inferirCategoriasPorTexto(`${planoConta} ${descricao}`).forEach((nome) => {
      tokens.add(normalizeText(nome));
      tokens.add(normalizeCompact(nome));
      nomes.add(nome);
    });
  });

  const movimentosPorBanco = await Promise.allSettled(
    bancos.map((item: any) =>
      api.get(
        `mov/listar.php?data=${dataInicio}&data1=${dataFim}&lanc=${encodeURIComponent(String(item?.nome ?? ""))}`,
      ),
    ),
  );

  movimentosPorBanco.forEach((result) => {
    if (result.status !== "fulfilled") return;

    const movimentos = Array.isArray(result.value?.data?.resultado)
      ? result.value.data.resultado
      : [];

    movimentos.forEach((item: any) => {
      const planoConta = String(item?.plano_conta ?? "").trim();
      const descricao = String(item?.descricao ?? "").trim();
      if (
        filtrarPorPlano &&
        !planoCombina(planoConta, String(planoNome ?? ""))
      ) {
        return;
      }

      const { left } = parsePlanoConta(planoConta);
      if (left) {
        tokens.add(normalizeText(left));
        tokens.add(normalizeCompact(left));
        nomes.add(left);
      }

      inferirCategoriasPorTexto(`${planoConta} ${descricao}`).forEach(
        (nome) => {
          tokens.add(normalizeText(nome));
          tokens.add(normalizeCompact(nome));
          nomes.add(nome);
        },
      );
    });
  });

  return { tokens, nomes };
}

async function buscarDespesasLancadasDireto(
  dataInicio: string,
  dataFim: string,
): Promise<DespesaLancadaPeriodo[]> {
  const endpoints = [
    "lancamentos_custos/despesas_lancadas_periodo.php",
    "despesas_lancadas_periodo.php",
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await api.post(endpoint, {
        dataInicio,
        dataFim,
      });

      if (response?.data?.success && Array.isArray(response?.data?.resultado)) {
        return response.data.resultado.map((item: any) => ({
          nome: String(item?.nome ?? "").trim(),
          plano: String(item?.plano ?? "").trim(),
          plano_conta: String(item?.plano_conta ?? "").trim(),
        }));
      }
    } catch {
      // tenta proximo endpoint
    }
  }

  return [];
}

function findFiltroByPlanoConta(
  planoContaRaw: string,
  descricaoRaw: string,
  filtros: FiltroSelecionado[],
): {
  filtroLabel: string;
  planoConta: string;
} | null {
  const planoConta = String(planoContaRaw ?? "").trim();
  const descricao = String(descricaoRaw ?? "").trim();
  const textoBase = `${planoConta} ${descricao}`.trim();
  if (!textoBase) return null;

  const planoContaNorm = normalizeText(planoConta);
  const planoContaCompact = normalizeCompact(planoConta);
  const categoriasInferidas = inferirCategoriasPorTexto(textoBase).map((item) =>
    normalizeText(item),
  );
  const textoBaseNorm = normalizeText(textoBase);

  for (const item of filtros) {
    const planoNome = String(item.planoNome ?? "").trim();
    const despesaId = String(item.despesaId ?? "").trim();
    const despesaNome = String(item.despesaNome ?? "").trim();

    const aliasById = normalizeText(`${despesaId} - ${planoNome}`);
    const aliasByNome = normalizeText(`${despesaNome} - ${planoNome}`);
    const aliasByIdCompact = normalizeCompact(`${despesaId}-${planoNome}`);
    const aliasByNomeCompact = normalizeCompact(`${despesaNome}-${planoNome}`);

    if (
      planoContaNorm === aliasById ||
      planoContaNorm === aliasByNome ||
      planoContaCompact === aliasByIdCompact ||
      planoContaCompact === aliasByNomeCompact
    ) {
      return {
        filtroLabel: `${planoNome} / ${despesaNome}`,
        planoConta: `${despesaNome || despesaId} - ${planoNome}`,
      };
    }

    const planoNomeNorm = normalizeText(planoNome);
    const despesaNomeNorm = normalizeText(despesaNome);

    if (
      planoNomeNorm &&
      despesaNomeNorm &&
      planoContaNorm.includes(planoNomeNorm) &&
      planoContaNorm.includes(despesaNomeNorm)
    ) {
      return {
        filtroLabel: `${planoNome} / ${despesaNome}`,
        planoConta: `${despesaNome || despesaId} - ${planoNome}`,
      };
    }

    if (
      despesaNomeNorm === "venda" &&
      (planoContaNorm === "venda" || planoContaNorm.includes("venda"))
    ) {
      return {
        filtroLabel: `${planoNome} / ${despesaNome}`,
        planoConta: `${despesaNome || despesaId} - ${planoNome}`,
      };
    }

    if (
      despesaNomeNorm &&
      (textoBaseNorm === despesaNomeNorm ||
        textoBaseNorm.includes(despesaNomeNorm) ||
        despesaNomeNorm.includes(textoBaseNorm))
    ) {
      return {
        filtroLabel: `${planoNome} / ${despesaNome}`,
        planoConta: `${despesaNome || despesaId} - ${planoNome}`,
      };
    }

    if (
      despesaNomeNorm &&
      categoriasInferidas.some(
        (categoriaNorm) =>
          categoriaNorm === despesaNomeNorm ||
          categoriaNorm.includes(despesaNomeNorm) ||
          despesaNomeNorm.includes(categoriaNorm),
      )
    ) {
      return {
        filtroLabel: `${planoNome} / ${despesaNome}`,
        planoConta: `${despesaNome || despesaId} - ${planoNome}`,
      };
    }
  }

  return null;
}

function movimentoEhPagar(movimentoRaw: any): boolean {
  const mov = normalizeText(movimentoRaw);
  return mov.includes("conta") && mov.includes("pagar");
}

function movimentoEhReceber(movimentoRaw: any): boolean {
  const mov = normalizeText(movimentoRaw);
  return mov.includes("conta") && mov.includes("receber");
}

function statusEhPendente(statusRaw: any): boolean {
  const status = normalizeText(statusRaw);
  return status.startsWith("pendente");
}

function extrairLocal(...itens: any[]): string {
  for (const item of itens) {
    const local = String(item?.local ?? "").trim();
    if (local) return local;
  }

  return "";
}

function localCombina(localRaw: any, localSelecionado: string): boolean {
  if (!localSelecionado || localSelecionado === LOCAL_TODOS) return true;

  const localRegistro = normalizeText(localRaw);
  const localFiltro = normalizeText(localSelecionado);
  if (!localFiltro) return true;
  if (!localRegistro) return false;

  return (
    localRegistro === localFiltro ||
    localRegistro.includes(localFiltro) ||
    localFiltro.includes(localRegistro)
  );
}

function sortMovimentosDesc(itens: MovimentoResumo[]): MovimentoResumo[] {
  function sortable(value: string) {
    const text = String(value ?? "").trim();

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
      const [dia, mes, ano] = text.split("/");
      return `${ano}-${mes}-${dia}`;
    }

    return text;
  }

  return [...itens].sort((a, b) =>
    sortable(b.vencimento).localeCompare(sortable(a.vencimento)),
  );
}

function aplicarGrupoCustoNosItens(
  itens: MovimentoResumo[],
): MovimentoResumo[] {
  return itens.map((item) => ({
    ...item,
    grupoCusto: classificarGrupoCusto(
      item.grupoCusto,
      item.filtroLabel,
      item.planoConta,
      item.descricao,
    ),
  }));
}

async function buscarResumoPorApisLegadas(
  dataInicio: string,
  dataFim: string,
  filtros: FiltroSelecionado[],
  localSelecionado: string,
): Promise<ResumoPeriodo> {
  const resumo = resumoVazio();
  const itens: MovimentoResumo[] = [];

  const [pagarResponse, receberResponse, bancosResponse] = await Promise.all([
    api.get(`pagar/listar.php?data=${dataInicio}&data1=${dataFim}&status=all`),
    api.get(
      `receber/listar.php?data=${dataInicio}&data1=${dataFim}&status=all`,
    ),
    api.get("mov/listar_lanc.php"),
  ]);

  const pendenciasPagar = Array.isArray(pagarResponse?.data?.resultado)
    ? pagarResponse.data.resultado
    : [];
  const pendenciasReceber = Array.isArray(receberResponse?.data?.resultado)
    ? receberResponse.data.resultado
    : [];
  const bancos = Array.isArray(bancosResponse?.data?.resultado)
    ? bancosResponse.data.resultado
    : [];

  const detalhesPagar = await Promise.allSettled(
    pendenciasPagar.map((item: any) =>
      api.get(
        `pagar/listar_id.php?id=${encodeURIComponent(String(item.id ?? ""))}`,
      ),
    ),
  );

  detalhesPagar.forEach((result, index) => {
    if (result.status !== "fulfilled") return;

    const dados = result.value?.data?.dados;
    const localRegistro = extrairLocal(dados, pendenciasPagar[index]);
    if (!localCombina(localRegistro, localSelecionado)) return;

    const planoConta = String(dados?.plano ?? "").trim();
    const descricao = String(dados?.descricao ?? "").trim();
    const filtro = findFiltroByPlanoConta(planoConta, descricao, filtros);
    if (!filtro) return;

    const valor = parseAmount(dados?.subtotal ?? dados?.valor);
    const pendente = statusEhPendente(dados?.status);
    if (pendente) {
      resumo.aPagar += valor;
    } else {
      resumo.pago += valor;
    }
    itens.push({
      id: `pagar-pendente-${dados?.id ?? pendenciasPagar[index]?.id ?? index}`,
      fonte: "pagar",
      descricao: String(
        dados?.descricao ??
          pendenciasPagar[index]?.descricao ??
          "Conta a pagar",
      ),
      valor,
      vencimento: String(
        dados?.vencF ??
          dados?.vencimento ??
          pendenciasPagar[index]?.vencimento ??
          "",
      ),
      statusLabel: pendente ? "A pagar" : "Pago",
      planoConta: planoConta || filtro.planoConta,
      filtroLabel: filtro.filtroLabel,
      local: localRegistro,
      grupoCusto: classificarGrupoCusto(
        filtro.filtroLabel,
        filtro.planoConta,
        planoConta,
        descricao,
      ),
    });
  });

  const detalhesReceber = await Promise.allSettled(
    pendenciasReceber.map((item: any) =>
      api.get(
        `receber/listar_id.php?id=${encodeURIComponent(String(item.id ?? ""))}`,
      ),
    ),
  );

  detalhesReceber.forEach((result, index) => {
    if (result.status !== "fulfilled") return;

    const dados = result.value?.data?.dados;
    const localRegistro = extrairLocal(dados, pendenciasReceber[index]);
    if (!localCombina(localRegistro, localSelecionado)) return;

    const planoConta = String(dados?.plano ?? "").trim();
    const descricao = String(dados?.descricao ?? "").trim();
    const filtro = findFiltroByPlanoConta(planoConta, descricao, filtros);
    if (!filtro) return;

    const valor = parseAmount(dados?.subtotal ?? dados?.valor);
    const pendente = statusEhPendente(dados?.status);
    if (pendente) {
      resumo.aReceber += valor;
    } else {
      resumo.recebido += valor;
    }
    itens.push({
      id: `receber-pendente-${dados?.id ?? pendenciasReceber[index]?.id ?? index}`,
      fonte: "receber",
      descricao: String(
        dados?.descricao ??
          pendenciasReceber[index]?.descricao ??
          "Conta a receber",
      ),
      valor,
      vencimento: String(
        dados?.vencF ??
          dados?.vencimento ??
          pendenciasReceber[index]?.vencimento ??
          "",
      ),
      statusLabel: pendente ? "A receber" : "Recebido",
      planoConta: planoConta || filtro.planoConta,
      filtroLabel: filtro.filtroLabel,
      local: localRegistro,
      grupoCusto: classificarGrupoCusto(
        filtro.filtroLabel,
        filtro.planoConta,
        planoConta,
        descricao,
      ),
    });
  });

  const movimentosPorBanco = await Promise.allSettled(
    bancos.map((item: any) =>
      api.get(
        `mov/listar.php?data=${dataInicio}&data1=${dataFim}&lanc=${encodeURIComponent(String(item?.nome ?? ""))}`,
      ),
    ),
  );

  movimentosPorBanco.forEach((result) => {
    if (result.status !== "fulfilled") return;

    const movimentos = Array.isArray(result.value?.data?.resultado)
      ? result.value.data.resultado
      : [];

    movimentos.forEach((item: any) => {
      const localRegistro = extrairLocal(item);
      if (!localCombina(localRegistro, localSelecionado)) return;

      const planoConta = String(item?.plano_conta ?? "").trim();
      const descricao = String(item?.descricao ?? "").trim();
      const filtro = findFiltroByPlanoConta(planoConta, descricao, filtros);
      if (!filtro) return;

      const movimento = normalizeText(item?.movimento);
      const valor = parseAmount(item?.valor);

      if (movimentoEhPagar(movimento)) {
        resumo.pago += valor;
        itens.push({
          id: `pagar-pago-${item?.id ?? Math.random()}`,
          fonte: "pagar",
          descricao: String(item?.descricao ?? "Conta a pagar"),
          valor,
          vencimento: String(item?.data ?? ""),
          statusLabel: "Pago",
          planoConta,
          filtroLabel: filtro.filtroLabel,
          local: localRegistro,
          grupoCusto: classificarGrupoCusto(
            filtro.filtroLabel,
            filtro.planoConta,
            planoConta,
            descricao,
          ),
        });
      }

      if (movimentoEhReceber(movimento)) {
        resumo.recebido += valor;
        itens.push({
          id: `receber-pago-${item?.id ?? Math.random()}`,
          fonte: "receber",
          descricao: String(item?.descricao ?? "Conta a receber"),
          valor,
          vencimento: String(item?.data ?? ""),
          statusLabel: "Recebido",
          planoConta,
          filtroLabel: filtro.filtroLabel,
          local: localRegistro,
          grupoCusto: classificarGrupoCusto(
            filtro.filtroLabel,
            filtro.planoConta,
            planoConta,
            descricao,
          ),
        });
      }
    });
  });

  resumo.resultadoProjetado =
    resumo.recebido + resumo.aReceber - resumo.pago - resumo.aPagar;
  resumo.itens = sortMovimentosDesc(aplicarGrupoCustoNosItens(itens));

  return resumo;
}

function buscarFiltroPorTexto(
  planoContaRaw: any,
  descricaoRaw: any,
  filtros: FiltroSelecionado[],
): { filtroLabel: string; planoConta: string } | null {
  const planoConta = String(planoContaRaw ?? "").trim();
  const descricao = String(descricaoRaw ?? "").trim();
  const base = `${planoConta} ${descricao}`.trim();
  if (!base) return null;

  const baseNorm = normalizeText(base);
  const categoriasInferidas = inferirCategoriasPorTexto(base).map((item) =>
    normalizeText(item),
  );

  for (const item of filtros) {
    const despesaNome = String(item.despesaNome ?? "").trim();
    const despesaNorm = normalizeText(despesaNome);
    if (!despesaNorm) continue;

    if (
      baseNorm.includes(despesaNorm) ||
      despesaNorm.includes(baseNorm) ||
      categoriasInferidas.some(
        (cat) =>
          cat === despesaNorm ||
          cat.includes(despesaNorm) ||
          despesaNorm.includes(cat),
      )
    ) {
      return {
        filtroLabel: `${item.planoNome} / ${item.despesaNome}`,
        planoConta: planoConta || `${item.despesaNome} - ${item.planoNome}`,
      };
    }
  }

  return null;
}

async function buscarResumoPorDescricaoAproximada(
  dataInicio: string,
  dataFim: string,
  filtros: FiltroSelecionado[],
  localSelecionado: string,
): Promise<ResumoPeriodo> {
  const resumo = resumoVazio();
  const itens: MovimentoResumo[] = [];

  const [pagarResponse, receberResponse, bancosResponse] = await Promise.all([
    api.get(`pagar/listar.php?data=${dataInicio}&data1=${dataFim}&status=all`),
    api.get(
      `receber/listar.php?data=${dataInicio}&data1=${dataFim}&status=all`,
    ),
    api.get("mov/listar_lanc.php"),
  ]);

  const pendenciasPagar = Array.isArray(pagarResponse?.data?.resultado)
    ? pagarResponse.data.resultado
    : [];
  const pendenciasReceber = Array.isArray(receberResponse?.data?.resultado)
    ? receberResponse.data.resultado
    : [];
  const bancos = Array.isArray(bancosResponse?.data?.resultado)
    ? bancosResponse.data.resultado
    : [];

  const detalhesPagar = await Promise.allSettled(
    pendenciasPagar.map((item: any) =>
      api.get(
        `pagar/listar_id.php?id=${encodeURIComponent(String(item.id ?? ""))}`,
      ),
    ),
  );

  detalhesPagar.forEach((result, index) => {
    if (result.status !== "fulfilled") return;
    const dados = result.value?.data?.dados;
    const localRegistro = extrairLocal(dados, pendenciasPagar[index]);
    if (!localCombina(localRegistro, localSelecionado)) return;

    const planoConta = String(dados?.plano ?? "").trim();
    const descricao = String(dados?.descricao ?? "").trim();
    const filtro = buscarFiltroPorTexto(planoConta, descricao, filtros);
    if (!filtro) return;

    const valor = parseAmount(dados?.subtotal ?? dados?.valor);
    const pendente = statusEhPendente(dados?.status);
    if (pendente) {
      resumo.aPagar += valor;
    } else {
      resumo.pago += valor;
    }
    itens.push({
      id: `pagar-aprox-${dados?.id ?? pendenciasPagar[index]?.id ?? index}`,
      fonte: "pagar",
      descricao: descricao || "Conta a pagar",
      valor,
      vencimento: String(
        dados?.vencF ??
          dados?.vencimento ??
          pendenciasPagar[index]?.vencimento ??
          "",
      ),
      statusLabel: pendente ? "A pagar" : "Pago",
      planoConta: planoConta || filtro.planoConta,
      filtroLabel: `${filtro.filtroLabel} (aprox)`,
      local: localRegistro,
      grupoCusto: classificarGrupoCusto(
        filtro.filtroLabel,
        filtro.planoConta,
        planoConta,
        descricao,
      ),
    });
  });

  const detalhesReceber = await Promise.allSettled(
    pendenciasReceber.map((item: any) =>
      api.get(
        `receber/listar_id.php?id=${encodeURIComponent(String(item.id ?? ""))}`,
      ),
    ),
  );

  detalhesReceber.forEach((result, index) => {
    if (result.status !== "fulfilled") return;
    const dados = result.value?.data?.dados;
    const localRegistro = extrairLocal(dados, pendenciasReceber[index]);
    if (!localCombina(localRegistro, localSelecionado)) return;

    const planoConta = String(dados?.plano ?? "").trim();
    const descricao = String(dados?.descricao ?? "").trim();
    const filtro = buscarFiltroPorTexto(planoConta, descricao, filtros);
    if (!filtro) return;

    const valor = parseAmount(dados?.subtotal ?? dados?.valor);
    const pendente = statusEhPendente(dados?.status);
    if (pendente) {
      resumo.aReceber += valor;
    } else {
      resumo.recebido += valor;
    }
    itens.push({
      id: `receber-aprox-${dados?.id ?? pendenciasReceber[index]?.id ?? index}`,
      fonte: "receber",
      descricao: descricao || "Conta a receber",
      valor,
      vencimento: String(
        dados?.vencF ??
          dados?.vencimento ??
          pendenciasReceber[index]?.vencimento ??
          "",
      ),
      statusLabel: pendente ? "A receber" : "Recebido",
      planoConta: planoConta || filtro.planoConta,
      filtroLabel: `${filtro.filtroLabel} (aprox)`,
      local: localRegistro,
      grupoCusto: classificarGrupoCusto(
        filtro.filtroLabel,
        filtro.planoConta,
        planoConta,
        descricao,
      ),
    });
  });

  const movimentosPorBanco = await Promise.allSettled(
    bancos.map((item: any) =>
      api.get(
        `mov/listar.php?data=${dataInicio}&data1=${dataFim}&lanc=${encodeURIComponent(String(item?.nome ?? ""))}`,
      ),
    ),
  );

  movimentosPorBanco.forEach((result) => {
    if (result.status !== "fulfilled") return;
    const movimentos = Array.isArray(result.value?.data?.resultado)
      ? result.value.data.resultado
      : [];

    movimentos.forEach((item: any) => {
      const localRegistro = extrairLocal(item);
      if (!localCombina(localRegistro, localSelecionado)) return;

      const planoConta = String(item?.plano_conta ?? "").trim();
      const descricao = String(item?.descricao ?? "").trim();
      const filtro = buscarFiltroPorTexto(planoConta, descricao, filtros);
      if (!filtro) return;

      const valor = parseAmount(item?.valor);
      const movimento = String(item?.movimento ?? "");

      if (movimentoEhPagar(movimento)) {
        resumo.pago += valor;
        itens.push({
          id: `pagar-aprox-mov-${item?.id ?? Math.random()}`,
          fonte: "pagar",
          descricao: descricao || "Conta a pagar",
          valor,
          vencimento: String(item?.data ?? ""),
          statusLabel: "Pago",
          planoConta: planoConta || filtro.planoConta,
          filtroLabel: `${filtro.filtroLabel} (aprox)`,
          local: localRegistro,
          grupoCusto: classificarGrupoCusto(
            filtro.filtroLabel,
            filtro.planoConta,
            planoConta,
            descricao,
          ),
        });
      }

      if (movimentoEhReceber(movimento)) {
        resumo.recebido += valor;
        itens.push({
          id: `receber-aprox-mov-${item?.id ?? Math.random()}`,
          fonte: "receber",
          descricao: descricao || "Conta a receber",
          valor,
          vencimento: String(item?.data ?? ""),
          statusLabel: "Recebido",
          planoConta: planoConta || filtro.planoConta,
          filtroLabel: `${filtro.filtroLabel} (aprox)`,
          local: localRegistro,
          grupoCusto: classificarGrupoCusto(
            filtro.filtroLabel,
            filtro.planoConta,
            planoConta,
            descricao,
          ),
        });
      }
    });
  });

  resumo.resultadoProjetado =
    resumo.recebido + resumo.aReceber - resumo.pago - resumo.aPagar;
  resumo.itens = sortMovimentosDesc(aplicarGrupoCustoNosItens(itens));

  return resumo;
}

export default function LancamentosCustos() {
  const navigation: any = useNavigation();

  const [categoriasPlano, setCategoriasPlano] = useState<CategoriaPlano[]>([]);
  const [listaDespesas, setListaDespesas] = useState<DespesaCategoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [despesaSelecionada, setDespesaSelecionada] = useState("");
  const [filtrosSelecionados, setFiltrosSelecionados] = useState<
    FiltroSelecionado[]
  >([]);
  const [dataInicio, setDataInicio] = useState<Date>(new Date());
  const [dataFim, setDataFim] = useState<Date>(new Date());
  const [pickerAberto, setPickerAberto] = useState<"inicio" | "fim" | null>(
    null,
  );
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [loadingDespesas, setLoadingDespesas] = useState(false);
  const [loadingResumo, setLoadingResumo] = useState(false);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
  const [resumo, setResumo] = useState<ResumoPeriodo>(resumoVazio());
  const [statusBusca, setStatusBusca] = useState("");
  const [statusDespesas, setStatusDespesas] = useState("");
  const [termosDetectados, setTermosDetectados] = useState<string[]>([]);
  const [locaisDisponiveis, setLocaisDisponiveis] = useState<string[]>([]);
  const [localSelecionado, setLocalSelecionado] = useState<string>(LOCAL_TODOS);
  const [loadingLocais, setLoadingLocais] = useState(false);

  useEffect(() => {
    async function restoreSavedState() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setRestoredFromStorage(true);
          return;
        }

        const parsed = JSON.parse(raw) as PersistedState;
        setCategoriaSelecionada(String(parsed?.categoriaSelecionada ?? ""));
        setDespesaSelecionada(String(parsed?.despesaSelecionada ?? ""));

        if (Array.isArray(parsed?.filtrosSelecionados)) {
          setFiltrosSelecionados(parsed.filtrosSelecionados);
        }

        if (parsed?.dataInicio) setDataInicio(new Date(parsed.dataInicio));
        if (parsed?.dataFim) setDataFim(new Date(parsed.dataFim));
        if (parsed?.localSelecionado) {
          setLocalSelecionado(String(parsed.localSelecionado));
        }
      } catch (error) {
        console.log("Erro ao restaurar filtros da tela", error);
      } finally {
        setRestoredFromStorage(true);
      }
    }

    restoreSavedState();
  }, []);

  useEffect(() => {
    if (!restoredFromStorage) return;

    const payload: PersistedState = {
      categoriaSelecionada,
      despesaSelecionada,
      filtrosSelecionados,
      dataInicio: dataInicio.toISOString(),
      dataFim: dataFim.toISOString(),
      localSelecionado,
    };

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(
      (error) => {
        console.log("Erro ao salvar filtros da tela", error);
      },
    );
  }, [
    categoriaSelecionada,
    despesaSelecionada,
    filtrosSelecionados,
    dataInicio,
    dataFim,
    localSelecionado,
    restoredFromStorage,
  ]);

  useEffect(() => {
    async function carregarLocais() {
      try {
        setLoadingLocais(true);

        const dataInicioFormatada = format(dataInicio, "yyyy-MM-dd");
        const dataFimFormatada = format(dataFim, "yyyy-MM-dd");

        const [respPagar, respReceber] = await Promise.all([
          api.get(
            `pagar/listar.php?data=${dataInicioFormatada}&data1=${dataFimFormatada}&status=all`,
          ),
          api.get(
            `receber/listar.php?data=${dataInicioFormatada}&data1=${dataFimFormatada}&status=all`,
          ),
        ]);

        const pagar = Array.isArray(respPagar?.data?.resultado)
          ? respPagar.data.resultado
          : [];
        const receber = Array.isArray(respReceber?.data?.resultado)
          ? respReceber.data.resultado
          : [];

        const setLocais = new Set<string>();
        [...pagar, ...receber].forEach((item: any) => {
          const local = String(item?.local ?? "").trim();
          if (local) setLocais.add(local);
        });

        const locais = Array.from(setLocais).sort((a, b) =>
          a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
        );

        setLocaisDisponiveis(locais);
        setLocalSelecionado((prev) => {
          if (prev === LOCAL_TODOS) return prev;
          return locais.some((item) => item === prev) ? prev : LOCAL_TODOS;
        });
      } catch (error) {
        console.log("Erro ao carregar locais do periodo", error);
        setLocaisDisponiveis([]);
      } finally {
        setLoadingLocais(false);
      }
    }

    carregarLocais();
  }, [dataInicio, dataFim]);

  useEffect(() => {
    async function carregarCategorias() {
      try {
        setLoadingCategorias(true);
        const response = await api.get("pagar/listar_plano.php");
        const raw = response?.data?.resultado ?? [];
        const arr = Array.isArray(raw) ? raw : [];

        const categorias = arr
          .map((item: any) => ({
            id: String(item?.id ?? item?.nome ?? "").trim(),
            nome: String(item?.nome ?? "").trim(),
          }))
          .filter((item) => item.id && item.nome)
          .sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
          );

        setCategoriasPlano(categorias);

        if (categorias.length > 0) {
          setCategoriaSelecionada((prev) => {
            const encontrou = categorias.some((item) => item.id === prev);
            return encontrou ? prev : categorias[0].id;
          });
        }
      } catch (error) {
        console.log("Erro ao carregar planos de contas", error);
        Alert.alert("Erro", "Nao foi possivel carregar o plano de contas.");
      } finally {
        setLoadingCategorias(false);
      }
    }

    carregarCategorias();
  }, []);

  const categoriaSelecionadaObj = useMemo(
    () => categoriasPlano.find((item) => item.id === categoriaSelecionada),
    [categoriasPlano, categoriaSelecionada],
  );

  useEffect(() => {
    async function carregarDespesas() {
      if (!categoriaSelecionadaObj?.nome) {
        setListaDespesas([]);
        setDespesaSelecionada("");
        setStatusDespesas("");
        setTermosDetectados([]);
        return;
      }

      try {
        setLoadingDespesas(true);
        setStatusDespesas("");
        setTermosDetectados([]);

        const dataInicioFormatada = format(dataInicio, "yyyy-MM-dd");
        const dataFimFormatada = format(dataFim, "yyyy-MM-dd");

        const [respPagar, respReceber] = await Promise.allSettled([
          api.get(
            `pagar/listar_desp.php?plano=${encodeURIComponent(categoriaSelecionadaObj.nome)}&desp=`,
          ),
          api.get(
            `receber/listar_desp.php?plano=${encodeURIComponent(categoriaSelecionadaObj.nome)}&desp=`,
          ),
        ]);

        const rawPagar =
          respPagar.status === "fulfilled"
            ? (respPagar.value?.data?.resultado ?? [])
            : [];
        const rawReceber =
          respReceber.status === "fulfilled"
            ? (respReceber.value?.data?.resultado ?? [])
            : [];

        const despesas = uniqueDespesas(
          [
            ...(Array.isArray(rawPagar) ? rawPagar : []),
            ...(Array.isArray(rawReceber) ? rawReceber : []),
          ]
            .map((item: any) => ({
              id: String(item?.id ?? "").trim(),
              nome: String(item?.nome ?? item?.despesa ?? "").trim(),
            }))
            .filter((item) => item.id && item.nome),
        );

        const despesasDiretas = await buscarDespesasLancadasDireto(
          dataInicioFormatada,
          dataFimFormatada,
        );

        const planoSelecionadoNorm = normalizeText(
          categoriaSelecionadaObj.nome,
        );
        const diretasNoPlano = despesasDiretas.filter((item) => {
          const planoNorm = normalizeText(item.plano);

          if (!planoNorm) return true;
          if (planoNorm === planoSelecionadoNorm) return true;
          if (planoNorm.includes(planoSelecionadoNorm)) return true;
          if (planoSelecionadoNorm.includes(planoNorm)) return true;

          return false;
        });

        const termosGlobaisDiretos = extrairTermosDetectadosDeLista(
          despesasDiretas.map(
            (item) =>
              `${item.nome} ${item.plano ?? ""} ${item.plano_conta ?? ""}`,
          ),
        );

        if (diretasNoPlano.length > 0) {
          const termos = extrairTermosDetectadosDeLista(
            diretasNoPlano.map(
              (item) =>
                `${item.nome} ${item.plano ?? ""} ${item.plano_conta ?? ""}`,
            ),
          );

          const nomesSet = new Set(
            diretasNoPlano
              .map((item) => normalizeText(item.nome))
              .filter((item) => !!item),
          );

          const fromBase = despesas.filter((item) =>
            nomesSet.has(normalizeText(item.nome)),
          );

          const extras = diretasNoPlano
            .filter(
              (item) =>
                !fromBase.some(
                  (baseItem) =>
                    normalizeText(baseItem.nome) === normalizeText(item.nome),
                ),
            )
            .map((item) => ({
              id: `extra:${normalizeCompact(item.nome)}`,
              nome: item.nome,
            }));

          const termosComGlobais = Array.from(
            new Set([...termos, ...termosGlobaisDiretos]),
          );

          const extrasInferidos = termosComGlobais
            .filter(
              (nome) =>
                !fromBase.some(
                  (baseItem) =>
                    normalizeText(baseItem.nome) === normalizeText(nome),
                ) &&
                !extras.some(
                  (extra) => normalizeText(extra.nome) === normalizeText(nome),
                ),
            )
            .map((nome) => ({
              id: `infer:${normalizeCompact(nome)}`,
              nome,
            }));

          const despesasFinal = uniqueDespesas([
            ...fromBase,
            ...extras,
            ...extrasInferidos,
          ]);

          setListaDespesas(despesasFinal);
          setDespesaSelecionada((prev) => {
            const existe = despesasFinal.some((item) => item.id === prev);
            return existe ? prev : (despesasFinal[0]?.id ?? "");
          });
          setStatusDespesas(
            `Mostrando ${despesasFinal.length} despesa(s) com lancamentos no periodo.`,
          );
          setTermosDetectados(termosComGlobais);
          return;
        }

        let { tokens: tokensLancados, nomes: nomesLancados } =
          await buscarDespesasComLancamentos(
            dataInicioFormatada,
            dataFimFormatada,
            categoriaSelecionadaObj.nome,
          );

        const globalLancados = await buscarDespesasComLancamentos(
          dataInicioFormatada,
          dataFimFormatada,
          "",
        );

        const usouFallbackGlobal = nomesLancados.size === 0;

        globalLancados.tokens.forEach((token) => tokensLancados.add(token));
        globalLancados.nomes.forEach((nome) => nomesLancados.add(nome));

        const termosFallback = extrairTermosDetectadosDeLista(nomesLancados);

        if (usouFallbackGlobal) {
          setStatusDespesas(
            "Nao encontramos lancamentos para o plano selecionado. Exibindo despesas com lancamentos de todos os planos no periodo.",
          );
        }

        const despesasFiltradas = despesas.filter((item) =>
          despesaCombinaLancamento(item, tokensLancados),
        );

        const despesasComLancamentos =
          despesasFiltradas.length > 0 ? despesasFiltradas : despesas;

        const extras = Array.from(nomesLancados)
          .filter((nome) => {
            const nomeNorm = normalizeText(nome);
            return !despesasComLancamentos.some(
              (item) => normalizeText(item.nome) === nomeNorm,
            );
          })
          .map((nome) => ({
            id: `extra:${normalizeCompact(nome)}`,
            nome: String(nome).trim(),
          }));

        const despesasFinal = uniqueDespesas([
          ...despesasComLancamentos,
          ...extras,
        ]);

        const termosFinal =
          termosFallback.length > 0
            ? termosFallback
            : extrairTermosDetectadosDeLista(
                despesasFinal.map((item) => item.nome),
              );

        setListaDespesas(despesasFinal);
        setDespesaSelecionada((prev) => {
          const existe = despesasFinal.some((item) => item.id === prev);
          return existe ? prev : (despesasFinal[0]?.id ?? "");
        });

        if (despesasFinal.length > 0 && !usouFallbackGlobal) {
          setStatusDespesas(
            `Mostrando ${despesasFinal.length} despesa(s) com lancamentos no periodo.`,
          );
        } else if (despesasFinal.length === 0) {
          setStatusDespesas(
            "Nao encontramos lancamentos para este plano no periodo. Exibindo todas as despesas do plano.",
          );
        }
        setTermosDetectados(termosFinal);
      } catch (error) {
        console.log("Erro ao carregar despesas", error);
        setListaDespesas([]);
        setStatusDespesas("Falha ao consultar despesas com lancamentos.");
        setTermosDetectados([]);
      } finally {
        setLoadingDespesas(false);
      }
    }

    carregarDespesas();
  }, [categoriaSelecionadaObj, dataInicio, dataFim]);

  const despesaSelecionadaObj = useMemo(
    () => listaDespesas.find((item) => item.id === despesaSelecionada),
    [listaDespesas, despesaSelecionada],
  );

  function adicionarFiltro() {
    const plano = categoriaSelecionadaObj;
    const despesa = despesaSelecionadaObj;

    if (!plano || !despesa) {
      Alert.alert("Atencao", "Selecione um plano e uma despesa.");
      return;
    }

    const key = `${plano.id}-${despesa.id}`;
    setFiltrosSelecionados((prev) => {
      if (prev.some((item) => item.key === key)) return prev;

      return [
        ...prev,
        {
          key,
          planoId: plano.id,
          planoNome: plano.nome,
          despesaId: despesa.id,
          despesaNome: despesa.nome,
        },
      ];
    });
  }

  function removerFiltro(key: string) {
    setFiltrosSelecionados((prev) => prev.filter((item) => item.key !== key));
  }

  function limparFiltros() {
    setFiltrosSelecionados([]);
    setResumo(resumoVazio());
    setStatusBusca("");
  }

  async function buscarResumoAutomatico() {
    if (dataFim < dataInicio) {
      Alert.alert(
        "Atencao",
        "A data final precisa ser maior ou igual a data inicial.",
      );
      return;
    }

    try {
      setLoadingResumo(true);

      const dataInicioFormatada = format(dataInicio, "yyyy-MM-dd");
      const dataFimFormatada = format(dataFim, "yyyy-MM-dd");

      let filtrosParaBusca = filtrosSelecionados;
      let gerouFiltrosAutomaticos = false;

      if (filtrosParaBusca.length === 0) {
        const lancamentosPeriodo = await buscarDespesasComLancamentos(
          dataInicioFormatada,
          dataFimFormatada,
          "",
        );
        filtrosParaBusca = montarFiltrosAutomaticosPorNomes(
          lancamentosPeriodo.nomes,
        );

        if (filtrosParaBusca.length > 0) {
          gerouFiltrosAutomaticos = true;
          setFiltrosSelecionados(filtrosParaBusca);
        }
      }

      if (filtrosParaBusca.length === 0) {
        Alert.alert(
          "Atencao",
          "Nao foi possivel detectar despesas no periodo para classificar automaticamente.",
        );
        setStatusBusca(
          "Nenhuma despesa detectada para classificacao automatica.",
        );
        return;
      }

      const payload = {
        dataInicio: dataInicioFormatada,
        dataFim: dataFimFormatada,
        filtros: filtrosParaBusca,
        local: localSelecionado === LOCAL_TODOS ? "" : String(localSelecionado),
      };

      const endpoints = [
        "lancamentos_custos/resumo_periodo.php",
        "resumo_periodo.php",
      ];

      let resumoApi: ResumoPeriodo | null = null;

      for (const endpoint of endpoints) {
        try {
          const response = await api.post(endpoint, payload);

          if (response?.data?.success) {
            resumoApi = {
              aPagar: Number(response.data.aPagar ?? 0),
              pago: Number(response.data.pago ?? 0),
              aReceber: Number(response.data.aReceber ?? 0),
              recebido: Number(response.data.recebido ?? 0),
              resultadoProjetado: Number(response.data.resultadoProjetado ?? 0),
              itens: Array.isArray(response.data.itens)
                ? sortMovimentosDesc(
                    aplicarGrupoCustoNosItens(
                      response.data.itens.map((item: any) => ({
                        ...item,
                        grupoCusto: classificarGrupoCusto(
                          item?.filtroLabel,
                          item?.planoConta,
                          item?.descricao,
                        ),
                      })),
                    ),
                  )
                : [],
            };
            break;
          }
        } catch {
          // tenta o proximo endpoint
        }
      }

      if (resumoApi) {
        if (resumoApi.itens.length > 0) {
          setResumo(resumoApi);
          setStatusBusca(
            `Busca concluida com ${resumoApi.itens.length} movimento(s).`,
          );
          return;
        }
      }

      const resumoLegado = await buscarResumoPorApisLegadas(
        dataInicioFormatada,
        dataFimFormatada,
        filtrosParaBusca,
        localSelecionado,
      );

      if (resumoLegado.itens.length === 0) {
        const resumoAproximado = await buscarResumoPorDescricaoAproximada(
          dataInicioFormatada,
          dataFimFormatada,
          filtrosParaBusca,
          localSelecionado,
        );

        if (resumoAproximado.itens.length > 0) {
          setResumo(resumoAproximado);
          setStatusBusca(
            `${gerouFiltrosAutomaticos ? "Classificacao automatica aplicada. " : ""}Busca concluida com ${resumoAproximado.itens.length} movimento(s) por correspondencia aproximada.`,
          );
          return;
        }
      }

      setResumo(resumoLegado);

      if (resumoLegado.itens.length === 0) {
        setStatusBusca(
          "Busca concluida sem resultados para os filtros e periodo.",
        );
        Alert.alert(
          "Busca concluida",
          "Nenhum lancamento encontrado para as despesas selecionadas no periodo informado.",
        );
      } else {
        setStatusBusca(
          `${gerouFiltrosAutomaticos ? "Classificacao automatica aplicada. " : ""}Busca concluida com ${resumoLegado.itens.length} movimento(s).`,
        );
      }
    } catch (error) {
      console.log("Erro ao buscar resumo automatico", error);
      setStatusBusca("Falha ao buscar dados automaticos.");
      Alert.alert(
        "Erro",
        "Nao foi possivel buscar os dados automaticos de contas a pagar e receber.",
      );
    } finally {
      setLoadingResumo(false);
    }
  }

  async function imprimirRelatorio() {
    if (resumo.itens.length === 0) {
      Alert.alert(
        "Atencao",
        "Busque os movimentos antes de imprimir o relatorio.",
      );
      return;
    }

    const receitaBruta = resumo.recebido + resumo.aReceber;
    const custoObra = resumo.pago + resumo.aPagar;
    const lucroProjetado = receitaBruta - custoObra;
    const totalCustosFixos = resumo.itens
      .filter(
        (item) => item.fonte === "pagar" && item.grupoCusto === "Custos fixos",
      )
      .reduce((acc, item) => acc + item.valor, 0);
    const totalCustosVariaveis = resumo.itens
      .filter(
        (item) =>
          item.fonte === "pagar" && item.grupoCusto === "Custos variaveis",
      )
      .reduce((acc, item) => acc + item.valor, 0);
    const totalCustoObraDemais = resumo.itens
      .filter(
        (item) => item.fonte === "pagar" && item.grupoCusto === "Custo da obra",
      )
      .reduce((acc, item) => acc + item.valor, 0);

    const percentualReceitaBruta = receitaBruta > 0 ? 100 : 0;
    const percentualCustoObra =
      receitaBruta > 0 ? (custoObra / receitaBruta) * 100 : 0;
    const percentualCustosFixos =
      receitaBruta > 0 ? (totalCustosFixos / receitaBruta) * 100 : 0;
    const percentualCustosVariaveis =
      receitaBruta > 0 ? (totalCustosVariaveis / receitaBruta) * 100 : 0;
    const percentualCustoObraDemais =
      receitaBruta > 0 ? (totalCustoObraDemais / receitaBruta) * 100 : 0;
    const percentualLucroProjetado =
      receitaBruta > 0 ? (lucroProjetado / receitaBruta) * 100 : 0;

    try {
      const localLabel =
        localSelecionado === LOCAL_TODOS ? "Todos os locais" : localSelecionado;

      const itensHtml =
        resumo.itens.length === 0
          ? `<tr><td colspan="6" style="text-align:center;padding:10px;color:#64748b;">Nenhum movimento encontrado.</td></tr>`
          : resumo.itens
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(item.descricao)}</td>
                    <td>${escapeHtml(item.statusLabel)}</td>
                    <td>${escapeHtml(item.grupoCusto)}</td>
                    <td>${escapeHtml(item.local || "-")}</td>
                    <td>${escapeHtml(item.vencimento || "-")}</td>
                    <td style="text-align:right;">${escapeHtml(formatCurrency(item.valor))}</td>
                  </tr>
                `,
              )
              .join("");

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
              h1 { font-size: 20px; margin-bottom: 8px; }
              .meta { font-size: 12px; color: #475569; margin-bottom: 14px; }
              .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
              .label { font-size: 12px; color: #475569; }
              .value { font-size: 16px; font-weight: 700; color: #0f172a; }
              .pct { font-size: 12px; color: #64748b; margin-top: 3px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
              th { background: #f8fafc; text-align: left; }
            </style>
          </head>
          <body>
            <h1>Relatorio de custos e lucro da obra</h1>
            <div class="meta">Periodo: ${escapeHtml(format(dataInicio, "dd/MM/yyyy"))} ate ${escapeHtml(format(dataFim, "dd/MM/yyyy"))} | Local: ${escapeHtml(localLabel)}</div>

            <div class="box grid">
              <div>
                <div class="label">Receita bruta da obra</div>
                <div class="value">${escapeHtml(formatCurrency(receitaBruta))}</div>
                <div class="pct">${escapeHtml(formatPercent(percentualReceitaBruta))} da receita bruta</div>
              </div>
              <div>
                <div class="label">Custo da obra (total)</div>
                <div class="value">${escapeHtml(formatCurrency(custoObra))}</div>
                <div class="pct">${escapeHtml(formatPercent(percentualCustoObra))} da receita bruta</div>
              </div>
              <div>
                <div class="label">Custos fixos</div>
                <div class="value">${escapeHtml(formatCurrency(totalCustosFixos))}</div>
                <div class="pct">${escapeHtml(formatPercent(percentualCustosFixos))} da receita bruta</div>
              </div>
              <div>
                <div class="label">Custos variaveis</div>
                <div class="value">${escapeHtml(formatCurrency(totalCustosVariaveis))}</div>
                <div class="pct">${escapeHtml(formatPercent(percentualCustosVariaveis))} da receita bruta</div>
              </div>
              <div>
                <div class="label">Custo da obra (demais despesas)</div>
                <div class="value">${escapeHtml(formatCurrency(totalCustoObraDemais))}</div>
                <div class="pct">${escapeHtml(formatPercent(percentualCustoObraDemais))} da receita bruta</div>
              </div>
              <div>
                <div class="label">Lucro projetado da obra</div>
                <div class="value">${escapeHtml(formatCurrency(lucroProjetado))}</div>
                <div class="pct">${escapeHtml(formatPercent(percentualLucroProjetado))} da receita bruta</div>
              </div>
            </div>

            <div class="box">
              <strong>Movimentos encontrados</strong>
              <table>
                <thead>
                  <tr>
                    <th>Descricao</th>
                    <th>Status</th>
                    <th>Grupo</th>
                    <th>Local</th>
                    <th>Data</th>
                    <th style="text-align:right;">Valor</th>
                  </tr>
                </thead>
                <tbody>${itensHtml}</tbody>
              </table>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html,
        width: 595,
        height: 842,
        margins: { left: 20, top: 20, right: 20, bottom: 20 },
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Relatorio de custos e lucro da obra",
        });
      } else {
        await Print.printAsync({ uri });
      }
    } catch (error) {
      console.log("Erro ao imprimir relatorio", error);
      Alert.alert("Erro", "Nao foi possivel gerar o relatorio.");
    }
  }

  function fecharDatePicker() {
    setPickerAberto(null);
  }

  function onChangeData(tipo: "inicio" | "fim", event: any, selected?: Date) {
    if (event?.type === "dismissed") {
      fecharDatePicker();
      return;
    }

    if (selected) {
      if (tipo === "inicio") {
        setDataInicio(selected);
        if (selected > dataFim) setDataFim(selected);
      } else {
        setDataFim(selected);
      }

      if (Platform.OS !== "ios") {
        fecharDatePicker();
      }
    }
  }

  const receitaBrutaObra = resumo.recebido + resumo.aReceber;
  const custoObra = resumo.pago + resumo.aPagar;
  const totalCustosFixos = resumo.itens
    .filter(
      (item) => item.fonte === "pagar" && item.grupoCusto === "Custos fixos",
    )
    .reduce((acc, item) => acc + item.valor, 0);
  const totalCustosVariaveis = resumo.itens
    .filter(
      (item) =>
        item.fonte === "pagar" && item.grupoCusto === "Custos variaveis",
    )
    .reduce((acc, item) => acc + item.valor, 0);
  const totalCustoObraDemais = resumo.itens
    .filter(
      (item) => item.fonte === "pagar" && item.grupoCusto === "Custo da obra",
    )
    .reduce((acc, item) => acc + item.valor, 0);
  const percentualCustosFixos =
    receitaBrutaObra > 0 ? (totalCustosFixos / receitaBrutaObra) * 100 : 0;
  const percentualCustosVariaveis =
    receitaBrutaObra > 0 ? (totalCustosVariaveis / receitaBrutaObra) * 100 : 0;
  const percentualReceitaBruta = receitaBrutaObra > 0 ? 100 : 0;
  const percentualCustoObra =
    receitaBrutaObra > 0 ? (custoObra / receitaBrutaObra) * 100 : 0;
  const percentualCustoObraDemais =
    receitaBrutaObra > 0 ? (totalCustoObraDemais / receitaBrutaObra) * 100 : 0;
  const percentualLucroProjetado =
    receitaBrutaObra > 0
      ? (resumo.resultadoProjetado / receitaBrutaObra) * 100
      : 0;

  const filtrosAgrupados = useMemo(() => {
    const grupoOrdem: GrupoCusto[] = [
      "Custos fixos",
      "Custos variaveis",
      "Custo da obra",
    ];

    const porGrupo = new Map<GrupoCusto, FiltroSelecionado[]>();
    grupoOrdem.forEach((grupo) => porGrupo.set(grupo, []));

    filtrosSelecionados.forEach((item) => {
      const grupo = classificarGrupoCusto(item.planoNome, item.despesaNome);
      porGrupo.get(grupo)?.push(item);
    });

    return grupoOrdem
      .map((grupo) => ({
        grupo,
        itens: (porGrupo.get(grupo) ?? []).sort((a, b) =>
          a.despesaNome.localeCompare(b.despesaNome, "pt-BR", {
            sensitivity: "base",
          }),
        ),
      }))
      .filter((bloco) => bloco.itens.length > 0);
  }, [filtrosSelecionados]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flexOne}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={28} color="#111827" />
          </TouchableOpacity>
          <Image
            style={styles.logo}
            source={require("../../assets/logo2.png")}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroBadge}>Calculo Automatico</Text>
            <Text style={styles.heroTitle}>Lucro por periodo e despesas</Text>
            <Text style={styles.heroSubtitle}>
              Escolha as despesas no plano de contas e a tela busca no banco os
              dados de pagar e receber automaticamente.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Periodo</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setPickerAberto("inicio")}
              >
                <Text style={styles.dateLabel}>Data inicial</Text>
                <Text style={styles.dateValue}>
                  {format(dataInicio, "dd/MM/yyyy")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setPickerAberto("fim")}
              >
                <Text style={styles.dateLabel}>Data final</Text>
                <Text style={styles.dateValue}>
                  {format(dataFim, "dd/MM/yyyy")}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Local</Text>
            {loadingLocais ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#0f766e" />
                <Text style={styles.loadingText}>Carregando locais...</Text>
              </View>
            ) : (
              <SelectField
                label=""
                selectedValue={localSelecionado}
                onChange={(value) => setLocalSelecionado(String(value))}
                placeholder="Selecione o local"
                options={[
                  { label: "Todos os locais", value: LOCAL_TODOS },
                  ...locaisDisponiveis.map((item) => ({
                    label: item,
                    value: item,
                  })),
                ]}
                labelStyle={styles.hiddenLabel}
                containerStyle={styles.selectContainer}
              />
            )}

            {pickerAberto && (
              <View style={styles.pickerBox}>
                <DateTimePicker
                  value={pickerAberto === "inicio" ? dataInicio : dataFim}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  locale="pt-BR"
                  onChange={(event, selected) =>
                    onChangeData(pickerAberto, event, selected)
                  }
                />

                <TouchableOpacity
                  style={styles.pickerCloseButton}
                  onPress={fecharDatePicker}
                >
                  <Text style={styles.pickerCloseButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Despesas do calculo</Text>

            <Text style={styles.label}>Plano de contas</Text>
            {loadingCategorias ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#0f766e" />
                <Text style={styles.loadingText}>
                  Carregando plano de contas...
                </Text>
              </View>
            ) : (
              <SelectField
                label=""
                selectedValue={categoriaSelecionada}
                onChange={(value) => setCategoriaSelecionada(String(value))}
                placeholder="Selecione um plano"
                options={categoriasPlano.map((item) => ({
                  label: item.nome,
                  value: item.id,
                }))}
                labelStyle={styles.hiddenLabel}
                containerStyle={styles.selectContainer}
              />
            )}

            <Text style={styles.label}>Despesa</Text>
            {loadingDespesas ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#0f766e" />
                <Text style={styles.loadingText}>Carregando despesas...</Text>
              </View>
            ) : (
              <>
                <SelectField
                  label=""
                  selectedValue={despesaSelecionada}
                  onChange={(value) => setDespesaSelecionada(String(value))}
                  placeholder="Selecione uma despesa"
                  options={listaDespesas.map((item) => ({
                    label: item.nome,
                    value: item.id,
                  }))}
                  labelStyle={styles.hiddenLabel}
                  containerStyle={styles.selectContainer}
                />
                {!!statusDespesas && (
                  <Text style={styles.helperInfo}>{statusDespesas}</Text>
                )}

                <View style={styles.detectedTermsBox}>
                  <Text style={styles.detectedTermsTitle}>
                    Termos detectados no periodo
                  </Text>
                  {termosDetectados.length === 0 ? (
                    <Text style={styles.detectedTermsEmpty}>
                      Nenhum termo relevante detectado para o plano e periodo.
                    </Text>
                  ) : (
                    <View style={styles.detectedTermsWrap}>
                      {termosDetectados.map((termo) => (
                        <View key={termo} style={styles.detectedTermChip}>
                          <Text style={styles.detectedTermText}>{termo}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={adicionarFiltro}
              >
                <MaterialIcons name="add" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Adicionar despesa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={limparFiltros}
              >
                <Text style={styles.secondaryButtonText}>Limpar</Text>
              </TouchableOpacity>
            </View>

            {despesaSelecionadaObj && categoriaSelecionadaObj && (
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Selecionado agora</Text>
                <Text style={styles.previewText}>
                  {categoriaSelecionadaObj.nome} / {despesaSelecionadaObj.nome}
                </Text>
              </View>
            )}

            <View style={styles.chipsWrap}>
              {filtrosSelecionados.length === 0 ? (
                <Text style={styles.emptyText}>
                  Nenhuma despesa adicionada ao calculo.
                </Text>
              ) : (
                filtrosAgrupados.map((bloco) => (
                  <View key={bloco.grupo}>
                    <Text style={styles.groupedChipTitle}>{bloco.grupo}</Text>
                    {bloco.itens.map((item) => (
                      <View key={item.key} style={styles.filterChip}>
                        <View style={styles.filterChipTextBox}>
                          <Text style={styles.filterChipPlan}>
                            {item.planoNome}
                          </Text>
                          <Text style={styles.filterChipText}>
                            {item.despesaNome}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => removerFiltro(item.key)}
                        >
                          <MaterialIcons
                            name="close"
                            size={18}
                            color="#475569"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ))
              )}
            </View>

            <TouchableOpacity
              style={styles.autoButton}
              onPress={buscarResumoAutomatico}
              disabled={loadingResumo}
            >
              {loadingResumo ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="query-stats" size={20} color="#fff" />
              )}
              <Text style={styles.autoButtonText}>
                {loadingResumo
                  ? "Buscando no banco..."
                  : "Buscar dados automaticos"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Resumo automatico</Text>
            <Text style={styles.summaryHint}>
              Demais despesas entram como custo da obra. Lucro projetado =
              receita bruta - custo da obra.
            </Text>
            {!!statusBusca && (
              <Text style={styles.summaryStatus}>{statusBusca}</Text>
            )}

            <TouchableOpacity
              style={styles.printButton}
              onPress={imprimirRelatorio}
              disabled={loadingResumo}
            >
              <MaterialIcons name="print" size={18} color="#0f172a" />
              <Text style={styles.printButtonText}>Imprimir relatorio</Text>
            </TouchableOpacity>

            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, styles.metricIncomeCard]}>
                <Text style={styles.metricLabel}>Recebido</Text>
                <Text style={styles.metricValuePositive}>
                  {formatCurrency(resumo.recebido)}
                </Text>
              </View>

              <View style={[styles.metricCard, styles.metricIncomeCardLight]}>
                <Text style={styles.metricLabel}>A receber</Text>
                <Text style={styles.metricValueNeutral}>
                  {formatCurrency(resumo.aReceber)}
                </Text>
              </View>

              <View style={[styles.metricCard, styles.metricExpenseCardLight]}>
                <Text style={styles.metricLabel}>Pago</Text>
                <Text style={styles.metricValueNeutral}>
                  {formatCurrency(resumo.pago)}
                </Text>
              </View>

              <View style={[styles.metricCard, styles.metricExpenseCard]}>
                <Text style={styles.metricLabel}>A pagar</Text>
                <Text style={styles.metricValueNegative}>
                  {formatCurrency(resumo.aPagar)}
                </Text>
              </View>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Lucro projetado da obra</Text>
              <Text
                style={
                  resumo.resultadoProjetado >= 0
                    ? styles.resultValuePositive
                    : styles.resultValueNegative
                }
              >
                {formatCurrency(resumo.resultadoProjetado)}
              </Text>
              <Text style={styles.resultPercent}>
                {formatPercent(percentualLucroProjetado)} da receita bruta
              </Text>
            </View>

            <View style={styles.workSummaryRow}>
              <View style={styles.workSummaryCard}>
                <Text style={styles.workSummaryLabel}>
                  Receita bruta da obra
                </Text>
                <Text style={styles.workSummaryValuePositive}>
                  {formatCurrency(receitaBrutaObra)}
                </Text>
                <Text style={styles.workSummaryPercent}>
                  {formatPercent(percentualReceitaBruta)} da receita bruta
                </Text>
              </View>
              <View style={styles.workSummaryCard}>
                <Text style={styles.workSummaryLabel}>
                  Custo da obra (total)
                </Text>
                <Text style={styles.workSummaryValueNegative}>
                  {formatCurrency(custoObra)}
                </Text>
                <Text style={styles.workSummaryPercent}>
                  {formatPercent(percentualCustoObra)} da receita bruta
                </Text>
              </View>
            </View>

            <View style={styles.workSummaryRow}>
              <View style={styles.workSummaryCard}>
                <Text style={styles.workSummaryLabel}>Custos fixos</Text>
                <Text style={styles.workSummaryValueNegative}>
                  {formatCurrency(totalCustosFixos)}
                </Text>
                <Text style={styles.workSummaryPercent}>
                  {formatPercent(percentualCustosFixos)} da receita bruta
                </Text>
              </View>
              <View style={styles.workSummaryCard}>
                <Text style={styles.workSummaryLabel}>Custos variaveis</Text>
                <Text style={styles.workSummaryValueNegative}>
                  {formatCurrency(totalCustosVariaveis)}
                </Text>
                <Text style={styles.workSummaryPercent}>
                  {formatPercent(percentualCustosVariaveis)} da receita bruta
                </Text>
              </View>
            </View>
            <View style={styles.workSummaryRow}>
              <View style={styles.workSummaryCard}>
                <Text style={styles.workSummaryLabel}>
                  Custo da obra (outras despesas)
                </Text>
                <Text style={styles.workSummaryValueNegative}>
                  {formatCurrency(totalCustoObraDemais)}
                </Text>
                <Text style={styles.workSummaryPercent}>
                  {formatPercent(percentualCustoObraDemais)} da receita bruta
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Movimentos encontrados</Text>

            {loadingResumo ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#0f766e" />
                <Text style={styles.loadingText}>
                  Atualizando movimentos...
                </Text>
              </View>
            ) : resumo.itens.length === 0 ? (
              <Text style={styles.emptyText}>
                Nenhum movimento encontrado para o periodo e despesas
                selecionadas.
              </Text>
            ) : (
              resumo.itens.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemTexts}>
                    <Text style={styles.itemTitle}>{item.descricao}</Text>
                    <Text style={styles.itemSubtitle}>{item.filtroLabel}</Text>
                    <Text style={styles.itemSubtitle}>
                      Grupo: {item.grupoCusto}
                    </Text>
                    <Text style={styles.itemSubtitle}>{item.planoConta}</Text>
                    {!!item.local && (
                      <Text style={styles.itemSubtitle}>
                        Local: {item.local}
                      </Text>
                    )}
                    <Text style={styles.itemMeta}>
                      {item.statusLabel} • {item.vencimento}
                    </Text>
                  </View>

                  <View style={styles.itemValueBox}>
                    <Text style={styles.itemBadge}>
                      {item.fonte === "receber" ? "Receber" : "Pagar"}
                    </Text>
                    <Text style={styles.itemValue}>
                      {formatCurrency(item.valor)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
