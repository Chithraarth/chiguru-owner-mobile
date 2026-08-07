import React, { useEffect, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CloudOff, CloudUpload, Copy, LogOut, Phone, RotateCcw, ShieldCheck, UserCircle2 } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { colors, radius, spacing } from "../../../components/theme";
import { useSessionStore } from "../../../store/sessionStore";
import { signOutUser } from "../../../lib/firebase";
import { getMyFarms, linkFarm } from "../../../api/endpoints/auth";
import { getFarmProfile, getBackupCode, restoreBackup, updateFarmProfile } from "../../../api/endpoints/estates";
import { useEstateStore } from "../../estate/store/estateStore";
import { useT } from "../../../lib/i18n";

export function ProfileScreen({ navigation }: { navigation: any }) {
  const { t } = useT();
  const user = useSessionStore((s) => s.user);
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const setActiveEstate = useEstateStore((s) => s.setActiveEstate);
  const qc = useQueryClient();

  const farmProfileQuery = useQuery({ queryKey: ["farm-profile", activeEstateId], queryFn: getFarmProfile, retry: false, enabled: activeEstateId != null });
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [phoneDirty, setPhoneDirty] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    if (!phoneDirty && farmProfileQuery.data) {
      setPhone(farmProfileQuery.data.contactPhone ?? "");
      setAlternatePhone(farmProfileQuery.data.alternatePhone ?? "");
    }
  }, [farmProfileQuery.data, phoneDirty]);

  async function savePhone() {
    setSavingPhone(true);
    try {
      await updateFarmProfile({ contactPhone: phone.trim(), alternatePhone: alternatePhone.trim() || null });
      qc.invalidateQueries({ queryKey: ["farm-profile"] });
      setPhoneDirty(false);
      Alert.alert(t("profile.saved"));
    } catch {
      Alert.alert("Could not save", "Check your internet.");
    } finally {
      setSavingPhone(false);
    }
  }

  const myFarmsQuery = useQuery({ queryKey: ["me-farms", user?.uid], queryFn: getMyFarms, enabled: !!user });
  const activeLinked = !!myFarmsQuery.data?.some((f) => f.id === activeEstateId);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const autoLinkTried = useRef(false);

  async function doLinkFarm(auto = false) {
    setLinking(true);
    setLinkError(null);
    try {
      await linkFarm();
      await myFarmsQuery.refetch();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Could not back up this farm.");
    } finally {
      setLinking(false);
    }
    if (!auto) {
      // no-op: errors already surfaced via linkError above
    }
  }

  useEffect(() => {
    if (user && myFarmsQuery.data && !activeLinked && !autoLinkTried.current) {
      autoLinkTried.current = true;
      void doLinkFarm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, myFarmsQuery.data, activeLinked]);

  function openFarm(id: number) {
    setActiveEstate(id);
    navigation.navigate("DashboardTab");
  }

  const backupQuery = useQuery({ queryKey: ["backup-code"], queryFn: getBackupCode, enabled: activeEstateId != null });
  const [copied, setCopied] = useState(false);
  const [restoreCode, setRestoreCode] = useState("");
  const [restoring, setRestoring] = useState(false);

  async function copyCode() {
    if (!backupQuery.data) return;
    await Clipboard.setStringAsync(backupQuery.data.recoveryCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRestore() {
    if (!restoreCode.trim()) return;
    setRestoring(true);
    try {
      const res = await restoreBackup(restoreCode.trim());
      if (res) {
        await setActiveEstate(res.estateId);
        qc.invalidateQueries({ queryKey: ["estates"] });
        Alert.alert("Restored", res.farmName);
        navigation.navigate("DashboardTab");
      }
    } catch {
      Alert.alert("Could not restore", "Check the code and try again.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <UserCircle2 size={48} color={colors.border} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.userName} numberOfLines={1}>{user?.displayName || user?.phoneNumber || "—"}</Text>
            {user?.email ? <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text> : null}
          </View>
        </View>
        <Pressable style={styles.signOutBtn} onPress={() => signOutUser()}>
          <LogOut size={15} color={colors.danger} />
          <Text style={styles.signOutText}>{t("profile.signOut")}</Text>
        </Pressable>
      </Card>

      {user ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
            <View style={[styles.iconWrap, activeLinked ? { backgroundColor: "#E3E0EC" } : { backgroundColor: "#FEF3C7" }]}>
              {activeLinked ? <CloudUpload size={18} color={colors.primary} /> : <CloudOff size={18} color="#92600E" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t("profile.farmBackup")}</Text>
              <Text style={styles.cardSubtitle}>{activeLinked ? t("profile.farmLinked") : linkError ?? t("profile.farmNotLinked")}</Text>
              {!activeLinked ? (
                <View style={{ marginTop: spacing.sm }}>
                  <Button title={t("profile.linkNow")} onPress={() => doLinkFarm(false)} loading={linking} />
                </View>
              ) : null}
              {(myFarmsQuery.data?.length ?? 0) > 0 ? (
                <View style={{ marginTop: spacing.sm }}>
                  <Text style={styles.sectionLabel}>{t("profile.myFarms")}</Text>
                  <View style={{ gap: spacing.xs }}>
                    {myFarmsQuery.data!.map((f) => (
                      <View key={f.id} style={styles.farmRow}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.farmName} numberOfLines={1}>{f.farmName}</Text>
                          {f.village || f.district ? <Text style={styles.farmLocation} numberOfLines={1}>{[f.village, f.district].filter(Boolean).join(", ")}</Text> : null}
                        </View>
                        {f.id === activeEstateId ? (
                          <Check size={16} color={colors.primary} />
                        ) : (
                          <Pressable style={styles.openFarmBtn} onPress={() => openFarm(f.id)}>
                            <Text style={styles.openFarmBtnText}>{t("profile.openFarm")}</Text>
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </Card>
      ) : null}

      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
          <View style={[styles.iconWrap, { backgroundColor: "#E3E0EC" }]}>
            <Phone size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{t("profile.phone")}</Text>
            <Text style={styles.cardSubtitle}>{t("profile.phoneHint")}</Text>
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, alignItems: "flex-end" }}>
              <View style={{ flex: 1 }}>
                <TextField
                  value={phone}
                  onChangeText={(v) => { setPhone(v); setPhoneDirty(true); }}
                  placeholder="98765 43210"
                  keyboardType="phone-pad"
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
              <Pressable style={[styles.saveBtn, (!phoneDirty || savingPhone) && { opacity: 0.5 }]} disabled={!phoneDirty || savingPhone} onPress={savePhone}>
                <Text style={styles.saveBtnText}>{t("profile.save")}</Text>
              </Pressable>
            </View>
            <TextField
              label="Alternate phone (optional)"
              value={alternatePhone}
              onChangeText={(v) => { setAlternatePhone(v); setPhoneDirty(true); }}
              placeholder="A family member's number"
              keyboardType="phone-pad"
              containerStyle={{ marginTop: spacing.sm, marginBottom: 0 }}
            />
          </View>
        </View>
      </Card>

      {!user ? (
      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
          <View style={[styles.iconWrap, { backgroundColor: "#E3E0EC" }]}>
            <ShieldCheck size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{t("profile.backupCode")}</Text>
            <Text style={styles.cardSubtitle}>{t("profile.backupCodeHint")}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm }}>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{backupQuery.data?.recoveryCode ?? "…"}</Text>
              </View>
              <Pressable style={styles.copyBtn} onPress={copyCode} disabled={!backupQuery.data}>
                {copied ? <Check size={18} color={colors.primary} /> : <Copy size={18} color={colors.text} />}
              </Pressable>
            </View>

            <View style={styles.restoreSection}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <RotateCcw size={14} color={colors.text} />
                <Text style={styles.restoreTitle}>{t("profile.restoreTitle")}</Text>
              </View>
              <View style={{ marginTop: spacing.sm }}>
                <TextField value={restoreCode} onChangeText={setRestoreCode} placeholder="FARM-XXXX-XXXX" autoCapitalize="characters" />
                <Button title={t("profile.restoreCta")} variant="secondary" onPress={handleRestore} loading={restoring} disabled={!restoreCode.trim()} />
              </View>
            </View>
          </View>
        </View>
      </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  userName: { fontSize: 15, fontWeight: "700", color: colors.text },
  userEmail: { fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "#F5C6C6", borderRadius: radius.sm, paddingVertical: spacing.sm + 2, marginTop: spacing.md },
  signOutText: { color: colors.danger, fontWeight: "600", fontSize: 13.5 },

  iconWrap: { width: 38, height: 38, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  cardSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  sectionLabel: { fontSize: 10.5, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing.xs },

  farmRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm },
  farmName: { fontSize: 13, fontWeight: "600", color: colors.text, textTransform: "capitalize" },
  farmLocation: { fontSize: 10.5, color: colors.textMuted },
  openFarmBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  openFarmBtnText: { fontSize: 11, fontWeight: "600", color: colors.text },

  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  codeBox: { flex: 1, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: spacing.sm + 4, alignItems: "center" },
  codeText: { fontSize: 15, fontWeight: "700", color: colors.text, letterSpacing: 1 },
  copyBtn: { width: 44, height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },

  restoreSection: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  restoreTitle: { fontSize: 13, fontWeight: "600", color: colors.text },
});
