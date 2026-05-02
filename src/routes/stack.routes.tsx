import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { Splash } from "../lotties/Splash";
import AuthRoutes from "./tab.routes";

const Stack = createNativeStackNavigator();

const lazyScreen = <T extends object>(loader: () => T) => {
  return () => loader() as React.ComponentType<any>;
};

function StackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        animation: "fade",
      }}
    >
      <Stack.Screen
        name="Login"
        getComponent={lazyScreen(() => require("../screens/Login").default)}
      />
      <Stack.Screen name="Home" component={AuthRoutes} />
      <Stack.Screen
        name="Pessoas"
        getComponent={lazyScreen(() => require("../screens/Pessoas").default)}
      />
      <Stack.Screen
        name="Despesas"
        getComponent={lazyScreen(() => require("../screens/Despesas").default)}
      />
      <Stack.Screen
        name="Usuarios"
        getComponent={lazyScreen(() => require("../screens/Usuarios").default)}
      />
      <Stack.Screen
        name="Fornecedores"
        getComponent={lazyScreen(
          () => require("../screens/Fornecedores").default,
        )}
      />
      <Stack.Screen
        name="NovaPessoa"
        getComponent={lazyScreen(
          () => require("../screens/NovaPessoa").default,
        )}
      />
      <Stack.Screen
        name="NovaDespesa"
        getComponent={lazyScreen(
          () => require("../screens/NovaDespesa").default,
        )}
      />
      <Stack.Screen
        name="NovoUsuario"
        getComponent={lazyScreen(
          () => require("../screens/NovoUsuario").default,
        )}
      />
      <Stack.Screen
        name="NovoFornecedor"
        getComponent={lazyScreen(
          () => require("../screens/NovoFornecedor").default,
        )}
      />
      <Stack.Screen
        name="Categorias"
        getComponent={lazyScreen(
          () => require("../screens/Categorias").default,
        )}
      />
      <Stack.Screen
        name="NovaCategoria"
        getComponent={lazyScreen(
          () => require("../screens/NovaCategoria").default,
        )}
      />
      <Stack.Screen
        name="CatDespesa"
        getComponent={lazyScreen(
          () => require("../screens/CatDespesa").default,
        )}
      />
      <Stack.Screen
        name="NovaCatDespesa"
        getComponent={lazyScreen(
          () => require("../screens/NovaCatDespesa").default,
        )}
      />
      <Stack.Screen
        name="Produtos"
        getComponent={lazyScreen(() => require("../screens/Produtos").default)}
      />
      <Stack.Screen
        name="NovoProduto"
        getComponent={lazyScreen(
          () => require("../screens/NovoProduto").default,
        )}
      />
      <Stack.Screen
        name="ComprarProduto"
        getComponent={lazyScreen(
          () => require("../screens/ComprarProduto").default,
        )}
      />
      <Stack.Screen
        name="Estoque"
        getComponent={lazyScreen(() => require("../screens/Estoque").default)}
      />
      <Stack.Screen
        name="Pagar"
        getComponent={lazyScreen(() => require("../screens/Pagar").default)}
      />
      <Stack.Screen
        name="NovaContaPagar"
        getComponent={lazyScreen(
          () => require("../screens/NovaContaPagar").default,
        )}
      />
      <Stack.Screen
        name="BaixarPagar"
        getComponent={lazyScreen(
          () => require("../screens/BaixarPagar").default,
        )}
      />
      <Stack.Screen
        name="Receber"
        getComponent={lazyScreen(() => require("../screens/Receber").default)}
      />
      <Stack.Screen
        name="NovaContaReceber"
        getComponent={lazyScreen(
          () => require("../screens/NovaContaReceber").default,
        )}
      />
      <Stack.Screen
        name="BaixarReceber"
        getComponent={lazyScreen(
          () => require("../screens/BaixarReceber").default,
        )}
      />
      <Stack.Screen
        name="NovaVenda"
        getComponent={lazyScreen(() => require("../screens/NovaVenda").default)}
      />
      <Stack.Screen
        name="FecharVenda"
        getComponent={lazyScreen(
          () => require("../screens/FecharVenda").default,
        )}
      />
      <Stack.Screen
        name="Compras"
        getComponent={lazyScreen(() => require("../screens/Compras").default)}
      />
      <Stack.Screen
        name="NovaCompra"
        getComponent={lazyScreen(
          () => require("../screens/NovaCompra").default,
        )}
      />
      <Stack.Screen
        name="Orcamento"
        getComponent={lazyScreen(() => require("../screens/Orcamento").default)}
      />
      <Stack.Screen
        name="NovoOrcamento"
        getComponent={lazyScreen(
          () => require("../screens/NovoOrcamento").default,
        )}
      />
      <Stack.Screen
        name="ServicosObra"
        getComponent={lazyScreen(
          () => require("../screens/ServicosObra").default,
        )}
      />
      <Stack.Screen
        name="LancamentosCustos"
        getComponent={lazyScreen(
          () => require("../screens/LancamentosCustos").default,
        )}
      />
      <Stack.Screen
        name="NotaFiscal"
        getComponent={lazyScreen(
          () => require("../screens/NotaFiscal").default,
        )}
      />
      <Stack.Screen
        name="NovoOrcamentoObra"
        getComponent={lazyScreen(
          () =>
            require("../screens/NovoOrcamentoObra/NovoOrcamentoObraScreen")
              .default,
        )}
      />
      <Stack.Screen
        name="FecharCompra"
        getComponent={lazyScreen(
          () => require("../screens/FecharCompra").default,
        )}
      />
      <Stack.Screen
        name="Movimentacoes"
        getComponent={lazyScreen(
          () => require("../screens/Movimentacoes").default,
        )}
      />
      <Stack.Screen
        name="ConsultaContasCliente"
        getComponent={lazyScreen(
          () => require("../screens/ConsultaContasCliente").default,
        )}
      />
      <Stack.Screen
        name="LivroPonto"
        getComponent={lazyScreen(
          () => require("../screens/LivroPonto").default,
        )}
      />
      <Stack.Screen
        name="Colaboradores"
        getComponent={lazyScreen(
          () => require("../screens/Colaboradores").default,
        )}
      />
      <Stack.Screen
        name="NovoColaborador"
        getComponent={lazyScreen(
          () => require("../screens/NovoColaborador").default,
        )}
      />
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
