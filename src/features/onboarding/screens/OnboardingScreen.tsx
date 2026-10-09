import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, Check, Mail, MapPin, Plus, UserCheck, Users } from "lucide-react-native";
import * as Location from "expo-location";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Text } from "../../../components/Text";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { HeaderBand } from "../../../components/HarvestHeader";
import { BigTiles, SectionLabel } from "../../../components/harvest";
import { Enter, LivingHills, useReducedMotion } from "../../../components/motion";
import { colors, radius, shadow, spacing } from "../../../components/theme";
import { createEstate } from "../../../api/endpoints/estates";
import { createCrop } from "../../../api/endpoints/crops";
import { useEstateStore } from "../../estate/store/estateStore";
import { useT } from "../../../lib/i18n";

const SIZES: { label: string; acres: number }[] = [
  { label: "Under 5", acres: 3 },
  { label: "5–10", acres: 8 },
  { label: "10–50", acres: 25 },
  { label: "50+", acres: 60 },
];

const COMMON_CROPS = ["Soybean", "Sugarcane", "Tur", "Cotton", "Onion", "Grapes", "Pomegranate", "Jowar"];

const STEPS = [
  { title: "Tell us about your farm", sub: "Takes about a minute. Change anything later." },
  { title: "Where is your farm?", sub: "Used for weather, market prices and your work plan." },
  { title: "What do you grow?", sub: "Pick all that apply. Add plots and seasons later." },
];

