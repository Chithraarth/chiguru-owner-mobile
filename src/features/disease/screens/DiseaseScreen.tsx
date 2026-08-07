import React, { useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FlaskConical,
  Sprout,
  Upload,
  X,
} from "lucide-react-native";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { TextField } from "../../../components/TextField";
import { colors, radius, spacing } from "../../../components/theme";
import { diagnoseDisease, submitDiagnosisOutcome } from "../../../api/endpoints/ai";
import { createSpray } from "../../../api/endpoints/sprays";
import { compressToDataUrl } from "../../../lib/imageCompression";
import type { DiagnosisResult } from "../../../types/api";

const CROPS = [
  "Coffee", "Pepper (Black Pepper)", "Cardamom", "Arecanut (Supari)", "Sugarcane", "Banana",
  "Pineapple", "Jackfruit", "Mango", "Coconut", "Tomato", "Potato", "Onion", "Brinjal",
  "Cauliflower", "Cabbage", "Capsicum", "Green Chilli", "Rice (Paddy)", "Wheat", "Maize",
  "Turmeric", "Ginger", "Cotton", "Groundnut", "Soybean", "Tea", "Cashew", "Cocoa",
];

const URGENCY_CONFIG: Record<string, { label: string; bg: string; fg: string }> = {
  immediate: { label: "Treat Immediately", bg: "#FDEAEA", fg: colors.danger },
  "within-3-days": { label: "Treat Within 3 Days", bg: "#FFEBD6", fg: "#95530F" },
  "within-week": { label: "Treat This Week", bg: "#FEF3C7", fg: "#92600E" },
  monitor: { label: "Monitor Closely", bg: "#E4EEFB", fg: "#5B8CD6" },
};
const CONFIDENCE_CONFIG: Record<string, { label: string; bg: string; fg: string }> = {
  high: { label: "High Confidence", bg: "#DCF5E6", fg: "#1F9E5C" },
  medium: { label: "Medium Confidence", bg: "#FEF9C3", fg: "#92600E" },
  low: { label: "Low Confidence", bg: colors.muted, fg: colors.textMuted },
};

