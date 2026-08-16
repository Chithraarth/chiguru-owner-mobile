import React, { useEffect, useState } from "react";
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { ArrowLeft, BadgeCheck, Camera, Clock, Mic, Pause, Play, Send, Square, User } from "lucide-react-native";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { endConsultation, getAgronomist, getConsultationMessages, sendConsultationMessage } from "../../../api/endpoints/agriDoctor";
import { compressToDataUrl, fileUriToBase64 } from "../../../lib/imageCompression";
import type { AgriDoctorEndResult, ConsultationMessage } from "../../../types/api";

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function fmtClock(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
function billing(elapsedSec: number, ratePer15: number) {
  const blocks = Math.max(1, Math.ceil(elapsedSec / (15 * 60)));
  return blocks * ratePer15;
}

/** Playback control for an audio message bubble - one player per bubble. */
function VoiceNotePlayer({ uri, tint }: { uri: string; tint: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  function toggle() {
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish || status.currentTime >= (status.duration || 0)) {
        player.seekTo(0);
      }
      player.play();
    }
  }

  const durationSec = status.duration || 0;

  return (
    <Pressable style={styles.voiceNote} onPress={toggle}>
      <View style={[styles.voicePlayBtn, { backgroundColor: tint }]}>
        {status.playing ? <Pause size={13} color="#fff" /> : <Play size={13} color="#fff" style={{ marginLeft: 1 }} />}
      </View>
      <View style={styles.voiceTrack}>
        <View
          style={[
            styles.voiceProgress,
            { backgroundColor: tint, width: `${durationSec ? Math.min(100, (status.currentTime / durationSec) * 100) : 0}%` },
          ]}
        />
      </View>
      <Text style={styles.voiceDuration}>{fmtClock(Math.round(durationSec))}</Text>
    </Pressable>
  );
}