/** Three-step "set up your farm" wizard, ending on a celebration screen with next steps. */
export function OnboardingScreen({ navigation }: { navigation?: any } = {}) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [farmName, setFarmName] = useState("");
  const [acres, setAcres] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState("Karnataka");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [crops, setCrops] = useState<string[]>([]);
  const [otherCrop, setOtherCrop] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const setActiveEstate = useEstateStore((s) => s.setActiveEstate);

  async function useMyLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      const [place] = await Location.reverseGeocodeAsync(pos.coords).catch(() => []);
      if (place) {
        if (!village && (place.city || place.district)) setVillage(place.city ?? place.district ?? "");
        if (!district && place.subregion) setDistrict(place.subregion);
        if (place.region) setStateName(place.region);
      }
    } catch {
      // best-effort: typing the place works just as well
    } finally {
      setLocating(false);
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      let position = coords;
      if (!position) {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === "granted") {
            const pos = await Location.getCurrentPositionAsync({});
            position = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          }
        } catch {
          // best-effort, non-fatal (mirrors the web app's onboarding wizard)
        }
      }

      const totalAcres = Number(acres);
      const profile = await createEstate({
        farmName: farmName.trim(),
        village: village.trim() || undefined,
        district: district.trim() || undefined,
        state: stateName.trim() || undefined,
        totalAcres: Number.isFinite(totalAcres) && totalAcres > 0 ? totalAcres : undefined,
        ...(position ?? {}),
      });
      if (!profile) throw new Error("Could not create farm - check your connection and try again.");

      await setActiveEstate(profile.id);

      const names = [...crops, ...otherCrop.split(",").map((c) => c.trim())].filter(Boolean);
      for (const name of Array.from(new Set(names))) {
        await createCrop({ name });
      }
      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estates"] });
      queryClient.invalidateQueries({ queryKey: ["farm-profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["crops"] });
      setCreatedName(farmName.trim());
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong"),
  });

  if (createdName) {
    return <FarmReady name={createdName} navigation={navigation} />;
  }

  const canNext = step === 0 ? farmName.trim().length > 0 : true;
  const last = step === STEPS.length - 1;

  function next() {
    setError(null);
    if (last) mutation.mutate();
    else setStep((s) => s + 1);
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
    else navigation?.goBack();
  }

  return (
    <View style={styles.container}>
      <HeaderBand
        title={STEPS[step].title}
        subtitle={STEPS[step].sub}
        onBack={back}
        right={<Text style={styles.stepCount}>{`${step + 1}/${STEPS.length}`}</Text>}
      />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Progress step={step} total={STEPS.length} />

        {step === 0 ? (
          <Enter key="s0" delay={100} style={styles.stepBody}>
            <TextField label="Farm name" value={farmName} onChangeText={setFarmName} placeholder="e.g. Patil Farm" containerStyle={{ marginBottom: 0 }} />
            <TextField label="Total area (acres)" value={acres} onChangeText={(v) => setAcres(v.replace(/[^\d.]/g, ""))} keyboardType="decimal-pad" containerStyle={{ marginBottom: 0 }} />
            <Text style={styles.fieldLabel}>Or pick a size</Text>
            <Chips options={SIZES.map((s) => s.label)} selected={SIZES.filter((s) => String(s.acres) === acres).map((s) => s.label)} onToggle={(l) => setAcres(String(SIZES.find((s) => s.label === l)!.acres))} />
          </Enter>
        ) : null}

        {step === 1 ? (
          <Enter key="s1" delay={100} style={styles.stepBody}>
            <View style={styles.map}>
              <View style={[styles.mapPlot, { left: 24, top: 18, width: 90, height: 60 }]} />
              <View style={[styles.mapPlot, { right: 30, bottom: 18, width: 110, height: 55 }]} />
              <View style={styles.mapPin}>
                <MapPin size={34} color={colors.danger} fill={colors.dangerBg} />
              </View>
              <View style={styles.mapBtn}>
                <Button
                  title={coords ? "Location added" : "Use my location"}
                  icon={coords ? Check : MapPin}
                  size="compact"
                  onPress={useMyLocation}
                  loading={locating}
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TextField label={t("onb.village")} value={village} onChangeText={setVillage} containerStyle={{ flex: 1, marginBottom: 0 }} />
              <TextField label={t("onb.district")} value={district} onChangeText={setDistrict} containerStyle={{ flex: 1, marginBottom: 0 }} />
            </View>
            <TextField label={t("onb.state")} value={stateName} onChangeText={setStateName} containerStyle={{ marginBottom: 0 }} />
          </Enter>
        ) : null}

        {step === 2 ? (
          <Enter key="s2" delay={100} style={styles.stepBody}>
            <Chips options={COMMON_CROPS} selected={crops} onToggle={(c) => setCrops((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]))} />
            <TextField label="Other crops" placeholder="e.g. Wheat, Chilli" value={otherCrop} onChangeText={setOtherCrop} containerStyle={{ marginBottom: 0 }} />
          </Enter>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <Enter delay={500} style={[styles.cta, { paddingBottom: insets.bottom + 20 }]}>
        <Button
          title={last ? "Create my farm" : step === 0 ? "Next: location" : "Next: crops"}
          icon={last ? Check : ArrowRight}
          onPress={next}
          loading={mutation.isPending}
          disabled={!canNext}
        />
      </Enter>
    </View>
  );
}

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.progress}>
      {Array.from({ length: total }, (_, i) => (
        <ProgressSegment key={i} filled={i <= step} delay={i === step ? 150 : 0} />
      ))}
    </View>
  );
}

function ProgressSegment({ filled, delay }: { filled: boolean; delay: number }) {
  const v = useRef(new Animated.Value(filled ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: filled ? 1 : 0, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [filled, delay, v]);
  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.segmentFill, { width: v.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
    </View>
  );
}

function Chips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (o: string) => void }) {
  return (
    <View style={styles.chips}>
      {options.map((o, i) => {
        const on = selected.includes(o);
        return (
          <Enter key={o} kind="pop" delay={250 + i * 60}>
            <Pressable
              onPress={() => onToggle(o)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[styles.chip, on && styles.chipOn]}
            >
              {on ? <Check size={16} color={colors.text} strokeWidth={2.6} /> : null}
              <Text style={styles.chipText}>{o}</Text>
            </Pressable>
          </Enter>
        );
      })}
    </View>
  );
}

const CONFETTI = ["#2F6B1F", "#FFFFFF", "#FF9F80", "#9FD8EA", "#D7B8F3", "#8CC152"];

