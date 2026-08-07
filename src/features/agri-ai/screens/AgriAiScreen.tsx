import React, { useLayoutEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bot, MessageSquare, Send, Sprout, Trash2, User } from "lucide-react-native";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import {
  createConversation,
  deleteConversation,
  getConversationMessages,
  getConversations,
  sendChatMessage,
} from "../../../api/endpoints/ai";
import type { ChatMessage } from "../../../types/api";

const QUICK_QUESTIONS = [
  "My crop leaves are turning yellow, what should I do?",
  "When is the best time to apply fertilizer?",
  "How do I control pests without expensive pesticides?",
  "What government schemes are available for farmers?",
];

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <View style={[styles.msgRow, isUser && { flexDirection: "row-reverse" }]}>
      <View style={[styles.avatar, { backgroundColor: isUser ? colors.primary : colors.secondary }]}>
        {isUser ? <User size={15} color="#fff" /> : <Sprout size={15} color={colors.primary} />}
      </View>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={isUser ? styles.userText : styles.aiText}>{msg.content}</Text>
      </View>
    </View>
  );
}

export function AgriAiScreen({ navigation }: { navigation: any }) {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const conversationsQuery = useQuery({ queryKey: ["ai-conversations"], queryFn: getConversations });
  const messagesQuery = useQuery({
    queryKey: ["ai-messages", conversationId],
    queryFn: () => getConversationMessages(conversationId!),
    enabled: conversationId != null,
  });

  const startMutation = useMutation({
    mutationFn: (title: string) => createConversation(title),
    onSuccess: (conv) => {
      if (conv) setConversationId(conv.id);
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      setConversationId(null);
    },
  });

  const activeConv = conversationsQuery.data?.find((c) => c.id === conversationId);

  useLayoutEffect(() => {
    navigation.setOptions({ title: conversationId == null ? "Agri Technician AI" : (activeConv?.title?.slice(0, 30) ?? "Agri Technician AI") });
  }, [navigation, conversationId, activeConv?.title]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    let id = conversationId;
    if (!id) {
      const conv = await startMutation.mutateAsync(trimmed.slice(0, 50));
      if (!conv) return;
      id = conv.id;
      setConversationId(id);
    }
    setInput("");
    setSending(true);
    await sendChatMessage(
      id,
      trimmed,
      () => {
        setSending(false);
        queryClient.invalidateQueries({ queryKey: ["ai-messages", id] });
        queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      },
      () => setSending(false)
    );
  }

  function confirmDelete(id: number) {
    Alert.alert("Delete this conversation?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  if (conversationsQuery.isLoading) return <LoadingView label="Loading Agri Advisor..." />;

  if (conversationId == null) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Sprout size={30} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Your Agri Technician</Text>
          <Text style={styles.heroSubtitle}>
            Expert farming advice powered by AI.{"\n"}Ask anything about your crops, pests, soil, or government schemes.
          </Text>
        </View>

        <View style={styles.disclaimer}>
          <AlertTriangle size={16} color="#B7791F" />
          <Text style={styles.disclaimerText}>
            <Text style={styles.disclaimerBold}>Safety & disclaimer.</Text> This is AI guidance, not a guarantee.{" "}
            <Text style={styles.disclaimerBold}>Confirm with an agronomist</Text> before buying or spraying. Always
            follow the dose and safety on the product label, wear gloves and a mask while spraying, test on a few
            plants first, and keep children, animals and food away.
          </Text>
        </View>

        <View>
          <Text style={styles.sectionLabel}>ASK A QUESTION</Text>
          <View style={{ gap: spacing.sm }}>
            {QUICK_QUESTIONS.map((q) => (
              <Pressable key={q} style={styles.questionRow} onPress={() => send(q)}>
                <Text style={styles.questionEmoji}>💬</Text>
                <Text style={styles.questionText}>{q}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {(conversationsQuery.data?.length ?? 0) > 0 ? (
          <View>
            <Text style={styles.sectionLabel}>PAST CONVERSATIONS</Text>
            <View style={{ gap: spacing.sm }}>
              {conversationsQuery.data!.map((c) => (
                <View key={c.id} style={styles.convRow}>
                  <MessageSquare size={16} color={colors.textMuted} />
                  <Pressable style={{ flex: 1 }} onPress={() => setConversationId(c.id)}>
                    <Text style={styles.convTitle} numberOfLines={1}>{c.title}</Text>
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(c.id)} hitSlop={10}>
                    <Trash2 size={16} color={colors.border} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {(messagesQuery.data?.length ?? 0) === 0 && !sending ? (
        <View style={styles.emptyChat}>
          <Bot size={40} color={colors.border} />
          <Text style={styles.emptyChatText}>Ask me anything about farming…</Text>
        </View>
      ) : (
        <FlatList
          data={messagesQuery.data ?? []}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
          renderItem={({ item }) => <MessageBubble msg={item} />}
        />
      )}
      <View style={styles.inputRow}>
        <View style={{ flex: 1 }}>
          <TextField
            placeholder="Type your farming question…"
            value={input}
            onChangeText={setInput}
            containerStyle={{ marginBottom: 0 }}
            multiline
          />
        </View>
        <View style={{ width: spacing.sm }} />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.5 }]}
          onPress={() => send(input)}
          disabled={!input.trim() || sending}
        >
          <Send size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  hero: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: "center" },
  heroIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  heroTitle: { color: "#fff", fontSize: 19, fontWeight: "700" },
  heroSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: spacing.xs, textAlign: "center", lineHeight: 18 },

  disclaimer: { flexDirection: "row", gap: spacing.sm, backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A", borderRadius: radius.md, padding: spacing.sm + 4 },
  disclaimerText: { flex: 1, fontSize: 11.5, color: "#92600E", lineHeight: 16 },
  disclaimerBold: { fontWeight: "700" },

  sectionLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing.sm },
  questionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm + 4 },
  questionEmoji: { fontSize: 15 },
  questionText: { flex: 1, fontSize: 13.5, color: colors.text },

  convRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm + 4 },
  convTitle: { fontSize: 13.5, color: colors.text },

  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  emptyChatText: { color: colors.textMuted, fontSize: 13 },

  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: "78%", borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  userBubble: { backgroundColor: colors.primary, borderTopRightRadius: 4 },
  aiBubble: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderTopLeftRadius: 4 },
  userText: { color: "#fff", fontSize: 13.5, lineHeight: 19 },
  aiText: { color: colors.text, fontSize: 13.5, lineHeight: 19 },

  inputRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
});
