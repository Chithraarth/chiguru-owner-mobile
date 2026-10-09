import React, { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../../../components/Text";
import { ChevronDown, ChevronUp, Leaf, Plus, TrendingUp, Trash2, X } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { ChipSelect } from "../../../components/ChipSelect";
import { LoadingView } from "../../../components/StateViews";
import { IconChip, SectionLabel, StatTiles, shortRupees } from "../../../components/harvest";
import { colors, radius, spacing } from "../../../components/theme";
import { useHarvests } from "../hooks/useHarvests";
import { useQuery } from "@tanstack/react-query";
import { getAllAttendance } from "../../../api/endpoints/attendance";
import { useWorkGroups } from "../../work-groups/hooks/useWorkGroups";
import { useT } from "../../../lib/i18n";
import type { AttendanceRecord, Harvest } from "../../../types/api";

function fmtDay(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

type QuickAdd = "general" | "sold" | null;

export function HarvestsScreen() {
  const { t } = useT();
  const { data: harvests = [], isLoading, crops, createHarvest, deleteHarvest } = useHarvests();
  const { data: attendance = [] } = useQuery<AttendanceRecord[]>({ queryKey: ["attendance-all"], queryFn: getAllAttendance });
  const { data: workGroups = [] } = useWorkGroups();
  const [openCrop, setOpenCrop] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [quickAdd, setQuickAdd] = useState<QuickAdd>(null);

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
        workGroupId: undefined,
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

  // Picked = what workers weighed in attendance (kg + crop per person per day).
  // It is added up here automatically - nothing to enter twice.
  const pickedRows = attendance.filter((a) => Number(a.harvestedKg ?? 0) > 0);
  const pickedKg = pickedRows.reduce((s, a) => s + Number(a.harvestedKg ?? 0), 0);
  const byCrop = new Map<string, { crop: string; kg: number; days: Map<string, { date: string; group: string | null; kg: number; people: number }> }>();
  for (const a of pickedRows) {
    // No crop typed that day? Use the work group's crop.
    const groupCrop = workGroups.find((g) => g.id === a.workGroupId)?.cropName ?? null;
    const crop = a.harvestCrop?.trim() || groupCrop?.trim() || "Crop not set";
    const c = byCrop.get(crop) ?? { crop, kg: 0, days: new Map() };
    const kg = Number(a.harvestedKg ?? 0);
    c.kg += kg;
    const key = `${a.date}|${a.workGroupId ?? ""}`;
    const d = c.days.get(key) ?? { date: a.date, group: a.workGroupName, kg: 0, people: 0 };
    d.kg += kg;
    d.people += 1;
    c.days.set(key, d);
    byCrop.set(crop, c);
  }
  const crops_ = [...byCrop.values()].sort((a, b) => b.kg - a.kg);

  // Sales have a price. Entries without one are the old hand-entered
  // "General" harvests - kept and listed apart so they don't look like sales.
  const sold = harvests.filter((h) => Number(h.pricePerKg ?? 0) > 0);
  const earlier = harvests.filter((h) => !(Number(h.pricePerKg ?? 0) > 0));
  const totalIncome = sold.reduce((s, h) => s + Number(h.totalIncome ?? 0), 0);
  const soldKg = sold.reduce((s, h) => s + Number(h.weightKg), 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
        <StatTiles
          items={[
            { label: "Picked", value: `${Math.round(pickedKg).toLocaleString("en-IN")} kg`, sub: "from attendance" },
            { label: "Sold", value: `${Math.round(soldKg).toLocaleString("en-IN")} kg`, sub: "harvest sales" },
            { label: "Income", value: shortRupees(totalIncome), sub: "from sales" },
          ]}
        />
        <Button title="Sold harvest" icon={Plus} onPress={() => openForm("sold")} />

        <SectionLabel>Picked by crop</SectionLabel>
        {crops_.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              Nothing picked yet. When you mark attendance with "Harvest picking today?", each person's kg adds up here by crop.
            </Text>
          </Card>
        ) : (
          crops_.map((c, ci) => {
            const open = openCrop === c.crop;
            const days = [...c.days.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
            return (
              <Card key={c.crop} style={{ padding: 0, overflow: "hidden" }}>
                <Pressable
                  onPress={() => setOpenCrop(open ? null : c.crop)}
                  style={styles.cropRow}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                >
                  <IconChip icon={Leaf} index={ci} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.harvestCrop}>{c.crop}</Text>
                    <Text style={styles.harvestMeta}>{days.length} {days.length === 1 ? "day" : "days"} of picking</Text>
                  </View>
                  <Text style={styles.cropKg}>{Math.round(c.kg).toLocaleString("en-IN")} kg</Text>
                  {open ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronDown size={18} color={colors.textMuted} />}
                </Pressable>
                {open
                  ? days.map((d) => (
                      <View key={`${d.date}-${d.group}`} style={styles.dayRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dayDate}>{fmtDay(d.date)}</Text>
                          <Text style={styles.harvestMeta}>
                            {d.group ?? "No group"} · {d.people} {d.people === 1 ? "person" : "people"}
                          </Text>
                        </View>
                        <Text style={styles.dayKg}>{d.kg.toLocaleString("en-IN")} kg</Text>
                      </View>
                    ))
                  : null}
              </Card>
            );
          })
        )}

        <SectionLabel>Sales</SectionLabel>
        {sold.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No sales recorded yet. Tap "Sold harvest" when you sell.</Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {sold.map((h) => (
              <Card key={h.id}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                      <Text style={styles.harvestCrop}>{h.cropName ?? "—"}</Text>
                      {h.grade ? <View style={styles.gradeBadge}><Text style={styles.gradeBadgeText}>{h.grade}</Text></View> : null}
                    </View>
                    <Text style={styles.harvestMeta}>
                      {fmtDay(h.date)}{h.blockName ? ` · ${h.blockName}` : ""}{h.buyer ? ` · ${h.buyer}` : ""}
                    </Text>
                    <Text style={styles.harvestQty}>
                      {Number(h.weightKg).toLocaleString("en-IN")} kg × ₹{Number(h.pricePerKg ?? 0)}/kg
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: spacing.xs }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <TrendingUp size={13} color={colors.primary} />
                      <Text style={styles.harvestIncome}>{inr(Number(h.totalIncome ?? 0))}</Text>
                    </View>
                    <Pressable onPress={() => confirmDelete(h)} hitSlop={10} accessibilityLabel="Delete this sale">
                      <Trash2 size={15} color={colors.textMuted} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
        {earlier.length > 0 ? (
          <>
            <SectionLabel>Earlier entries (added by hand)</SectionLabel>
            <View style={{ gap: spacing.sm }}>
              {earlier.map((h) => (
                <Card key={h.id}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.harvestCrop}>{h.cropName ?? "—"}</Text>
                      <Text style={styles.harvestMeta}>{fmtDay(h.date)}{h.blockName ? ` · ${h.blockName}` : ""}</Text>
                    </View>
                    <Text style={styles.dayKg}>{Number(h.weightKg).toLocaleString("en-IN")} kg</Text>
                    <Pressable onPress={() => confirmDelete(h)} hitSlop={10} accessibilityLabel="Delete this entry">
                      <Trash2 size={15} color={colors.textMuted} />
                    </Pressable>
                  </View>
                </Card>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowForm(false)} />
        <ScrollView style={styles.formSheet} contentContainerStyle={{ paddingBottom: spacing.lg }}>
          <View style={styles.formHeader}>
            <View>
              <Text style={styles.formTitle}>
                {quickAdd === "sold" ? "Record Sold Harvest" : quickAdd === "general" ? "Record General Harvest" : "Record Harvest"}
              </Text>
              <Text style={styles.formSubtitle}>
                Sold — adds to Income
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
  backChip: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", minHeight: 40, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.card },
  container: { flex: 1, backgroundColor: colors.bg },
  statCard: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm + 4 },
  statLabel: { fontSize: 13.5, fontWeight: "600" },
  statValue: { fontSize: 19, fontWeight: "700", marginTop: 2 },
  statAddBtn: { flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, marginTop: spacing.sm },
  statAddText: { fontSize: 12.5, fontWeight: "700" },

  sectionLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5 },
  folderRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  folderIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E4EEFB", alignItems: "center", justifyContent: "center" },
  folderName: { fontSize: 16.5, fontWeight: "700", color: colors.text },
  folderSubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  countBadge: { backgroundColor: "#FFF0C2", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText: { fontSize: 14, fontWeight: "700", color: colors.primary },

  backLink: { fontSize: 14.5, fontWeight: "700", color: colors.primary },

  harvestCrop: { fontSize: 16, fontWeight: "700", color: colors.text },
  gradeBadge: { backgroundColor: "#FEF3C7", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  gradeBadgeText: { fontSize: 12.5, color: "#92600E", fontWeight: "600" },
  statusBadge: { backgroundColor: colors.muted, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeText: { fontSize: 12.5, color: colors.textMuted, fontWeight: "600" },
  harvestMeta: { fontSize: 13.5, color: colors.textMuted, marginTop: 3 },
  harvestQty: { fontSize: 14.5, color: colors.text, marginTop: 3 },
  harvestIncome: { fontSize: 15.5, fontWeight: "700", color: colors.primary },

  cropRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, minHeight: 64 },
  cropKg: { fontSize: 16.5, fontWeight: "800", color: colors.primary },
  dayRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderTopWidth: 1, borderTopColor: colors.border },
  dayDate: { fontSize: 15, fontWeight: "600", color: colors.text },
  dayKg: { fontSize: 15, fontWeight: "700", color: colors.text },
  emptyText: { fontSize: 14.5, color: colors.textMuted, lineHeight: 20 },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  formSheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "88%", backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  formHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.md },
  formTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  formSubtitle: { fontSize: 14, color: "#3E6FB0", fontWeight: "600", marginTop: 2 },
  estimateBox: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm + 2, alignItems: "center", marginBottom: spacing.md },
  estimateText: { fontSize: 14.5, color: colors.primary },
  errorText: { color: colors.danger, fontSize: 14.5, marginBottom: spacing.md },
});
