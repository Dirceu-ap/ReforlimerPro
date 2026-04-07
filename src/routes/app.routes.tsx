import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import Orcamento from "../screens/Orcamento";
import NovoOrcamento from "../screens/NovoOrcamento";

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <NavigationContainer>
      <Drawer.Navigator>
        <Drawer.Screen
          name="Orcamento"
          component={Orcamento}
          options={{ drawerLabel: "Orçamento" }}
        />
        <Drawer.Screen name="NovoOrcamento" component={NovoOrcamento} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
