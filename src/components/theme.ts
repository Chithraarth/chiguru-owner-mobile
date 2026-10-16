// "Harvest Sun" design tokens - warm cream ground, deep leaf green for actions,
// sun yellow for headers and the centre action. Mirrors the approved design
// canvas (Set 5 · Harvest Sun) so screens can be matched value for value.
export const colors = {
  bg: "#FFF8E6", // cream page
  card: "#FFFFFF",
  border: "#F0E4C2", // warm hairline / input border
  text: "#1F2A14", // ink
  textMuted: "#5A6350",
  primary: "#2F6B1F", // leaf green - buttons, active tab, links
  primaryDark: "#245418",
  onPrimary: "#FFFFFF",
  onPrimarySoft: "#DCEFD2",
  secondary: "#FBF2D9", // soft tint behind secondary content
  muted: "#FBF2D9",
  tint: "#FFF0C2", // selected chip / light button
  accent: "#F4B400", // sun yellow - header bands, centre + button
  accentInk: "#3A2A00", // text on the yellow
  accentInkSoft: "#5C4400",
  success: "#17804D",
  successBg: "#E3F4EA",
  danger: "#B42A4A",
  dangerBg: "#FBE6EB",
  warning: "#9A5B00",
  amberBg: "#FDF1DC",
  hill: "#8CC152",
  hillDark: "#5E9E32",
  scrim: "rgba(31,42,20,0.5)",
};

/** Pastel circle colours used behind icons, tiles and avatars, in order. */
export const chipColors: { bg: string; fg: string }[] = [
  { bg: "#FFD166", fg: "#22190F" },
  { bg: "#9ED27B", fg: "#22190F" },
  { bg: "#FF9F80", fg: "#22190F" },
  { bg: "#9FD8EA", fg: "#22190F" },
  { bg: "#D7B8F3", fg: "#22190F" },
  { bg: "#F7B7C9", fg: "#22190F" },
];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 12,
  md: 18, // inputs
  lg: 28, // cards
  xl: 32, // header band corners
  pill: 999,
};

/** Soft warm drop shadow used on cards and floating surfaces. */
export const shadow = {
  shadowColor: "#5A4600",
  shadowOpacity: 0.1,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

/** Baloo 2 faces, one family per weight (Android can't synthesise weights for custom fonts). */
export const fonts = {
  regular: "Baloo2_400Regular",
  medium: "Baloo2_500Medium",
  semibold: "Baloo2_600SemiBold",
  bold: "Baloo2_700Bold",
  extrabold: "Baloo2_800ExtraBold",
};

export function fontForWeight(weight?: string | number): string {
  switch (String(weight ?? "400")) {
    case "500":
      return fonts.medium;
    case "600":
      return fonts.semibold;
    case "bold":
    case "700":
      return fonts.bold;
    case "800":
    case "900":
      return fonts.extrabold;
    default:
      return fonts.regular;
  }
}
