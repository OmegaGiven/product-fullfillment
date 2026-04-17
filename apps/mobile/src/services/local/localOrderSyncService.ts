import type { ImportedOrder } from "../../domain";
import type { IntegrationAuthService, OrderSyncService } from "../interfaces";

import type { LocalStorageService } from "./localStorageService";
import { getSeededOrdersForIntegration } from "./seedData";

export class LocalOrderSyncService implements OrderSyncService {
  constructor(
    private storageService: LocalStorageService,
    private integrationAuthService: IntegrationAuthService
  ) {}

  async syncOrders(connectionId?: string) {
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
    return nextOrders;
  }

  private async syncConnection(connection: {
    connectionId: string;
    connectionName: string;
    integrationKey: string;
    integrationName: string;
    mode: "mock" | "live";
  }): Promise<ImportedOrder[]> {
    if (connection.mode === "mock") {
      return getSeededOrdersForIntegration(connection.integrationKey).map((order) => ({
        ...order,
        id: `${connection.connectionId}:${order.id}`,
        integrationConnectionId: connection.connectionId,
        integrationConnectionName: connection.connectionName,
        integrationName: connection.integrationName
      }));
    }

    return [];
  }
}
