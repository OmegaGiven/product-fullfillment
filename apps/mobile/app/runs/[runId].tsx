import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppNav } from "../../src/components/AppNav";
import type { RunId } from "../../src/domain";
import { useAppTheme } from "../../src/providers/AppearanceProvider";
import { useFulfillmentRun } from "../../src/hooks/useFulfillmentRun";
import { spacing, type AppTheme } from "../../src/theme";
import { WorkflowScreen } from "../../src/workflow/WorkflowScreen";

function normalizeRunId(value?: string | string[]): RunId | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return undefined;
  }

  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

export default function FulfillmentRunScreen() {
  const {
    theme: { colors }
  } = useAppTheme();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ runId: string }>();
  const runId = normalizeRunId(params.runId);
  const { run, workflow, isLoading, refresh } = useFulfillmentRun(runId);

  if (isLoading || !run || !workflow) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Loading fulfillment run...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <AppNav title={String(run.id)} />

      <View style={styles.heroCard}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{run.name}</Text>
          <View style={[styles.badge, styles.badgeAccent]}>
            <Text style={styles.badgeText}>{run.status}</Text>
          </View>
        </View>
      </View>

      <WorkflowScreen run={run} workflow={workflow} onRunUpdated={refresh} />
    </ScrollView>
  );
}

function createStyles(colors: AppTheme["colors"]) {
return StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    gap: spacing.lg,
    padding: spacing.xl
  },
  loading: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    justifyContent: "center"
  },
  loadingText: {
    color: colors.text
  },
  heroCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36
  },
  badge: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  badgeAccent: {
    backgroundColor: colors.accentSoft
  },
  badgeText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize"
  }
});
}