export function DiseaseScreen({ navigation }: { navigation: any }) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState("");
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [cropSearch, setCropSearch] = useState("");
  const [diagnosing, setDiagnosing] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingSpray, setCreatingSpray] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);

  async function pick(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const picked = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
    if (picked.canceled || !picked.assets?.[0]) return;
    setPhotoUri(picked.assets[0].uri);
    setResult(null);
    setError(null);
  }

  async function analyze() {
    if (!photoUri) return;
    setDiagnosing(true);
    setError(null);
    try {
      const dataUrl = await compressToDataUrl(photoUri, "ai");
      setPhotoData(dataUrl);
      const diagnosis = await diagnoseDisease(dataUrl, selectedCrop || undefined);
      setResult(diagnosis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again with a clearer photo.");
    } finally {
      setDiagnosing(false);
    }
  }

  async function createSprayTask() {
    if (!result) return;
    setCreatingSpray(true);
    try {
      await createSpray({
        date: new Date().toISOString().slice(0, 10),
        productName: result.recommendedProduct || `${result.diseaseName} treatment`,
        productType: "Pesticide / Fungicide",
        litresUsed: 10,
        areaAcres: 1,
        cost: 0,
        notes: `Auto-created from disease diagnosis: ${result.diseaseName}. ${result.treatmentSteps[0] ?? ""}`,
      });
      Alert.alert("Spray record created!", "You can edit it in the Sprays section.");
      navigation.navigate("Sprays");
    } catch {
      Alert.alert("Failed to create spray record");
    } finally {
      setCreatingSpray(false);
    }
  }

  async function submitOutcome(value: "helpful" | "not-helpful" | "agronomist-confirmed") {
    if (!result?.id) return;
    setOutcome(value);
    try {
      await submitDiagnosisOutcome(result.id, value);
    } catch {
      setOutcome(null);
    }
  }

  function reset() {
    setResult(null);
    setPhotoUri(null);
    setPhotoData(null);
    setSelectedCrop("");
    setOutcome(null);
    setError(null);
  }

  const urgency = result ? URGENCY_CONFIG[result.urgency] ?? URGENCY_CONFIG.monitor : null;
  const confidence = result ? CONFIDENCE_CONFIG[result.confidence] ?? CONFIDENCE_CONFIG.medium : null;
  const cannotDiagnose = !!result && !result.isDisease && (result.confidence === "low" || /unable to identify/i.test(result.diseaseName));
  const isHealthy = !!result && !result.isDisease && !cannotDiagnose;
  const filteredCrops = CROPS.filter((c) => c.toLowerCase().includes(cropSearch.toLowerCase()));

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl }}>
      {!result && !diagnosing ? (
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <FlaskConical size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Plant Disease Detector</Text>
            <Text style={styles.heroSubtitle}>Select your crop · take a photo · get instant AI diagnosis + treatment advice</Text>
          </View>
        </View>
      ) : null}

      {!result ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionLabel}>WHICH CROP? (SELECT FOR BETTER ACCURACY)</Text>
          <Pressable
            style={[styles.cropPicker, selectedCrop && styles.cropPickerActive]}
            onPress={() => setShowCropPicker(true)}
          >
            <Text style={[styles.cropPickerText, selectedCrop && { color: colors.primary, fontWeight: "600" }]} numberOfLines={1}>
              {selectedCrop || "Tap to select crop (sabzi, phal, anaaj…)"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {selectedCrop ? (
                <Pressable onPress={() => setSelectedCrop("")} hitSlop={8}>
                  <X size={16} color={colors.textMuted} />
                </Pressable>
              ) : null}
              <ChevronDown size={16} color={colors.textMuted} />
            </View>
          </Pressable>

          {photoUri ? (
            <View style={styles.photoPreviewWrap}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <Pressable style={styles.photoRemove} onPress={() => setPhotoUri(null)}>
                <X size={16} color="#fff" />
              </Pressable>
              {selectedCrop ? (
                <View style={styles.photoCropTag}>
                  <Text style={styles.photoCropTagText}>🌱 {selectedCrop}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Pressable style={styles.dropzone} onPress={() => pick(true)}>
              <View style={styles.dropzoneIcon}>
                <Camera size={26} color="#fff" />
              </View>
              <Text style={styles.dropzoneTitle}>Take or upload a photo</Text>
              <Text style={styles.dropzoneSubtitle}>Photo of affected leaf, fruit, stem, or whole plant. Closer = better diagnosis.</Text>
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs }}>
                <Pressable style={styles.dropzoneChip} onPress={() => pick(true)}>
                  <Camera size={12} color={colors.textMuted} />
                  <Text style={styles.dropzoneChipText}>Camera</Text>
                </Pressable>
                <Pressable style={styles.dropzoneChip} onPress={() => pick(false)}>
                  <Upload size={12} color={colors.textMuted} />
                  <Text style={styles.dropzoneChipText}>Gallery</Text>
                </Pressable>
              </View>
            </Pressable>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {photoUri ? (
            <Button
              title={`Analyze ${selectedCrop || "Plant"} Disease`}
              onPress={analyze}
              loading={diagnosing}
            />
          ) : null}
        </View>
      ) : null}

      {diagnosing ? (
        <View style={styles.loadingWrap}>
          <Sprout size={32} color={colors.primary} />
          <Text style={styles.loadingTitle}>Examining your plant…</Text>
          {selectedCrop ? <Text style={styles.loadingCrop}>Analyzing {selectedCrop}</Text> : null}
          <Text style={styles.loadingSubtitle}>AI is checking for diseases, pests & deficiencies</Text>
        </View>
      ) : null}

      {result && !diagnosing ? (
        <View style={{ gap: spacing.md }}>
          {photoUri ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Image source={{ uri: photoUri }} style={styles.thumb} />
              <View>
                <Text style={styles.thumbLabel}>Analyzed photo</Text>
                {selectedCrop ? <Text style={styles.thumbCrop}>🌱 {selectedCrop}</Text> : null}
                <Pressable onPress={reset}>
                  <Text style={styles.thumbLink}>← Analyze another photo</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Card
            style={[
              styles.resultCard,
              isHealthy && { backgroundColor: "#EAFBF1", borderColor: "#B7E8CC" },
              cannotDiagnose && { backgroundColor: "#FFF3E6", borderColor: "#FBD9AE" },
              !isHealthy && !cannotDiagnose && result.urgency === "immediate" && { backgroundColor: "#FDEAEA", borderColor: "#F5C6C6" },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
              {isHealthy ? <CheckCircle2 size={20} color="#1F9E5C" /> : <AlertTriangle size={20} color="#C77A2E" />}
              <View style={{ flex: 1 }}>
                <Text style={styles.diseaseName}>{result.diseaseName}</Text>
                {result.scientificName ? <Text style={styles.scientificName}>{result.scientificName}</Text> : null}
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm }}>
              {confidence ? (
                <View style={[styles.pill, { backgroundColor: confidence.bg }]}>
                  <Text style={[styles.pillText, { color: confidence.fg }]}>{confidence.label}</Text>
                </View>
              ) : null}
              {result.affectedCrop ? (
                <View style={[styles.pill, { backgroundColor: "#E4EEFB" }]}>
                  <Text style={[styles.pillText, { color: "#5B8CD6" }]}>🌱 {result.affectedCrop}</Text>
                </View>
              ) : null}
              {urgency && result.isDisease ? (
                <View style={[styles.pill, { backgroundColor: urgency.bg, flexDirection: "row", alignItems: "center", gap: 4 }]}>
                  <Clock size={11} color={urgency.fg} />
                  <Text style={[styles.pillText, { color: urgency.fg }]}>{urgency.label}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.description}>{result.description}</Text>

            {result.visibleSymptoms && !isHealthy ? (
              <Text style={styles.symptomsText}>
                <Text style={{ fontWeight: "700" }}>Seen in photo: </Text>
                {result.visibleSymptoms}
              </Text>
            ) : null}

            {!isHealthy && result.confidence !== "high" ? (
              <View style={styles.warningBox}>
                <AlertTriangle size={14} color="#C77A2E" />
                <Text style={styles.warningText}>
                  {cannotDiagnose
                    ? "Photo not clear. Please take a sharp close-up of the affected part in good light and try again, or show it to your nearest KVK. Do not buy any chemical based on this."
                    : "Not fully sure. This may also be something else. Please confirm with a KVK or an experienced farmer, and take a clearer close-up photo, before buying chemicals."}
                </Text>
              </View>
            ) : null}

            {!isHealthy && result.differentials && result.differentials.length > 0 ? (
              <View style={styles.differentialsBox}>
                <Text style={styles.differentialsTitle}>Could also be:</Text>
                {result.differentials.map((d, i) => (
                  <Text key={i} style={styles.differentialItem}>
                    • <Text style={{ fontWeight: "600" }}>{d.name}</Text>{d.note ? ` — ${d.note}` : ""}
                  </Text>
                ))}
              </View>
            ) : null}

            {result.recommendedProduct && result.isDisease ? (
              <View style={styles.productBox}>
                <FlaskConical size={14} color="#92600E" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.productLabel}>Available at agri shop:</Text>
                  <Text style={styles.productName}>{result.recommendedProduct}</Text>
                </View>
              </View>
            ) : null}
          </Card>

          {result.immediateSteps && result.immediateSteps.length > 0 && !isHealthy ? (
            <Card>
              <Text style={styles.blockTitle}>👀 Do this first (free)</Text>
              {result.immediateSteps.map((s, i) => (
                <Text key={i} style={styles.checkItem}>✓ {s}</Text>
              ))}
            </Card>
          ) : null}

          {result.doNotDo && result.doNotDo.length > 0 && !isHealthy ? (
            <Card style={{ backgroundColor: "#FDEAEA", borderColor: "#F5C6C6" }}>
              <Text style={[styles.blockTitle, { color: colors.danger }]}>🚫 Do NOT do this</Text>
              {result.doNotDo.map((s, i) => (
                <Text key={i} style={[styles.checkItem, { color: colors.danger }]}>✕ {s}</Text>
              ))}
            </Card>
          ) : null}

          {result.treatmentSteps?.length > 0 && result.isDisease ? (
            <Card>
              <Text style={styles.blockTitle}>💊 Treatment Steps</Text>
              {result.treatmentSteps.map((s, i) => (
                <View key={i} style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs }}>
                  <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                  <Text style={styles.stepText}>{s}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {result.preventionTips?.length > 0 ? (
            <Card style={{ backgroundColor: "#E4EEFB", borderColor: "#C7DCF5" }}>
              <Text style={[styles.blockTitle, { color: "#3E6FB0" }]}>🛡️ Prevention Tips</Text>
              {result.preventionTips.map((s, i) => (
                <Text key={i} style={[styles.checkItem, { color: "#3E6FB0" }]}>• {s}</Text>
              ))}
            </Card>
          ) : null}

          <Card style={{ backgroundColor: colors.muted }}>
            <Text style={styles.kvkText}>
              💡 <Text style={{ fontWeight: "600" }}>Expert tip:</Text> For confirmation, take a sample to your nearest{" "}
              <Text style={{ fontWeight: "600", color: colors.primary }}>KVK (Krishi Vigyan Kendra)</Text> or contact the
              state agriculture department helpline.
            </Text>
          </Card>

          <View style={styles.disclaimer}>
            <AlertTriangle size={14} color="#B7791F" />
            <Text style={styles.disclaimerText}>AI guidance, not a guarantee. Confirm with an agronomist before buying or spraying.</Text>
          </View>

          {result.isDisease ? (
            <Button title="Create Spray Record from This Diagnosis" onPress={createSprayTask} loading={creatingSpray} />
          ) : null}

          <Pressable style={styles.doctorCta} onPress={() => navigation.navigate("AgriDoctor")}>
            <View style={styles.doctorIconWrap}>
              <FlaskConical size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.doctorCtaTitle}>Want a second opinion?</Text>
              <Text style={styles.doctorCtaSubtitle}>Consult an agriculture doctor to confirm & improve yield</Text>
            </View>
            <ChevronRight size={16} color={colors.accent} />
          </Pressable>

          {result.id != null ? (
            <Card style={{ backgroundColor: colors.muted }}>
              <Text style={styles.feedbackTitle}>Was this diagnosis helpful?</Text>
              <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm }}>
                <Pressable
                  style={[styles.feedbackBtn, outcome === "helpful" && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => submitOutcome("helpful")}
                >
                  <Text style={[styles.feedbackBtnText, outcome === "helpful" && { color: "#fff" }]}>👍 Helpful</Text>
                </Pressable>
                <Pressable
                  style={[styles.feedbackBtn, outcome === "not-helpful" && { backgroundColor: colors.danger, borderColor: colors.danger }]}
                  onPress={() => submitOutcome("not-helpful")}
                >
                  <Text style={[styles.feedbackBtnText, outcome === "not-helpful" && { color: "#fff" }]}>👎 Not helpful</Text>
                </Pressable>
                <Pressable
                  style={[styles.feedbackBtn, outcome === "agronomist-confirmed" && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                  onPress={() => submitOutcome("agronomist-confirmed")}
                >
                  <Text style={[styles.feedbackBtnText, outcome === "agronomist-confirmed" && { color: "#fff" }]}>✅ Confirmed</Text>
                </Pressable>
              </View>
            </Card>
          ) : null}

          <Pressable onPress={reset}>
            <Text style={styles.analyzeAnother}>Analyze another plant →</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={showCropPicker} transparent animationType="slide" onRequestClose={() => setShowCropPicker(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowCropPicker(false)} />
        <View style={styles.cropSheet}>
          <View style={styles.cropSheetHeader}>
            <Text style={styles.cropSheetTitle}>Select Crop</Text>
            <Pressable onPress={() => setShowCropPicker(false)} hitSlop={10}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>
          <TextField placeholder="Search crop…" value={cropSearch} onChangeText={setCropSearch} containerStyle={{ marginBottom: spacing.sm }} />
          <ScrollView style={{ maxHeight: 320 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {filteredCrops.map((crop) => (
                <Pressable
                  key={crop}
                  style={[styles.cropChip, selectedCrop === crop && styles.cropChipActive]}
                  onPress={() => { setSelectedCrop(crop); setShowCropPicker(false); setCropSearch(""); }}
                >
                  <Text style={[styles.cropChipText, selectedCrop === crop && styles.cropChipTextActive]}>{crop}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  hero: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md },
  heroIconWrap: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  heroSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 11.5, marginTop: 2 },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5 },
  cropPicker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 2, borderColor: colors.border, backgroundColor: "#fff", borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4 },
  cropPickerActive: { borderColor: colors.primary, backgroundColor: colors.bg },
  cropPickerText: { flex: 1, fontSize: 13.5, color: colors.textMuted },

  photoPreviewWrap: { borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  photoPreview: { width: "100%", height: 220 },
  photoRemove: { position: "absolute", top: spacing.sm, right: spacing.sm, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 16, padding: 6 },
  photoCropTag: { position: "absolute", bottom: spacing.sm, left: spacing.sm, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  photoCropTagText: { color: "#fff", fontSize: 11 },

  dropzone: { borderWidth: 2, borderStyle: "dashed", borderColor: colors.border, backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  dropzoneIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  dropzoneTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  dropzoneSubtitle: { fontSize: 11.5, color: colors.textMuted, textAlign: "center" },
  dropzoneChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs },
  dropzoneChipText: { fontSize: 11, color: colors.textMuted },

  errorText: { color: colors.danger, fontSize: 12.5 },

  loadingWrap: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xl },
  loadingTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
  loadingCrop: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  loadingSubtitle: { fontSize: 12, color: colors.textMuted },

  thumb: { width: 60, height: 60, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  thumbLabel: { fontSize: 11, color: colors.textMuted },
  thumbCrop: { fontSize: 11, color: colors.primary, fontWeight: "600" },
  thumbLink: { fontSize: 11, color: colors.primary, fontWeight: "600", marginTop: 2 },

  resultCard: { gap: 0 },
  diseaseName: { fontSize: 15, fontWeight: "700", color: colors.text, lineHeight: 20 },
  scientificName: { fontSize: 11, color: colors.textMuted, fontStyle: "italic" },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: "600" },
  description: { fontSize: 13, color: colors.text, marginTop: spacing.sm, lineHeight: 19 },
  symptomsText: { fontSize: 11.5, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 16 },
  warningBox: { flexDirection: "row", gap: spacing.xs, backgroundColor: "#FFF3E6", borderWidth: 1, borderColor: "#FBD9AE", borderRadius: radius.sm, padding: spacing.sm + 2, marginTop: spacing.sm },
  warningText: { flex: 1, fontSize: 11.5, color: "#95530F", lineHeight: 16 },
  differentialsBox: { backgroundColor: colors.muted, borderRadius: radius.sm, padding: spacing.sm + 2, marginTop: spacing.sm, gap: 4 },
  differentialsTitle: { fontSize: 11.5, fontWeight: "700", color: colors.text },
  differentialItem: { fontSize: 11.5, color: colors.textMuted, lineHeight: 16 },
  productBox: { flexDirection: "row", gap: spacing.xs, backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A", borderRadius: radius.sm, padding: spacing.sm + 2, marginTop: spacing.sm },
  productLabel: { fontSize: 11, fontWeight: "700", color: "#92600E" },
  productName: { fontSize: 13, fontWeight: "600", color: "#7A4A0D", marginTop: 2 },

  blockTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  checkItem: { fontSize: 13, color: colors.text, marginTop: spacing.xs, lineHeight: 18 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#E3E0EC", alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 11, fontWeight: "700", color: colors.primary },
  stepText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },

  kvkText: { fontSize: 11.5, color: colors.textMuted, lineHeight: 16 },
  disclaimer: { flexDirection: "row", gap: spacing.xs, backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A", borderRadius: radius.sm, padding: spacing.sm + 2 },
  disclaimerText: { flex: 1, fontSize: 11, color: "#92600E", lineHeight: 15 },

  doctorCta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "#F3EEFB", borderWidth: 1, borderColor: "#DDD0F0", borderRadius: radius.md, padding: spacing.sm + 4 },
  doctorIconWrap: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: "#E3D5F5", alignItems: "center", justifyContent: "center" },
  doctorCtaTitle: { fontSize: 13, fontWeight: "700", color: colors.accent },
  doctorCtaSubtitle: { fontSize: 11, color: colors.accent },

  feedbackTitle: { fontSize: 12, fontWeight: "600", color: colors.textMuted, textAlign: "center" },
  feedbackBtn: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", borderRadius: radius.sm },
  feedbackBtnText: { fontSize: 11.5, fontWeight: "600", color: colors.text },

  analyzeAnother: { textAlign: "center", fontSize: 13, color: colors.textMuted, paddingVertical: spacing.sm },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  cropSheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "80%", backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  cropSheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  cropSheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  cropChip: { paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.xs + 2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff" },
  cropChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  cropChipText: { fontSize: 12.5, color: colors.text },
  cropChipTextActive: { color: "#fff", fontWeight: "600" },
});
