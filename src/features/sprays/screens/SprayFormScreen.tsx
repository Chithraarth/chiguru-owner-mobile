import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { ChipSelect } from "../../../components/ChipSelect";
import { SelectOrType } from "../../../components/SelectOrType";
import { colors, spacing } from "../../../components/theme";
import { useSprays } from "../hooks/useSprays";

const PRODUCT_TYPES = ["Fungicide", "Insecticide", "Herbicide", "Foliar fertilizer", "Bio-pesticide", "Other"];
const WEATHER = ["Clear", "Cloudy", "Light rain risk", "Humid", "Windy"];
const NEW_CROP = "+ Add new crop";

function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function SprayFormScreen({ navigation }: { navigation: any }) {
  const { createSpray, crops, createCrop } = useSprays();
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState(PRODUCT_TYPES[0]);
  const [cropId, setCropId] = useState<number | null>(null);
  const [newCropName, setNewCropName] = useState("");
  const [blockName, setBlockName] = useState("");
  const [concentrationPct, setConcentrationPct] = useState("");
  const [barrelsUsed, setBarrelsUsed] = useState("");
  const [litresUsed, setLitresUsed] = useState("");
  const [areaAcres, setAreaAcres] = useState("");
  const [costPerLitre, setCostPerLitre] = useState("");
  const [cost, setCost] = useState("");
  const [weatherCondition, setWeatherCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Auto-compute total cost from litres × cost-per-litre, matching the web app.
  // The farmer can still overwrite the computed value directly.
  useEffect(() => {
    const l = parseFloat(litresUsed);
    const cpl = parseFloat(costPerLitre);
    if (!isNaN(l) && !isNaN(cpl) && l > 0 && cpl > 0) {
      setCost((l * cpl).toFixed(2));
    }
  }, [litresUsed, costPerLitre]);

  const cropOptions = ["None", ...crops.map((c) => c.name), NEW_CROP];
  const selectedCropLabel = cropId ? crops.find((c) => c.id === cropId)?.name ?? "None" : "None";

  async function submit() {
    setError(null);
    if (!productName.trim()) {
      setError("Enter the product name");
      return;
    }
    const litres = Number(litresUsed);
    const area = Number(areaAcres);
    const costNum = Number(cost);
    if (!litresUsed || !Number.isFinite(litres) || litres <= 0) {
      setError("Enter litres used");
      return;
    }
    if (!areaAcres || !Number.isFinite(area) || area <= 0) {
      setError("Enter area sprayed (acres)");
      return;
    }
    if (!cost || !Number.isFinite(costNum) || costNum < 0) {
      setError("Enter the cost");
      return;
    }

    let finalCropId = cropId ?? undefined;
    if (selectedCropLabel === NEW_CROP) {
      const name = newCropName.trim();
      if (!name) {
        setError("Type the new crop's name");
        return;
      }
      try {
        const crop = await createCrop.mutateAsync(name);
        finalCropId = crop?.id;
      } catch {
        setError("Could not create that crop. Try again.");
        return;
      }
    }

    createSpray.mutate(
      {
        date: todayIso(),
        cropId: finalCropId,
        blockName: blockName.trim() || undefined,
        productName: productName.trim(),
        productType: productType || undefined,
        concentrationPct: concentrationPct ? Number(concentrationPct) : undefined,
        barrelsUsed: barrelsUsed ? Number(barrelsUsed) : undefined,
        litresUsed: litres,
        areaAcres: area,
        cost: costNum,
        weatherCondition: weatherCondition || undefined,
        notes: notes.trim() || undefined,
      },
      { onSuccess: () => navigation.goBack() }
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <TextField label="Product name *" value={productName} onChangeText={setProductName} />
      <SelectOrType label="Product type" options={PRODUCT_TYPES} value={productType} onChange={setProductType} />
      <ChipSelect
        label="Crop"
        options={cropOptions}
        value={selectedCropLabel}
        onChange={(name) => setCropId(crops.find((c) => c.name === name)?.id ?? null)}
      />
      {selectedCropLabel === NEW_CROP ? (
        <TextField label="New crop name *" value={newCropName} onChangeText={setNewCropName} />
      ) : null}
      <TextField label="Block / area" value={blockName} onChangeText={setBlockName} />
      <TextField label="Concentration %" keyboardType="decimal-pad" value={concentrationPct} onChangeText={setConcentrationPct} />
      <TextField label="Barrels used" keyboardType="decimal-pad" value={barrelsUsed} onChangeText={setBarrelsUsed} />
      <TextField label="Litres used *" keyboardType="decimal-pad" value={litresUsed} onChangeText={setLitresUsed} />
      <TextField label="Area sprayed (acres) *" keyboardType="decimal-pad" value={areaAcres} onChangeText={setAreaAcres} />
      <TextField label="Cost per litre" keyboardType="decimal-pad" value={costPerLitre} onChangeText={setCostPerLitre} />
      <TextField label="Total cost *" keyboardType="decimal-pad" value={cost} onChangeText={setCost} />
      <SelectOrType label="Weather" options={WEATHER} value={weatherCondition} onChange={setWeatherCondition} />
      <TextField label="Notes" multiline numberOfLines={2} value={notes} onChangeText={setNotes} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title="Save spray record"
        onPress={submit}
        loading={createSpray.isPending || createCrop.isPending}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  error: { color: colors.danger, marginBottom: spacing.md },
});
