import React from "react";

import { Text, TouchableOpacity, View } from "react-native";

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  AntDesign,
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";

import fonts from "../styles/fonts";

import DrawerRoutes from "./drawer.routes";
import Vendas from "../screens/Vendas";
import Receber from "../screens/Receber";
import Pagar from "../screens/Pagar";
import LivroPonto from "../screens/LivroPonto";
import { CommonActions } from "@react-navigation/native";

const AppTab = createBottomTabNavigator();

const AuthRoutes = () => {
  const resetToTab = (navigation: any, tabName: string) => {
    const parent = navigation.getParent?.();
    if (!parent) return;

    parent.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: "Home",
            state: {
              index: 0,
              routes: [{ name: tabName }],
            },
          },
        ],
      }),
    );
  };

  return (
    <AppTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "green",
        tabBarInactiveTintColor: "gray",
        tabBarHideOnKeyboard: false,
        tabBarLabelPosition: "below-icon",
        headerShown: false,

        tabBarStyle: {
          height: 80,
          paddingTop: 10,
        },
      }}
    >
      <AppTab.Screen
        name="Inicio"
        component={DrawerRoutes}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            resetToTab(navigation, "Inicio");
          },
        })}
        options={{
          tabBarIcon: ({ size, color }) => (
            <AntDesign name="home" size={size} color={color} />
          ),

          tabBarLabel: ({ focused, color }) => (
            <View>
              <Text
                style={
                  focused
                    ? {
                        color: color,
                        fontFamily: fonts.text,
                        fontSize: 12,
                        textAlign: "center",
                      }
                    : {
                        color: color,
                        fontFamily: fonts.text,
                        fontSize: 12,
                      }
                }
              >
                Inicio
              </Text>
              <View
                style={
                  focused
                    ? {
                        backgroundColor: color,
                        borderColor: color,
                        width: 45,
                        height: 2,
                        borderTopLeftRadius: 5,
                        borderTopRightRadius: 5,
                        marginTop: 5,
                      }
                    : {
                        height: 2,
                      }
                }
              ></View>
            </View>
          ),
        }}
      />

      <AppTab.Screen
        name="Vendas"
        component={Vendas}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            resetToTab(navigation, "Vendas");
          },
        })}
        options={{
          tabBarIcon: ({ size, color }) => (
            <MaterialIcons name="credit-card" size={size} color={color} />
          ),

          tabBarLabel: ({ focused, color }) => (
            <View>
              <Text
                style={
                  focused
                    ? {
                        color: color,
                        fontFamily: fonts.text,
                        fontSize: 12,
                        textAlign: "center",
                      }
                    : {
                        color: color,
                        fontFamily: fonts.text,
                        fontSize: 12,
                      }
                }
              >
                Vendas
              </Text>
              <View
                style={
                  focused
                    ? {
                        backgroundColor: color,
                        borderColor: color,
                        width: 65,
                        height: 2,
                        borderTopLeftRadius: 5,
                        borderTopRightRadius: 5,
                        marginTop: 5,
                      }
                    : {
                        height: 2,
                      }
                }
              ></View>
            </View>
          ),
        }}
      />

      <AppTab.Screen
        name="LivroPonto"
        component={LivroPonto}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            resetToTab(navigation, "LivroPonto");
          },
        })}
        options={{
          tabBarIcon: ({ size, color }) => (
            <MaterialCommunityIcons
              name="clock-time-four-outline"
              size={size}
              color={color}
            />
          ),

          tabBarLabel: ({ focused, color }) => (
            <View>
              <Text
                style={
                  focused
                    ? {
                        color: color,
                        fontFamily: fonts.text,
                        fontSize: 12,
                        textAlign: "center",
                      }
                    : {
                        color: color,
                        fontFamily: fonts.text,
                        fontSize: 12,
                      }
                }
              >
                Ponto
              </Text>
              <View
                style={
                  focused
                    ? {
                        backgroundColor: color,
                        borderColor: color,
                        width: 50,
                        height: 2,
                        borderTopLeftRadius: 5,
                        borderTopRightRadius: 5,
                        marginTop: 5,
                      }
                    : {
                        height: 2,
                      }
                }
              ></View>
            </View>
          ),
        }}
      />

      <AppTab.Screen
        name="Contas à Pagar"
        component={Pagar}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            resetToTab(navigation, "Contas à Pagar");
          },
        })}
        options={{
          tabBarIcon: ({ size, color }) => (
            <MaterialCommunityIcons
              name="calendar-clock"
              size={size}
              color={color}
            />
          ),

          tabBarLabel: ({ focused, color }) => (
            <View>
              <Text
                style={
                  focused
                    ? {
                        color: color,
                        fontFamily: fonts.text,
                        fontSize: 12,
                        textAlign: "center",
                      }
                    : {
                        color: color,
                        fontFamily: fonts.text,
                        fontSize: 12,
                      }
                }
              >
                À Pagar
              </Text>
              <View
                style={
                  focused
                    ? {
                        backgroundColor: color,
                        borderColor: color,
                        width: 90,
                        height: 2,
                        borderTopLeftRadius: 5,
                        borderTopRightRadius: 5,
                        marginTop: 5,
                      }
                    : {
                        height: 2,
                      }
                }
              ></View>
            </View>
          ),
        }}
      />

      <AppTab.Screen
        name="Contas à Receber"
        component={Receber}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            resetToTab(navigation, "Contas à Receber");
          },
        })}
        options={{
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="card" size={size} color={color} />
          ),

          tabBarLabel: ({ focused, color }) => (
            <View>
              <Text
                style={
                  focused
                    ? {
                        color: color,
                        fontFamily: fonts.text,
                        fontSize: 12,
                        textAlign: "center",
                      }
                    : {
                        color: color,
                        fontFamily: fonts.text,
                        fontSize: 12,
                      }
                }
              >
                À Receber
              </Text>

              <View
                style={
                  focused
                    ? {
                        backgroundColor: color,
                        borderColor: color,
                        width: 60,
                        height: 2,
                        borderTopLeftRadius: 5,
                        borderTopRightRadius: 5,
                        marginTop: 5,
                      }
                    : {
                        height: 2,
                      }
                }
              ></View>
            </View>
          ),
        }}
      />
    </AppTab.Navigator>
  );
};

export default AuthRoutes;
