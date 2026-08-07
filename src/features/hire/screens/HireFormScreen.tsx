import React, { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import * as Location from "expo-location";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapPin } from "lucide-react-native";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { ChipSelect } from "../../../components/ChipSelect";
import { colors, spacing } from "../../../components/theme";
import { useHire } from "../hooks/useHire";
import type { HireListing } from "../../../types/api";

const RENTAL_CATEGORIES = ["tractor", "jcb_hitachi", "harvester", "weight_machine", "auto_tempo", "pickup", "sprayer", "power_tiller", "other"];
const JOB_CATEGORIES = ["farm_labourers", "women_workers", "mestri", "manager_writer", "other"];

export function HireFormScreen({ navigation, route }: { navigation: any; route: any }) {
  const editListing: HireListing | undefined = route.params?.listing;
  const listingType: "rental" | "job" = editListing?.listingType ?? route.params?.listingType ?? "rental";
  const isRental = listingType === "rental";
  const isEdit = !!editListing;
  const { createListing, updateListing } = useHire(listingType);
  const [title, setTitle] = useState(editListing?.title ?? "");
  const [category, setCategory] = useState(editListing?.category ?? (isRental ? RENTAL_CATEGORIES : JOB_CATEGORIES)[0]);
  const [rate, setRate] = useState(editListing?.rate ?? "");
  const [workersNeeded, setWorkersNeeded] = useState(editListing?.workersNeeded ? String(editListing.workersNeeded) : "");
  const [posterName, setPosterName] = useState(editListing?.posterName ?? "");
  const [phone, setPhone] = useState(editListing?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(editListing?.whatsapp ?? "");
  const [district, setDistrict] = useState(editListing?.district ?? "");
  const [taluk, setTaluk] = useState(editListing?.taluk ?? "");
  const [village, setVillage] = useState(editListing?.village ?? "");
  const [description, setDescription] = useState(editListing?.description ?? "");
  const [latitude, setLatitude] = useState<number | undefined>(editListing?.latitude ? Number(editListing.latitude) : undefined);
  const [longitude, setLongitude] = useState<number | undefined>(editListing?.longitude ? Number(editListing.longitude) : undefined);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  async function useMyLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
      const [place] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (place) {
        setVillage(place.city ?? place.name ?? village);
        setTaluk(place.subregion ?? taluk);
        setDistrict(place.district ?? place.region ?? district);
      }
    } catch {
      setError("Could not get your location. Fill it in manually.");
    } finally {
      setLocating(false);
    }
  }

  function submit() {
    setError(null);
    const digits = phone.replace(/\D/g, "");
    if (!title.trim() || !posterName.trim() || !district.trim()) {
      setError("Fill in all required fields");
      return;
    }
    if (digits.length < 10 || digits.length > 15) {
      setError("Enter a valid phone number (at least 10 digits)");
      return;
    }
    const body = {
      listingType,
      category,
      title: title.trim(),
      posterName: posterName.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || undefined,
      district: district.trim(),
      taluk: taluk.trim() || undefined,
      village: village.trim() || undefined,
      latitude,
      longitude,
      rate: rate.trim() || undefined,
      workersNeeded: !isRental && workersNeeded.trim() ? Number(workersNeeded) : undefined,
      description: description.trim() || undefined,
    };

    if (isEdit && editListing) {
      updateListing.mutate({ id: editListing.id, data: body }, { onSuccess: () => navigation.goBack() });
    } else {
      createListing.mutate(body, { onSuccess: () => navigation.goBack() });
    }
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.md + insets.bottom }}
      enableOnAndroid
      extraScrollHeight={80}
      keyboardShouldPersistTaps="handled"
    >
      <TextField
        label={isRental ? "What are you renting out? *" : "What do you need? *"}
        value={title}
        onChangeText={setTitle}
        placeholder={isRental ? "e.g. Mahindra 575 Tractor with rotavator" : "e.g. Need 10 workers for coffee picking"}
      />
      <ChipSelect label="Category" options={isRental ? RENTAL_CATEGORIES : JOB_CATEGORIES} value={category} onChange={setCategory} />
      <TextField label={isRental ? "Rate (optional)" : "Wage offered (optional)"} value={rate} onChangeText={setRate} placeholder={isRental ? "1200/hour" : "500/day"} />
      {!isRental ? (
        <TextField label="Workers needed" keyboardType="number-pad" value={workersNeeded} onChangeText={setWorkersNeeded} placeholder="10" />
      ) : null}
      <TextField label="Your name *" value={posterName} onChangeText={setPosterName} />
      <TextField label="Contact phone *" keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="9XXXXXXXXX" />
      <TextField label="WhatsApp (optional)" keyboardType="phone-pad" value={whatsapp} onChangeText={setWhatsapp} placeholder="Same as phone" />

      <Pressable style={styles.locationBtn} onPress={useMyLocation} disabled={locating}>
        <MapPin size={15} color={colors.primary} />
        <Text style={styles.locationBtnText}>{locating ? "Getting location..." : "Use my location to fill district/taluk/village"}</Text>
      </Pressable>

      <TextField label="District *" value={district} onChangeText={setDistrict} />
      <TextField label="Taluk" value={taluk} onChangeText={setTaluk} />
      <TextField label="Village" value={village} onChangeText={setVillage} />
      <TextField
        label="Details (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder={isRental ? "Condition, attachments, availability, driver included, etc." : "Work type, dates, food/stay, etc."}
        multiline
        numberOfLines={2}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title={isEdit ? "Save changes" : isRental ? "Post for rent" : "Post requirement"}
        onPress={submit}
        loading={createListing.isPending || updateListing.isPending}
      />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  error: { color: colors.danger, marginBottom: spacing.md },
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.md,
  },
  locationBtnText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
});
