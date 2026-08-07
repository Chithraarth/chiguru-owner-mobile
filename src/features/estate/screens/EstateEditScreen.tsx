import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { LoadingView } from "../../../components/StateViews";
import { colors, spacing } from "../../../components/theme";
import { getFarmProfile, updateFarmProfile } from "../../../api/endpoints/estates";
import { useEstates } from "../hooks/useEstates";
import { useT } from "../../../lib/i18n";

export function EstateEditScreen({ navigation, route }: { navigation: any; route: any }) {
  const { t } = useT();
  const { estateId, estateName } = route.params as { estateId: number; estateName: string };
  const { switchEstate } = useEstates();
  const queryClient = useQueryClient();
  const [switched, setSwitched] = useState(false);

  const [farmName, setFarmName] = useState(estateName ?? "");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState("");
  const [totalAcres, setTotalAcres] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    switchEstate(estateId).then(() => setSwitched(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estateId]);

  const profileQuery = useQuery({
    queryKey: ["farm-profile", estateId],
    queryFn: getFarmProfile,
    enabled: switched,
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setFarmName(profileQuery.data.farmName ?? "");
    setVillage(profileQuery.data.village ?? "");
    setDistrict(profileQuery.data.district ?? "");
    setStateName(profileQuery.data.state ?? "");
    setTotalAcres(profileQuery.data.totalAcres ?? "");
  }, [profileQuery.data]);

  const mutation = useMutation({
    mutationFn: () =>
      updateFarmProfile({
        farmName: farmName.trim(),
        village: village.trim() || undefined,
        district: district.trim() || undefined,
        state: stateName.trim() || undefined,
        totalAcres: totalAcres.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estates"] });
      queryClient.invalidateQueries({ queryKey: ["farm-profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigation.goBack();
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : "Something went wrong"),
  });

  const canSubmit = farmName.trim().length > 0;

  if (!switched || profileQuery.isLoading) return <LoadingView label="Loading farm details..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.title}>{t("estate.editEstate")}</Text>
      <Text style={styles.subtitle}>Update location, size, and other details for this farm.</Text>

      <TextField label={`${t("estate.estateName")} *`} value={farmName} onChangeText={setFarmName} />
      <TextField label={t("estate.village")} value={village} onChangeText={setVillage} />
      <TextField label={t("estate.district")} value={district} onChangeText={setDistrict} />
      <TextField label={t("estate.state")} value={stateName} onChangeText={setStateName} />
      <TextField label={t("estate.acres")} keyboardType="decimal-pad" value={totalAcres} onChangeText={setTotalAcres} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title={t("estate.saveChanges")} onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />

      <View style={{ height: spacing.md }} />
      <Button title="Manage crops" variant="secondary" onPress={() => navigation.navigate("Crops")} />

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
