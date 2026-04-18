import type { ImportedOrder } from "../../domain";
import type { IntegrationAuthService, OrderSyncService } from "../interfaces";

import type { LocalStorageService } from "./localStorageService";
import { logApiEvent } from "./apiLogger";
import { getSeededOrdersForIntegration } from "./seedData";

export class LocalOrderSyncService implements OrderSyncService {
  constructor(
    private storageService: LocalStorageService,
    private integrationAuthService: IntegrationAuthService
  ) {}

  async syncOrders(connectionId?: number) {
    logApiEvent("orders", "syncOrders", "request", {
      connectionId: connectionId ?? "all"
    });
    const connections = await this.integrationAuthService.listConnections();
    const existingOrders = await this.storageService.listOrders();

    const targetConnections = connectionId
      ? connections.filter((connection) => connection.connectionId === connectionId)
      : connections;

    const syncedByConnection = await Promise.all(
      targetConnections.map(async (connection) => {
        const orders = await this.syncConnection(connection);
        await this.integrationAuthService.recordSyncResult(connection.connectionId, orders.length);
        return {
          connectionId: connection.connectionId,
          orders
        };
      })
    );

    const replacedKeys = new Set(syncedByConnection.map((entry) => entry.connectionId));
    const preservedOrders = existingOrders.filter(
      (order) => !order.integrationConnectionId || !replacedKeys.has(order.integrationConnectionId)
    );
    const nextOrders = [
      ...preservedOrders,
      ...syncedByConnection.flatMap((entry) => entry.orders)
    ];

    await this.storageService.replaceOrders(nextOrders);
    logApiEvent("orders", "syncOrders", "response", {
      connectionId: connectionId ?? "all",
      connectionCount: targetConnections.length,
      preservedOrderCount: preservedOrders.length,
      syncedOrderCount: syncedByConnection.reduce((sum, entry) => sum + entry.orders.length, 0),
      totalOrderCount: nextOrders.length,
      connectionSummaries: syncedByConnection.map((entry) => ({
        connectionId: entry.connectionId,
        orderCount: entry.orders.length
      }))
    });
    return nextOrders;
  }

  private async syncConnection(connection: {
    connectionId: number;
    connectionName: string;
    integrationKey: string;
    integrationName: string;
    mode: "mock" | "live";
  }): Promise<ImportedOrder[]> {
    logApiEvent("orders", "syncConnection", "request", {
      connectionId: connection.connectionId,
      connectionName: connection.connectionName,
      integrationKey: connection.integrationKey,
      mode: connection.mode
    });

    if (connection.mode === "mock") {
      const orders = getSeededOrdersForIntegration(connection.integrationKey).map((order) => ({
        ...order,
        id: Number(`${connection.connectionId}${order.id}`),
        integrationConnectionId: connection.connectionId,
        integrationConnectionName: connection.connectionName,
        integrationName: connection.integrationName
      }));
      logApiEvent("orders", "syncConnection", "response", {
        connectionId: connection.connectionId,
        integrationKey: connection.integrationKey,
        mode: connection.mode,
        returnedOrderCount: orders.length,
        source: "seeded-orders"
      });
      return orders;
    }

    logApiEvent("orders", "syncConnection", "response", {
      connectionId: connection.connectionId,
      integrationKey: connection.integrationKey,
      mode: connection.mode,
      returnedOrderCount: 0,
      source: "live-not-implemented"
    });
    return [];
  }
}
