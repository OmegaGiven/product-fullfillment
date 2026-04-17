import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../providers/AppearanceProvider";
import type { AppTheme } from "../theme";

type NavKey = "home" | "orders" | "history" | "workflows" | "templates" | "integrations" | "user";

type Props = {
  title: string;
  active?: NavKey | null;
};

const NAV_ITEMS: {
  key: NavKey;
  label: string;
  href: "/" | "/orders" | "/history" | "/workflows" | "/templates" | "/integrations" | "/settings";
}[] = [
  { key: "home", label: "Home", href: "/" },
  { key: "orders", label: "Orders", href: "/orders" },
  { key: "history", label: "Fulfillments", href: "/history" },
  { key: "workflows", label: "Workflows", href: "/workflows" },
  { key: "templates", label: "Templates", href: "/templates" },
  { key: "integrations", label: "Integrations", href: "/integrations" },
  { key: "user", label: "User", href: "/settings" }
];

export function AppNav({ title, active = null }: Props) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.topRow}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.actionsRow}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <Pressable
              key={item.key}
              onPress={() => router.push(item.href)}
              style={[styles.navButton, isActive ? styles.navButtonActive : null]}
            >
              <Text style={[styles.navButtonText, isActive ? styles.navButtonTextActive : null]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  const { colors, radius, spacing } = theme;
  return StyleSheet.create({
    topRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    title: {
      color: colors.text,
      flex: 1,
      fontSize: 18,
      fontWeight: "700"
    },
    actionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      justifyContent: "flex-end"
    },
    navButton: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderStrong,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    navButtonActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent
    },
    navButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700"
    },
    navButtonTextActive: {
      color: colors.text
    }
  });
}
