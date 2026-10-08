import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { ChipSelect } from "../../../components/ChipSelect";
import { SelectOrType } from "../../../components/SelectOrType";
import { FormFooter } from "../../../components/harvest";
import { colors, spacing } from "../../../components/theme";
import { useCrops } from "../hooks/useCrops";
import { useT } from "../../../lib/i18n";
import type { Crop } from "../../../types/api";

const CROP_NAMES = ["Coffee", "Pepper", "Cardamom", "Arecanut", "Sugarcane", "Banana", "Orange"];
const OTHER = "+ Other";
const SEASONS = ["Annual", "Kharif", "Rabi", "Zaid", "Perennial"];

export function CropFormScreen({ navigation, route }: { navigation: any; route: any }) {
  const { t } = useT();
  const editCrop: Crop | undefined = route.params?.crop;
  const { data: crops = [], createCrop, updateCrop } = useCrops();
  const isEdit = !!editCrop;

  // Multi-add (create only): several crop names can be picked and saved in one go.
  const [multiNames, setMultiNames] = useState<string[]>(editCrop ? [editCrop.name] : []);
  const [customName, setCustomName] = useState("");
  const [typingOther, setTypingOther] = useState(false);
  const [variety, setVariety] = useState(editCrop?.variety ?? "");
  const [acres, setAcres] = useState(editCrop?.acres ?? "");
  const [season, setSeason] = useState(editCrop?.season ?? "Annual");
  const [blockName, setBlockName] = useState(editCrop?.blockName ?? "");
  const [notes, setNotes] = useState(editCrop?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const existingNames = new Set(crops.filter((c) => c.id !== editCrop?.id).map((c) => c.name.toLowerCase()));

  function toggleName(name: string) {
    if (name === OTHER) {
      setTypingOther((v) => !v);
      return;
    }
    if (isEdit) {
      setMultiNames([name]);
      return;
    }
    setMultiNames((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]));
  }

  function addCustomName() {
    const name = customName.trim();
    if (!name) return;
    const known = [...CROP_NAMES, ...multiNames].find((n) => n.toLowerCase() === name.toLowerCase());
    const finalName = known ?? name;
    if (!multiNames.includes(finalName)) setMultiNames((cur) => (isEdit ? [finalName] : [...cur, finalName]));
    setCustomName("");
  }

  // A name typed in the "Other" box but not yet added still counts.
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
      <ChipSelect
        label={isEdit ? "Crop name *" : "Crop name(s) * — tap to pick, tap again to remove"}
        options={[...CROP_NAMES, ...multiNames.filter((n) => !CROP_NAMES.includes(n)), OTHER]}
        values={typingOther ? [...multiNames, OTHER] : multiNames}
        onChange={toggleName}
      />
      {typingOther ? (
        <TextField
          label="Other crop name"
          value={customName}
          onChangeText={setCustomName}
          onSubmitEditing={addCustomName}
          returnKeyType="done"
          blurOnSubmit={false}
          autoFocus
          placeholder="Type a name and press Done, e.g. Vanilla"
        />
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
          title={isEdit ? "Save changes" : multiNames.length > 1 ? `Add ${multiNames.length} crops` : "Add crop"}
          onPress={submit}
          loading={createCrop.isPending || updateCrop.isPending}
        />
    </FormFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  error: { color: colors.danger, marginBottom: spacing.md },
});
