import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { ChipSelect } from "../../../components/ChipSelect";
import { SelectOrType } from "../../../components/SelectOrType";
import { colors, spacing } from "../../../components/theme";
import { useCrops } from "../hooks/useCrops";
import { useT } from "../../../lib/i18n";
import type { Crop } from "../../../types/api";

const CROP_NAMES = ["Coffee", "Pepper", "Cardamom", "Arecanut", "Sugarcane", "Banana", "Orange", "Other"];
const SEASONS = ["Annual", "Kharif", "Rabi", "Zaid", "Perennial"];

export function CropFormScreen({ navigation, route }: { navigation: any; route: any }) {
  const { t } = useT();
  const editCrop: Crop | undefined = route.params?.crop;
  const { data: crops = [], createCrop, updateCrop } = useCrops();
  const isEdit = !!editCrop;

  // Multi-add (create only): several crop names can be picked and saved in one go.
  const [multiNames, setMultiNames] = useState<string[]>(editCrop ? [editCrop.name] : []);
  const [customName, setCustomName] = useState("");
  const [variety, setVariety] = useState(editCrop?.variety ?? "");
  const [acres, setAcres] = useState(editCrop?.acres ?? "");
  const [season, setSeason] = useState(editCrop?.season ?? "Annual");
  const [blockName, setBlockName] = useState(editCrop?.blockName ?? "");
  const [notes, setNotes] = useState(editCrop?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const existingNames = new Set(crops.filter((c) => c.id !== editCrop?.id).map((c) => c.name.toLowerCase()));

  function toggleName(name: string) {
    if (isEdit) {
      setMultiNames([name]);
      return;
    }
    setMultiNames((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]));
  }

  function addCustomName() {
    const name = customName.trim();
    if (!name) return;
    if (!multiNames.includes(name)) setMultiNames((cur) => (isEdit ? [name] : [...cur, name]));
    setCustomName("");
  }

  function submit() {
    setError(null);
    const names = multiNames.filter(Boolean);
    if (names.length === 0) {
      setError("Pick or type at least one crop name");
      return;
    }

    const duplicate = names.find((n) => existingNames.has(n.toLowerCase()));
    if (duplicate) {
      Alert.alert(
        "Crop already exists",
        `"${duplicate}" is already on this farm. Add it again anyway?`,
        [
          { text: t("scan.cancel"), style: "cancel" },
          { text: "Add anyway", onPress: doSave },
        ]
      );
      return;
    }
    doSave();
  }

  function doSave() {
    const body = {
      variety: variety.trim() || undefined,
      acres: acres ? Number(acres) : undefined,
      season: season.trim() || undefined,
      blockName: blockName.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (isEdit && editCrop) {
      updateCrop.mutate({ id: editCrop.id, data: { ...body, name: multiNames[0] } }, { onSuccess: () => navigation.goBack() });
      return;
    }

    Promise.all(multiNames.map((name) => createCrop.mutateAsync({ name, ...body }))).then(
      () => navigation.goBack(),
      () => setError("Could not save one or more crops. Try again.")
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <ChipSelect
        label={isEdit ? "Crop name *" : "Crop name(s) * — tap to select multiple"}
        options={CROP_NAMES}
        value={multiNames.length === 1 ? multiNames[0] : ""}
        onChange={toggleName}
      />
      {!isEdit ? (
        <>
          <TextField
            label="Or type a custom crop name"
            value={customName}
            onChangeText={setCustomName}
            onSubmitEditing={addCustomName}
            placeholder="e.g. Vanilla"
          />
          <Button title="+ Add name" variant="secondary" size="compact" onPress={addCustomName} />
        </>
      ) : null}
      {multiNames.length > 0 ? (
        <Text style={styles.selectedNames}>
          Selected: {multiNames.join(", ")}
        </Text>
      ) : null}
      <TextField label="Variety" value={variety} onChangeText={setVariety} />
      <TextField label="Acres" keyboardType="decimal-pad" value={acres} onChangeText={setAcres} />
      <SelectOrType label="Season" options={SEASONS} value={season} onChange={setSeason} />
      <TextField label="Block / plot name" value={blockName} onChangeText={setBlockName} />
      <TextField label="Notes" multiline numberOfLines={2} value={notes} onChangeText={setNotes} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title={isEdit ? "Save changes" : multiNames.length > 1 ? `Add ${multiNames.length} crops` : "Add crop"}
        onPress={submit}
        loading={createCrop.isPending || updateCrop.isPending}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  error: { color: colors.danger, marginBottom: spacing.md },
  selectedNames: { fontSize: 13, color: colors.textMuted, marginTop: -spacing.sm, marginBottom: spacing.md },
});
