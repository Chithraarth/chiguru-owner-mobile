import React, { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  MapPin,
  Package,
  Phone,
  Sprout,
  Store,
  Trash2,
  X,
  XCircle,
} from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { LoadingView, EmptyState } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { useT } from "../../../lib/i18n";
import {
  getAllNurseryVendors,
  getNurseryVendorDetail,
  updateNurseryVendor,
  deleteNurseryVendor,
  deleteNurseryListing,
} from "../../../api/endpoints/nursery";
import type { NurseryVendor } from "../../../types/api";

type FilterStatus = "all" | "pending" | "approved" | "suspended";

const STATUS_CONFIG: Record<string, { label: string; bg: string; fg: string; icon: any }> = {
  pending: { label: "Pending", bg: "#FEF3C7", fg: "#B7791F", icon: Clock },
  approved: { label: "Approved", bg: "#E3E0EC", fg: colors.primary, icon: CheckCircle2 },
  suspended: { label: "Suspended", bg: "#FDEAEA", fg: colors.danger, icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Icon size={11} color={cfg.fg} />
      <Text style={[styles.badgeText, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

function VendorDetail({ vendorId, onBack }: { vendorId: number; onBack: () => void }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [showNotes, setShowNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["nursery-vendor-detail", vendorId],
    queryFn: () => getNurseryVendorDetail(vendorId),
  });

  async function patch(data: Partial<Pick<NurseryVendor, "status" | "isActive" | "adminNotes">>) {
    setSaving(true);
    try {
      await updateNurseryVendor(vendorId, data);
      qc.invalidateQueries({ queryKey: ["nursery-vendors-all"] });
      qc.invalidateQueries({ queryKey: ["nursery-vendor-detail", vendorId] });
      setShowNotes(false);
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteListing(id: number) {
    Alert.alert("Remove this listing?", undefined, [
      { text: t("scan.cancel"), style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await deleteNurseryListing(id);
          qc.invalidateQueries({ queryKey: ["nursery-vendor-detail", vendorId] });
          qc.invalidateQueries({ queryKey: ["nursery-vendors-all"] });
        },
      },
    ]);
  }

  if (isLoading) return <LoadingView label="Loading vendor..." />;
  if (!vendor) return <EmptyState title="Vendor not found" />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Pressable onPress={onBack} style={styles.backRow}>
        <ArrowLeft size={16} color={colors.primary} />
        <Text style={styles.backText}>All Vendors</Text>
      </Pressable>

      <Card>
        <View style={styles.detailHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <Store size={18} color={colors.textMuted} />
              <Text style={styles.detailName}>{vendor.name}</Text>
            </View>
            {vendor.speciality ? <Text style={styles.speciality}>🌿 {vendor.speciality}</Text> : null}
            <View style={styles.metaRow}>
              <MapPin size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{vendor.location}</Text>
            </View>
            <View style={styles.metaRow}>
              <Phone size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{vendor.phone}{vendor.whatsapp ? ` · WA: ${vendor.whatsapp}` : ""}</Text>
            </View>
          </View>
          <StatusBadge status={vendor.status} />
        </View>
        {vendor.description ? <Text style={styles.description}>{vendor.description}</Text> : null}
        {vendor.adminNotes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Admin notes</Text>
            <Text style={styles.notesText}>{vendor.adminNotes}</Text>
          </View>
        ) : null}
        {vendor.createdAt ? (
          <Text style={styles.registeredText}>
            Registered: {new Date(vendor.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
        ) : null}
      </Card>

      <View style={styles.actionGrid}>
        {vendor.status !== "approved" ? (
          <Pressable style={[styles.actionBtn, styles.actionBtnPrimary]} disabled={saving} onPress={() => patch({ status: "approved", isActive: true })}>
            <CheckCircle2 size={15} color="#fff" />
            <Text style={styles.actionBtnPrimaryText}>{vendor.status === "suspended" ? "Reactivate" : "Approve"}</Text>
          </Pressable>
        ) : null}
        {vendor.status !== "suspended" ? (
          <Pressable style={[styles.actionBtn, styles.actionBtnDanger]} disabled={saving} onPress={() => patch({ status: "suspended", isActive: false })}>
            <XCircle size={15} color={colors.danger} />
            <Text style={styles.actionBtnDangerText}>Suspend</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={() => { setNotesDraft(vendor.adminNotes ?? ""); setShowNotes(true); }}
        >
          <Edit3 size={15} color={colors.text} />
          <Text style={styles.actionBtnSecondaryText}>Add Note</Text>
        </Pressable>
      </View>

      <View>
        <Text style={styles.blockTitle}>Plant Listings ({vendor.listings?.length ?? 0})</Text>
        {(vendor.listings?.length ?? 0) === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
            <Package size={36} color={colors.border} />
            <Text style={{ color: colors.textMuted, marginTop: spacing.sm, fontSize: 13 }}>No listings yet</Text>
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {vendor.listings!.map((l) => (
              <Card key={l.id} style={styles.listingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listingName}>{l.name}</Text>
                  <Text style={styles.listingMeta}>{l.category} · ₹{l.price} / {l.unit}</Text>
                  {l.qtyAvailable > 0 ? <Text style={styles.listingQty}>{l.qtyAvailable} available</Text> : null}
                </View>
                <View style={[styles.liveBadge, { backgroundColor: l.isAvailable ? "#E3E0EC" : colors.muted }]}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: l.isAvailable ? colors.primary : colors.textMuted }}>
                    {l.isAvailable ? "Live" : "Hidden"}
                  </Text>
                </View>
                <Pressable onPress={() => confirmDeleteListing(l.id)} hitSlop={10} style={{ marginLeft: spacing.sm }}>
                  <Trash2 size={15} color={colors.textMuted} />
                </Pressable>
              </Card>
            ))}
          </View>
        )}
      </View>

      <Modal visible={showNotes} transparent animationType="slide" onRequestClose={() => setShowNotes(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowNotes(false)} />
        <View style={styles.notesSheet}>
          <View style={styles.notesSheetHeader}>
            <Text style={styles.notesSheetTitle}>Admin Note</Text>
            <Pressable onPress={() => setShowNotes(false)} hitSlop={10}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.label}>Note for this vendor</Text>
          <TextInput
            style={styles.textarea}
            multiline
            numberOfLines={4}
            placeholder="e.g. Verified by phone call on 15 Jun 2026"
            placeholderTextColor={colors.textMuted}
            value={notesDraft}
            onChangeText={setNotesDraft}
          />
          <Button title="Save Note" onPress={() => patch({ adminNotes: notesDraft })} loading={saving} />
        </View>
      </Modal>
    </ScrollView>
  );
}

export function NurseryAdminScreen() {
  const { t } = useT();
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["nursery-vendors-all"],
    queryFn: getAllNurseryVendors,
  });

  async function patch(id: number, data: Partial<Pick<NurseryVendor, "status" | "isActive">>) {
    await updateNurseryVendor(id, data);
    qc.invalidateQueries({ queryKey: ["nursery-vendors-all"] });
  }

  function confirmDeleteVendor(v: NurseryVendor) {
    Alert.alert("Remove vendor?", `${v.name} and all their listings will be permanently deleted.`, [
      { text: t("scan.cancel"), style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteNurseryVendor(v.id);
          qc.invalidateQueries({ queryKey: ["nursery-vendors-all"] });
        },
      },
    ]);
  }

  if (selectedVendorId !== null) {
    return <VendorDetail vendorId={selectedVendorId} onBack={() => setSelectedVendorId(null)} />;
  }

  if (isLoading) return <LoadingView label="Loading vendors..." />;

  const pending = vendors.filter((v) => v.status === "pending");
  const approved = vendors.filter((v) => v.status === "approved");
  const suspended = vendors.filter((v) => v.status === "suspended");
  const displayed = filterStatus === "all" ? vendors : filterStatus === "pending" ? pending : filterStatus === "approved" ? approved : suspended;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
          <Text style={[styles.statValue, { color: "#B7791F" }]}>{pending.length}</Text>
          <Text style={[styles.statLabel, { color: "#B7791F" }]}>Pending</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: "#EDEBF7", borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{approved.length}</Text>
          <Text style={[styles.statLabel, { color: colors.primary }]}>Approved</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: "#FDEAEA", borderColor: "#F5C6C6" }]}>
          <Text style={[styles.statValue, { color: colors.danger }]}>{suspended.length}</Text>
          <Text style={[styles.statLabel, { color: colors.danger }]}>Suspended</Text>
        </View>
      </View>

      {pending.length > 0 ? (
        <Pressable style={styles.alertBanner} onPress={() => setFilterStatus("pending")}>
          <AlertTriangle size={18} color="#B7791F" />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>{pending.length} vendor{pending.length > 1 ? "s" : ""} waiting for approval</Text>
            <Text style={styles.alertSubtitle}>Review and approve to make them visible to farmers</Text>
          </View>
          <Text style={styles.alertLink}>View</Text>
        </Pressable>
      ) : null}

      <View style={styles.tabs}>
        {(["all", "pending", "approved", "suspended"] as FilterStatus[]).map((s) => (
          <Pressable key={s} onPress={() => setFilterStatus(s)} style={[styles.tab, filterStatus === s && styles.tabActive]}>
            <Text style={[styles.tabText, filterStatus === s && styles.tabTextActive]}>
              {s === "all" ? `All (${vendors.length})` : s === "pending" ? `Pending (${pending.length})` : s === "approved" ? `Active (${approved.length})` : `Suspended (${suspended.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {displayed.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
          <Sprout size={40} color={colors.border} />
          <Text style={{ color: colors.textMuted, marginTop: spacing.sm, fontSize: 13 }}>
            No vendors {filterStatus !== "all" ? `with status "${filterStatus}"` : "registered yet"}
          </Text>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {displayed.map((v) => (
            <Card key={v.id} style={{ padding: spacing.md }}>
              <View style={styles.vendorHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <Text style={styles.vendorName} numberOfLines={1}>{v.name}</Text>
                    <StatusBadge status={v.status} />
                  </View>
                  {v.speciality ? <Text style={styles.speciality} numberOfLines={1}>🌿 {v.speciality}</Text> : null}
                  <View style={styles.metaRow}>
                    <MapPin size={11} color={colors.textMuted} />
                    <Text style={styles.metaText} numberOfLines={1}>{v.location}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Phone size={11} color={colors.textMuted} />
                    <Text style={styles.metaText}>{v.phone}</Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.listingCount}>{v.listingCount ?? 0}</Text>
                  <Text style={styles.listingCountLabel}>listings</Text>
                </View>
              </View>

              <View style={styles.quickActionsRow}>
                {v.status === "pending" ? (
                  <Pressable style={[styles.quickBtn, styles.quickBtnPrimary]} onPress={() => patch(v.id, { status: "approved", isActive: true })}>
                    <CheckCircle2 size={13} color="#fff" />
                    <Text style={styles.quickBtnPrimaryText}>Approve</Text>
                  </Pressable>
                ) : null}
                {v.status === "approved" ? (
                  <Pressable style={[styles.quickBtn, styles.quickBtnDanger]} onPress={() => patch(v.id, { status: "suspended", isActive: false })}>
                    <XCircle size={13} color={colors.danger} />
                    <Text style={styles.quickBtnDangerText}>Suspend</Text>
                  </Pressable>
                ) : null}
                {v.status === "suspended" ? (
                  <Pressable style={[styles.quickBtn, styles.quickBtnPrimary]} onPress={() => patch(v.id, { status: "approved", isActive: true })}>
                    <CheckCircle2 size={13} color="#fff" />
                    <Text style={styles.quickBtnPrimaryText}>Reactivate</Text>
                  </Pressable>
                ) : null}
                <Pressable style={[styles.quickBtn, styles.quickBtnSecondary]} onPress={() => setSelectedVendorId(v.id)}>
                  <Eye size={13} color={colors.text} />
                  <Text style={styles.quickBtnSecondaryText}>View Shop</Text>
                </Pressable>
                <Pressable style={styles.quickBtnIcon} onPress={() => confirmDeleteVendor(v)}>
                  <Trash2 size={13} color={colors.danger} />
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  statsRow: { flexDirection: "row", gap: spacing.sm },
  statBox: { flex: 1, borderWidth: 1, borderRadius: radius.md, alignItems: "center", paddingVertical: spacing.sm + 2 },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },

  alertBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A", borderRadius: radius.md, padding: spacing.sm + 4 },
  alertTitle: { fontSize: 13, fontWeight: "700", color: "#92600E" },
  alertSubtitle: { fontSize: 11, color: "#B7791F", marginTop: 2 },
  alertLink: { fontSize: 12, fontWeight: "700", color: "#92600E", textDecorationLine: "underline" },

  tabs: { flexDirection: "row", backgroundColor: colors.muted, borderRadius: radius.sm, padding: 4, gap: 2 },
  tab: { flex: 1, paddingVertical: spacing.sm - 2, borderRadius: radius.sm - 2, alignItems: "center" },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: colors.text },

  badge: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: "700" },

  vendorHeaderRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  vendorName: { fontSize: 15, fontWeight: "700", color: colors.text, flexShrink: 1 },
  speciality: { fontSize: 11, color: colors.primary, marginTop: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  metaText: { fontSize: 11, color: colors.textMuted, flexShrink: 1 },
  listingCount: { fontSize: 17, fontWeight: "700", color: colors.primary },
  listingCountLabel: { fontSize: 10, color: colors.textMuted },

  quickActionsRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm + 4, paddingTop: spacing.sm + 4, borderTopWidth: 1, borderTopColor: colors.bg },
  quickBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: spacing.sm - 2, borderRadius: radius.sm },
  quickBtnPrimary: { backgroundColor: colors.primary },
  quickBtnPrimaryText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  quickBtnDanger: { backgroundColor: "#FDEAEA", borderWidth: 1, borderColor: "#F5C6C6" },
  quickBtnDangerText: { color: colors.danger, fontSize: 11, fontWeight: "700" },
  quickBtnSecondary: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  quickBtnSecondaryText: { color: colors.text, fontSize: 11, fontWeight: "700" },
  quickBtnIcon: { width: 32, height: 32, backgroundColor: "#FDEAEA", borderWidth: 1, borderColor: "#F5C6C6", borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },

  backRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  backText: { fontSize: 13, fontWeight: "700", color: colors.primary },
  detailHeaderRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  detailName: { fontSize: 17, fontWeight: "700", color: colors.text },
  description: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.bg, lineHeight: 17 },
  notesBox: { backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A", borderRadius: radius.sm, padding: spacing.sm + 2, marginTop: spacing.sm },
  notesLabel: { fontSize: 11, fontWeight: "700", color: "#92600E" },
  notesText: { fontSize: 12, color: "#B7791F", marginTop: 2 },
  registeredText: { fontSize: 11, color: colors.textMuted, marginTop: spacing.sm },

  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, flexGrow: 1, minWidth: "30%", paddingVertical: spacing.sm + 2, borderRadius: radius.sm },
  actionBtnPrimary: { backgroundColor: colors.primary },
  actionBtnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  actionBtnDanger: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#F5C6C6" },
  actionBtnDangerText: { color: colors.danger, fontWeight: "700", fontSize: 13 },
  actionBtnSecondary: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border },
  actionBtnSecondaryText: { color: colors.text, fontWeight: "600", fontSize: 13 },

  blockTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  listingRow: { flexDirection: "row", alignItems: "center" },
  listingName: { fontSize: 14, fontWeight: "600", color: colors.text },
  listingMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  listingQty: { fontSize: 11, color: "#5B8CD6", marginTop: 1 },
  liveBadge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  notesSheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  notesSheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  notesSheetTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  label: { fontSize: 12, color: colors.textMuted },
  textarea: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm + 2, fontSize: 14, color: colors.text, minHeight: 90, textAlignVertical: "top" },
});
