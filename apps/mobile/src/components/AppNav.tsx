import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../providers/AppearanceProvider";
import { spacing, type AppTheme } from "../theme";

type NavKey = "home" | "orders" | "user";

type Props = {
  title: string;
  active?: NavKey | null;
};

const NAV_ITEMS: { key: NavKey; label: string; href: "/" | "/orders" | "/settings" }[] = [
  { key: "home", label: "Home", href: "/" },
  { key: "orders", label: "Orders", href: "/orders" },
  { key: "user", label: "User", href: "/settings" }
];

export function AppNav({ title, active = null }: Props) {
  const router = useRouter();
  const {
    theme: { colors }
  } = useAppTheme();
  const styles = createStyles(colors);

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

function createStyles(colors: AppTheme["colors"]) {
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
      gap: spacing.sm
    },
    navButton: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderStrong,
      borderRadius: 999,
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
