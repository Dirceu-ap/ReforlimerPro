import React, { ReactNode } from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { snapPoint } from "react-native-redash";
import { styles } from "./styles";

interface SwipeableRowProps {
  children: ReactNode;
  onPressWhatsapp?: () => void;
  onPressEdit?: () => void;
  onPressDelete?: () => void;
  onPressParcelar?: () => void;
}

const finalDestination = 140;
const snapPoints = [-140, 0, finalDestination];

const SwipeableRow = ({
  children,
  onPressWhatsapp = () => {},
  onPressEdit = () => {},
  onPressDelete = () => {},
  onPressParcelar = () => {},
}: SwipeableRowProps) => {
  const translateX = useSharedValue(0);
  const context = useSharedValue({ x: 0 });
  const theme = useTheme();

  const gesture = Gesture.Pan()
    .onBegin(() => {
      context.value.x = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = context.value.x + event.translationX;
    })
    .onEnd((event) => {
      const dest = snapPoint(translateX.value, event.velocityX, snapPoints);
      translateX.value = withSpring(dest, { overshootClamping: true });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const contentStyle = {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 10,
  };

  return (
    <View style={localStyles.container}>
      <View style={localStyles.actionsContainer}>
        <View style={styles.SwipeableWhatsapp}>
          <View style={styles.whatsapp}>
            <TouchableOpacity
              style={{ alignItems: "flex-end", flex: 1 }}
              onPress={onPressWhatsapp}
            >
              <Ionicons name="logo-whatsapp" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.SwipeableEdit}>
          <View style={styles.edit}>
            <TouchableOpacity
              style={{ alignItems: "flex-end", flex: 1 }}
              onPress={onPressEdit}
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

        <View style={(styles as any).SwipeableParcelar}>
          <View style={(styles as any).parcelar}>
            <TouchableOpacity
              style={{ alignItems: "flex-start", flex: 1 }}
              onPress={onPressParcelar}
            >
              <MaterialCommunityIcons name="calendar" size={30} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[localStyles.content, contentStyle, animatedStyle]}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

export default SwipeableRow;

const localStyles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "visible",
  },
  actionsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  content: {
    zIndex: 2, // garantir sobreposição do card
    elevation: 4,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    overflow: "hidden",
  },
});
