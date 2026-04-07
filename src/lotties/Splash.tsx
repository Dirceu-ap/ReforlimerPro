import React from "react";
import { Image, StyleSheet, View } from "react-native";

import LottieView from "lottie-react-native";

import loadAnimation from "../assets/splash.json";
import { useNavigation } from "@react-navigation/native";

export function Splash() {
  return (
    <View style={styles.container}>
      <Image style={styles.logo} source={require("../assets/logo.png")} />

      <LottieView
        source={loadAnimation}
        autoPlay
        loop={false}
        style={styles.animation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  animation: {
    backgroundColor: "transparent",
    position: "absolute",
    bottom: -165,
  },

  logo: {
    width: 220,
    height: 90,
    alignSelf: "center",
    marginTop: 100,
  },
});
