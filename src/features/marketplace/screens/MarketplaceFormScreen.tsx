import React, { useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { Camera } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { ChipSelect } from "../../../components/ChipSelect";
import { FormFooter } from "../../../components/harvest";
import { colors, spacing } from "../../../components/theme";
import { useMarketplace } from "../hooks/useMarketplace";
import { compressToDataUrl } from "../../../lib/imageCompression";

const CATEGORIES = ["coffee", "pepper", "honey", "spices", "fruits", "tea", "vegetables", "grains", "dairy", "other"];

export function MarketplaceFormScreen({ navigation }: { navigation: any }) {
  const { createListing } = useMarketplace();
  const [sellerName, setSellerName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("kg");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickPhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    setPhotoUri(result.assets[0].uri);
    setPhotoDataUrl(await compressToDataUrl(result.assets[0].uri, "record"));
  }

  function submit() {
    setError(null);
    if (!sellerName.trim() || !phone.trim() || !productName.trim() || !location.trim()) {
      setError("Fill in all required fields");
      return;
    }
    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) {
      setError("Enter a valid price");
      return;
    }
    createListing.mutate(
      {
        sellerName: sellerName.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || undefined,
        productName: productName.trim(),
        category,
        price: priceNum,
        unit: unit.trim() || "kg",
        quantity: quantity.trim() || undefined,
        location: location.trim(),
        description: description.trim() || undefined,
        photoUrl: photoDataUrl ?? undefined,
      },
      // Produce for sale shows on the Market board.
      { onSuccess: () => navigation.popTo("Marketplace") }
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 110 }}>
      {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : (
        <Button title="Add product photo" icon={Camera} variant="light" onPress={pickPhoto} />
      )}
      <TextField label="What are you selling? *" value={productName} onChangeText={setProductName} placeholder="e.g. Arabica Coffee Beans" />
      <ChipSelect label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
      <TextField label="Price (₹) *" keyboardType="decimal-pad" value={price} onChangeText={setPrice} placeholder="350" />
      <TextField label="Per unit" value={unit} onChangeText={setUnit} placeholder="kg" />
      <TextField label="Quantity available" value={quantity} onChangeText={setQuantity} placeholder="e.g. 50 kg" />
      <TextField label="Your name *" value={sellerName} onChangeText={setSellerName} />
      <TextField label="Contact phone *" keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="9XXXXXXXXX" />
      <TextField label="WhatsApp (optional)" keyboardType="phone-pad" value={whatsapp} onChangeText={setWhatsapp} placeholder="Same as phone" />
      <TextField label="Location *" value={location} onChangeText={setLocation} placeholder="Village, District" />
      <TextField label="Description (optional)" value={description} onChangeText={setDescription} multiline numberOfLines={2} placeholder="Quality, harvest date, organic, etc." />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
    <FormFooter>
      <Button title="List for sale" onPress={submit} loading={createListing.isPending} />
    </FormFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  preview: { width: "100%", height: 180, borderRadius: 12, marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
});
