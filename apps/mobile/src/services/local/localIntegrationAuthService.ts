import type {
  IntegrationAuthService,
  IntegrationDefinition,
  IntegrationConnection,
  IntegrationCredentialInput
} from "../interfaces";
import { nowIso } from "../../utils";
import { createId } from "../../utils";

import {
  deleteSecureItem,
  getSecureJson,
  isSecureStoreBacked,
  setSecureJson
} from "./localSecureStore";

type StoredConnectionRecord = {
  connectionId: string;
  connectionName: string;
  integrationKey: string;
  mode: "mock" | "live";
  values: Record<string, string>;
  connectedAt: string;
  lastSyncedAt: string | null;
  syncedOrderCount: number;
};

const CONNECTION_INDEX_KEY = "integration:index";

const SUPPORTED_INTEGRATIONS: IntegrationDefinition[] = [
  {
    integrationKey: "etsy",
    integrationName: "Etsy",
    description:
      "Primary V1 integration. Supports mock mode now and live API credentials later.",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        placeholder: "Enter Etsy API key",
        secret: true
      },
      {
        key: "shopId",
        label: "Shop ID",
        placeholder: "Enter Etsy shop ID",
        secret: false
      }
    ]
  },
  {
    integrationKey: "squarespace",
    integrationName: "Squarespace",
    description: "Follow-up integration for pulling order data into the same local workflow.",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        placeholder: "Enter Squarespace API key",
        secret: true
      },
      {
        key: "siteId",
        label: "Site ID",
        placeholder: "Enter Squarespace site ID",
        secret: false
      }
    ]
  }
];

function getStorageKey(connectionId: string) {
  return `integration:${connectionId}`;
}

function toConnection(
  base: IntegrationDefinition,
  stored: StoredConnectionRecord,
  usesSecureStorage: boolean
): IntegrationConnection {
  return {
    ...base,
    connectionId: stored.connectionId,
    connectionName: stored.connectionName,
    mode: stored.mode,
    connectedAt: stored.connectedAt,
    lastSyncedAt: stored.lastSyncedAt,
    syncedOrderCount: stored.syncedOrderCount,
    hasStoredCredentials: Object.keys(stored.values).length > 0,
    usesSecureStorage
  };
}

export class LocalIntegrationAuthService implements IntegrationAuthService {
  async listIntegrationCatalog(): Promise<IntegrationDefinition[]> {
    return SUPPORTED_INTEGRATIONS;
  }

  private async getConnectionIndex() {
    return (await getSecureJson<string[]>(CONNECTION_INDEX_KEY)) ?? [];
  }

  private async saveConnectionIndex(connectionIds: string[]) {
    await setSecureJson(CONNECTION_INDEX_KEY, connectionIds);
  }

  async listConnections(): Promise<IntegrationConnection[]> {
    const usesSecureStorage = await isSecureStoreBacked();
    const connectionIds = await this.getConnectionIndex();
    const connections = await Promise.all(
      connectionIds.map(async (connectionId) => {
        const stored = await getSecureJson<StoredConnectionRecord>(getStorageKey(connectionId));
        if (!stored) {
          return null;
        }
        const integration = SUPPORTED_INTEGRATIONS.find(
          (entry) => entry.integrationKey === stored.integrationKey
        );
        if (!integration) {
          return null;
        }
        return toConnection(integration, stored, usesSecureStorage);
      })
    );

    return connections.filter((connection): connection is IntegrationConnection => !!connection);
  }

  async saveCredentials(input: IntegrationCredentialInput): Promise<IntegrationConnection> {
    const integration = SUPPORTED_INTEGRATIONS.find(
      (entry) => entry.integrationKey === input.integrationKey
    );
    if (!integration) {
      throw new Error("Unsupported integration.");
    }

    const cleanedValues = Object.fromEntries(
      Object.entries(input.values)
        .map(([key, value]) => [key, value.trim()])
        .filter(([, value]) => value.length > 0)
    );

    if (input.mode === "live" && Object.keys(cleanedValues).length === 0) {
      throw new Error("Enter at least one credential value for live mode.");
    }

    const record: StoredConnectionRecord = {
      connectionId: input.connectionId ?? createId("connection"),
      connectionName: input.connectionName.trim() || `${integration.integrationName} Store`,
      integrationKey: input.integrationKey,
      mode: input.mode,
      values: cleanedValues,
      connectedAt: nowIso(),
      lastSyncedAt: null,
      syncedOrderCount: 0
    };

    const existing = input.connectionId
      ? await getSecureJson<StoredConnectionRecord>(getStorageKey(input.connectionId))
      : null;
    if (existing) {
      record.lastSyncedAt = existing.lastSyncedAt;
      record.syncedOrderCount = existing.syncedOrderCount;
    }

    await setSecureJson(getStorageKey(record.connectionId), record);
    const connectionIndex = await this.getConnectionIndex();
    if (!connectionIndex.includes(record.connectionId)) {
      await this.saveConnectionIndex([...connectionIndex, record.connectionId]);
    }

    return toConnection(integration, record, await isSecureStoreBacked());
  }

  async removeCredentials(connectionId: string) {
    await deleteSecureItem(getStorageKey(connectionId));
    const connectionIndex = await this.getConnectionIndex();
    await this.saveConnectionIndex(connectionIndex.filter((entry) => entry !== connectionId));
  }

  async recordSyncResult(connectionId: string, syncedOrderCount: number) {
    const existing = await getSecureJson<StoredConnectionRecord>(getStorageKey(connectionId));
    if (!existing) {
      throw new Error("Integration connection not found.");
    }
    const nextRecord: StoredConnectionRecord = {
      connectionId,
      connectionName: existing.connectionName,
      integrationKey: existing.integrationKey,
      mode: existing.mode,
      values: existing.values,
      connectedAt: existing.connectedAt ?? nowIso(),
      lastSyncedAt: nowIso(),
      syncedOrderCount
    };

    await setSecureJson(getStorageKey(connectionId), nextRecord);
  }
}
