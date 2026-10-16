import React, { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Flag, X } from "lucide-react-native";
import { Text } from "./Text";
import { Button } from "./Button";
import { TextField } from "./TextField";
import { colors, radius, spacing } from "./theme";
import { reportListing, type ReportBoard, type ReportReason } from "../api/endpoints/moderation";

const REASONS: { key: ReportReason; label: string }[] = [
  { key: "spam", label: "Spam or a scam" },
  { key: "misleading", label: "Wrong or misleading" },
  { key: "offensive", label: "Offensive or abusive" },
  { key: "illegal", label: "Illegal item or service" },
  { key: "other", label: "Something else" },
];

/** Small "Report" link for a listing card; opens the report / block sheet. */
export function ReportButton({ board, listingId, title }: { board: ReportBoard; listingId: number; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10} style={styles.reportLink} accessibilityRole="button" accessibilityLabel={`Report ${title}`}>
        <Flag size={14} color={colors.textMuted} />
        <Text style={styles.reportLinkText}>Report</Text>
      </Pressable>
      {open ? <ReportSheet board={board} listingId={listingId} title={title} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ReportSheet({ board, listingId, title, onClose }: { board: ReportBoard; listingId: number; title: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(false);
  const [sending, setSending] = useState(false);

  async function send() {
    if (!reason || sending) return;
    setSending(true);
    try {
      const r = await reportListing({ board, listingId, reason, details: details.trim() || undefined, block });
      // Refetch every board and the ads feed so the hidden ads disappear.
      qc.invalidateQueries();
      onClose();
      Alert.alert(
        "Thanks for reporting",
        r.blocked
          ? "This ad and everything else this person posts are now hidden for you. Our team reviews reports within 24 hours."
          : "This ad is now hidden for you. Our team reviews reports within 24 hours."
      );
    } catch (e) {
      Alert.alert("Could not send the report", e instanceof Error ? e.message : "Check your internet and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.head}>
          <Text style={styles.title}>Report this ad</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close"><X size={22} color={colors.textMuted} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.lg }} keyboardShouldPersistTaps="handled">
          <Text style={styles.sub} numberOfLines={2}>{title}</Text>
          <Text style={styles.label}>What's wrong with it?</Text>
          {REASONS.map((r) => (
            <Pressable key={r.key} onPress={() => setReason(r.key)} style={[styles.reason, reason === r.key && styles.reasonOn]} accessibilityRole="radio" accessibilityState={{ selected: reason === r.key }}>
              <View style={[styles.radio, reason === r.key && styles.radioOn]} />
              <Text style={styles.reasonText}>{r.label}</Text>
            </Pressable>
          ))}
          <TextField label="More details (optional)" value={details} onChangeText={setDetails} multiline maxLength={1000} style={{ minHeight: 70, textAlignVertical: "top" }} containerStyle={{ marginBottom: 0 }} />
          <View style={styles.blockRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.blockTitle}>Block this person</Text>
              <Text style={styles.blockSub}>Hide every ad they post from you.</Text>
            </View>
            <Switch value={block} onValueChange={setBlock} trackColor={{ true: colors.primary, false: colors.border }} accessibilityLabel="Block this person" />
          </View>
          <Button title={block ? "Report and block" : "Send report"} onPress={send} loading={sending} disabled={!reason} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  reportLink: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end", paddingHorizontal: 4 },
  reportLinkText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  backdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: { maxHeight: "85%", backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.md },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  sub: { color: colors.textMuted, fontSize: 14 },
  label: { fontSize: 14, fontWeight: "700", color: colors.textMuted, marginTop: spacing.xs },
  reason: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  reasonOn: { borderColor: colors.primary, backgroundColor: colors.tint },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  reasonText: { fontSize: 16, color: colors.text, fontWeight: "600" },
  blockRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.dangerBg, borderRadius: radius.md, padding: 12 },
  blockTitle: { fontSize: 16, fontWeight: "700", color: colors.danger },
  blockSub: { fontSize: 13, color: colors.textMuted },
});
