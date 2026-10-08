import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { PlusCircle, X } from "lucide-react-native";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { SelectOrType } from "../../../components/SelectOrType";
import { FormFooter } from "../../../components/harvest";
import { colors, radius, spacing } from "../../../components/theme";
import { useCrops } from "../hooks/useCrops";
import { useT } from "../../../lib/i18n";
import type { Crop } from "../../../types/api";

const SEASONS = ["Annual", "Kharif", "Rabi", "Zaid", "Perennial"];

export function CropFormScreen({ navigation, route }: { navigation: any; route: any }) {
  const { t } = useT();
  const editCrop: Crop | undefined = route.params?.crop;
  const { data: crops = [], createCrop, updateCrop } = useCrops();
  const isEdit = !!editCrop;

  // Multi-add (create only): several crop names can be picked and saved in one go.
  // Create: each typed name becomes a removable chip, so several crops can
  // be added in one go. Edit: just the one name, edited in place.
  const [multiNames, setMultiNames] = useState<string[]>([]);
  const [customName, setCustomName] = useState(editCrop?.name ?? "");
  const [variety, setVariety] = useState(editCrop?.variety ?? "");
  const [acres, setAcres] = useState(editCrop?.acres ?? "");
  const [season, setSeason] = useState(editCrop?.season ?? "Annual");
  const [blockName, setBlockName] = useState(editCrop?.blockName ?? "");
  const [notes, setNotes] = useState(editCrop?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const existingNames = new Set(crops.filter((c) => c.id !== editCrop?.id).map((c) => c.name.toLowerCase()));

  function addCustomName() {
    const name = customName.trim();
    if (!name) return;
    if (!multiNames.some((n) => n.toLowerCase() === name.toLowerCase())) setMultiNames((cur) => [...cur, name]);
    setCustomName("");
  }

  function removeName(name: string) {
    setMultiNames((cur) => cur.filter((n) => n !== name));
  }

  // A name still sitting in the box (not yet added as a chip) counts too.
  function namesToSave(): string[] {
    const typed = customName.trim();
    const all = [...multiNames];
    if (typed && !all.some((n) => n.toLowerCase() === typed.toLowerCase())) {
      if (isEdit) return [typed];
      all.push(typed);
    }
    return all.filter(Boolean);
  }

  function submit() {
    setError(null);
    const names = namesToSave();
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
          { text: "Add anyway", onPress: () => doSave(names) },
        ]
      );
      return;
    }
    doSave(names);
  }

  function doSave(names: string[]) {
    const body = {
      variety: variety.trim() || undefined,
      acres: acres ? Number(acres) : undefined,
      season: season.trim() || undefined,
      blockName: blockName.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (isEdit && editCrop) {
      updateCrop.mutate({ id: editCrop.id, data: { ...body, name: names[0] } }, { onSuccess: () => navigation.goBack() });
      return;
    }

    Promise.all(names.map((name) => createCrop.mutateAsync({ name, ...body }))).then(
      () => navigation.goBack(),
      () => setError("Could not save one or more crops. Try again.")
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 110 }}>
      <TextField
        label="Crop name *"
        value={customName}
        onChangeText={setCustomName}
        onSubmitEditing={isEdit ? undefined : addCustomName}
        returnKeyType={isEdit ? "default" : "done"}
        blurOnSubmit={isEdit}
        autoCapitalize="words"
        placeholder={isEdit ? "" : "Type a crop, e.g. Coffee"}
        containerStyle={!isEdit ? { marginBottom: spacing.xs } : undefined}
        rightElement={
          !isEdit && customName.trim() ? (
            <Pressable onPress={addCustomName} hitSlop={10} accessibilityRole="button" accessibilityLabel="Add this crop">
              <PlusCircle size={26} color={colors.primary} />
            </Pressable>
          ) : undefined
        }
      />
      {!isEdit ? (
        <Text style={styles.hint}>Adding more than one? Press Done after each name.</Text>
      ) : null}
      {!isEdit && multiNames.length > 0 ? (
        <View style={styles.chipRow}>
          {multiNames.map((n) => (
            <Pressable
              key={n}
              onPress={() => removeName(n)}
              style={styles.chip}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${n}`}
            >
              <Text style={styles.chipText}>{n}</Text>
              <X size={16} color={colors.text} strokeWidth={2.6} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <TextField label="Variety" value={variety} onChangeText={setVariety} />
      <TextField label="Acres" keyboardType="decimal-pad" value={acres} onChangeText={setAcres} />
      <SelectOrType label="Season" options={SEASONS} value={season} onChange={setSeason} />
      <TextField label="Block / plot name" value={blockName} onChangeText={setBlockName} />
      <TextField label="Notes" multiline numberOfLines={2} value={notes} onChangeText={setNotes} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
    <FormFooter>
      <Button
          title={isEdit ? "Save changes" : namesToSave().length > 1 ? `Add ${namesToSave().length} crops` : "Add crop"}
          onPress={submit}
          loading={createCrop.isPending || updateCrop.isPending}
        />
    </FormFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.tint },
  chipText: { fontSize: 15.5, fontWeight: "700", color: colors.text },
  container: { flex: 1, backgroundColor: colors.bg },
  error: { color: colors.danger, marginBottom: spacing.md },
});
