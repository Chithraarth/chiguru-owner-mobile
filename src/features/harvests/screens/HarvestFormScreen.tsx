import React, { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { ChipSelect } from "../../../components/ChipSelect";
import { colors, spacing } from "../../../components/theme";
import { useHarvests } from "../hooks/useHarvests";

function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function HarvestFormScreen({ navigation }: { navigation: any }) {
  const { createHarvest, crops } = useHarvests();
  const [cropId, setCropId] = useState<number | null>(crops[0]?.id ?? null);
  const [weightKg, setWeightKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [buyer, setBuyer] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!cropId) {
      setError("Select a crop");
      return;
    }
    const weight = Number(weightKg);
    if (!weight || weight <= 0) {
      setError("Enter the weight harvested");
      return;
    }
    createHarvest.mutate(
      {
        date: todayIso(),
        cropId,
        weightKg: weight,
        pricePerKg: pricePerKg ? Number(pricePerKg) : undefined,
        buyer: buyer.trim() || undefined,
      },
      { onSuccess: () => navigation.goBack() }
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      {crops.length > 0 ? (
        <ChipSelect
          label="Crop *"
          options={crops.map((c) => c.name)}
          value={crops.find((c) => c.id === cropId)?.name ?? ""}
          onChange={(name) => setCropId(crops.find((c) => c.name === name)?.id ?? null)}
        />
      ) : (
        <Text style={styles.error}>Add a crop first before logging a harvest.</Text>
      )}
      <TextField label="Weight (kg) *" keyboardType="decimal-pad" value={weightKg} onChangeText={setWeightKg} />
      <TextField label="Price per kg" keyboardType="decimal-pad" value={pricePerKg} onChangeText={setPricePerKg} />
      <TextField label="Buyer" value={buyer} onChangeText={setBuyer} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Save harvest" onPress={submit} loading={createHarvest.isPending} disabled={crops.length === 0} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  error: { color: colors.danger, marginBottom: spacing.md },
});
