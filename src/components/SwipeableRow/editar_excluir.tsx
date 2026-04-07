import React, { ReactNode } from "react";
import { TouchableOpacity, View } from "react-native";

import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { snapPoint } from "react-native-redash";
import { styles } from "./styles";

import Animated from "react-native-reanimated";

interface SwipeableRowProps {
  children: ReactNode;

  onPressEdit: () => void;
  onPressDelete: () => void;
}

type AnimatedGHContext = { x: number };

const finalDestination = 70;
const snapPoints = [-150, 0, finalDestination];

const SwipeableRow = ({
  children,
  onPressEdit,
  onPressDelete,
}: SwipeableRowProps) => {
  const translateX = useSharedValue(0);

  const theme = useTheme();

  const context = useSharedValue({ x: 0 } as AnimatedGHContext);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      context.value.x = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = context.value.x + (event.translationX ?? 0);
    })
    .onEnd((event) => {
      const dest = snapPoint(
        translateX.value,
        event.velocityX ?? 0,
        snapPoints
      );
      translateX.value = withSpring(dest, { overshootClamping: true });
    });

  const style = useAnimatedStyle(() => ({
    zIndex: 100,
    backgroundColor: theme.colors.background,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View>
      <View style={styles.SwipeableDeleteDir}>
        <View style={styles.deleteDir}>
          <TouchableOpacity
            style={{ alignItems: "flex-end", flex: 1 }}
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

      <GestureDetector gesture={gesture}>
        <Animated.View style={style}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
};

export default SwipeableRow;
