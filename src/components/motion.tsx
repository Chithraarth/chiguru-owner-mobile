// Gentle motion for the Harvest Sun screens: content that fades up or pops in
// when a screen opens, things that keep floating, and the living hills (sun
// that glows, sprouts that sway). All of it switches off when the phone's
// "reduce motion" setting is on.
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { HillsArt, SPROUT_XS } from "./harvest";
import { colors } from "./theme";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

type EnterKind = "up" | "down" | "pop" | "fade";

/** Plays once on mount: fades up (default), drops down, or pops in with a small overshoot. */
export function Enter({
  children,
  delay = 0,
  kind = "up",
  duration,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  kind?: EnterKind;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      v.setValue(1);
      return;
    }
    const anim =
      kind === "pop"
        ? Animated.spring(v, { toValue: 1, delay, friction: 5, tension: 90, useNativeDriver: true })
        : Animated.timing(v, {
            toValue: 1,
            delay,
            duration: duration ?? (kind === "down" ? 650 : 560),
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
            useNativeDriver: true,
          });
    anim.start();
    return () => anim.stop();
  }, [reduced, v, delay, kind, duration]);

  const transform =
    kind === "pop"
      ? [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }]
      : kind === "down"
        ? [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] }) }]
        : kind === "up"
          ? [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }]
          : [];
  const opacity = v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });
  return <Animated.View style={[style, { opacity, transform }]}>{children}</Animated.View>;
}

/** Keeps a child bobbing up and down after `delay`. */
export function Float({ children, delay = 0, distance = 10, period = 3600, style }: { children: React.ReactNode; delay?: number; distance?: number; period?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [reduced, v, delay, period]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] });
  return <Animated.View style={[style, { transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** A loop between 0 and 1 (ping-pong), for glows, sways and nudges. */
function usePingPong(period: number, delay = 0, reduced = false) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [v, period, delay, reduced]);
  return v;
}

/** Nudges its child right and back, e.g. the arrow on a "Next" button. */
export function Nudge({ children, delay = 1600 }: { children: React.ReactNode; delay?: number }) {
  const reduced = useReducedMotion();
  const v = usePingPong(1200, delay, reduced);
  return <Animated.View style={{ transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }) }] }}>{children}</Animated.View>;
}

/** Small side-to-side wiggle loop (icons, the greeting). */
export function Wiggle({ children, delay = 1400, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const v = usePingPong(2800, delay, reduced);
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ["-5deg", "5deg"] });
  return <Animated.View style={[style, { transform: [{ rotate }] }]}>{children}</Animated.View>;
}

function Sprout({ leftPct, height, index, reduced }: { leftPct: number; height: number; index: number; reduced: boolean }) {
  const v = usePingPong(index % 3 === 2 ? 3200 : 2600, index % 2 ? 0 : 1300, reduced);
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ["-8deg", "8deg"] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: `${leftPct}%`,
        bottom: 6,
        width: 14,
        height: 26,
        marginLeft: -7,
        transformOrigin: "bottom",
        transform: [{ rotate }],
      }}
    >
      <Svg width={14} height={26} viewBox="0 0 14 26">
        <Path d="M7 26 v-18 M2 14 q5 -8 5 -12 q0 4 5 12" stroke={colors.primary} strokeWidth={2} fill="none" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

/**
 * The rolling hills that rise into place on load, with a softly glowing sun
 * and sprouts swaying in the breeze. Drop it inside a yellow band (it
 * anchors to the band's bottom edge).
 */
export function LivingHills({ height = 150, rise = true }: { height?: number; rise?: boolean }) {
  const reduced = useReducedMotion();
  const sun = usePingPong(4000, 0, reduced);
  const up = useRef(new Animated.Value(rise ? 0 : 1)).current;
  useEffect(() => {
    if (!rise || reduced) {
      up.setValue(1);
      return;
    }
    Animated.timing(up, { toValue: 1, duration: 1000, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start();
  }, [rise, reduced, up]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height,
        transform: [{ translateY: up.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) }],
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          left: "82.5%",
          top: Math.min(40, height * 0.3) - 26,
          marginLeft: -26,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: "#FFFFFF",
          opacity: sun.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.85] }),
          transform: [{ scale: sun.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) }],
        }}
      />
      <HillsArt height={height} sun={false} sprouts={false} />
      {SPROUT_XS.map((x, i) => (
        <Sprout key={x} leftPct={(x / 400) * 100} height={height} index={i} reduced={reduced} />
      ))}
    </Animated.View>
  );
}

/** Three dots pulsing in turn - the splash loader. */
export function LoadingDots({ color = colors.primary }: { color?: string }) {
  const reduced = useReducedMotion();
  const a = usePingPong(1200, 0, reduced);
  const b = usePingPong(1200, 150, reduced);
  const c = usePingPong(1200, 300, reduced);
  return (
    <View style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}>
      {[a, b, c].map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: color,
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
          }}
        />
      ))}
    </View>
  );
}