function Confetto({ i }: { i: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true }));
    const t = setTimeout(() => loop.start(), (i * 370) % 2800);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [i, v]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: `${4 + i * 6.8}%`,
        width: i % 2 ? 8 : 10,
        height: i % 3 ? 14 : 8,
        borderRadius: i % 4 === 0 ? 5 : 2,
        backgroundColor: CONFETTI[i % CONFETTI.length],
        opacity: v.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-30, 380] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "540deg"] }) },
        ],
      }}
    />
  );
}

/** "Your farm is ready!" - tick that pops in with a ripple, confetti, and the first things to do. */
function FarmReady({ name, navigation }: { name: string; navigation?: any }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    const t = setTimeout(() => loop.start(), 1100);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [reduced, ring]);

  const go = (screen: string) => navigation?.navigate(screen);

  return (
    <View style={styles.container}>
      <View style={[styles.doneBand, { paddingTop: insets.top + 50 }]}>
        <LivingHills height={150} />
        {reduced ? null : Array.from({ length: 14 }, (_, i) => <Confetto key={i} i={i} />)}
        <Enter kind="pop" delay={300}>
          <View style={styles.tickWrap}>
            <Animated.View
              style={[
                styles.tickRing,
                {
                  opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                  transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
                },
              ]}
            />
            <View style={styles.tick}>
              <Enter kind="pop" delay={850}>
                <Check size={54} color="#FFFFFF" strokeWidth={3} />
              </Enter>
            </View>
          </View>
        </Enter>
        <Enter delay={700}>
          <Text style={styles.doneTitle}>{name} is ready!</Text>
        </Enter>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]}>
        <Enter delay={900}>
          <SectionLabel>Next steps</SectionLabel>
        </Enter>
        <Enter delay={1050}>
          <BigTiles
            items={[
              { icon: Users, title: "Add your workers", sub: "Names, pay type and rate", onPress: () => go("LabourRecords") },
              { icon: UserCheck, title: "Create a work group", sub: "e.g. Soybean weeding", onPress: () => go("WorkGroupForm") },
              { icon: Mail, title: "Invite a helper", sub: "They mark attendance for you", onPress: () => go("ManagerDevices") },
            ]}
          />
        </Enter>
      </ScrollView>

      <Enter delay={1200} style={[styles.cta, { paddingBottom: insets.bottom + 20 }]}>
        <Button title="Go to my farm" icon={ArrowRight} onPress={() => (navigation?.popToTop ? navigation.popToTop() : navigation?.goBack())} />
      </Enter>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 20, paddingTop: 16, gap: 14, paddingBottom: 120 },
  stepBody: { gap: 14 },
  stepCount: { fontSize: 15, fontWeight: "700", color: colors.accentInk },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  progress: { flexDirection: "row", gap: 6 },
  segment: { flex: 1, height: 10, borderRadius: 5, backgroundColor: "#EFE3BF", overflow: "hidden" },
  segmentFill: { height: "100%", borderRadius: 5, backgroundColor: colors.primary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 2.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.tint },
  chipText: { fontSize: 16, fontWeight: "700", color: colors.text },
  map: { height: 170, borderRadius: 24, backgroundColor: "#DCEBC6", overflow: "hidden", ...shadow },
  mapPlot: { position: "absolute", borderRadius: 8, backgroundColor: "#CFE3B0" },
  mapPin: { position: "absolute", left: "50%", top: 50, marginLeft: -17 },
  mapBtn: { position: "absolute", right: 12, bottom: 12 },
  error: { color: colors.danger, fontSize: 14.5, fontWeight: "600" },
  cta: { position: "absolute", left: 20, right: 20, bottom: 0 },
  doneBand: {
    height: 360,
    backgroundColor: colors.accent,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    overflow: "hidden",
    alignItems: "center",
    gap: 12,
  },
  tickWrap: { width: 96, height: 96, alignItems: "center", justifyContent: "center" },
  tickRing: { position: "absolute", width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary },
  tick: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 30, fontWeight: "800", color: colors.accentInk, textAlign: "center", paddingHorizontal: 20, lineHeight: 36 },
});
