import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, ChevronUp, MapPin, Plus, Check, Pencil } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { colors, radius, spacing } from "../../../components/theme";
import { useEstates } from "../../estate/hooks/useEstates";

export function EstateCard({
  farmName,
  village,
  district,
  totalAcres,
  cropsCount,
  navigation,
}: {
  farmName: string;
  village: string | null;
  district: string | null;
  totalAcres: string | null;
  cropsCount: number;
  navigation: any;
}) {
  const [open, setOpen] = useState(false);
  const { data: estates, activeEstateId, switchEstate } = useEstates();

  return (
    <View>
      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>{farmName}</Text>
            <View style={styles.locationRow}>
              <MapPin size={13} color={colors.textMuted} />
              <Text style={styles.location} numberOfLines={1}>
                {[village, district].filter(Boolean).join(", ") || "No location set"}
              </Text>
            </View>
            <Text style={styles.meta}>{totalAcres ?? 0} acres · {cropsCount} Crops</Text>
          </View>
          {(estates?.length ?? 0) > 0 && (
            <Pressable style={styles.switchBtn} onPress={() => setOpen((o) => !o)}>
              <Text style={styles.switchLabel}>Switch</Text>
              {open ? <ChevronUp size={15} color={colors.accent} /> : <ChevronDown size={15} color={colors.accent} />}
            </Pressable>
          )}
        </View>
      </Card>

      {open && (
        <Card style={styles.dropdown}>
          {estates?.map((e) => (
            <Pressable
              key={e.id}
              style={[styles.dropdownRow, e.id === activeEstateId && styles.dropdownRowActive]}
              onPress={async () => {
                await switchEstate(e.id);
                setOpen(false);
              }}
            >
              <Text style={styles.dropdownName} numberOfLines={1}>{e.farmName}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                {e.id === activeEstateId ? <Check size={16} color={colors.primary} /> : null}
                <Pressable
                  hitSlop={10}
                  onPress={(ev) => {
                    ev.stopPropagation();
                    setOpen(false);
                    navigation.navigate("EstateEdit", { estateId: e.id, estateName: e.farmName });
                  }}
                >
                  <Pencil size={15} color={colors.textMuted} />
                </Pressable>
              </View>
            </Pressable>
          ))}
          <Pressable
            style={styles.addRow}
            onPress={() => {
              setOpen(false);
              navigation.navigate("Onboarding");
            }}
          >
            <Plus size={15} color={colors.primary} />
            <Text style={styles.addLabel}>Add new estate</Text>
          </Pressable>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  name: { fontSize: 17, fontWeight: "700", color: colors.text, textTransform: "capitalize" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  location: { fontSize: 12.5, color: colors.textMuted, flexShrink: 1 },
  meta: { fontSize: 12.5, color: colors.textMuted, marginTop: 4 },
  switchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#E9E6FB",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  switchLabel: { fontSize: 13, fontWeight: "600", color: colors.accent },
  dropdown: { marginTop: spacing.xs, padding: 0, overflow: "hidden" },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownRowActive: { backgroundColor: colors.bg },
  dropdownName: { fontSize: 14.5, fontWeight: "600", color: colors.text, textTransform: "capitalize", flexShrink: 1 },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  addLabel: { fontSize: 14, fontWeight: "600", color: colors.primary },
});
