import React, { useEffect } from "react";
import Routes from "./src/routes";
import FlashMessage from "react-native-flash-message";
import "react-native-gesture-handler";
import { useSharedValue } from 'react-native-reanimated';

import {
  useFonts,
  Jost_400Regular,
  Jost_600SemiBold,
} from "@expo-google-fonts/jost";

import * as Updates from "expo-updates";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync(); // Para manter a splash até carregar tudo

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
    async function updateApp() {
      const { isAvailable } = await Updates.checkForUpdateAsync();

      if (isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    }

    updateApp();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync(); // Quando terminar de carregar
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null; // Corrigido para SDK 54

  return (
    <>
    
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Routes />
        <FlashMessage icon="auto" duration={3000} style={{ marginTop: 0 }} />
      </GestureHandlerRootView>
    </>
  );
}
