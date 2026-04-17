import { useRouter } from "expo-router";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useState } from "react";

import { AppNav } from "../src/components/AppNav";
import { useBootstrapApp } from "../src/hooks/useBootstrapApp";
import { useFulfillmentRuns } from "../src/hooks/useFulfillmentRuns";
import { useWorkflowTemplates } from "../src/hooks/useWorkflowTemplates";
import { useAppTheme } from "../src/providers/AppearanceProvider";
import { useToast } from "../src/providers/ToastProvider";
import type { RecordId } from "../src/domain";
import type { AppTheme } from "../src/theme";

function formatRunTitle(
  workflowName: string | undefined,
  runName: string,
  fulfillmentId: RecordId
) {
  return `${workflowName ?? runName}: #${fulfillmentId}`;
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
    id: RecordId;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filters, setFilters] = useState({
    fulfillmentId: "",
    workflowId: "",
    status: "",
    step: "",
    mode: "",
    matched: "",
    channel: "",
    created: "",
    updated: ""
  });
  const [sortState, setSortState] = useState<{
    key:
      | "fulfillmentId"
      | "workflowId"
      | "status"
      | "step"
      | "mode"
      | "matched"
      | "channel"
      | "created"
      | "updated"
      | null;
    direction: "asc" | "desc" | null;
  }>({
    key: null,
    direction: null
  });

  const filteredRuns = runs.filter((run) => {
    const workflow = templates.find((template) => template.id === run.workflowTemplateId);
    const stepLabel = `${run.currentStepIndex + 1} / ${run.stepOrder.length}`;
    const createdLabel = new Date(run.createdAt).toLocaleDateString();
    const updatedLabel = new Date(run.updatedAt).toLocaleDateString();
    const matchedLabel = run.matchedOrderId ? String(run.matchedOrderId) : "no";

    return (
      String(run.id).includes(filters.fulfillmentId.trim()) &&
      String(run.workflowTemplateId).includes(filters.workflowId.trim()) &&
      run.status.toLowerCase().includes(filters.status.trim().toLowerCase()) &&
      stepLabel.toLowerCase().includes(filters.step.trim().toLowerCase()) &&
      run.executionMode.toLowerCase().includes(filters.mode.trim().toLowerCase()) &&
      matchedLabel.toLowerCase().includes(filters.matched.trim().toLowerCase()) &&
      String(run.selectedChannel ?? "none").toLowerCase().includes(filters.channel.trim().toLowerCase()) &&
      createdLabel.toLowerCase().includes(filters.created.trim().toLowerCase()) &&
      updatedLabel.toLowerCase().includes(filters.updated.trim().toLowerCase())
    );
  });

  const sortedRuns = [...filteredRuns].sort((left, right) => {
    if (!sortState.key || !sortState.direction) {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    }

    const directionFactor = sortState.direction === "asc" ? 1 : -1;
    const leftStep = left.currentStepIndex + 1;
    const rightStep = right.currentStepIndex + 1;

    switch (sortState.key) {
      case "fulfillmentId":
        return (left.id - right.id) * directionFactor;
      case "workflowId":
        return (left.workflowTemplateId - right.workflowTemplateId) * directionFactor;
      case "status":
        return left.status.localeCompare(right.status) * directionFactor;
      case "step":
        return (leftStep - rightStep) * directionFactor;
      case "mode":
        return left.executionMode.localeCompare(right.executionMode) * directionFactor;
      case "matched":
        return ((left.matchedOrderId ?? -1) - (right.matchedOrderId ?? -1)) * directionFactor;
      case "channel":
        return String(left.selectedChannel ?? "").localeCompare(String(right.selectedChannel ?? "")) * directionFactor;
      case "created":
        return (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) * directionFactor;
      case "updated":
        return (new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()) * directionFactor;
      default:
        return 0;
    }
  });

  function toggleSort(
    key:
      | "fulfillmentId"
      | "workflowId"
      | "status"
      | "step"
      | "mode"
      | "matched"
      | "channel"
      | "created"
      | "updated"
  ) {
    setSortState((current) => {
      if (current.key !== key) {
        return { key, direction: "asc" };
      }

      if (current.direction === "asc") {
        return { key, direction: "desc" };
      }

      if (current.direction === "desc") {
        return { key: null, direction: null };
      }

      return { key, direction: "asc" };
    });
  }

  function getSortArrow(
    key:
      | "fulfillmentId"
      | "workflowId"
      | "status"
      | "step"
      | "mode"
      | "matched"
      | "channel"
      | "created"
      | "updated"
  ) {
    if (sortState.key !== key || !sortState.direction) {
      return "";
    }

    return sortState.direction === "asc" ? " ↑" : " ↓";
  }

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

      <View style={styles.filterActionsRow}>
        <View style={styles.filterButtons}>
          <Pressable
            onPress={() =>
              setFilters({
                fulfillmentId: "",
                workflowId: "",
                status: "",
                step: "",
                mode: "",
                matched: "",
                channel: "",
                created: "",
                updated: ""
              })
            }
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>Clear Filters</Text>
          </Pressable>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Filtered</Text>
            <Text style={styles.statValue}>{filteredRuns.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Runs</Text>
            <Text style={styles.statValue}>{runs.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={styles.statValue}>
              {runs.filter((run) => run.status === "completed").length}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>In Progress</Text>
            <Text style={styles.statValue}>
              {runs.filter((run) => run.status !== "completed").length}
            </Text>
          </View>
        </View>
      </View>

      {sortedRuns.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {runs.length === 0 ? "No fulfillment history yet" : "No fulfillments match the current filters"}
          </Text>
          <Text style={styles.emptyText}>
            {runs.length === 0
              ? "Start a workflow from Home and it will appear here with its run details."
              : "Adjust or clear the filters to see more of the saved fulfillment runs."}
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
                <Pressable
                  onPress={() => toggleSort("fulfillmentId")}
                  style={[styles.tableCell, styles.cellRunId, styles.tableHeaderCell]}
                >
                  <Text style={styles.tableHeaderText}>Fulfillment ID{getSortArrow("fulfillmentId")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleSort("workflowId")}
                  style={[styles.tableCell, styles.cellWorkflow, styles.tableHeaderCell]}
                >
                  <Text style={styles.tableHeaderText}>Workflow ID{getSortArrow("workflowId")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleSort("status")}
                  style={[styles.tableCell, styles.cellStatus, styles.tableHeaderCell]}
                >
                  <Text style={styles.tableHeaderText}>Status{getSortArrow("status")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleSort("step")}
                  style={[styles.tableCell, styles.cellStep, styles.tableHeaderCell]}
                >
                  <Text style={styles.tableHeaderText}>Step{getSortArrow("step")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleSort("mode")}
                  style={[styles.tableCell, styles.cellMode, styles.tableHeaderCell]}
                >
                  <Text style={styles.tableHeaderText}>Mode{getSortArrow("mode")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleSort("matched")}
                  style={[styles.tableCell, styles.cellMatch, styles.tableHeaderCell]}
                >
                  <Text style={styles.tableHeaderText}>Matched{getSortArrow("matched")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleSort("channel")}
                  style={[styles.tableCell, styles.cellChannel, styles.tableHeaderCell]}
                >
                  <Text style={styles.tableHeaderText}>Channel{getSortArrow("channel")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleSort("created")}
                  style={[styles.tableCell, styles.cellDate, styles.tableHeaderCell]}
                >
                  <Text style={styles.tableHeaderText}>Created{getSortArrow("created")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleSort("updated")}
                  style={[styles.tableCell, styles.cellDate, styles.tableHeaderCell]}
                >
                  <Text style={styles.tableHeaderText}>Updated{getSortArrow("updated")}</Text>
                </Pressable>
                <Text style={[styles.tableCell, styles.cellActions, styles.tableHeaderText]}>Actions</Text>
              </View>
              <View style={[styles.tableRow, styles.tableFilterRow]}>
                <View style={[styles.tableCell, styles.cellRunId]}>
                  <TextInput
                    onChangeText={(value) => setFilters((current) => ({ ...current, fulfillmentId: value }))}
                    placeholder="Filter"
                    placeholderTextColor={theme.colors.muted}
                    style={styles.filterInput}
                    value={filters.fulfillmentId}
                  />
                </View>
                <View style={[styles.tableCell, styles.cellWorkflow]}>
                  <TextInput
                    onChangeText={(value) => setFilters((current) => ({ ...current, workflowId: value }))}
                    placeholder="Filter"
                    placeholderTextColor={theme.colors.muted}
                    style={styles.filterInput}
                    value={filters.workflowId}
                  />
                </View>
                <View style={[styles.tableCell, styles.cellStatus]}>
                  <TextInput
                    onChangeText={(value) => setFilters((current) => ({ ...current, status: value }))}
                    placeholder="Filter"
                    placeholderTextColor={theme.colors.muted}
                    style={styles.filterInput}
                    value={filters.status}
                  />
                </View>
                <View style={[styles.tableCell, styles.cellStep]}>
                  <TextInput
                    onChangeText={(value) => setFilters((current) => ({ ...current, step: value }))}
                    placeholder="Filter"
                    placeholderTextColor={theme.colors.muted}
                    style={styles.filterInput}
                    value={filters.step}
                  />
                </View>
                <View style={[styles.tableCell, styles.cellMode]}>
                  <TextInput
                    onChangeText={(value) => setFilters((current) => ({ ...current, mode: value }))}
                    placeholder="Filter"
                    placeholderTextColor={theme.colors.muted}
                    style={styles.filterInput}
                    value={filters.mode}
                  />
                </View>
                <View style={[styles.tableCell, styles.cellMatch]}>
                  <TextInput
                    onChangeText={(value) => setFilters((current) => ({ ...current, matched: value }))}
                    placeholder="Filter"
                    placeholderTextColor={theme.colors.muted}
                    style={styles.filterInput}
                    value={filters.matched}
                  />
                </View>
                <View style={[styles.tableCell, styles.cellChannel]}>
                  <TextInput
                    onChangeText={(value) => setFilters((current) => ({ ...current, channel: value }))}
                    placeholder="Filter"
                    placeholderTextColor={theme.colors.muted}
                    style={styles.filterInput}
                    value={filters.channel}
                  />
                </View>
                <View style={[styles.tableCell, styles.cellDate]}>
                  <TextInput
                    onChangeText={(value) => setFilters((current) => ({ ...current, created: value }))}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor={theme.colors.muted}
                    style={styles.filterInput}
                    value={filters.created}
                  />
                </View>
                <View style={[styles.tableCell, styles.cellDate]}>
                  <TextInput
                    onChangeText={(value) => setFilters((current) => ({ ...current, updated: value }))}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor={theme.colors.muted}
                    style={styles.filterInput}
                    value={filters.updated}
                  />
                </View>
                <View style={[styles.tableCell, styles.cellActions]} />
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
                    <View style={[styles.tableCell, styles.cellRunId]}>
                      <Text style={styles.cellPrimaryText}>
                        {String(run.id)}
                      </Text>
                    </View>
                    <View style={[styles.tableCell, styles.cellWorkflow]}>
                      <Text style={styles.cellPrimaryText}>
                        {run.workflowTemplateId}
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
    filterActionsRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      justifyContent: "space-between"
    },
    filterButtons: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    statsRow: {
      alignItems: "stretch",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      justifyContent: "flex-end",
      marginLeft: "auto"
    },
    clearButton: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderStrong,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2
    },
    clearButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700"
    },
    statCard: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      gap: 2,
      minWidth: 92,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs + 2
    },
    statLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase"
    },
    statValue: {
      color: colors.text,
      fontSize: 18,
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
    tableFilterRow: {
      backgroundColor: colors.surfaceRaised
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
    tableHeaderCell: {
      justifyContent: "center"
    },
    tableCell: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
      minHeight: 64,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    filterInput: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radius.sm,
      borderWidth: 1,
      color: colors.text,
      fontSize: 14,
      minHeight: 40,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs
    },
    cellRunId: {
      flexBasis: 180,
      flexGrow: 1,
      minWidth: 180
    },
    cellWorkflow: {
      flexBasis: 240,
      flexGrow: 1.5,
      minWidth: 240
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
