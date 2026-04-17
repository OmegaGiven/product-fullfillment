import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { useFulfillmentRun } from "../../src/hooks/useFulfillmentRun";
import { colors, spacing } from "../../src/theme";
import { WorkflowScreen } from "../../src/workflow/WorkflowScreen";

export default function FulfillmentRunScreen() {
  const params = useLocalSearchParams<{ runId: string }>();
  const { run, workflow, isLoading } = useFulfillmentRun(params.runId);

  if (isLoading || !run || !workflow) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Loading fulfillment run...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{run.name}</Text>
        <Text style={styles.subtitle}>
          {run.executionMode === "local" ? "Local mode" : "Remote mode"} | {run.status}
        </Text>
      </View>
      <WorkflowScreen run={run} workflow={workflow} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  header: {
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15
  }
});
