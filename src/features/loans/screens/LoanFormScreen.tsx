import React, { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { ChipSelect } from "../../../components/ChipSelect";
import { colors, spacing } from "../../../components/theme";
import { useLoans } from "../hooks/useLoans";

function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function LoanFormScreen({ navigation }: { navigation: any }) {
  const { createLoan, workers } = useLoans();
  const [workerId, setWorkerId] = useState<number | null>(workers[0]?.id ?? null);
  const [amount, setAmount] = useState("");
  const [interestPct, setInterestPct] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!workerId) {
      setError("Select a worker");
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid loan amount");
      return;
    }
    createLoan.mutate(
      {
        workerId,
        amount: amt,
        interestPct: interestPct ? Number(interestPct) : undefined,
        issuedDate: todayIso(),
        notes: notes.trim() || undefined,
      },
      { onSuccess: () => navigation.goBack() }
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      {workers.length > 0 ? (
        <ChipSelect
          label="Worker *"
          options={workers.map((w) => w.name)}
          value={workers.find((w) => w.id === workerId)?.name ?? ""}
          onChange={(name) => setWorkerId(workers.find((w) => w.name === name)?.id ?? null)}
        />
      ) : (
        <Text style={styles.error}>Add a worker first before issuing a loan.</Text>
      )}
      <TextField label="Amount *" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      <TextField label="Interest % (optional)" keyboardType="decimal-pad" value={interestPct} onChangeText={setInterestPct} />
      <TextField label="Notes" multiline numberOfLines={2} value={notes} onChangeText={setNotes} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Issue loan" onPress={submit} loading={createLoan.isPending} disabled={workers.length === 0} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  error: { color: colors.danger, marginBottom: spacing.md },
});
