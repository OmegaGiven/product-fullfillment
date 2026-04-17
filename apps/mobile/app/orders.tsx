import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { AppNav } from "../src/components/AppNav";
import { useOrders, type EnrichedOrder } from "../src/hooks/useOrders";
import { useAppTheme } from "../src/providers/AppearanceProvider";
import { useServices } from "../src/providers/AppProviders";
import type { IntegrationConnection } from "../src/services/interfaces";
import type { AppTheme } from "../src/theme";

function formatAddress(order: {
  shippingAddress: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
}) {
  const address = order.shippingAddress;
  return [address.name, address.address1, address.address2, `${address.city}, ${address.state} ${address.postalCode}`]
    .filter(Boolean)
    .join("\n");
}

function escapeCsvValue(value: string) {
  const normalized = value.replace(/\r?\n/g, " ").replace(/"/g, '""');
  return `"${normalized}"`;
}

function buildOrderExportCsv(orders: EnrichedOrder[]) {
  const header = [
    "Store",
    "Platform",
    "Integration Key",
    "Order",
    "Buyer",
    "Buyer Email",
    "Ship To",
    "Channels",
    "Created",
    "Linked Run"
  ];

  const rows = orders.map((order) => [
    order.integrationConnectionName ?? "",
    order.integrationName,
    order.integrationKey,
    order.orderNumber,
    order.buyerName,
    order.buyerEmail ?? "",
    formatAddress(order),
    order.availableChannels.join(", "),
    order.createdAt,
    order.linkedRunId ?? ""
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(String(value))).join(","))
    .join("\n");
}

export default function OrdersScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const { orders, isLoading, refresh } = useOrders();
  const { integrationAuthService, orderSyncService } = useServices();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncMenuOpen, setIsSyncMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [filters, setFilters] = useState({
    store: "",
    platform: "",
    order: "",
    buyer: "",
    address: "",
    channels: "",
    created: ""
  });

  useEffect(() => {
    let isMounted = true;

    async function loadConnections() {
      const nextConnections = await integrationAuthService.listConnections();
      if (isMounted) {
        setConnections(nextConnections);
      }
    }

    void loadConnections();

    return () => {
      isMounted = false;
    };
  }, [integrationAuthService]);

  const filteredOrders = orders.filter((order) => {
    const createdLabel = new Date(order.createdAt).toLocaleDateString();
    const addressText = formatAddress(order).toLowerCase();
    const channelsText = order.availableChannels.join(", ").toLowerCase();
    const buyerText = `${order.buyerName} ${order.buyerEmail ?? ""}`.toLowerCase();
    const storeText = (order.integrationConnectionName ?? "").toLowerCase();

    return (
      storeText.includes(filters.store.trim().toLowerCase()) &&
      order.integrationName.toLowerCase().includes(filters.platform.trim().toLowerCase()) &&
      order.orderNumber.toLowerCase().includes(filters.order.trim().toLowerCase()) &&
      buyerText.includes(filters.buyer.trim().toLowerCase()) &&
      addressText.includes(filters.address.trim().toLowerCase()) &&
      channelsText.includes(filters.channels.trim().toLowerCase()) &&
      createdLabel.toLowerCase().includes(filters.created.trim().toLowerCase())
    );
  });

  async function handleSync(connectionId?: string) {
    setIsSyncing(true);
    setError(null);
    try {
      await orderSyncService.syncOrders(connectionId);
      await refresh();
      setConnections(await integrationAuthService.listConnections());
      setIsSyncMenuOpen(false);
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleExport() {
    if (filteredOrders.length === 0) {
      setError("There are no filtered orders to export.");
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const csv = buildOrderExportCsv(filteredOrders);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `orders-export-${timestamp}.csv`;

      if (Platform.OS === "web") {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, csv, {
          encoding: FileSystem.EncodingType.UTF8
        });

        if (!(await Sharing.isAvailableAsync())) {
          throw new Error("Export sharing is not available on this device.");
        }

        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Export filtered orders",
          UTI: "public.comma-separated-values-text"
        });
      }
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <AppNav title="Orders" active="orders" />

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Sync failed</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.filterActionsRow}>
        <View style={styles.filterButtons}>
          <Pressable
            onPress={() => setIsSyncMenuOpen(true)}
            style={[styles.syncButton, isSyncing ? styles.buttonDisabled : null]}
            disabled={isSyncing}
          >
            <Text style={styles.syncButtonText}>{isSyncing ? "Syncing..." : "Sync Orders"}</Text>
          </Pressable>
          <Pressable
            onPress={() => void handleExport()}
            style={[styles.exportButton, isExporting ? styles.buttonDisabled : null]}
            disabled={isExporting}
          >
            <Text style={styles.exportButtonText}>{isExporting ? "Exporting..." : "Export"}</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              setFilters({
                store: "",
                platform: "",
                order: "",
                buyer: "",
                address: "",
                channels: "",
                created: ""
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
            <Text style={styles.statValue}>{filteredOrders.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Orders</Text>
            <Text style={styles.statValue}>{orders.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Platforms</Text>
            <Text style={styles.statValue}>
              {new Set(filteredOrders.map((order) => order.integrationKey)).size}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tableCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.tableScrollContent}
        >
          <View style={styles.tableInner}>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <Text style={[styles.tableCell, styles.cellStore, styles.tableHeaderText]}>Store</Text>
              <Text style={[styles.tableCell, styles.cellPlatform, styles.tableHeaderText]}>Platform</Text>
              <Text style={[styles.tableCell, styles.cellOrder, styles.tableHeaderText]}>Order</Text>
              <Text style={[styles.tableCell, styles.cellBuyer, styles.tableHeaderText]}>Buyer</Text>
              <Text style={[styles.tableCell, styles.cellAddress, styles.tableHeaderText]}>Ship To</Text>
              <Text style={[styles.tableCell, styles.cellChannels, styles.tableHeaderText]}>Channels</Text>
              <Text style={[styles.tableCell, styles.cellDate, styles.tableHeaderText]}>Created</Text>
              <Text style={[styles.tableCell, styles.cellWorkflow, styles.tableHeaderText]}>Workflow</Text>
            </View>
            <View style={[styles.tableRow, styles.tableFilterRow]}>
              <View style={[styles.tableCell, styles.cellStore]}>
                <TextInput
                  onChangeText={(value) => setFilters((current) => ({ ...current, store: value }))}
                  placeholder="Filter"
                  placeholderTextColor={colors.muted}
                  style={styles.filterInput}
                  value={filters.store}
                />
              </View>
              <View style={[styles.tableCell, styles.cellPlatform]}>
                <TextInput
                  onChangeText={(value) => setFilters((current) => ({ ...current, platform: value }))}
                  placeholder="Filter"
                  placeholderTextColor={colors.muted}
                  style={styles.filterInput}
                  value={filters.platform}
                />
              </View>
              <View style={[styles.tableCell, styles.cellOrder]}>
                <TextInput
                  onChangeText={(value) => setFilters((current) => ({ ...current, order: value }))}
                  placeholder="Filter"
                  placeholderTextColor={colors.muted}
                  style={styles.filterInput}
                  value={filters.order}
                />
              </View>
              <View style={[styles.tableCell, styles.cellBuyer]}>
                <TextInput
                  onChangeText={(value) => setFilters((current) => ({ ...current, buyer: value }))}
                  placeholder="Filter"
                  placeholderTextColor={colors.muted}
                  style={styles.filterInput}
                  value={filters.buyer}
                />
              </View>
              <View style={[styles.tableCell, styles.cellAddress]}>
                <TextInput
                  onChangeText={(value) => setFilters((current) => ({ ...current, address: value }))}
                  placeholder="Filter"
                  placeholderTextColor={colors.muted}
                  style={styles.filterInput}
                  value={filters.address}
                />
              </View>
              <View style={[styles.tableCell, styles.cellChannels]}>
                <TextInput
                  onChangeText={(value) => setFilters((current) => ({ ...current, channels: value }))}
                  placeholder="Filter"
                  placeholderTextColor={colors.muted}
                  style={styles.filterInput}
                  value={filters.channels}
                />
              </View>
              <View style={[styles.tableCell, styles.cellDate]}>
                <TextInput
                  onChangeText={(value) => setFilters((current) => ({ ...current, created: value }))}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={colors.muted}
                  style={styles.filterInput}
                  value={filters.created}
                />
              </View>
              <View style={[styles.tableCell, styles.cellWorkflow]} />
            </View>

            {filteredOrders.length === 0 && !isLoading ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyTitle}>
                  {orders.length === 0 ? "No stored orders yet" : "No orders match the current filters"}
                </Text>
                <Text style={styles.emptyText}>
                  {orders.length === 0
                    ? "Sync an integration in settings or use mock mode to load seeded orders here."
                    : "Adjust or clear the filters to see more of the stored order feed."}
                </Text>
              </View>
            ) : null}

            {filteredOrders.map((order, index) => (
              <View
                key={order.id}
                style={[styles.tableRow, index % 2 === 0 ? styles.tableRowAlt : null]}
              >
                <Text style={[styles.tableCell, styles.cellStore]}>
                  {order.integrationConnectionName ?? "Unlabeled Store"}
                </Text>
                <Text style={[styles.tableCell, styles.cellPlatform]}>{order.integrationName}</Text>
                <Text style={[styles.tableCell, styles.cellOrder]}>{order.orderNumber}</Text>
                <View style={[styles.tableCell, styles.cellBuyer]}>
                  <Text style={styles.cellPrimaryText}>{order.buyerName}</Text>
                  <Text style={styles.cellSecondaryText}>{order.buyerEmail ?? "No email"}</Text>
                </View>
                <Text style={[styles.tableCell, styles.cellAddress]}>{formatAddress(order)}</Text>
                <Text style={[styles.tableCell, styles.cellChannels]}>
                  {order.availableChannels.join(", ")}
                </Text>
                <Text style={[styles.tableCell, styles.cellDate]}>
                  {new Date(order.createdAt).toLocaleDateString()}
                </Text>
                <View style={[styles.tableCell, styles.cellWorkflow]}>
                  {order.linkedRunId ? (
                    <Pressable
                      onPress={() => router.push(`/runs/${order.linkedRunId}`)}
                      style={styles.linkButton}
                    >
                      <Text style={styles.linkButtonText}>Open #{order.linkedRunId}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.cellSecondaryText}>No workflow</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isSyncMenuOpen}
        onRequestClose={() => {
          if (!isSyncing) {
            setIsSyncMenuOpen(false);
          }
        }}
      >
        <View style={styles.modalScrim}>
          <View style={styles.syncMenuCard}>
            <View style={styles.syncMenuHeader}>
              <Text style={styles.syncMenuTitle}>Sync Orders</Text>
              <Pressable
                onPress={() => setIsSyncMenuOpen(false)}
                style={styles.syncMenuCloseButton}
                disabled={isSyncing}
              >
                <Text style={styles.syncMenuCloseButtonText}>Close</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => void handleSync()}
              style={[styles.syncMenuOption, isSyncing ? styles.buttonDisabled : null]}
              disabled={isSyncing}
            >
              <Text style={styles.syncMenuOptionTitle}>Sync All</Text>
              <Text style={styles.syncMenuOptionMeta}>
                Pull orders from every configured integration.
              </Text>
            </Pressable>

            {connections.map((connection) => (
              <Pressable
                key={connection.connectionId}
                onPress={() => void handleSync(connection.connectionId)}
                style={[styles.syncMenuOption, isSyncing ? styles.buttonDisabled : null]}
                disabled={isSyncing}
              >
                <Text style={styles.syncMenuOptionTitle}>{connection.connectionName}</Text>
                <Text style={styles.syncMenuOptionMeta}>
                  {connection.integrationName} • {connection.mode}
                </Text>
              </Pressable>
            ))}

            {connections.length === 0 ? (
              <Text style={styles.syncMenuEmptyText}>No integrations are configured yet.</Text>
            ) : null}
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
    syncButton: {
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm
    },
    syncButtonDisabled: {
      opacity: 0.65
    },
    syncButtonText: {
      color: colors.surfaceRaised,
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
    syncMenuCard: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderStrong,
      borderRadius: radius.xl,
      borderWidth: 1,
      gap: spacing.sm,
      maxWidth: 420,
      padding: spacing.lg,
      width: "100%"
    },
    syncMenuHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    syncMenuTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "700"
    },
    syncMenuCloseButton: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    syncMenuCloseButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700"
    },
    syncMenuOption: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md
    },
    syncMenuOptionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700"
    },
    syncMenuOptionMeta: {
      color: colors.muted,
      fontSize: 13
    },
    syncMenuEmptyText: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20
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
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      justifyContent: "space-between"
    },
    filterButtons: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    statsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      justifyContent: "flex-end",
      marginLeft: "auto"
    },
    buttonDisabled: {
      opacity: 0.65
    },
    exportButton: {
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    exportButtonText: {
      color: colors.surfaceRaised,
      fontSize: 13,
      fontWeight: "700"
    },
    clearButton: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderStrong,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
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
      gap: spacing.xs,
      minWidth: 110,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
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
      fontSize: 20,
      fontWeight: "700"
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
    tableHeaderText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.6,
      textTransform: "uppercase"
    },
    tableRowAlt: {
      backgroundColor: colors.surface
    },
    tableCell: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
      minHeight: 76,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md
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
    cellPlatform: {
      flexBasis: 140,
      flexGrow: 1.1,
      minWidth: 140
    },
    cellStore: {
      flexBasis: 180,
      flexGrow: 1.3,
      minWidth: 180
    },
    cellOrder: {
      flexBasis: 120,
      flexGrow: 1,
      minWidth: 120
    },
    cellBuyer: {
      flexBasis: 220,
      flexGrow: 1.6,
      gap: spacing.xs,
      minWidth: 220
    },
    cellAddress: {
      flexBasis: 280,
      flexGrow: 2,
      minWidth: 280
    },
    cellChannels: {
      flexBasis: 200,
      flexGrow: 1.3,
      minWidth: 200
    },
    cellDate: {
      flexBasis: 120,
      flexGrow: 1,
      minWidth: 120
    },
    cellWorkflow: {
      flexBasis: 150,
      flexGrow: 1,
      minWidth: 150
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
    linkButton: {
      alignSelf: "flex-start",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderStrong,
      borderRadius: radius.md,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    linkButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700"
    },
    emptyRow: {
      gap: spacing.sm,
      minWidth: "100%",
      padding: spacing.xl
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "700"
    },
    emptyText: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 22
    }
  });
}
