import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet as WalletIcon, Sparkles, Zap } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { createRechargeOrder, getWallet, verifyRecharge } from "../../../api/endpoints/wallet";
import { RazorpayCheckoutModal } from "../components/RazorpayCheckoutModal";
import { ApiError } from "../../../api/errors";
import type { WalletRechargeOrderResponse } from "../../../types/api";

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const TXN_LABELS: Record<string, string> = {
  recharge: "Wallet recharge",
  share_reward: "Share reward",
  ai_charge: "AI feature use",
};

export function WalletScreen() {
  const queryClient = useQueryClient();
  const [rechargingAmount, setRechargingAmount] = useState<number | null>(null);
  const [rechargeInput, setRechargeInput] = useState("");
  const [order, setOrder] = useState<WalletRechargeOrderResponse | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const walletQuery = useQuery({ queryKey: ["wallet"], queryFn: getWallet });

  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: ["wallet"] });

  async function onRecharge(amount: number) {
    setRechargingAmount(amount);
    try {
      const created = await createRechargeOrder(amount);
      if (!created) {
        Alert.alert("You're offline", "Connect to the internet to recharge your wallet.");
        setRechargingAmount(null);
        return;
      }
      setOrder(created);
      setCheckoutVisible(true);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Please try again.";
      Alert.alert("Couldn't start recharge", msg);
      setRechargingAmount(null);
    }
  }

  async function onCheckoutSuccess(result: { paymentId: string; orderId: string; signature: string }) {
    setCheckoutVisible(false);
    if (!rechargingAmount) return;
    setVerifying(true);
    try {
      const res = await verifyRecharge({
        orderId: result.orderId,
        paymentId: result.paymentId,
        signature: result.signature,
        amount: rechargingAmount,
      });
      if (!res) {
        Alert.alert("Payment received", "You're offline — this will finish crediting once you're back online.");
        return;
      }
      invalidateAll();
      setRechargeInput("");
      Alert.alert("Wallet recharged", `${inr(rechargingAmount)} has been added to your wallet.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Please contact support if this keeps happening.";
      Alert.alert("Couldn't verify your payment", msg);
    } finally {
      setVerifying(false);
      setRechargingAmount(null);
      setOrder(null);
    }
  }

  function onCheckoutDismiss() {
    setCheckoutVisible(false);
    setRechargingAmount(null);
    setOrder(null);
  }

  function onCheckoutError(message: string) {
    setCheckoutVisible(false);
    setRechargingAmount(null);
    setOrder(null);
    Alert.alert("Payment failed", message);
  }

  if (walletQuery.isLoading) return <LoadingView label="Loading wallet..." />;

  const data = walletQuery.data;
  const balance = data?.balance ?? 0;
  const minRechargeAmount = data?.minRechargeAmount ?? 200;
  const rechargeValue = Math.floor(Number(rechargeInput));
  const rechargeValid = Number.isFinite(rechargeValue) && rechargeValue >= minRechargeAmount;
  const aiPrices = Object.entries(data?.aiPrices ?? {});
  const transactions = data?.transactions ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <View style={styles.balanceCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          <WalletIcon size={18} color="#fff" />
          <Text style={styles.balanceTitle}>Wallet balance</Text>
        </View>
        <Text style={styles.balanceValue}>{inr(balance)}</Text>
        <Text style={styles.balanceDesc}>Used to pay for AI features, on top of your subscription.</Text>
      </View>

      {verifying ? (
        <Card style={{ backgroundColor: "#FFF8E6", borderColor: "#F0DFA6" }}>
          <Text style={{ color: "#8A6D1D", fontSize: 12.5 }}>Payment received. Verifying your recharge...</Text>
        </Card>
      ) : null}

      <View>
        <Text style={styles.sectionTitle}>Recharge wallet</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <TextField
              placeholder={`Min ${inr(minRechargeAmount)}`}
              keyboardType="number-pad"
              value={rechargeInput}
              onChangeText={setRechargeInput}
              editable={rechargingAmount === null}
            />
          </View>
          <Button
            title="Add"
            onPress={() => onRecharge(rechargeValue)}
            loading={rechargingAmount !== null && !checkoutVisible}
            disabled={!rechargeValid || rechargingAmount !== null}
          />
        </View>
        <Text style={styles.minRechargeNote}>Minimum {inr(minRechargeAmount)}</Text>
      </View>

      <View>
        <Text style={styles.sectionTitle}>AI feature prices</Text>
        <Card style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {aiPrices.map(([key, cfg], i) => (
            <View key={key} style={[styles.priceRow, i > 0 && styles.priceRowBorder]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, flex: 1 }}>
                <Sparkles size={14} color={colors.primary} />
                <Text style={styles.priceLabel}>{cfg.label}</Text>
              </View>
              <Text style={styles.priceValue}>{inr(cfg.price)}</Text>
            </View>
          ))}
        </Card>
      </View>

      <View>
        <Text style={styles.sectionTitle}>Recent transactions</Text>
        {transactions.length === 0 ? (
          <Card style={{ alignItems: "center", marginTop: spacing.sm }}>
            <Text style={styles.emptyText}>No transactions yet.</Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {transactions.slice(0, 20).map((txn) => {
              const amount = Number(txn.amount);
              const isCredit = amount >= 0;
              return (
                <Card key={txn.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 }}>
                    <View style={[styles.txnIconWrap, isCredit ? styles.txnIconCredit : styles.txnIconDebit]}>
                      <Zap size={14} color={isCredit ? "#2F9E67" : colors.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnLabel}>{txn.feature ?? TXN_LABELS[txn.type] ?? txn.type}</Text>
                      <Text style={styles.txnDate}>{fmtDate(txn.createdAt)}</Text>
                    </View>
                  </View>
                  <Text style={[styles.txnAmount, { color: isCredit ? "#2F9E67" : colors.danger }]}>
                    {isCredit ? "+" : ""}{inr(amount)}
                  </Text>
                </Card>
              );
            })}
          </View>
        )}
      </View>

      <RazorpayCheckoutModal
        visible={checkoutVisible}
        order={order}
        description={rechargingAmount ? `Wallet recharge — ${inr(rechargingAmount)}` : "Wallet recharge"}
        onSuccess={onCheckoutSuccess}
        onDismiss={onCheckoutDismiss}
        onError={onCheckoutError}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  balanceCard: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md },
  balanceTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  balanceValue: { color: "#fff", fontSize: 30, fontWeight: "700", marginTop: spacing.sm },
  balanceDesc: { color: "rgba(255,255,255,0.85)", fontSize: 12.5, marginTop: spacing.xs, lineHeight: 17 },

  sectionTitle: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  minRechargeNote: { fontSize: 11, color: colors.textMuted, marginTop: spacing.xs },

  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs },
  priceRowBorder: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  priceLabel: { fontSize: 13, color: colors.text, flex: 1 },
  priceValue: { fontSize: 13, fontWeight: "700", color: colors.text },

  emptyText: { fontSize: 13, color: colors.textMuted },
  txnIconWrap: { width: 30, height: 30, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  txnIconCredit: { backgroundColor: "#E5F7EC" },
  txnIconDebit: { backgroundColor: "#FBEAEE" },
  txnLabel: { fontSize: 13, fontWeight: "600", color: colors.text, textTransform: "capitalize" },
  txnDate: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  txnAmount: { fontSize: 14, fontWeight: "700" },
});
