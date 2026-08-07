import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { colors, spacing } from "../../../components/theme";
import { createEstate } from "../../../api/endpoints/estates";
import { createCrop } from "../../../api/endpoints/crops";
import { useEstateStore } from "../../estate/store/estateStore";
import { useT } from "../../../lib/i18n";

export function OnboardingScreen({ navigation }: { navigation?: any } = {}) {
  const { t } = useT();
  const [farmName, setFarmName] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState("Karnataka");
  const [cropName, setCropName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const setActiveEstate = useEstateStore((s) => s.setActiveEstate);

  const mutation = useMutation({
    mutationFn: async () => {
      let coords: { latitude?: number; longitude?: number } = {};
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({});
          coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        }
      } catch {
        // best-effort, non-fatal (mirrors the web app's onboarding wizard)
      }

      const profile = await createEstate({
        farmName: farmName.trim(),
        village: village.trim() || undefined,
        district: district.trim() || undefined,
        state: stateName.trim() || undefined,
        ...coords,
      });
      if (!profile) throw new Error("Could not create farm - check your connection and try again.");

      await setActiveEstate(profile.id);

      if (cropName.trim()) {
        await createCrop({ name: cropName.trim() });
      }

      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estates"] });
      queryClient.invalidateQueries({ queryKey: ["farm-profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigation?.goBack();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong"),
  });

  const canSubmit = farmName.trim().length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.title}>{t("home.setupFarm")}</Text>
      <Text style={styles.subtitle}>Tell us a little about your farm to get started.</Text>

      <TextField label="Farm name *" value={farmName} onChangeText={setFarmName} />
      <TextField label={t("onb.village")} value={village} onChangeText={setVillage} />
      <TextField label={t("onb.district")} value={district} onChangeText={setDistrict} />
      <TextField label={t("onb.state")} value={stateName} onChangeText={setStateName} />
      <TextField label="First crop (optional)" value={cropName} onChangeText={setCropName} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title="Create my farm"
        onPress={() => mutation.mutate()}
        loading={mutation.isPending}
        disabled={!canSubmit}
      />

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, marginBottom: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md },
});
