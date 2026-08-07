import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { ChipSelect } from "../../../components/ChipSelect";
import { SelectOrType } from "../../../components/SelectOrType";
import { colors, spacing } from "../../../components/theme";
import { useWorkGroups } from "../hooks/useWorkGroups";
import { countWorkersFromPhoto } from "../../../api/endpoints/workGroups";
import { compressToDataUrl } from "../../../lib/imageCompression";
import type { PayFrequency, PaymentType } from "../../../types/api";

const CATEGORIES = [
  "Harvest / Cutting",
  "Pruning",
  "Manuring",
  "Drone spraying",
  "Fertilizer application",
  "Weeding",
  "Irrigation",
  "Planting",
];
const LABOUR_TYPES = ["General labour", "Skilled labour", "Machine operator", "Drone operator", "Contractor"];
const PAYMENT_TYPES: PaymentType[] = ["Per day", "Per hour", "Per acre", "Per kg"];
const PAY_FREQUENCIES: PayFrequency[] = ["daily", "weekly-5", "weekly-6", "weekly-7", "monthly"];

export function WorkGroupFormScreen({ navigation }: { navigation: any }) {
  const { createWorkGroup } = useWorkGroups();

  const [name, setName] = useState("");
  const [blockName, setBlockName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [labourType, setLabourType] = useState(LABOUR_TYPES[0]);
  const [paymentType, setPaymentType] = useState<PaymentType>("Per day");
  const [rate, setRate] = useState("");
  const [advancePerUnit, setAdvancePerUnit] = useState("");
  const [payFrequency, setPayFrequency] = useState<PayFrequency>("daily");
  const [expectedWorkers, setExpectedWorkers] = useState("");
  const [loanTaken, setLoanTaken] = useState("");
  const [loanNotes, setLoanNotes] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function scanHeadcount() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;

    setScanning(true);
    try {
      const dataUrl = await compressToDataUrl(result.assets[0].uri, "ai");
      const { count } = await countWorkersFromPhoto(dataUrl);
      setExpectedWorkers(String(count));
    } catch {
      Alert.alert("AI headcount failed", "Could not count workers from that photo. Try again or enter manually.");
    } finally {
      setScanning(false);
    }
  }

  function submit() {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Enter a work name");
      return;
    }
    const rateNum = Number(rate);
    if (!Number.isFinite(rateNum) || rateNum <= 0) {
      setError("Enter a valid rate");
      return;
    }
    createWorkGroup.mutate(
      {
        name: trimmedName,
        blockName: blockName.trim() || undefined,
        category,
        labourType,
        paymentType,
        rate: rateNum,
        advancePerUnit: advancePerUnit ? Number(advancePerUnit) : undefined,
        payFrequency,
        expectedWorkers: expectedWorkers ? Number(expectedWorkers) : undefined,
        loanTaken: loanTaken ? Number(loanTaken) : undefined,
        loanNotes: loanNotes.trim() || undefined,
      },
      { onSuccess: () => navigation.goBack() }
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <TextField label="Work name *" value={name} onChangeText={setName} />
      <TextField label="Block / area" value={blockName} onChangeText={setBlockName} />
      <SelectOrType label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
      <SelectOrType label="Labour type" options={LABOUR_TYPES} value={labourType} onChange={setLabourType} />
      <ChipSelect
        label="Payment type"
        options={PAYMENT_TYPES}
        value={paymentType}
        onChange={(v) => setPaymentType(v as PaymentType)}
      />
      <TextField label="Rate *" keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
      <TextField
        label="Advance per unit (optional)"
        keyboardType="decimal-pad"
        value={advancePerUnit}
        onChangeText={setAdvancePerUnit}
      />
      {rate && advancePerUnit ? (
        <Text style={styles.heldPreview}>
          Amount held: {(Number(rate) - Number(advancePerUnit)).toFixed(2)} per unit
        </Text>
      ) : null}
      <TextField
        label="Loan given at start (optional)"
        keyboardType="decimal-pad"
        value={loanTaken}
        onChangeText={setLoanTaken}
      />
      {loanTaken ? (
        <TextField label="Loan notes" value={loanNotes} onChangeText={setLoanNotes} />
      ) : null}
      <ChipSelect
        label="Pay frequency"
        options={PAY_FREQUENCIES}
        value={payFrequency}
        onChange={(v) => setPayFrequency(v as PayFrequency)}
      />
      <TextField
        label="Expected workers"
        keyboardType="number-pad"
        value={expectedWorkers}
        onChangeText={setExpectedWorkers}
      />
      <Button title="📷 Scan headcount with AI" variant="secondary" onPress={scanHeadcount} loading={scanning} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title="Create work group"
        onPress={submit}
        loading={createWorkGroup.isPending}
        disabled={scanning}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  error: { color: colors.danger, marginBottom: spacing.md },
  heldPreview: { fontSize: 12, color: colors.textMuted, marginTop: -spacing.sm, marginBottom: spacing.md },
});
