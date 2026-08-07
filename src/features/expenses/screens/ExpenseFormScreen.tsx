import React, { useState } from "react";
import { Image, ScrollView, StyleSheet, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { ChipSelect } from "../../../components/ChipSelect";
import { colors, spacing } from "../../../components/theme";
import { useExpenses } from "../hooks/useExpenses";
import { compressWithFallback } from "../../../lib/imageCompression";
import { useT } from "../../../lib/i18n";
import type { ExpenseCategory } from "../../../types/api";

const CATEGORIES: ExpenseCategory[] = [
  "Fertilizer",
  "Pesticide",
  "Fungicide",
  "Seeds / Seedlings",
  "Labour",
  "Equipment",
  "Fuel",
  "Water / Irrigation",
  "Transport",
  "Storage",
  "Electricity",
  "Other",
];

function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const TODAY = todayIso();
function yesterdayIso() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
const YESTERDAY = yesterdayIso();

export function ExpenseFormScreen({ navigation }: { navigation: any }) {
  const { createExpense, crops } = useExpenses();
  const { t } = useT();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Fertilizer");
  const [customCategory, setCustomCategory] = useState("");
  const [date, setDate] = useState(TODAY);
  const [cropId, setCropId] = useState<number | null>(null);
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  async function pickReceipt() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;

    setPhotoUri(result.assets[0].uri);
    setCompressing(true);
    try {
      const dataUrl = await compressWithFallback(result.assets[0].uri, "receipt");
      setPhotoDataUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo too large, try a simpler shot");
      setPhotoUri(null);
    } finally {
      setCompressing(false);
    }
  }

  function submit() {
    setError(null);
    const amountNum = Number(amount);
    if (!amount || Number.isNaN(amountNum) || amountNum <= 0) {
      setError("Enter the amount spent");
      return;
    }
    if (!photoDataUrl) {
      setError("Bill photo required");
      return;
    }
    createExpense.mutate(
      {
        date,
        cropId: cropId ?? undefined,
        category: category === "Other" && customCategory.trim() ? customCategory.trim() : category,
        amount: amountNum,
        description: description.trim() || undefined,
        vendor: vendor.trim() || undefined,
        receiptUrl: photoDataUrl,
      },
      {
        onSuccess: () => navigation.goBack(),
        onError: (err) => setError(err instanceof Error ? err.message : "Could not save expense"),
      }
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <TextField
        label="Amount spent *"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <ChipSelect
        label="Date"
        options={["Today", "Yesterday"]}
        value={date === YESTERDAY ? "Yesterday" : "Today"}
        onChange={(v) => setDate(v === "Yesterday" ? YESTERDAY : TODAY)}
      />
      <ChipSelect
        label="Category"
        options={CATEGORIES}
        value={category}
        onChange={(v) => setCategory(v as ExpenseCategory)}
      />
      {category === "Other" ? (
        <TextField label="Specify category" value={customCategory} onChangeText={setCustomCategory} />
      ) : null}
      {crops.length > 0 ? (
        <ChipSelect
          label="Crop (optional)"
          options={["None", ...crops.map((c) => c.name)]}
          value={cropId ? crops.find((c) => c.id === cropId)?.name ?? "None" : "None"}
          onChange={(name) => {
            const crop = crops.find((c) => c.name === name);
            setCropId(crop?.id ?? null);
          }}
        />
      ) : null}
      <TextField label="Vendor" value={vendor} onChangeText={setVendor} />
      <TextField label={t("scan.descLabel")} multiline numberOfLines={2} value={description} onChangeText={setDescription} />

      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.preview} />
      ) : (
        <Button
          title="📷 Take bill photo *"
          variant="secondary"
          onPress={pickReceipt}
          loading={compressing}
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Save expense" onPress={submit} loading={createExpense.isPending} disabled={compressing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  preview: { width: "100%", height: 200, borderRadius: 12, marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
});
