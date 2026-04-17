import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useBootstrapApp } from "../src/hooks/useBootstrapApp";
import { useFulfillmentRuns } from "../src/hooks/useFulfillmentRuns";
import { colors, spacing } from "../src/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { isReady, error } = useBootstrapApp();
  const { runs, createRun } = useFulfillmentRuns();

  if (!isReady) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Preparing local workspace...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>App bootstrap failed</Text>
        <Text style={styles.body}>{error.message}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Product Fulfillment V1</Text>
      <Text style={styles.title}>Phone-first, local-first packing workflow</Text>
      <Text style={styles.body}>
        Start a fulfillment run, capture photos, match the label to an order,
        review the outgoing message, and approve the send.
      </Text>

      <Pressable
        onPress={async () => {
          const run = await createRun();
          router.push(`/runs/${run.id}`);
        }}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>Start New Fulfillment</Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved Runs</Text>
        {runs.length === 0 ? (
          <Text style={styles.body}>No fulfillment runs yet.</Text>
        ) : (
          runs.map((run) => (
            <Pressable
              key={run.id}
              onPress={() => router.push(`/runs/${run.id}`)}
              style={styles.card}
            >
              <Text style={styles.cardTitle}>{run.name}</Text>
              <Text style={styles.cardMeta}>
                Step {run.currentStepIndex + 1} of {run.stepOrder.length}
              </Text>
              <Text style={styles.cardMeta}>
                Status: {run.status} | Mode: {run.executionMode}
              </Text>
            </Pressable>
          ))
        )}
      </View>
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
  centered: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36
  },
  body: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "700"
  },
  section: {
    gap: spacing.md
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700"
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 14
  }
});
