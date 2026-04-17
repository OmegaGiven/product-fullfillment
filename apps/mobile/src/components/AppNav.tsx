import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { NAV_PAGE_LABELS, type NavKey } from "../accessControl/accessControl";
import { useAccessControl } from "../providers/AccessControlProvider";
import { useAppTheme } from "../providers/AppearanceProvider";
import type { AppTheme } from "../theme";

type Props = {
  title: string;
  active?: NavKey | null;
};

const NAV_ITEMS: {
  key: NavKey;
  label: string;
  href: "/" | "/orders" | "/history" | "/workflows" | "/templates" | "/integrations" | "/settings";
}[] = [
  { key: "home", label: NAV_PAGE_LABELS.home, href: "/" },
  { key: "orders", label: NAV_PAGE_LABELS.orders, href: "/orders" },
  { key: "history", label: NAV_PAGE_LABELS.history, href: "/history" },
  { key: "workflows", label: NAV_PAGE_LABELS.workflows, href: "/workflows" },
  { key: "templates", label: NAV_PAGE_LABELS.templates, href: "/templates" },
  { key: "integrations", label: NAV_PAGE_LABELS.integrations, href: "/integrations" },
  { key: "user", label: NAV_PAGE_LABELS.user, href: "/settings" }
];

export function AppNav({ title, active = null }: Props) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { canAccessPage } = useAccessControl();
  const styles = createStyles(theme);
  const visibleItems = NAV_ITEMS.filter((item) => canAccessPage(item.key, "read") || item.key === active);

  return (
    <View style={styles.topRow}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.actionsRow}>
        {visibleItems.map((item) => {
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
