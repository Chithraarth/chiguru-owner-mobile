import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { ChipSelect } from "../../../components/ChipSelect";
import { colors, spacing } from "../../../components/theme";
import { useYearPlan } from "../hooks/useYearPlan";
import type { PlanTask, PlanTaskCategory } from "../../../types/api";

const CATEGORIES: { value: PlanTaskCategory; label: string }[] = [
  { value: "fertilizer", label: "Fertilizer" },
  { value: "spray", label: "Spray" },
  { value: "irrigation", label: "Irrigation" },
  { value: "pruning", label: "Pruning" },
  { value: "harvest", label: "Harvest" },
  { value: "other", label: "Other" },
];

function next12Months(): string[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function PlanTaskFormScreen({ navigation, route }: { navigation: any; route: any }) {
  const task: PlanTask | undefined = route.params?.task;
  const defaultMonth: string | undefined = route.params?.defaultMonth;
  const defaultDay: number | undefined = route.params?.defaultDay;
  const months = next12Months();
  const { crops, saveTask, removeTask } = useYearPlan();

  const [month, setMonth] = useState(task?.month ?? defaultMonth ?? months[0]);
  const [day, setDay] = useState(task?.day != null ? String(task.day) : defaultDay != null ? String(defaultDay) : "");
  const [title, setTitle] = useState(task?.title ?? "");
  const [details, setDetails] = useState(task?.details ?? "");
  const [category, setCategory] = useState<PlanTaskCategory>(task?.category ?? "other");
  const [cropId, setCropId] = useState(task?.cropId != null ? String(task.cropId) : "");
  const [error, setError] = useState<string | null>(null);

  const cropOptions = ["Whole farm", ...crops.map((c) => c.name)];
  const selectedCropLabel = cropId ? crops.find((c) => String(c.id) === cropId)?.name ?? "Whole farm" : "Whole farm";

  function submit() {
    if (!title.trim()) {
      setError("Enter a task title");
      return;
    }
    setError(null);
    saveTask.mutate(
      {
        id: task?.id ?? null,
        month,
        day: day ? Number(day) : null,
        title: title.trim(),
        details: details.trim() || null,
        category,
        cropId: cropId ? Number(cropId) : null,
        clientId: task ? undefined : `plan-task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
      { onSuccess: () => navigation.goBack() }
    );
  }

  function onDelete() {
    if (!task) return;
    removeTask.mutate(task.id, { onSuccess: () => navigation.goBack() });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <TextField label="Task title *" value={title} onChangeText={setTitle} placeholder="e.g. Apply NPK fertilizer" />
      <TextField
        label="Details"
        value={details}
        onChangeText={setDetails}
        multiline
        numberOfLines={3}
        style={{ minHeight: 72, textAlignVertical: "top" }}
      />
      <ChipSelect label="Month" options={months.map(monthLabel)} value={monthLabel(month)} onChange={(v) => setMonth(months[months.map(monthLabel).indexOf(v)])} />
      <TextField label="Day of month (optional)" value={day} onChangeText={(v) => setDay(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="Leave blank for whole month" />
      <ChipSelect label="Category" options={CATEGORIES.map((c) => c.label)} value={CATEGORIES.find((c) => c.value === category)?.label ?? "Other"} onChange={(v) => setCategory(CATEGORIES.find((c) => c.label === v)?.value ?? "other")} />
      <ChipSelect
        label="Crop"
        options={cropOptions}
        value={selectedCropLabel}
        onChange={(v) => setCropId(v === "Whole farm" ? "" : String(crops.find((c) => c.name === v)?.id ?? ""))}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={task ? "Save changes" : "Add task"} onPress={submit} loading={saveTask.isPending} />
      {task ? (
        <View style={{ marginTop: spacing.sm }}>
          <Button title="Delete task" variant="danger" onPress={onDelete} loading={removeTask.isPending} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  error: { color: colors.danger, marginBottom: spacing.md },
});
