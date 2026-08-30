import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { ChipSelect } from "../../../components/ChipSelect";
import { colors, radius, spacing } from "../../../components/theme";
import { useHarvests } from "../hooks/useHarvests";

const PAYMENT_STATUSES = ["pending", "partial", "paid"];

function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function HarvestFormScreen({ navigation }: { navigation: any }) {
  const { createHarvest, crops } = useHarvests();
  const [cropId, setCropId] = useState<number | null>(crops[0]?.id ?? null);
  const [date, setDate] = useState(todayIso());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weightKg, setWeightKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [buyer, setBuyer] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pending");
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
        date,
        cropId,
        weightKg: weight,
        pricePerKg: pricePerKg ? Number(pricePerKg) : undefined,
        buyer: buyer.trim() || undefined,
        paymentStatus,
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
      <Text style={styles.label}>Date *</Text>
      <Pressable style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
        <Text style={styles.dateText}>{fmtDate(date)}</Text>
      </Pressable>
      {showDatePicker ? (
        <DateTimePicker
          value={new Date(date)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          onChange={(event, selected) => {
            setShowDatePicker(Platform.OS === "ios");
            if (event.type === "set" && selected) {
              const d = new Date(selected.getTime() - selected.getTimezoneOffset() * 60_000);
              setDate(d.toISOString().slice(0, 10));
            }
          }}
        />
      ) : null}
      <TextField label="Weight (kg) *" keyboardType="decimal-pad" value={weightKg} onChangeText={setWeightKg} />
      <TextField label="Price per kg" keyboardType="decimal-pad" value={pricePerKg} onChangeText={setPricePerKg} />
      <TextField label="Buyer" value={buyer} onChangeText={setBuyer} />
      <ChipSelect
        label="Payment status"
        options={PAYMENT_STATUSES}
        value={paymentStatus}
        onChange={setPaymentStatus}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Save harvest" onPress={submit} loading={createHarvest.isPending} disabled={crops.length === 0} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  error: { color: colors.danger, marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: "500", color: colors.text, marginBottom: spacing.xs },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: "#fff",
    marginBottom: spacing.md,
  },
  dateText: { fontSize: 16, color: colors.text },
});
