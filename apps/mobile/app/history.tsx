import { useRouter } from "expo-router";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import { AppNav } from "../src/components/AppNav";
import { useBootstrapApp } from "../src/hooks/useBootstrapApp";
import { useFulfillmentRuns } from "../src/hooks/useFulfillmentRuns";
import { useWorkflowTemplates } from "../src/hooks/useWorkflowTemplates";
import { useAppTheme } from "../src/providers/AppearanceProvider";
import { useToast } from "../src/providers/ToastProvider";
import type { AppTheme } from "../src/theme";

function formatRunTitle(workflowName: string | undefined, runName: string, runId: string | number) {
  return `${workflowName ?? runName}: #${runId}`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const styles = createStyles(theme);
  const { isReady, error } = useBootstrapApp();
  const { runs, deleteRun } = useFulfillmentRuns();
  const { templates } = useWorkflowTemplates();
  const [runPendingDelete, setRunPendingDelete] = useState<{
    id: string | number;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sortedRuns = [...runs].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );

  async function confirmDelete() {
    if (!runPendingDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteRun(runPendingDelete.id);
      showToast("Deleted fulfillment");
      setRunPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  if (!isReady) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Preparing fulfillment history...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <AppNav title="Fulfillments" active="history" />

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>History unavailable</Text>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      ) : null}

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Runs</Text>
          <Text style={styles.summaryValue}>{runs.length}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Completed</Text>
          <Text style={styles.summaryValue}>
            {runs.filter((run) => run.status === "completed").length}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>In Progress</Text>
          <Text style={styles.summaryValue}>
            {runs.filter((run) => run.status !== "completed").length}
          </Text>
        </View>
      </View>

      {sortedRuns.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No fulfillment history yet</Text>
          <Text style={styles.emptyText}>
            Start a workflow from Home and it will appear here with its run details.
          </Text>
        </View>
      ) : (
        <View style={styles.tableCard}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.tableScrollContent}
          >
            <View style={styles.tableInner}>
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.tableCell, styles.cellRun, styles.tableHeaderText]}>Run</Text>
                <Text style={[styles.tableCell, styles.cellStatus, styles.tableHeaderText]}>Status</Text>
                <Text style={[styles.tableCell, styles.cellStep, styles.tableHeaderText]}>Step</Text>
                <Text style={[styles.tableCell, styles.cellMode, styles.tableHeaderText]}>Mode</Text>
                <Text style={[styles.tableCell, styles.cellMatch, styles.tableHeaderText]}>Matched</Text>
                <Text style={[styles.tableCell, styles.cellChannel, styles.tableHeaderText]}>Channel</Text>
                <Text style={[styles.tableCell, styles.cellDate, styles.tableHeaderText]}>Created</Text>
                <Text style={[styles.tableCell, styles.cellDate, styles.tableHeaderText]}>Updated</Text>
                <Text style={[styles.tableCell, styles.cellActions, styles.tableHeaderText]}>Actions</Text>
              </View>

              {sortedRuns.map((run, index) => {
                const workflow = templates.find((template) => template.id === run.workflowTemplateId);
                const runTitle = formatRunTitle(workflow?.name, run.name, run.id);
                return (
                  <View
                    key={run.id}
                    style={[
                      styles.tableRow,
                      index % 2 === 1 ? styles.tableRowAlt : null
                    ]}
                  >
                    <View style={[styles.tableCell, styles.cellRun]}>
                      <Text style={styles.cellPrimaryText}>
                        {runTitle}
                      </Text>
                      <Text style={styles.cellSecondaryText}>
                        Workflow: {workflow?.name ?? "Unknown"}
                      </Text>
                    </View>
                    <View style={[styles.tableCell, styles.cellStatus]}>
                      <Text style={styles.cellPrimaryText}>{run.status}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.cellStep]}>
                      <Text style={styles.cellPrimaryText}>
                        {run.currentStepIndex + 1} / {run.stepOrder.length}
                      </Text>
                    </View>
                    <View style={[styles.tableCell, styles.cellMode]}>
                      <Text style={styles.cellPrimaryText}>{run.executionMode}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.cellMatch]}>
                      {run.matchedOrderId ? (
                        <Pressable
                          onPress={() => router.push(`/orders/${run.matchedOrderId}`)}
                          style={styles.openButton}
                        >
                          <Text style={styles.openButtonText}>{run.matchedOrderId}</Text>
                        </Pressable>
                      ) : (
                        <Text style={styles.cellPrimaryText}>No</Text>
                      )}
                    </View>
                    <View style={[styles.tableCell, styles.cellChannel]}>
                      <Text style={styles.cellPrimaryText}>{run.selectedChannel ?? "None"}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.cellDate]}>
                      <Text style={styles.cellPrimaryText}>
                        {new Date(run.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.tableCell, styles.cellDate]}>
                      <Text style={styles.cellPrimaryText}>
                        {new Date(run.updatedAt).toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.tableCell, styles.cellActions]}>
                      <Pressable
                        onPress={() => router.push(`/runs/${run.id}`)}
                        style={styles.openButton}
                      >
                        <Text style={styles.openButtonText}>Open</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          setRunPendingDelete({
                            id: run.id,
                            title: runTitle
                          })
                        }
                        style={styles.deleteButton}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      <Modal
        animationType="fade"
        transparent
        visible={runPendingDelete !== null}
        onRequestClose={() => {
          if (!isDeleting) {
            setRunPendingDelete(null);
          }
        }}
      >
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <Text style={styles.errorTitle}>Confirm Delete</Text>
            <Text style={styles.errorText}>
              Delete fulfillment `{runPendingDelete?.title}`? This removes the saved run history.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setRunPendingDelete(null)}
                style={styles.openButton}
                disabled={isDeleting}
              >
                <Text style={styles.openButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void confirmDelete()}
                style={styles.deleteButton}
                disabled={isDeleting}
              >
                <Text style={styles.deleteButtonText}>
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function createStyles(theme: AppTheme) {
  const { colors, radius, spacing } = theme;

  return StyleSheet.create({
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
    loadingText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700"
    },
    errorCard: {
      backgroundColor: colors.dangerSoft,
      borderColor: colors.danger,
      borderRadius: radius.lg,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.lg
    },
    errorTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700"
    },
    errorText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20
    },
    summaryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    summaryCard: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      flexGrow: 1,
      gap: spacing.xs,
      minWidth: 120,
      padding: spacing.lg
    },
    summaryLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase"
    },
    summaryValue: {
      color: colors.text,
      fontSize: 28,
      fontWeight: "700"
    },
    emptyCard: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: radius.xl,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.xl
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700"
    },
    emptyText: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 22
    },
    tableCard: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: radius.xl,
      borderWidth: 1,
      overflow: "hidden"
    },
    tableScrollContent: {
      flexGrow: 1
    },
    tableInner: {
      minWidth: "100%"
    },
    tableRow: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
      flexDirection: "row"
    },
    tableHeaderRow: {
      backgroundColor: colors.surface,
      borderTopWidth: 0
    },
    tableRowAlt: {
      backgroundColor: colors.surface
    },
    tableHeaderText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.6,
      textTransform: "uppercase"
    },
    tableCell: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
      minHeight: 72,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md
    },
    cellRun: {
      flexBasis: 280,
      flexGrow: 1.8,
      minWidth: 280
    },
    cellStatus: {
      flexBasis: 120,
      flexGrow: 1,
      minWidth: 120
    },
    cellStep: {
      flexBasis: 110,
      flexGrow: 0.9,
      minWidth: 110
    },
    cellMode: {
      flexBasis: 120,
      flexGrow: 1,
      minWidth: 120
    },
    cellMatch: {
      flexBasis: 180,
      flexGrow: 1.2,
      minWidth: 180
    },
    cellChannel: {
      flexBasis: 140,
      flexGrow: 1,
      minWidth: 140
    },
    cellDate: {
      flexBasis: 180,
      flexGrow: 1.1,
      minWidth: 180
    },
    cellActions: {
      flexBasis: 170,
      flexGrow: 1,
      gap: spacing.sm,
      minWidth: 170
    },
    cellPrimaryText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700"
    },
    cellSecondaryText: {
      color: colors.muted,
      fontSize: 13
    },
    openButton: {
      alignItems: "center",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderStrong,
      borderRadius: radius.md,
      borderWidth: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    openButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700"
    },
    deleteButton: {
      alignItems: "center",
      backgroundColor: colors.dangerSoft,
      borderColor: colors.danger,
      borderRadius: radius.md,
      borderWidth: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    deleteButtonText: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: "700"
    },
    modalScrim: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.42)",
      flex: 1,
      justifyContent: "center",
      padding: spacing.lg
    },
    modalCard: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderStrong,
      borderRadius: radius.xl,
      borderWidth: 1,
      gap: spacing.md,
      maxWidth: 420,
      padding: spacing.xl,
      width: "100%"
    },
    modalActions: {
      flexDirection: "row",
      gap: spacing.sm
    }
  });
}
