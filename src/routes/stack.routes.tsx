import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { Splash } from "../lotties/Splash";
import Login from "../screens/Login";
import AuthRoutes from "./tab.routes";
import Pessoas from "../screens/Pessoas";
import Fornecedores from "../screens/Fornecedores";
import Usuarios from "../screens/Usuarios";
import NovoUsuario from "../screens/NovoUsuario";
import NovoFornecedor from "../screens/NovoFornecedor";
import NovaPessoa from "../screens/NovaPessoa";
import Despesas from "../screens/Despesas";
import NovaDespesa from "../screens/NovaDespesa";
import Categorias from "../screens/Categorias";
import NovaCategoria from "../screens/NovaCategoria";
import CatDespesa from "../screens/CatDespesa";
import NovaCatDespesa from "../screens/NovaCatDespesa";
import Produtos from "../screens/Produtos";
import NovoProduto from "../screens/NovoProduto";
import ComprarProduto from "../screens/ComprarProduto";
import Estoque from "../screens/Estoque";
import Pagar from "../screens/Pagar";
import NovaContaPagar from "../screens/NovaContaPagar";
import BaixarPagar from "../screens/BaixarPagar";
import Receber from "../screens/Receber";
import NovaContaReceber from "../screens/NovaContaReceber";
import BaixarReceber from "../screens/BaixarReceber";
import NovaVenda from "../screens/NovaVenda";
import FecharVenda from "../screens/FecharVenda";
import Compras from "../screens/Compras";
import NovaCompra from "../screens/NovaCompra";
import FecharCompra from "../screens/FecharCompra";
import Movimentacoes from "../screens/Movimentacoes";
import ConsultaContaCliente from "../screens/ConsultaContasCliente";
import ConsultaContasCliente from "../screens/ConsultaContasCliente";
import Orcamento from "../screens/Orcamento";
import NovoOrcamento from "../screens/NovoOrcamento";
import LivroPonto from "../screens/LivroPonto";
import Colaboradores from "../screens/Colaboradores";
import NovoColaborador from "../screens/NovoColaborador";
import ServicosObra from "../screens/ServicosObra";
import NovoOrcamentoObra from "../screens/NovoOrcamentoObra/NovoOrcamentoObraScreen";
import LancamentosCustos from "../screens/LancamentosCustos";
import NotaFiscal from "../screens/NotaFiscal";

const Stack = createNativeStackNavigator();

function StackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Home" component={AuthRoutes} />
      <Stack.Screen name="Pessoas" component={Pessoas} />
      <Stack.Screen name="Despesas" component={Despesas} />
      <Stack.Screen name="Usuarios" component={Usuarios} />
      <Stack.Screen name="Fornecedores" component={Fornecedores} />
      <Stack.Screen name="NovaPessoa" component={NovaPessoa} />
      <Stack.Screen name="NovaDespesa" component={NovaDespesa} />
      <Stack.Screen name="NovoUsuario" component={NovoUsuario} />
      <Stack.Screen name="NovoFornecedor" component={NovoFornecedor} />
      <Stack.Screen name="Categorias" component={Categorias} />
      <Stack.Screen name="NovaCategoria" component={NovaCategoria} />
      <Stack.Screen name="CatDespesa" component={CatDespesa} />
      <Stack.Screen name="NovaCatDespesa" component={NovaCatDespesa} />
      <Stack.Screen name="Produtos" component={Produtos} />
      <Stack.Screen name="NovoProduto" component={NovoProduto} />
      <Stack.Screen name="ComprarProduto" component={ComprarProduto} />
      <Stack.Screen name="Estoque" component={Estoque} />
      <Stack.Screen name="Pagar" component={Pagar} />
      <Stack.Screen name="NovaContaPagar" component={NovaContaPagar} />
      <Stack.Screen name="BaixarPagar" component={BaixarPagar} />
      <Stack.Screen name="Receber" component={Receber} />
      <Stack.Screen name="NovaContaReceber" component={NovaContaReceber} />
      <Stack.Screen name="BaixarReceber" component={BaixarReceber} />
      <Stack.Screen name="NovaVenda" component={NovaVenda} />
      <Stack.Screen name="FecharVenda" component={FecharVenda} />
      <Stack.Screen name="Compras" component={Compras} />
      <Stack.Screen name="NovaCompra" component={NovaCompra} />
      <Stack.Screen name="Orcamento" component={Orcamento} />
      <Stack.Screen name="NovoOrcamento" component={NovoOrcamento} />
      <Stack.Screen name="ServicosObra" component={ServicosObra} />
      <Stack.Screen name="LancamentosCustos" component={LancamentosCustos} />
      <Stack.Screen name="NotaFiscal" component={NotaFiscal} />
      <Stack.Screen name="NovoOrcamentoObra" component={NovoOrcamentoObra} />
      <Stack.Screen name="FecharCompra" component={FecharCompra} />
      <Stack.Screen name="Movimentacoes" component={Movimentacoes} />
      <Stack.Screen
        name="ConsultaContasCliente"
        component={ConsultaContasCliente}
      />
      <Stack.Screen name="LivroPonto" component={LivroPonto} />
      <Stack.Screen name="Colaboradores" component={Colaboradores} />
      <Stack.Screen name="NovoColaborador" component={NovoColaborador} />
      <Stack.Screen name="Splash" component={Splash} />
    </Stack.Navigator>
  );
}

function AppRoutes() {
  return (
    <NavigationContainer>
      <StackNavigator />
    </NavigationContainer>
  );
}
export default AppRoutes;
