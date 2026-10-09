import { Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unlockDoctorContacts } from "../../api/endpoints/agriDoctor";

/**
 * The one-time wallet payment that reveals every Agri Doctor's number. A short
 * wallet is handled by the app-wide prompt (lib/planGate.ts), which offers a
 * recharge.
 */
export function useUnlockDoctorContacts() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: unlockDoctorContacts,
    onSuccess: (res) => {
      if (!res) {
        Alert.alert("You're offline", "Connect to the internet to unlock doctors' numbers.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["agronomists"] });
      queryClient.invalidateQueries({ queryKey: ["agronomist"] });
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (err: any) => {
      if (err?.code === "WALLET_EMPTY" || err?.code === "SUBSCRIPTION_REQUIRED") return;
      Alert.alert("Couldn't unlock", err instanceof Error ? err.message : "Please try again.");
    },
  });

  function confirm(fee: number) {
    Alert.alert("Unlock doctors' numbers?", `₹${fee} will be taken from your wallet, once. You'll see every doctor's number from then on.`, [
      { text: "Cancel", style: "cancel" },
      { text: `Pay ₹${fee}`, onPress: () => mutation.mutate() },
    ]);
  }

  return { confirm, isPending: mutation.isPending };
}
