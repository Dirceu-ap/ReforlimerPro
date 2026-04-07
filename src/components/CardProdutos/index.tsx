import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { styles } from "./styles";
import urlImg from "../../services/urlImg";

interface DadosProps {
  data: any;
  onComprar?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const CardProdutos = ({ data, onComprar, onEdit, onDelete }: DadosProps) => {
  const imageUri = data.foto
    ? `${urlImg}/${data.foto}`
    : "https://via.placeholder.com/55x55.png?text=Produto";

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Image
          style={{
            width: 55,
            height: 55,
            borderRadius: 8,
            marginRight: 12,
            backgroundColor: "#eee",
            opacity: data.ativo === "Sim" ? 1 : 0.3,
          }}
          source={{ uri: imageUri }}
        />
        <View style={styles.cardDados}>
          <Text style={styles.cardNome}>{data.nome}</Text>
          <Text style={styles.cardInfo}>Código: {data.codigo}</Text>
          <Text style={styles.cardInfo}>Venda: {data.valor_venda}</Text>
          <Text style={styles.cardInfo}>Custo: {data.valor_compra}</Text>
          <Text style={styles.cardInfo}>Ativo: {data.ativo}</Text>
          <Text style={styles.cardInfo}>Estoque: {data.estoque}</Text>
          {Number(data.estoque) < 3 && (
            <Text
              style={[
                styles.cardInfo,
                { color: "#e74c3c", fontWeight: "bold" },
              ]}
            >
              Estoque baixo
            </Text>
          )}
          {/* Botões alinhados abaixo do campo Ativo */}
          <View style={styles.cardAcoes}>
            <TouchableOpacity onPress={onComprar} style={styles.actionButton}>
              <MaterialIcons name="shopping-cart" size={20} color="#32B76C" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
              <MaterialIcons name="edit" size={20} color="#2980b9" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
              <MaterialIcons name="delete" size={20} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

export default CardProdutos;
