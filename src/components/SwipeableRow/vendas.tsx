import React, { ReactNode } from "react";
import { TouchableOpacity, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "./stylesVendas";
import { snapPoint } from "react-native-redash";

interface SwipeableRowProps {
  children: ReactNode;
  onPressWhatsapp: () => void;
  onPressDelete: () => void;
}

const finalDestination = 140;
const snapPointsArr = [-140, 0, finalDestination];

const SwipeableRow = ({
  children,
  onPressWhatsapp,
  onPressDelete,
}: SwipeableRowProps) => {
  const translateX = useSharedValue(0);
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
        snapPoint(translateX.value, event.velocityX, snapPointsArr),
        { overshootClamping: true }
      );
    });

  const style = useAnimatedStyle(() => ({
    zIndex: 100,
    backgroundColor: "#fff",
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View>
      <View style={styles.SwipeableWhatsapp}>
        <View style={styles.whatsapp}>
          <TouchableOpacity
            style={{ alignItems: "flex-end", flex: 1 }}
            onPress={onPressWhatsapp}
          >
            <Ionicons name="document" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.SwipeableDelete}>
        <View style={styles.delete}>
          <TouchableOpacity
            style={{ alignItems: "flex-start", flex: 1 }}
            onPress={onPressDelete}
          >
            <MaterialCommunityIcons
              name="delete-outline"
              size={30}
              color="#FFF"
            />
          </TouchableOpacity>
        </View>
      </View>
      <GestureDetector gesture={onGestureEvent}>
        <Animated.View style={style}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
};

export default SwipeableRow;
