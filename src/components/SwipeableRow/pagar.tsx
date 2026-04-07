import React, { ReactNode, useState } from "react";
import {
  TouchableOpacity,
  View,
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableHighlight,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../services/api";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { snapPoint } from "react-native-redash";
import { styles } from "./stylesPagar";

interface SwipeableRowProps {
  children: ReactNode;
  onPressWhatsapp: () => void;
  onPressEdit: () => void;
  onPressDelete: () => void;
  onPressParcelar: () => void;
  item?: any;
  itemId?: number | string;
  valor?: string | number;
  onAfterBaixa?: (data?: any) => void;
  disabled?: boolean;
}

type AnimatedGHContext = {
  x: number;
};

const finalDestination = 140;
const snapPoints = [-140, 0, finalDestination];

const SwipeableRowProd = ({
  children,
  onPressWhatsapp,
  onPressEdit,
  onPressDelete,
  onPressParcelar,
  itemId,
  item,
  valor,
  onAfterBaixa,
  disabled,
}: SwipeableRowProps) => {
  if (disabled) {
    return <View>{children}</View>;
  }

  const translateX = useSharedValue(0);

  const theme = useTheme();

  const context = useSharedValue({ x: 0 });

  const onGestureEvent = Gesture.Pan()
    .onBegin(() => {
      context.value.x = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = context.value.x + event.translationX;
    })
    .onEnd((event) => {
      translateX.value = withSpring(
        snapPoint(translateX.value, event.velocityX, snapPoints),
        {
          overshootClamping: true,
        },
      );
    });

  const style = useAnimatedStyle(() => ({
    zIndex: 100,
    backgroundColor: "#FAFAFA",
    transform: [{ translateX: translateX.value }],
    paddingHorizontal: 10,
  }));

  const [isProcessing, setIsProcessing] = useState(false);

  const parseNumber = (v: any) => {
    if (v === undefined || v === null) return 0;
    const s = String(v);
    const cleaned = s
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d\.\-]/g, "");
    const n = Number(cleaned);
    return isNaN(n) ? 0 : n;
  };

  return (
    <View>
      <View style={styles.SwipeableWhatsapp}>
        <View style={styles.whatsapp}>
          <TouchableOpacity
            style={{ alignItems: "flex-end", flex: 1 }}
            onPress={async () => {
              if (isProcessing) return;
              setIsProcessing(true);
              try {
                onPressWhatsapp && onPressWhatsapp();

                const effectiveId =
                  itemId ?? item?.id ?? item?.ID ?? item?.id_conta;
                if (!effectiveId) {
                  Alert.alert("Erro", "ID da conta não informado.");
                  setIsProcessing(false);
                  return;
                }

                // obter usuário logado (se houver)
                let userId = "";
                try {
                  const raw = await AsyncStorage.getItem("@user");
                  if (raw) {
                    const parsed = JSON.parse(raw);
                    userId = parsed?.id ?? parsed?.ID ?? parsed?.user ?? "";
                  }
                } catch (e) {}

                const subtotalVal = parseNumber(
                  valor ?? item?.valor ?? item?.total ?? item?.valor_total ?? 0,
                );
                const descontoNum = 0;
                const jurosNum = 0;
                const multaNum = 0;
                const totalPago =
                  subtotalVal - descontoNum + jurosNum + multaNum;

                const payload = {
                  id: effectiveId,
                  valor: String(totalPago),
                  desconto: String(descontoNum),
                  juros: String(jurosNum),
                  multa: String(multaNum),
                  subtotal: String(subtotalVal),
                  saida: item?.saida ?? "Caixa",
                  user: String(userId ?? ""),
                };

                try {
                  // construir URL absoluta a partir do baseURL do axios para evitar 404 por path incorreto
                  const base = String(api?.defaults?.baseURL ?? "").replace(
                    /\/$/,
                    "",
                  );
                  const absoluteUrl = `${base}/contas_pagar/baixar.php`;

                  // usar fetch com URL absoluta (evita confusão de baseURL do axios)
                  const r = await fetch(absoluteUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });

                  if (r.status === 200) {
                    let respData: any = null;
                    const text = await r.text();
                    try {
                      respData = JSON.parse(text);
                    } catch {
                      respData = text;
                    }

                    if (respData && respData.sucesso === true) {
                      const conta =
                        respData.conta ?? respData.resultado ?? respData;
                      if (
                        item &&
                        typeof item === "object" &&
                        conta &&
                        typeof conta === "object"
                      ) {
                        const camposMap = [
                          "status",
                          "juros",
                          "multa",
                          "desconto",
                          "subtotal",
                          "data_baixa",
                          "usuario_baixa",
                          "id_compra",
                          "valor",
                        ];
                        camposMap.forEach((k) => {
                          if (conta[k] !== undefined && conta[k] !== null)
                            (item as any)[k] = conta[k];
                        });
                      }
                      if (onAfterBaixa) onAfterBaixa(conta);
                      Alert.alert(
                        "Sucesso",
                        respData.mensagem || "Baixa efetuada",
                      );
                    } else {
                      Alert.alert(
                        "Aviso",
                        respData?.mensagem ?? "Falha ao dar baixa",
                      );
                    }
                  }
                } catch (err: any) {
                  // Falha na requisição (sem log de teste)
                  Alert.alert(
                    "Erro",
                    "Falha na requisição de baixa. Verifique o servidor.",
                  );
                }
              } catch (err: any) {
                // Erro não esperado na operação de baixa (sem log de teste)
                Alert.alert("Erro", "Falha ao dar baixa. Veja console.");
              } finally {
                setIsProcessing(false);
              }
            }}
          >
            <Ionicons name="checkbox" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.SwipeableEdit}>
        <View style={styles.edit}>
          <TouchableOpacity
            style={{ alignItems: "flex-end", flex: 1 }}
            onPress={() => onPressEdit()}
          >
            <MaterialCommunityIcons
              name="account-edit-outline"
              size={30}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.SwipeableDelete}>
        <View style={styles.delete}>
          <TouchableOpacity
            style={{ alignItems: "flex-start", flex: 1 }}
            onPress={() => onPressDelete()}
          >
            <MaterialCommunityIcons
              name="delete-outline"
              size={30}
              color="#FFF"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.SwipeableParcelar}>
        <View style={styles.parcelar}>
          <TouchableOpacity
            style={{ alignItems: "flex-start", flex: 1 }}
            onPress={() => onPressParcelar()}
          >
            <MaterialCommunityIcons name="calendar" size={30} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <GestureDetector gesture={onGestureEvent}>
        <Animated.View style={style}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
};

export default SwipeableRowProd;
