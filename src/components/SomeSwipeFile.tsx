import React from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue, withSpring } from "react-native-reanimated";
import { View } from "react-native";

export default function SomeSwipeFile() {
  const translateX = useSharedValue(0);
  const context = useSharedValue({ x: 0 });

  const gesture = Gesture.Pan()
    .onBegin(() => {
      context.value.x = translateX.value;
    })
    .onUpdate((e) => {
      translateX.value = context.value.x + e.translationX;
    })
    .onEnd((e) => {
      const dest = /* calc snap if precisar */ 0;
      translateX.value = withSpring(dest, { overshootClamping: true });
    });

  return (
    <GestureDetector gesture={gesture}>
      {/* Animated.View com useAnimatedStyle transform: translateX */}
      <View />
    </GestureDetector>
  );
}
