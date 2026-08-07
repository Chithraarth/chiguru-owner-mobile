import React, { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, FileText, Landmark, Upload } from "lucide-react-native";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { ChipSelect } from "../../../components/ChipSelect";
import { colors, radius, spacing } from "../../../components/theme";
import { registerAgronomist } from "../../../api/endpoints/agriDoctor";
import { compressToDataUrl } from "../../../lib/imageCompression";

const SPECIALITIES = [
  "Crop Disease & Pest Management",
  "Soil Health & Nutrition",
  "Horticulture & High-Value Crops",
  "Irrigation & Water Management",
  "Organic Farming",
  "Dairy & Livestock",
  "Seeds & Plant Breeding",
  "Other",
];

export function AgriDoctorRegisterScreen({ navigation }: { navigation: any }) {
  const [name, setName] = useState("");
  const [speciality, setSpeciality] = useState(SPECIALITIES[0]);
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [location, setLocation] = useState("");
  const [languages, setLanguages] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [ratePer15Min, setRatePer15Min] = useState("100");
  const [bio, setBio] = useState("");
  const [certificateUrl, setCertificateUrl] = useState("");
  const [certUploading, setCertUploading] = useState(false);
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function pickCertificate() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
    if (picked.canceled || !picked.assets?.[0]) return;
    setCertUploading(true);
    try {
      const dataUrl = await compressToDataUrl(picked.assets[0].uri, "record");
      setCertificateUrl(dataUrl);
    } catch {
      Alert.alert("Could not read that image");
    } finally {
      setCertUploading(false);
    }
  }

  const create = useMutation({
    mutationFn: () =>
      registerAgronomist({
        name: name.trim(),
        speciality,
        qualification: qualification.trim(),
        experience: experience.trim(),
        certificateUrl,
        workplace: workplace.trim() || undefined,
        location: location.trim() || undefined,
        languages: languages.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        ratePer15Min: Number(ratePer15Min) || 100,
        bio: bio.trim() || undefined,
        consultationPlan: `₹${Number(ratePer15Min) || 0} per 15 min`,
        accountHolderName: accountHolderName.trim() || undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        ifscCode: ifscCode.trim() || undefined,
        upiId: upiId.trim() || undefined,
        panNumber: panNumber.trim() || undefined,
      }),
    onSuccess: (res) => {
      if (!res) {
        Alert.alert("Saved offline", "Your profile will publish when you're back online.");
      } else {
        Alert.alert("Your profile is live!", "Farmers can now consult you.");
      }
      navigation.navigate("AgriDoctor");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not save profile"),
  });

  const hasBank = accountHolderName.trim() && bankAccountNumber.trim() && ifscCode.trim();
  const hasPayout = Boolean(hasBank || upiId.trim());
  const hasCredentials = Boolean(qualification.trim() && experience.trim() && certificateUrl);
  const canSubmit = name.trim() && speciality.trim() && hasCredentials && hasPayout;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.xs }}>
      <Text style={styles.intro}>
        Agronomists, professors and crop doctors — add your details so farmers and planters can find and consult you.
      </Text>

      <TextField label="Full name *" value={name} onChangeText={setName} placeholder="Dr. Suresh Kumar" />
      <ChipSelect label="Speciality *" options={SPECIALITIES} value={speciality} onChange={setSpeciality} />
      <TextField label="Agriculture qualification *" value={qualification} onChangeText={setQualification} placeholder="B.Sc. / M.Sc. / Ph.D. Agriculture" />
      <TextField label="Years of experience *" value={experience} onChangeText={setExperience} placeholder="12 years" />
      <TextField label="Where do you work" value={workplace} onChangeText={setWorkplace} placeholder="Agricultural University / KVK / Private" />
      <TextField label="Location" value={location} onChangeText={setLocation} placeholder="District, State" />
      <TextField label="Languages" value={languages} onChangeText={setLanguages} placeholder="Hindi, English" />
      <TextField label="Contact phone" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholder="+91 ..." />
      <TextField label="Consultation fee per 15 min (₹)" value={ratePer15Min} onChangeText={setRatePer15Min} keyboardType="numeric" />
      <TextField label="About you" value={bio} onChangeText={setBio} multiline numberOfLines={3} placeholder="How you help farmers improve their yield…" />

      <View style={styles.certBox}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <FileText size={16} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.certTitle}>Agriculture education certificate *</Text>
            <Text style={styles.certSubtitle}>Upload a clear photo of your agriculture degree or certificate. This is required to become an Agri Doctor.</Text>
          </View>
        </View>
        {certificateUrl ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Image source={{ uri: certificateUrl }} style={styles.certPreview} resizeMode="contain" />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <CheckCircle2 size={14} color={colors.primary} />
                <Text style={styles.certAddedText}>Certificate added</Text>
              </View>
              <Pressable onPress={pickCertificate}><Text style={styles.replaceLink}>Replace</Text></Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.uploadBtn} onPress={pickCertificate} disabled={certUploading}>
            <Upload size={15} color={colors.primary} />
            <Text style={styles.uploadBtnText}>{certUploading ? "Uploading..." : "Upload certificate photo"}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.payoutBox}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Landmark size={16} color="#92600E" />
          <View style={{ flex: 1 }}>
            <Text style={styles.payoutTitle}>Payout details</Text>
            <Text style={styles.payoutSubtitle}>Where should we deposit your 80% share? Add a bank account or a UPI ID.</Text>
          </View>
        </View>
        <TextField label="Account holder name" value={accountHolderName} onChangeText={setAccountHolderName} containerStyle={{ marginTop: spacing.sm }} />
        <TextField label="Bank account number" value={bankAccountNumber} onChangeText={setBankAccountNumber} keyboardType="numeric" />
        <TextField label="IFSC code" value={ifscCode} onChangeText={(v) => setIfscCode(v.toUpperCase())} autoCapitalize="characters" />
        <Text style={styles.orText}>— OR —</Text>
        <TextField label="UPI ID" value={upiId} onChangeText={setUpiId} autoCapitalize="none" placeholder="e.g. name@bank" />
        <TextField label="PAN (optional, for tax)" value={panNumber} onChangeText={(v) => setPanNumber(v.toUpperCase())} autoCapitalize="characters" />
        {!hasPayout ? <Text style={styles.payoutWarning}>Add full bank details or a UPI ID to publish your profile.</Text> : null}
      </View>

      {!hasCredentials ? <Text style={styles.hintText}>Add your qualification, experience and education certificate to publish your profile.</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Button title="Publish my profile" onPress={() => create.mutate()} loading={create.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  intro: { fontSize: 12.5, color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 17 },
  certBox: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm + 4, marginVertical: spacing.sm },
  certTitle: { fontSize: 13, fontWeight: "700", color: colors.primary },
  certSubtitle: { fontSize: 11, color: colors.primary, marginTop: 2, lineHeight: 15 },
  certPreview: { width: "100%", height: 160, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff" },
  certAddedText: { fontSize: 11.5, color: colors.primary, fontWeight: "600" },
  replaceLink: { fontSize: 11.5, color: colors.primary, textDecorationLine: "underline" },
  uploadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, paddingVertical: spacing.sm + 2, marginTop: spacing.sm },
  uploadBtnText: { fontSize: 13, fontWeight: "600", color: colors.primary },

  payoutBox: { backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A", borderRadius: radius.md, padding: spacing.sm + 4, marginBottom: spacing.sm },
  payoutTitle: { fontSize: 13, fontWeight: "700", color: "#92600E" },
  payoutSubtitle: { fontSize: 11, color: "#92600E", marginTop: 2, lineHeight: 15 },
  orText: { fontSize: 11, color: "#92600E", textAlign: "center", marginBottom: spacing.sm },
  payoutWarning: { fontSize: 11.5, color: "#92600E", fontWeight: "600" },

  hintText: { fontSize: 11.5, color: colors.textMuted, marginBottom: spacing.sm },
  errorText: { color: colors.danger, fontSize: 12.5, marginBottom: spacing.sm },
});
