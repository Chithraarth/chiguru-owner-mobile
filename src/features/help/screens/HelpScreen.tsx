import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, HelpCircle, LifeBuoy, Lightbulb, MessageCircleQuestion, Sparkles } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { colors, radius, spacing } from "../../../components/theme";
import { getHelpMessages, postHelpMessage } from "../../../api/endpoints/help";
import type { HelpMessage } from "../../../types/api";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function HelpScreen() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<"question" | "suggestion">("question");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");

  const query = useQuery({
    queryKey: ["help-messages"],
    queryFn: getHelpMessages,
    refetchInterval: (q) => ((q.state.data as HelpMessage[] | undefined) ?? []).some((m) => m.type === "question" && !m.reply) ? 4000 : false,
  });

  const sendMutation = useMutation({
    mutationFn: () => postHelpMessage(type, message.trim(), phone.trim()),
    onSuccess: () => {
      setMessage("");
      setPhone("");
      queryClient.invalidateQueries({ queryKey: ["help-messages"] });
    },
  });

  const messages = query.data ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <View style={styles.intro}>
        <View style={styles.introIconWrap}>
          <LifeBuoy size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.introTitle}>We're here to help</Text>
          <Text style={styles.introSubtitle}>
            Ask a question and the Chiguru helpline replies within seconds. Send a suggestion and the Chiguru team will review it and update you right here.
          </Text>
        </View>
      </View>

      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <TypeTile
            active={type === "question"}
            icon={HelpCircle}
            label="Ask a question"
            color={colors.primary}
            onPress={() => setType("question")}
          />
          <TypeTile
            active={type === "suggestion"}
            icon={Lightbulb}
            label="Give a suggestion"
            color={colors.accent}
            onPress={() => setType("suggestion")}
          />
        </View>

        <TextField
          label={type === "question" ? "What do you need help with? *" : "What should we improve? *"}
          placeholder={type === "question" ? "e.g. How do I move a worker to another group?" : "e.g. Please add a weekly wage report I can print"}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          maxLength={2000}
          style={{ minHeight: 90, textAlignVertical: "top" }}
        />
        <TextField
          label="Phone number (optional — if you want a call back)"
          placeholder="e.g. 98765 43210"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={20}
        />
        <Button
          title={sendMutation.isPending ? "Sending..." : type === "question" ? "Send question" : "Send suggestion"}
          onPress={() => sendMutation.mutate()}
          loading={sendMutation.isPending}
          disabled={!message.trim() || sendMutation.isPending}
        />
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Text style={styles.sectionTitle}>Your messages</Text>
        {query.isLoading ? (
          <Card style={{ alignItems: "center", padding: spacing.lg }}>
            <Text style={styles.emptyText}>Loading…</Text>
          </Card>
        ) : messages.length === 0 ? (
          <Card style={{ alignItems: "center", padding: spacing.lg }}>
            <MessageCircleQuestion size={30} color={colors.border} />
            <Text style={styles.emptyText}>No messages yet. Ask us anything — we're happy to help.</Text>
          </Card>
        ) : (
          messages.map((m) => (
            <Card key={m.id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {m.type === "suggestion" ? <Lightbulb size={15} color={colors.accent} /> : <HelpCircle size={15} color={colors.primary} />}
                <Text style={styles.msgType}>{m.type === "suggestion" ? "Suggestion" : "Question"}</Text>
                <Text style={styles.msgDate}>{fmtDate(m.createdAt)}</Text>
              </View>
              <Text style={styles.msgBody}>{m.message}</Text>
              {m.reply ? (
                <View style={styles.replyBox}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {m.type === "question" ? <Sparkles size={14} color={colors.primary} /> : <CheckCircle2 size={14} color={colors.primary} />}
                    <Text style={styles.replyLabel}>{m.type === "question" ? "Reply from Chiguru Helpline" : "Update from Chiguru team"}</Text>
                  </View>
                  <Text style={styles.replyBody}>{m.reply}</Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm }}>
                  <Clock size={13} color={colors.textMuted} />
                  <Text style={styles.pendingText}>
                    {m.type === "question" ? "Chiguru Helpline is preparing your reply — it will appear here shortly" : "With the Chiguru team — updates will appear here"}
                  </Text>
                </View>
              )}
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function TypeTile({ active, icon: Icon, label, color, onPress }: { active: boolean; icon: any; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tile,
        active ? { borderColor: color, backgroundColor: color + "0D" } : { borderColor: colors.border },
      ]}
    >
      <Icon size={22} color={active ? color : colors.textMuted} />
      <Text style={[styles.tileLabel, active && { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  intro: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, backgroundColor: colors.primary + "0D", borderWidth: 1, borderColor: colors.primary + "1A", borderRadius: radius.lg, padding: spacing.md },
  introIconWrap: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  introTitle: { fontSize: 14.5, fontWeight: "700", color: colors.primary },
  introSubtitle: { fontSize: 12, color: colors.primary, opacity: 0.8, marginTop: 3, lineHeight: 17 },

  tile: { flex: 1, alignItems: "center", gap: spacing.xs, paddingVertical: spacing.sm + 4, borderWidth: 2, borderRadius: radius.md },
  tileLabel: { fontSize: 12.5, fontWeight: "600", color: colors.textMuted, textAlign: "center" },

  sectionTitle: { fontSize: 13.5, fontWeight: "700", color: colors.text, paddingHorizontal: 2 },
  emptyText: { fontSize: 12.5, color: colors.textMuted, marginTop: spacing.xs, textAlign: "center" },

  msgType: { fontSize: 10.5, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.4, textTransform: "uppercase" },
  msgDate: { marginLeft: "auto", fontSize: 10.5, color: colors.textMuted },
  msgBody: { fontSize: 13.5, color: colors.text, marginTop: spacing.sm },

  replyBox: { marginTop: spacing.sm, backgroundColor: colors.primary + "0D", borderWidth: 1, borderColor: colors.primary + "33", borderRadius: radius.sm, padding: spacing.sm + 4 },
  replyLabel: { fontSize: 11, fontWeight: "700", color: colors.primary },
  replyBody: { fontSize: 13, color: colors.primary, marginTop: 5 },

  pendingText: { fontSize: 11.5, color: colors.textMuted, flex: 1 },
});
