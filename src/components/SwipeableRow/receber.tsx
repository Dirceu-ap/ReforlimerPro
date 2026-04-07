import React, { ReactNode } from "react";
import { TouchableOpacity, View } from "react-native";

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
  disabled = false,
}: SwipeableRowProps) => {
  const translateX = useSharedValue(0);

  const theme = useTheme();

  const context = useSharedValue({ x: 0 });

  const onGestureEvent = Gesture.Pan()
    .enabled(!disabled)
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

  return (
    <View>
      <View style={styles.SwipeableWhatsapp}>
        <View style={styles.whatsapp}>
          <TouchableOpacity
            style={{ alignItems: "flex-end", flex: 1 }}
            onPress={() => onPressWhatsapp()}
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