export function ConsultationScreen({ navigation, route }: { navigation: any; route: any }) {
  const consultationId: number = route.params.consultationId;
  const doctorId: number | undefined = route.params.doctorId;
  const [input, setInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [ended, setEnded] = useState<AgriDoctorEndResult | null>(null);
  const [attachingPhoto, setAttachingPhoto] = useState(false);
  const queryClient = useQueryClient();

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [preparingMic, setPreparingMic] = useState(false);

  const { data: doctor } = useQuery({ queryKey: ["agronomist", doctorId], queryFn: () => getAgronomist(doctorId!), enabled: doctorId != null });
  const messagesQuery = useQuery({
    queryKey: ["consultation-messages", consultationId],
    queryFn: () => getConsultationMessages(consultationId),
    refetchInterval: 4000,
  });

  useEffect(() => {
    if (ended) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [ended]);

  const sendMutation = useMutation({
    mutationFn: ({ text, media }: { text: string; media?: { mediaType: "image" | "audio"; mediaUrl: string } }) =>
      sendConsultationMessage(consultationId, text, media),
    onSuccess: () => {
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["consultation-messages", consultationId] });
    },
    onError: (err: any) => {
      Alert.alert("Couldn't send", err?.message ?? "Please check your connection and try again.");
    },
  });

  const endMutation = useMutation({
    mutationFn: () => endConsultation(consultationId),
    onSuccess: (result) => { if (result) setEnded(result); },
  });

  async function attachPhoto(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const picked = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
    if (picked.canceled || !picked.assets?.[0]) return;

    setAttachingPhoto(true);
    try {
      const dataUrl = await compressToDataUrl(picked.assets[0].uri, "ai");
      sendMutation.mutate({ text: input.trim(), media: { mediaType: "image", mediaUrl: dataUrl } });
    } catch (err) {
      Alert.alert("Couldn't attach photo", err instanceof Error ? err.message : "Please try again with a smaller photo.");
    } finally {
      setAttachingPhoto(false);
    }
  }

  async function startRecording() {
    setPreparingMic(true);
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Microphone not available", "Please allow microphone access to record a voice note.");
        return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert("Couldn't start recording", "Please try again.");
    } finally {
      setPreparingMic(false);
    }
  }

  async function stopRecordingAndSend() {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return;
      const base64 = await fileUriToBase64(uri);
      const mediaUrl = `data:audio/m4a;base64,${base64}`;
      if (mediaUrl.length > 4_000_000) {
        Alert.alert("Voice note too long", "Please record a shorter voice note (under a minute).");
        return;
      }
      sendMutation.mutate({ text: "", media: { mediaType: "audio", mediaUrl } });
    } catch {
      Alert.alert("Couldn't send voice note", "Please try again.");
    }
  }

  function cancelRecording() {
    recorder.stop().catch(() => {});
  }

  const ratePer15 = doctor ? Number(doctor.ratePer15Min) : 0;
  const cost = billing(elapsed, ratePer15);

  if (ended) {
    return (
      <View style={styles.endedContainer}>
        <View style={styles.endedIconWrap}><BadgeCheck size={36} color={colors.primary} /></View>
        <Text style={styles.endedTitle}>Consultation complete</Text>
        <Text style={styles.endedSubtitle}>{doctor?.name} · {ended.minutes} min</Text>
        <View style={styles.endedCard}>
          <View style={styles.endedRow}><Text style={styles.endedLabel}>Charged</Text><Text style={styles.endedValue}>{inr(ended.cost)}</Text></View>
          <View style={styles.endedRow}><Text style={styles.endedSubLabel}>↳ Doctor (80%)</Text><Text style={styles.endedSubValue}>{inr(ended.doctorEarning)}</Text></View>
          <View style={[styles.endedRow, styles.endedRowBorder]}><Text style={styles.endedSubLabel}>↳ Platform fee (20%)</Text><Text style={styles.endedSubValue}>{inr(ended.platformFee)}</Text></View>
          <View style={styles.endedRow}><Text style={styles.endedLabel}>Wallet balance</Text><Text style={styles.endedValue}>{inr(ended.walletBalance)}</Text></View>
        </View>
        <Button title="Back to doctors" onPress={() => navigation.navigate("AgriDoctor")} />
      </View>
    );
  }

  if (messagesQuery.isLoading) return <LoadingView label="Loading consultation..." />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.header}>
        <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 4 }} onPress={() => endMutation.mutate()} disabled={endMutation.isPending}>
          <ArrowLeft size={14} color="#fff" />
          <Text style={styles.headerEndText}>End & bill</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Clock size={13} color="#fff" />
            <Text style={styles.headerTimer}>{fmtClock(elapsed)}</Text>
          </View>
          <Text style={styles.headerCost}>{inr(cost)}</Text>
        </View>
      </View>

      <FlatList
        data={messagesQuery.data ?? []}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }: { item: ConsultationMessage }) => {
          const isFarmer = item.sender === "farmer";
          const bubbleTextStyle = isFarmer ? styles.farmerText : styles.doctorText;
          return (
            <View style={[styles.msgRow, isFarmer && { flexDirection: "row-reverse" }]}>
              <View style={[styles.avatar, { backgroundColor: isFarmer ? colors.primary : colors.bg }]}>
                {isFarmer ? <User size={14} color="#fff" /> : <Text style={{ fontSize: 14 }}>{doctor?.emoji ?? "🌾"}</Text>}
              </View>
              <View style={[styles.bubble, isFarmer ? styles.farmerBubble : styles.doctorBubble]}>
                {item.mediaType === "image" && item.mediaUrl ? (
                  <Image source={{ uri: item.mediaUrl }} style={styles.msgImage} resizeMode="cover" />
                ) : null}
                {item.mediaType === "audio" && item.mediaUrl ? (
                  <VoiceNotePlayer uri={item.mediaUrl} tint={isFarmer ? "rgba(255,255,255,0.25)" : colors.primary} />
                ) : null}
                {item.text ? <Text style={bubbleTextStyle}>{item.text}</Text> : null}
              </View>
            </View>
          );
        }}
      />

      {recorderState.isRecording ? (
        <View style={styles.recordingBar}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording… {fmtClock(Math.round(recorderState.durationMillis / 1000))}</Text>
          <Pressable style={styles.recordingCancel} onPress={cancelRecording} hitSlop={8}>
            <Text style={styles.recordingCancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.recordingStop} onPress={stopRecordingAndSend} hitSlop={8}>
            <Square size={13} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <Pressable
            style={[styles.iconBtn, attachingPhoto && { opacity: 0.5 }]}
            onPress={() => attachPhoto(true)}
            disabled={attachingPhoto || sendMutation.isPending}
          >
            <Camera size={18} color={colors.textMuted} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <TextField placeholder="Describe your crop problem…" value={input} onChangeText={setInput} containerStyle={{ marginBottom: 0 }} multiline />
          </View>
          {input.trim() ? (
            <Pressable
              style={[styles.sendBtn, sendMutation.isPending && { opacity: 0.5 }]}
              onPress={() => sendMutation.mutate({ text: input.trim() })}
              disabled={sendMutation.isPending}
            >
              <Send size={16} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.sendBtn, preparingMic && { opacity: 0.5 }]}
              onPress={startRecording}
              disabled={preparingMic || sendMutation.isPending}
            >
              <Mic size={16} color="#fff" />
            </Pressable>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerEndText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  headerTimer: { color: "#fff", fontSize: 12 },
  headerCost: { color: "#fff", fontSize: 13, fontWeight: "700" },

  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.xs },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: "78%", borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  farmerBubble: { backgroundColor: colors.primary, borderTopRightRadius: 4 },
  doctorBubble: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderTopLeftRadius: 4 },
  farmerText: { color: "#fff", fontSize: 13.5 },
  doctorText: { color: colors.text, fontSize: 13.5 },

  msgImage: { width: 200, height: 200, borderRadius: radius.sm, marginBottom: spacing.xs, backgroundColor: colors.muted },

  voiceNote: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minWidth: 170, paddingVertical: 2 },
  voicePlayBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  voiceTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "rgba(120,120,120,0.25)", overflow: "hidden" },
  voiceProgress: { height: "100%", borderRadius: 2 },
  voiceDuration: { fontSize: 11, color: colors.textMuted, minWidth: 32 },

  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: colors.muted },

  recordingBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  recordingText: { flex: 1, fontSize: 13, color: colors.text, fontWeight: "600" },
  recordingCancel: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  recordingCancelText: { fontSize: 12.5, color: colors.textMuted, fontWeight: "600" },
  recordingStop: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" },

  inputRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },

  endedContainer: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.sm },
  endedIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#E3E0EC", alignItems: "center", justifyContent: "center" },
  endedTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  endedSubtitle: { fontSize: 13, color: colors.textMuted },
  endedCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, width: "100%", maxWidth: 300, marginVertical: spacing.sm },
  endedRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  endedRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 4, paddingBottom: 6 },
  endedLabel: { fontSize: 13, color: colors.textMuted },
  endedValue: { fontSize: 13, fontWeight: "700", color: colors.text },
  endedSubLabel: { fontSize: 11, color: colors.textMuted, paddingLeft: spacing.sm },
  endedSubValue: { fontSize: 11, color: colors.textMuted },
});
