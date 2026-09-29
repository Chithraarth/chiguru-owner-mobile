import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../../components/Text";
import { Logo } from "../../components/Logo";
import { Enter, Float, LivingHills, LoadingDots } from "../../components/motion";
import { colors } from "../../components/theme";

/** Full-screen yellow splash with the logo, name and a pulsing loader - shown while the app starts up. */
export function SplashView({ label }: { label?: string }) {
  return (
    <View style={styles.screen}>
      <LivingHills height={260} />
      <View style={styles.center}>
        <Enter kind="pop" delay={100}>
          <Float delay={1000}>
            <Logo size={96} />
          </Float>
        </Enter>
        <Enter delay={450}>
          <Text style={styles.name}>Chiguru</Text>
        </Enter>
        <Enter delay={650}>
          <Text style={styles.tagline}>खेती का साथी · Your farm’s friend</Text>
        </Enter>
        <Enter delay={900} style={{ marginTop: 26 }}>
          <LoadingDots />
        </Enter>
        {label ? (
          <Enter delay={1100}>
            <Text style={styles.label}>{label}</Text>
          </Enter>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.accent, overflow: "hidden" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingBottom: 140 },
  name: { fontSize: 44, fontWeight: "800", color: colors.accentInk, lineHeight: 52 },
  tagline: { fontSize: 18, fontWeight: "600", color: colors.accentInkSoft },
  label: { fontSize: 15, fontWeight: "600", color: colors.accentInkSoft },
});
