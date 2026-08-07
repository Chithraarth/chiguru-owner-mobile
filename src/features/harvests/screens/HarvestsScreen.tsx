import React, { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Leaf, Plus, TrendingUp, Trash2, X } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { ChipSelect } from "../../../components/ChipSelect";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { useHarvests } from "../hooks/useHarvests";
import { useWorkGroups } from "../../work-groups/hooks/useWorkGroups";
import { useT } from "../../../lib/i18n";
import type { Harvest } from "../../../types/api";

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

type QuickAdd = "general" | "sold" | null;

export function HarvestsScreen() {
  const { t } = useT();
  const { data: harvests = [], isLoading, crops, createHarvest, deleteHarvest } = useHarvests();
  const { data: workGroups = [] } = useWorkGroups();
  const [openFolder, setOpenFolder] = useState<{ id: number | null; name: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [quickAdd, setQuickAdd] = useState<QuickAdd>(null);
  const insets = useSafeAreaInsets();

  const [cropId, setCropId] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [grade, setGrade] = useState("");
  const [buyer, setBuyer] = useState("");
  const [blockName, setBlockName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function confirmDelete(h: Harvest) {
    Alert.alert("Delete this harvest record?", undefined, [
      { text: t("scan.cancel"), style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteHarvest.mutate(h.id) },
    ]);
  }

  function openForm(qa: QuickAdd) {
    setQuickAdd(qa);
    setCropId(crops[0]?.id ?? null);
    setWeightKg("");
    setPricePerKg("");
    setGrade("");
    setBuyer("");
    setBlockName("");
    setFormError(null);
    setShowForm(true);
  }

  function submit() {
    setFormError(null);
    if (!cropId) {
      setFormError("Select a crop");
      return;
    }
    const weight = Number(weightKg);
    if (!weight || weight <= 0) {
      setFormError("Enter the weight harvested");
      return;
    }
    const price = quickAdd === "general" ? 0 : Number(pricePerKg);
    if (quickAdd === "sold" && !(price > 0)) {
      setFormError("Please enter the selling price per kg");
      return;
    }
    createHarvest.mutate(
      {
        date: new Date().toISOString().slice(0, 10),
        cropId,
        workGroupId: quickAdd ? undefined : (openFolder?.id ?? undefined),
        blockName: blockName.trim() || undefined,
        weightKg: weight,
        grade: grade.trim() || undefined,
        pricePerKg: price,
        totalIncome: weight * price,
        buyer: quickAdd === "general" ? undefined : buyer.trim() || undefined,
        paymentStatus: quickAdd === "sold" ? "paid" : "pending",
      },
      { onSuccess: () => setShowForm(false) }
    );
  }

  if (isLoading) return <LoadingView label="Loading harvests..." />;

  const totalIncome = harvests.reduce((s, h) => s + Number(h.totalIncome ?? 0), 0);
  const totalKg = harvests.reduce((s, h) => s + Number(h.weightKg), 0);

  const knownGroupIds = new Set(workGroups.map((g) => g.id));
  const orphanIds = [...new Set(harvests.filter((h) => h.workGroupId != null && !knownGroupIds.has(h.workGroupId)).map((h) => h.workGroupId as number))];
  const groupList = [...workGroups.map((g) => ({ id: g.id, name: g.name })), ...orphanIds.map((id) => ({ id, name: `Group #${id}` }))];
  const generalHarvests = harvests.filter((h) => h.workGroupId == null);

  const folders = [
    ...groupList.map((g) => {
      const recs = harvests.filter((h) => h.workGroupId === g.id);
      const kg = recs.reduce((s, h) => s + Number(h.weightKg), 0);
      return { id: g.id as number | null, name: g.name, subtitle: recs.length === 0 ? "No harvests yet" : `${kg.toLocaleString("en-IN")} kg harvested`, count: recs.length };
    }),
    {
      id: null,
      name: "General Harvests",
      subtitle: generalHarvests.length === 0 ? "Harvests without a group" : `${generalHarvests.reduce((s, h) => s + Number(h.weightKg), 0).toLocaleString("en-IN")} kg harvested`,
      count: generalHarvests.length,
    },
  ];

  const folderHarvests = openFolder ? harvests.filter((h) => (h.workGroupId ?? null) === openFolder.id) : harvests;
  const folderKg = folderHarvests.reduce((s, h) => s + Number(h.weightKg), 0);
  const folderIncome = folderHarvests.reduce((s, h) => s + Number(h.totalIncome ?? 0), 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        {openFolder === null ? (
          <>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable style={[styles.statCard, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]} onPress={() => openForm("sold")}>
                <Text style={[styles.statLabel, { color: "#92600E" }]}>Total income</Text>
                <Text style={[styles.statValue, { color: "#92600E" }]}>{inr(totalIncome)}</Text>
                <View style={[styles.statAddBtn, { backgroundColor: "#FDE68A" }]}>
                  <Plus size={12} color="#92600E" />
                  <Text style={[styles.statAddText, { color: "#92600E" }]}>Sold Harvest</Text>
                </View>
              </Pressable>
              <Pressable style={[styles.statCard, { backgroundColor: colors.bg, borderColor: colors.border }]} onPress={() => openForm("general")}>
                <Text style={[styles.statLabel, { color: colors.primary }]}>Total yield</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>{totalKg.toLocaleString("en-IN")} kg</Text>
                <View style={[styles.statAddBtn, { backgroundColor: "#E3E0EC" }]}>
                  <Plus size={12} color={colors.primary} />
                  <Text style={[styles.statAddText, { color: colors.primary }]}>General Harvest</Text>
                </View>
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>👥 YOUR WORK GROUPS</Text>
            <View style={{ gap: spacing.sm }}>
              {folders.map((f) => (
                <Pressable key={f.id ?? "general"} onPress={() => setOpenFolder({ id: f.id, name: f.name })}>
                  <Card style={styles.folderRow}>
                    <View style={styles.folderIcon}>
                      <Text style={{ fontSize: 20 }}>{f.id == null ? "🌾" : "👥"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.folderName}>{f.name}</Text>
                      <Text style={styles.folderSubtitle}>{f.subtitle}</Text>
                    </View>
                    {f.count > 0 ? (
                      <View style={styles.countBadge}><Text style={styles.countBadgeText}>{f.count}</Text></View>
                    ) : null}
                  </Card>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Pressable onPress={() => setOpenFolder(null)}>
              <Text style={styles.backLink}>← All Groups</Text>
            </Pressable>

            {folderHarvests.length > 0 ? (
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <View style={[styles.statCard, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
                  <Text style={[styles.statLabel, { color: "#92600E" }]}>Income</Text>
                  <Text style={[styles.statValue, { color: "#92600E" }]}>{inr(folderIncome)}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.statLabel, { color: colors.primary }]}>Yield</Text>
                  <Text style={[styles.statValue, { color: colors.primary }]}>{folderKg.toLocaleString("en-IN")} kg</Text>
                </View>
              </View>
            ) : null}

            {folderHarvests.length === 0 ? (
              <EmptyState
                title={`No harvests for ${openFolder.name} yet`}
                actionLabel="Record harvest"
                onAction={() => openForm(null)}
              />
            ) : (
              <View style={{ gap: spacing.sm }}>
                {folderHarvests.map((h) => (
                  <Card key={h.id}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                          <Text style={styles.harvestCrop}>{h.cropName ?? "—"}</Text>
                          {h.grade ? <View style={styles.gradeBadge}><Text style={styles.gradeBadgeText}>{h.grade}</Text></View> : null}
                          <View style={[styles.statusBadge, h.paymentStatus === "paid" && { backgroundColor: "#E3E0EC" }]}>
                            <Text style={[styles.statusBadgeText, h.paymentStatus === "paid" && { color: colors.primary }]}>{h.paymentStatus}</Text>
                          </View>
                        </View>
                        <Text style={styles.harvestMeta}>
                          {h.date}{h.blockName ? ` · ${h.blockName}` : ""}{h.buyer ? ` · ${h.buyer}` : ""}
                        </Text>
                        <Text style={styles.harvestQty}>
                          {Number(h.weightKg).toLocaleString("en-IN")} kg × ₹{h.pricePerKg ?? 0}/kg
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: spacing.xs }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <TrendingUp size={13} color={colors.primary} />
                          <Text style={styles.harvestIncome}>{inr(Number(h.totalIncome ?? 0))}</Text>
                        </View>
                        <Pressable onPress={() => confirmDelete(h)} hitSlop={10}>
                          <Trash2 size={15} color={colors.textMuted} />
                        </Pressable>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {openFolder !== null ? (
        <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
          <Button title="+ Add Harvest" onPress={() => openForm(null)} />
        </View>
      ) : null}

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowForm(false)} />
        <ScrollView style={styles.formSheet} contentContainerStyle={{ paddingBottom: spacing.lg }}>
          <View style={styles.formHeader}>
            <View>
              <Text style={styles.formTitle}>
                {quickAdd === "sold" ? "Record Sold Harvest" : quickAdd === "general" ? "Record General Harvest" : "Record Harvest"}
              </Text>
              <Text style={styles.formSubtitle}>
                {quickAdd === "sold" ? "💰 Sold — adds to Total income" : quickAdd === "general" ? "🌾 General — adds to Total yield" : openFolder?.id != null ? `👥 ${openFolder.name}` : "🌾 General"}
              </Text>
            </View>
            <Pressable onPress={() => setShowForm(false)} hitSlop={10}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {crops.length > 0 ? (
            <ChipSelect
              label="Crop *"
              options={crops.map((c) => c.name)}
              value={crops.find((c) => c.id === cropId)?.name ?? ""}
              onChange={(name) => setCropId(crops.find((c) => c.name === name)?.id ?? null)}
            />
          ) : (
            <Text style={styles.errorText}>Add a crop first before logging a harvest.</Text>
          )}

          <TextField label="Weight (kg) *" keyboardType="decimal-pad" value={weightKg} onChangeText={setWeightKg} />
          {quickAdd !== "general" ? (
            <TextField label="Price per kg (₹) *" keyboardType="decimal-pad" value={pricePerKg} onChangeText={setPricePerKg} />
          ) : null}
          {quickAdd !== "general" && Number(weightKg) > 0 && Number(pricePerKg) > 0 ? (
            <View style={styles.estimateBox}>
              <Text style={styles.estimateText}>Expected income: <Text style={{ fontWeight: "700" }}>{inr(Number(weightKg) * Number(pricePerKg))}</Text></Text>
            </View>
          ) : null}
          <TextField label="Grade" value={grade} onChangeText={setGrade} placeholder="A Grade, Cherry, Parchment…" />
          <TextField label="Block / Area" value={blockName} onChangeText={setBlockName} placeholder="e.g. Block A" />
          {quickAdd !== "general" ? <TextField label="Buyer" value={buyer} onChangeText={setBuyer} /> : null}

          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          <Button title="Save Harvest" onPress={submit} loading={createHarvest.isPending} disabled={crops.length === 0} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  statCard: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm + 4 },
  statLabel: { fontSize: 11.5, fontWeight: "600" },
  statValue: { fontSize: 19, fontWeight: "700", marginTop: 2 },
  statAddBtn: { flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, marginTop: spacing.sm },
  statAddText: { fontSize: 10.5, fontWeight: "700" },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5 },
  folderRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  folderIcon: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: "#E4EEFB", alignItems: "center", justifyContent: "center" },
  folderName: { fontSize: 15, fontWeight: "700", color: colors.text },
  folderSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  countBadge: { backgroundColor: "#E9E6FB", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText: { fontSize: 12, fontWeight: "700", color: colors.accent },

  backLink: { fontSize: 13, fontWeight: "700", color: colors.primary },

  harvestCrop: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  gradeBadge: { backgroundColor: "#FEF3C7", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  gradeBadgeText: { fontSize: 10.5, color: "#92600E", fontWeight: "600" },
  statusBadge: { backgroundColor: colors.muted, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeText: { fontSize: 10.5, color: colors.textMuted, fontWeight: "600" },
  harvestMeta: { fontSize: 11.5, color: colors.textMuted, marginTop: 3 },
  harvestQty: { fontSize: 12.5, color: colors.text, marginTop: 3 },
  harvestIncome: { fontSize: 14, fontWeight: "700", color: colors.primary },

  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  formSheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "88%", backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  formHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.md },
  formTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  formSubtitle: { fontSize: 12, color: "#3E6FB0", fontWeight: "600", marginTop: 2 },
  estimateBox: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm + 2, alignItems: "center", marginBottom: spacing.md },
  estimateText: { fontSize: 13, color: colors.primary },
  errorText: { color: colors.danger, fontSize: 12.5, marginBottom: spacing.md },
});
