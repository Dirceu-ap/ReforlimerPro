import React, { useEffect } from "react";
import Routes from "./src/routes";
import FlashMessage from "react-native-flash-message";
import "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native";

import {
  useFonts,
  Jost_400Regular,
  Jost_600SemiBold,
} from "@expo-google-fonts/jost";

import * as Updates from "expo-updates";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignora erro caso a splash já esteja sendo gerenciada.
});

/**
 * The main application component for DamFinanca3.
 *
 * - Loads custom fonts (`Jost_400Regular`, `Jost_600SemiBold`) using `useFonts`.
 * - Handles splash screen visibility based on font loading status.
 * - Checks for app updates on mount and reloads if an update is available.
 * - Renders the root gesture handler, application routes, and a flash message.
 *
 * @returns The root JSX element of the application, or `null` while fonts are loading.
 */
export default function App() {
  const [fontsLoaded] = useFonts({
    Jost_400Regular,
    Jost_600SemiBold,
  });

  useEffect(() => {
    let cancelled = false;

    async function updateApp() {
      // Em Expo Go/dev-client durante desenvolvimento, essa API pode falhar.
      if (__DEV__ || !Updates.isEnabled) {
        return;
      }

      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();

        if (!cancelled && isAvailable) {
          await Updates.fetchUpdateAsync();
          if (!cancelled) {
            await Updates.reloadAsync();
          }
        }
      } catch (error) {
        console.warn("Falha ao verificar atualização OTA:", error);
      }
    }

    updateApp();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync(); // Quando terminar de carregar
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null; // Corrigido para SDK 54

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Routes />
        <FlashMessage icon="auto" duration={3000} style={{ marginTop: 0 }} />
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}
