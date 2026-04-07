import React from "react";
import { Text, View } from "react-native";

import { styles } from "./styles";

interface DadosProps {
  title: string;
}

export const Title = ({ title }: DadosProps) => {
  return (
    <View style={styles.Container}>
      <Text style={styles.Title}>{title}</Text>
    </View>
  );
};

export default Title;
