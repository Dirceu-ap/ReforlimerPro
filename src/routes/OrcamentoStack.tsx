import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import Orcamento from "../screens/Orcamento";
import NovoOrcamento from "../screens/NovoOrcamento";
import ServicosObra from "../screens/ServicosObra";
import NovoOrcamentoObra from "../screens/NovoOrcamentoObra/NovoOrcamentoObraScreen";

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Orcamento" component={Orcamento} />
      <Stack.Screen name="NovoOrcamento" component={NovoOrcamento} />
      <Stack.Screen name="ServicosObra" component={ServicosObra} />
      <Stack.Screen
        name="NovoOrcamentoObra"
        component={NovoOrcamentoObra}
        options={{ title: "Orçamento de Obra" }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
