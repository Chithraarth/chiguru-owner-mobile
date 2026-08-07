import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { colors, spacing } from "../../../components/theme";
import { useEstateUpdates } from "../hooks/useEstateUpdates";
import { compressToDataUrl } from "../../../lib/imageCompression";
import { countWorkersInUpdatePhoto } from "../../../api/endpoints/estateUpdates";

export function DailyUpdateFormScreen({ navigation }: { navigation: any }) {
  const { createUpdate } = useEstateUpdates();
  const [description, setDescription] = useState("");
  const [blockName, setBlockName] = useState("");
  const [attendanceCount, setAttendanceCount] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
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

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;

    setPhotoUri(result.assets[0].uri);
    const dataUrl = await compressToDataUrl(result.assets[0].uri, "record");
    setPhotoDataUrl(dataUrl);

    try {
      const { count } = await countWorkersInUpdatePhoto(dataUrl);
      setAttendanceCount(String(count));
      setAiHint(`🤖 AI detected ${count} workers`);
    } catch {
      // best-effort only, matches the web app's silent failure here
    }
  }

  function submit() {
    setError(null);
    if (!description.trim()) {
      setError("Please describe the work done");
      return;
    }
    createUpdate.mutate(
      {
        description: description.trim(),
        blockName: blockName.trim() || null,
        photoUrl: photoDataUrl,
        videoUrl: null,
        notes: notes.trim() || null,
        attendanceCount: attendanceCount ? Number(attendanceCount) : null,
        latitude: coords ? String(coords.lat) : null,
        longitude: coords ? String(coords.lng) : null,
      },
      { onSuccess: () => navigation.goBack() }
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.preview} />
      ) : (
        <Button title="📷 Take a photo" variant="secondary" onPress={takePhoto} />
      )}
      {aiHint ? <Text style={styles.aiHint}>{aiHint}</Text> : null}

      <View style={{ height: spacing.md }} />

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

      <Button title="Post update" onPress={submit} loading={createUpdate.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  preview: { width: "100%", height: 220, borderRadius: 12, marginBottom: spacing.sm },
  aiHint: { color: colors.primary, fontSize: 13, marginTop: spacing.xs },
  locationStatus: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
});
