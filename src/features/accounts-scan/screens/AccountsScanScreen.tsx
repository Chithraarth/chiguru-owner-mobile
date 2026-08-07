import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AlertCircle, Camera, CheckCircle2, ImageIcon, RefreshCw, Sparkles, Sun } from "lucide-react-native";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { colors, radius, spacing } from "../../../components/theme";
import { scanAccountsPage, type AccountsScanEntry, type AccountsScanResult } from "../../../api/endpoints/ai";
import { createExpense } from "../../../api/endpoints/expenses";
import { compressToDataUrl } from "../../../lib/imageCompression";
import { useT } from "../../../lib/i18n";

type Phase = "capture" | "preview" | "analyzing" | "results";

const CAT_COLOR: Record<string, { bg: string; fg: string }> = {
  Labour: { bg: "#E4EEFB", fg: "#3E6FB0" },
  Fertilizer: { bg: "#EDEBF7", fg: colors.primary },
  Pesticide: { bg: "#FDEAEA", fg: colors.danger },
  Seed: { bg: "#FEF9C3", fg: "#92600E" },
  Harvest: { bg: "#EDEBF7", fg: colors.primary },
  Equipment: { bg: "#F3E8FD", fg: "#7B3FBF" },
  Other: { bg: colors.muted, fg: colors.textMuted },
};

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function AccountsScanScreen({ navigation }: { navigation: any }) {
  const { t } = useT();
  const [phase, setPhase] = useState<Phase>("capture");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AccountsScanResult | null>(null);
  const [entries, setEntries] = useState<AccountsScanEntry[]>([]);
  const [savedSet, setSavedSet] = useState<Set<number>>(new Set());
  const [confirmedSet, setConfirmedSet] = useState<Set<number>>(new Set());
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function hasDoubt(entry: AccountsScanEntry) {
    return Boolean(entry.question) || entry.confidence === "low";
  }
  function needsCheck(entry: AccountsScanEntry, idx: number) {
    return hasDoubt(entry) && !confirmedSet.has(idx);
  }

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
    setPhase("preview");
  }

  function chooseMethod() {
    Alert.alert(t("scan.chooseMethod"), undefined, [
      { text: t("scan.takePhoto"), onPress: () => pick(true) },
      { text: t("scan.gallery"), onPress: () => pick(false) },
      { text: t("scan.cancel"), style: "cancel" },
    ]);
  }

  async function analyzePhoto() {
    if (!photoUri) return;
    setPhase("analyzing");
    setError(null);
    try {
      const dataUrl = await compressToDataUrl(photoUri, "ai");
      setPhotoDataUrl(dataUrl);
      const scanResult = await scanAccountsPage(dataUrl);
      setResult(scanResult);
      setEntries(scanResult.entries);
      setSavedSet(new Set());
      setConfirmedSet(new Set());
      setPhase("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("scan.noEntries"));
      setPhase("preview");
    }
  }

  function updateEntry(idx: number, patch: Partial<AccountsScanEntry>) {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }

  function confirmEntry(idx: number) {
    setConfirmedSet((s) => new Set([...s, idx]));
  }

  async function saveEntry(idx: number) {
    const entry = entries[idx];
    if (!entry || savedSet.has(idx) || needsCheck(entry, idx)) return;
    setSavingIdx(idx);
    try {
      await createExpense({
        date: entry.date ?? todayIso(),
        category: (entry.type === "income" ? "Harvest Income" : entry.category) as any,
        amount: entry.amount,
        description: [entry.description, entry.originalText && entry.originalText !== entry.description ? `[${entry.originalText}]` : null].filter(Boolean).join(" "),
        receiptUrl: photoDataUrl ?? "",
      });
      setSavedSet((s) => new Set([...s, idx]));
    } catch {
      Alert.alert("Could not save", "Please try again.");
    } finally {
      setSavingIdx(null);
    }
  }

  async function saveAll() {
    setSavingAll(true);
    const pending = entries.map((e, i) => ({ e, i })).filter(({ i }) => !savedSet.has(i));
    const toSave = pending.filter(({ e, i }) => !needsCheck(e, i));
    let count = 0;
    for (const { e, i } of toSave) {
      try {
        await createExpense({
          date: e.date ?? todayIso(),
          category: (e.type === "income" ? "Harvest Income" : e.category) as any,
          amount: e.amount,
          description: [e.description, e.originalText && e.originalText !== e.description ? `[${e.originalText}]` : null].filter(Boolean).join(" "),
          receiptUrl: photoDataUrl ?? "",
        });
        setSavedSet((s) => new Set([...s, i]));
        count++;
      } catch {
        // skip, continue with others
      }
    }
    setSavingAll(false);
    Alert.alert(count === toSave.length ? "All saved" : "Some saved", `${count} entries saved to Expenses.`);
  }

  function resetAll() {
    setPhase("capture");
    setPhotoUri(null);
    setPhotoDataUrl(null);
    setResult(null);
    setEntries([]);
    setSavedSet(new Set());
    setConfirmedSet(new Set());
    setError(null);
  }

  const grouped = entries.reduce<Record<string, { entry: AccountsScanEntry; idx: number }[]>>((acc, entry, idx) => {
    const key = entry.category || "Other";
    (acc[key] = acc[key] || []).push({ entry, idx });
    return acc;
  }, {});
  const allSaved = entries.length > 0 && savedSet.size >= entries.length;
  const pendingChecks = entries.filter((e, i) => needsCheck(e, i)).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      {phase === "capture" ? (
        <>
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>{t("scan.instructions")}</Text>
            {[
              { Icon: Sun, text: t("scan.tip1") },
              { Icon: Camera, text: t("scan.tip2") },
              { Icon: ImageIcon, text: t("scan.tip3") },
            ].map(({ Icon, text }, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipIconWrap}><Icon size={14} color="#92600E" /></View>
                <Text style={styles.tipText}>{text}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.readBtn} onPress={chooseMethod}>
            <Camera size={40} color="#fff" />
            <Text style={styles.readBtnTitle}>{t("scan.readBtn")}</Text>
            <Text style={styles.readBtnHint}>{t("scan.chooseHint")}</Text>
          </Pressable>
        </>
      ) : null}

      {phase === "preview" && photoUri ? (
        <>
          <Image source={{ uri: photoUri }} style={styles.previewImage} />
          <Text style={styles.previewHint}>{t("scan.previewHint")}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Button title={t("scan.readBtn")} onPress={analyzePhoto} />
          <Pressable onPress={() => { setPhase("capture"); setPhotoUri(null); }}>
            <Text style={styles.retakeLink}>{t("scan.retake")}</Text>
          </Pressable>
        </>
      ) : null}

      {phase === "analyzing" ? (
        <View style={styles.analyzingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.analyzingTitle}>{t("scan.analyzing")}</Text>
          <Text style={styles.analyzingSubtitle}>{t("scan.analyzing2")}</Text>
        </View>
      ) : null}

      {phase === "results" && result ? (
        <>
          <View style={styles.summaryCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.summaryTitle}>{t("scan.found", { n: entries.length })}</Text>
              {result.year ? (
                <View style={styles.yearBadge}><Text style={styles.yearBadgeText}>{result.year}</Text></View>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.xs, flexWrap: "wrap" }}>
              {(result.totalExpense ?? 0) > 0 ? (
                <Text style={styles.summaryStat}>{t("scan.totalExpense")}: <Text style={{ fontWeight: "700", color: "#fff" }}>{inr(result.totalExpense)}</Text></Text>
              ) : null}
              {(result.totalIncome ?? 0) > 0 ? (
                <Text style={styles.summaryStat}>{t("scan.totalIncome")}: <Text style={{ fontWeight: "700", color: "#fff" }}>{inr(result.totalIncome)}</Text></Text>
              ) : null}
            </View>
            {result.pageDescription ? <Text style={styles.summaryDesc}>{result.pageDescription}</Text> : null}
          </View>

          {pendingChecks > 0 ? (
            <View style={styles.warningBanner}>
              <AlertCircle size={16} color="#C77A2E" />
              <Text style={styles.warningBannerText}>{t("scan.needCheck", { n: pendingChecks })}</Text>
            </View>
          ) : null}

          {!allSaved && entries.length > 0 ? (
            <Button title={`${t("scan.saveAll")} (${entries.length - savedSet.size})`} onPress={saveAll} loading={savingAll} />
          ) : allSaved ? (
            <Button title={`${t("scan.viewExpenses")} →`} onPress={() => navigation.navigate("ExpenseList")} />
          ) : null}

          {Object.entries(grouped).map(([category, items]) => {
            const col = CAT_COLOR[category] ?? CAT_COLOR.Other;
            return (
              <View key={category} style={{ gap: spacing.sm }}>
                <Text style={styles.categoryLabel}>{category.toUpperCase()}</Text>
                {items.map(({ entry, idx }) => {
                  const isSaved = savedSet.has(idx);
                  const isSaving = savingIdx === idx;
                  const unclear = needsCheck(entry, idx);
                  return (
                    <View key={idx} style={[styles.entryCard, unclear && styles.entryCardWarn]}>
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
                        <View style={[styles.typeBadge, { backgroundColor: col.bg }]}>
                          <Text style={[styles.typeBadgeText, { color: col.fg }]}>{entry.type === "income" ? "Income" : "Expense"}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.entryDesc}>{entry.description}</Text>
                          {entry.originalText && entry.originalText !== entry.description ? (
                            <Text style={styles.entryOriginal}>{entry.originalText}</Text>
                          ) : null}
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                            {entry.date ? <Text style={styles.entryMeta}>{entry.date}</Text> : null}
                            {entry.unit ? <Text style={styles.entryMeta}>· {entry.unit}</Text> : null}
                            {unclear ? <Text style={styles.doubtTag}>⚠ {t("scan.aiDoubt")}</Text> : null}
                            {hasDoubt(entry) && confirmedSet.has(idx) && !isSaved ? <Text style={styles.checkedTag}>✓ {t("scan.checkedByYou")}</Text> : null}
                          </View>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: spacing.xs }}>
                          <Text style={[styles.entryAmount, { color: entry.type === "income" ? colors.primary : "#95530F" }]}>
                            {entry.type === "income" ? "+" : "−"}{inr(entry.amount)}
                          </Text>
                          {!unclear ? (
                            <Pressable
                              style={[styles.saveBtn, isSaved && styles.saveBtnDone]}
                              disabled={isSaved || isSaving || savingAll}
                              onPress={() => saveEntry(idx)}
                            >
                              <Text style={[styles.saveBtnText, isSaved && { color: colors.primary }]}>
                                {isSaving ? "…" : isSaved ? t("scan.saved") : t("scan.saveOne")}
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>

                      {unclear ? (
                        <View style={styles.doubtBox}>
                          <Text style={styles.doubtQuestion}>{entry.question ?? t("scan.defaultQuestion")}</Text>
                          <TextField
                            label={t("scan.amountLabel")}
                            keyboardType="decimal-pad"
                            value={String(entry.amount)}
                            onChangeText={(v) => updateEntry(idx, { amount: Number(v) || 0 })}
                            containerStyle={{ marginBottom: spacing.sm }}
                          />
                          <TextField
                            label={t("scan.descLabel")}
                            value={entry.description}
                            onChangeText={(v) => updateEntry(idx, { description: v })}
                            containerStyle={{ marginBottom: spacing.sm }}
                          />
                          <Button title={t("scan.confirmFix")} onPress={() => confirmEntry(idx)} />
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            );
          })}

          {result.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesText}><Text style={{ fontWeight: "700" }}>Notes: </Text>{result.notes}</Text>
            </View>
          ) : null}

          <Pressable style={styles.scanAnotherBtn} onPress={resetAll}>
            <RefreshCw size={14} color={colors.textMuted} />
            <Text style={styles.scanAnotherText}>{t("scan.scanAnother")}</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  instructionsCard: { backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A", borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  instructionsTitle: { fontSize: 14.5, fontWeight: "700", color: "#92600E" },
  tipRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  tipIconWrap: { width: 26, height: 26, borderRadius: radius.sm, backgroundColor: "#FDE68A", alignItems: "center", justifyContent: "center" },
  tipText: { fontSize: 12.5, color: "#92600E", flex: 1 },

  readBtn: { backgroundColor: "#D9861F", borderRadius: radius.md, padding: spacing.lg, alignItems: "center", gap: spacing.xs },
  readBtnTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  readBtnHint: { color: "rgba(255,255,255,0.85)", fontSize: 12 },

  previewImage: { width: "100%", height: 260, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  previewHint: { fontSize: 12, color: colors.textMuted, textAlign: "center" },
  retakeLink: { textAlign: "center", fontSize: 13, color: colors.textMuted, paddingVertical: spacing.sm },
  errorText: { color: colors.danger, fontSize: 12.5, textAlign: "center" },

  analyzingWrap: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl * 1.5 },
  analyzingTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
  analyzingSubtitle: { fontSize: 12, color: colors.textMuted },

  summaryCard: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md },
  summaryTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  yearBadge: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  yearBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  summaryStat: { color: "rgba(255,255,255,0.85)", fontSize: 12.5 },
  summaryDesc: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: spacing.xs, lineHeight: 15 },

  warningBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "#FFF3E6", borderWidth: 1, borderColor: "#FBD9AE", borderRadius: radius.sm, padding: spacing.sm + 2 },
  warningBannerText: { flex: 1, fontSize: 12.5, fontWeight: "600", color: "#95530F" },

  categoryLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5 },
  entryCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm + 4 },
  entryCardWarn: { borderColor: "#FBD9AE" },
  typeBadge: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  typeBadgeText: { fontSize: 10.5, fontWeight: "700" },
  entryDesc: { fontSize: 13.5, fontWeight: "600", color: colors.text, lineHeight: 18 },
  entryOriginal: { fontSize: 11, color: colors.textMuted, fontStyle: "italic", marginTop: 2 },
  entryMeta: { fontSize: 11, color: colors.textMuted },
  doubtTag: { fontSize: 10.5, color: "#95530F", backgroundColor: "#FFF3E6", borderRadius: 4, paddingHorizontal: 4 },
  checkedTag: { fontSize: 10.5, color: colors.primary, backgroundColor: colors.bg, borderRadius: 4, paddingHorizontal: 4 },
  entryAmount: { fontSize: 13.5, fontWeight: "700" },
  saveBtn: { backgroundColor: "#D9861F", borderRadius: radius.sm, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2 },
  saveBtnDone: { backgroundColor: colors.bg },
  saveBtnText: { fontSize: 11.5, fontWeight: "700", color: "#fff" },

  doubtBox: { marginTop: spacing.sm, backgroundColor: "#FFF3E6", borderWidth: 1, borderColor: "#FBD9AE", borderRadius: radius.sm, padding: spacing.sm + 4 },
  doubtQuestion: { fontSize: 12.5, fontWeight: "600", color: "#95530F", marginBottom: spacing.sm },

  notesBox: { backgroundColor: "#E4EEFB", borderWidth: 1, borderColor: "#C7DCF5", borderRadius: radius.sm, padding: spacing.sm + 4 },
  notesText: { fontSize: 11.5, color: "#3E6FB0", lineHeight: 16 },

  scanAnotherBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: spacing.sm },
  scanAnotherText: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
});
