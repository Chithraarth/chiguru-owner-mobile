// Matches chiguru-owner-web's "Lavender & Indigo" design tokens, converted
// from the HSL values in src/index.css (:root, light mode) to hex so React
// Native's StyleSheet can use them directly.
export const colors = {
  bg: "#F8F7FC", // hsl(250 45% 98%)
  card: "#FFFFFF", // hsl(0 0% 100%)
  border: "#E4E1EC", // hsl(248 25% 90%)
  text: "#1E1B33", // hsl(250 40% 15%)
  textMuted: "#6E6B80", // hsl(250 15% 45%)
  primary: "#2E2A54", // hsl(250 38% 25%)
  primaryDark: "#211E3D", // darker shade for pressed states
  secondary: "#E3E0EC", // hsl(248 30% 90%)
  muted: "#EAE8EF", // hsl(248 20% 92%)
  accent: "#7B3FBF", // hsl(270 40% 50%)
  danger: "#C23357", // hsl(350 60% 50%)
  warning: "#B7791F",
  amberBg: "#FEF3C7",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// chiguru-owner-web uses --radius: 1rem (16px) for cards, and fully pill-shaped
// (radius = height/2) primary buttons - see the "Create New Estate" button.
export const radius = {
  sm: 10,
  md: 16,
  lg: 20,
  pill: 999,
};
