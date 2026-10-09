import React, { createContext, forwardRef, useContext } from "react";
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
} from "react-native";
import { colors, fontForWeight, fonts } from "./theme";

// React Native has no app-wide default font, and a custom font needs one
// family per weight on Android. These drop-in replacements for RN's Text and
// TextInput pick the Baloo 2 face that matches the style's fontWeight, so
// screens keep writing plain `fontWeight: "700"`.

const InsideText = createContext(false);

export const Text = forwardRef<RNText, TextProps>(function Text({ style, children, ...props }, ref) {
  const nested = useContext(InsideText);
  const flat = StyleSheet.flatten(style) ?? {};
  // A nested <Text> without its own weight inherits the parent's face.
  const override =
    flat.fontFamily || (nested && flat.fontWeight === undefined)
      ? null
      : { fontFamily: fontForWeight(flat.fontWeight), fontWeight: "normal" as const };
  return (
    <RNText ref={ref} {...props} style={[!nested && { color: colors.text }, style, override]}>
      <InsideText.Provider value={true}>{children}</InsideText.Provider>
    </RNText>
  );
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  const flat = StyleSheet.flatten(style) ?? {};
  return (
    <RNTextInput
      ref={ref}
      placeholderTextColor={colors.textMuted}
      {...props}
      style={[style, { fontFamily: flat.fontFamily ?? (flat.fontWeight ? fontForWeight(flat.fontWeight) : fonts.regular), fontWeight: "normal" }]}
    />
  );
});
