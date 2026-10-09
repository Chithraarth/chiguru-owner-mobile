import React from "react";
import { View } from "react-native";
import { Sprout } from "lucide-react-native";
import { colors } from "./theme";

/** Chiguru mark: a white sprout in a leaf-green circle. */
export function Logo({ size = 64 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
      <Sprout size={Math.round(size * 0.54)} color="#FFFFFF" strokeWidth={2} />
    </View>
  );
}
