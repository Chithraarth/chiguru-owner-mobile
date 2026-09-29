import React, { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../../components/Text";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Video as VideoIcon, Camera, Video } from "lucide-react-native";
import { Button } from "../../../../components/Button";
import { TextField } from "../../../../components/TextField";
import { colors, radius, spacing } from "../../../../components/theme";
import { createEstateUpdate, countWorkersInUpdatePhoto } from "../../api";
import { compressToDataUrl, fileUriToBase64 } from "../../../../lib/imageCompression";
import { newClientId } from "../../../../lib/idempotency";
import { useEstateStore } from "../../../estate/store/estateStore";
import { useInviteeMe } from "../../hooks/useInviteeMe";
import { useWorkGroups } from "../../attendance/hooks/useAttendance";

// Keeps the base64 video payload comfortably under the backend's 20MB JSON
// body limit (base64 inflates raw bytes by ~33%).
const MAX_VIDEO_BYTES = 10 * 1024 * 1024;

function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function WorkUpdateScreen({ navigation }: { navigation: any }) {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const managerMe = useInviteeMe();
  const queryClient = useQueryClient();
  const { data: workGroups = [], isLoading: loadingGroups } = useWorkGroups();

  const [workGroupId, setWorkGroupId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [blockName, setBlockName] = useState("");
  const [attendanceCount, setAttendanceCount] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDataUrl, setVideoDataUrl] = useState<string | null>(null);
  const [recordingVideo, setRecordingVideo] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<"locating" | "attached" | "none">("locating");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationStatus("none");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus("attached");
      } catch {
        setLocationStatus("none");
      }
    })();
  }, []);

  const submitMutation = useMutation({
    mutationFn: () =>
      createEstateUpdate({
        date: todayIso(),
        estateId: activeEstateId,
        workerName: managerMe?.name,
        workGroupId,
        blockName: blockName.trim() || null,
        description: description.trim(),
        photoUrl: videoDataUrl ? null : photoDataUrl,
        videoUrl: videoDataUrl,
        notes: notes.trim() || null,
        attendanceCount: attendanceCount ? Number(attendanceCount) : null,
        latitude: coords ? String(coords.lat) : null,
        longitude: coords ? String(coords.lng) : null,
        clientId: newClientId(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estate-updates"] });
      navigation.goBack();
    },
  });

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;

    setPhotoUri(result.assets[0].uri);
    setVideoUri(null);
    setVideoDataUrl(null);
    const dataUrl = await compressToDataUrl(result.assets[0].uri, "record");
    setPhotoDataUrl(dataUrl);

    try {
      const { count } = await countWorkersInUpdatePhoto(dataUrl);
      setAttendanceCount(String(count));
      setAiHint(`🤖 AI detected ${count} workers`);
    } catch {
      // best-effort only
    }
  }

  async function recordVideo() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["videos"], videoMaxDuration: 15 });
    if (result.canceled || !result.assets?.[0]) return;

    const uri = result.assets[0].uri;
    setRecordingVideo(true);
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && info.size > MAX_VIDEO_BYTES) {
        setError("That video is too long/large to upload - try a shorter clip (under ~15s).");
        return;
      }
      const base64 = await fileUriToBase64(uri);
      setVideoUri(uri);
      setVideoDataUrl(`data:video/mp4;base64,${base64}`);
      setPhotoUri(null);
      setPhotoDataUrl(null);
    } catch {
      setError("Could not process that video. Try again or take a photo instead.");
    } finally {
      setRecordingVideo(false);
    }
  }

  function clearMedia() {
    setPhotoUri(null);
    setPhotoDataUrl(null);
    setVideoUri(null);
    setVideoDataUrl(null);
    setAiHint(null);
  }

  function submit() {
    setError(null);
    if (!workGroupId) {
      setError("Please select a work group");
      return;
    }
    if (!description.trim()) {
      setError("Please describe the work done");
      return;
    }
    submitMutation.mutate();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: spacing.xl }}>
      {photoUri ? (
        <View>
          <Image source={{ uri: photoUri }} style={styles.preview} />
          <Button title="Remove photo" variant="secondary" size="compact" onPress={clearMedia} />
        </View>
      ) : videoUri ? (
        <View style={styles.videoPreview}>
          <VideoIcon size={22} color={colors.primary} />
          <Text style={styles.videoPreviewText}>Video attached</Text>
          <Button title="Remove" variant="secondary" size="compact" onPress={clearMedia} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Take a photo" icon={Camera} variant="light" onPress={takePhoto} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Record video" icon={Video} variant="light" onPress={recordVideo} loading={recordingVideo} />
          </View>
        </View>
      )}
      {aiHint ? <Text style={styles.aiHint}>{aiHint}</Text> : null}

      <View style={{ height: spacing.md }} />

      <Text style={styles.fieldLabel}>Work group *</Text>
      {loadingGroups ? (
        <Text style={styles.locationStatus}>Loading work groups...</Text>
      ) : workGroups.length === 0 ? (
        <Text style={styles.locationStatus}>No work groups yet — create one from Attendance first.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {workGroups.map((g) => {
              const selected = workGroupId === g.id;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => setWorkGroupId(g.id)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{g.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      <TextField
        label="What work was done? *"
        multiline
        numberOfLines={3}
        value={description}
        onChangeText={setDescription}
      />
      <TextField label="Block / area" value={blockName} onChangeText={setBlockName} />
      <TextField
        label="Workers present"
        keyboardType="number-pad"
        value={attendanceCount}
        onChangeText={setAttendanceCount}
      />
      <TextField label="Notes" multiline numberOfLines={2} value={notes} onChangeText={setNotes} />

      <Text style={styles.locationStatus}>
        {locationStatus === "locating" && "📍 Getting location..."}
        {locationStatus === "attached" && "📍 Location attached"}
        {locationStatus === "none" && "📍 Location not available"}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Post update" onPress={submit} loading={submitMutation.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  preview: { width: "100%", height: 220, borderRadius: 12, marginBottom: spacing.sm },
  videoPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  videoPreviewText: { flex: 1, color: colors.text, fontWeight: "600" },
  aiHint: { color: colors.primary, fontSize: 13, marginTop: spacing.xs },
  fieldLabel: { fontSize: 14, fontWeight: "500", color: colors.text, marginBottom: spacing.xs },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextSelected: { color: "#fff", fontWeight: "600" },
  locationStatus: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
});
