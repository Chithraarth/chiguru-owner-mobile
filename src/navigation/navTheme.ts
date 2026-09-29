import { DefaultTheme, type Theme } from "@react-navigation/native";
import { colors, fonts } from "../components/theme";

/** Cream screens, green actions - applied to every NavigationContainer. */
export const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.accent,
    text: colors.accentInk,
    primary: colors.primary,
    border: "transparent",
    notification: colors.danger,
  },
  fonts: {
    regular: { fontFamily: fonts.regular, fontWeight: "normal" },
    medium: { fontFamily: fonts.medium, fontWeight: "normal" },
    bold: { fontFamily: fonts.bold, fontWeight: "normal" },
    heavy: { fontFamily: fonts.extrabold, fontWeight: "normal" },
  },
};
