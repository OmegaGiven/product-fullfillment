import type {
  IntegrationAuthService,
  IntegrationDefinition,
  IntegrationConnection,
  IntegrationCredentialInput,
  PreparedIntegrationOAuth
} from "../interfaces";
import { nowIso } from "../../utils";
import { createLocalRecordId } from "../../utils";

import {
  deleteSecureItem,
  getSecureJson,
  isSecureStoreBacked,
  setSecureJson
} from "./localSecureStore";
import { logApiEvent } from "./apiLogger";

type StoredConnectionRecord = {
  connectionId: number;
  connectionName: string;
  integrationKey: string;
  mode: "mock" | "live";
  values: Record<string, string>;
  connectedAt: string;
  lastSyncedAt: string | null;
  syncedOrderCount: number;
};

const CONNECTION_INDEX_KEY = "integration:index";
const OAUTH_STATE_PREFIX = "integration:oauth-state:";
const ETSY_SCOPES = ["transactions_r", "shops_r", "shops_w"];

const SUPPORTED_INTEGRATIONS: IntegrationDefinition[] = [
  {
    integrationKey: "etsy",
    integrationName: "Etsy",
    description:
      "Primary V1 integration. Supports mock mode now and live OAuth preparation for seller authorization.",
    fields: [
      {
        key: "keystring",
        label: "Keystring",
        placeholder: "Enter Etsy app keystring",
        secret: true
      },
      {
        key: "sharedSecret",
        label: "Shared Secret",
        placeholder: "Enter Etsy shared secret",
        secret: true
      },
      {
        key: "redirectUri",
        label: "Redirect URI",
        placeholder: "Enter the exact HTTPS redirect URI registered in Etsy",
        secret: false
      }
    ],
    supportsOAuth: true,
    liveSetupNotes: [
      "Use the Etsy keystring as client_id when building the OAuth URL.",
      "The redirect URI must exactly match the HTTPS URI registered with Etsy.",
      "OAuth uses PKCE and a single-use state value for every request.",
      "The shared secret is still useful for x-api-key testing and later server-side verification."
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
    ],
    supportsOAuth: false,
    liveSetupNotes: ["Squarespace live API work is planned after Etsy."]
  }
];

function getStorageKey(connectionId: number) {
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
    usesSecureStorage,
    supportsOAuth: base.supportsOAuth ?? false,
    liveSetupNotes: base.liveSetupNotes ?? []
  };
}

function createPkceVerifier() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let verifier = "";
  for (let index = 0; index < 64; index += 1) {
    verifier += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return verifier;
}

function createStateToken() {
  return `etsy_state_${createLocalRecordId()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function sha256Base64Url(input: string) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("OAuth preparation needs Web Crypto support on this device.");
  }

  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(input));
  const bytes = Array.from(new Uint8Array(digest));
  const binary = bytes.map((byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export class LocalIntegrationAuthService implements IntegrationAuthService {
  async listIntegrationCatalog(): Promise<IntegrationDefinition[]> {
    return SUPPORTED_INTEGRATIONS;
  }

  private async getConnectionIndex() {
    return (await getSecureJson<number[]>(CONNECTION_INDEX_KEY)) ?? [];
  }

  private async saveConnectionIndex(connectionIds: number[]) {
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
    logApiEvent("integration", "saveCredentials", "request", {
      connectionId: input.connectionId ?? "new",
      connectionName: input.connectionName,
      integrationKey: input.integrationKey,
      mode: input.mode,
      valueKeys: Object.keys(input.values)
    });

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
      connectionId: input.connectionId ?? createLocalRecordId(),
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

    const connection = toConnection(integration, record, await isSecureStoreBacked());
    logApiEvent("integration", "saveCredentials", "response", {
      connectionId: connection.connectionId,
      connectionName: connection.connectionName,
      integrationKey: connection.integrationKey,
      mode: connection.mode,
      hasStoredCredentials: connection.hasStoredCredentials
    });
    return connection;
  }

  async prepareOAuthConnection(connectionId: number): Promise<PreparedIntegrationOAuth | null> {
    logApiEvent("integration", "prepareOAuthConnection", "request", {
      connectionId
    });
    const connections = await this.listConnections();
    const connection = connections.find((entry) => entry.connectionId === connectionId);
    if (!connection || connection.integrationKey !== "etsy") {
      logApiEvent("integration", "prepareOAuthConnection", "response", {
        connectionId,
        prepared: false,
        reason: "connection-not-found-or-unsupported"
      });
      return null;
    }

    const stored = await getSecureJson<StoredConnectionRecord>(getStorageKey(connectionId));
    if (!stored) {
      throw new Error("Integration connection not found.");
    }

    const keystring = stored.values.keystring?.trim();
    const redirectUri = stored.values.redirectUri?.trim();

    if (!keystring || !redirectUri) {
      throw new Error("Etsy live setup requires both keystring and redirect URI.");
    }

    const codeVerifier = createPkceVerifier();
    const codeChallenge = await sha256Base64Url(codeVerifier);
    const state = createStateToken();
    const requestedAt = nowIso();

    await setSecureJson(`${OAUTH_STATE_PREFIX}${connectionId}`, {
      state,
      codeVerifier,
      redirectUri,
      scopes: ETSY_SCOPES,
      requestedAt
    });

    const query = new URLSearchParams({
      response_type: "code",
      client_id: keystring,
      redirect_uri: redirectUri,
      scope: ETSY_SCOPES.join(" "),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256"
    });

    const prepared = {
      connectionId,
      integrationKey: connection.integrationKey,
      authorizationUrl: `https://www.etsy.com/oauth/connect?${query.toString()}`,
      redirectUri,
      scopes: ETSY_SCOPES,
      state,
      requestedAt
    };
    logApiEvent("integration", "prepareOAuthConnection", "response", {
      connectionId,
      integrationKey: connection.integrationKey,
      redirectUri,
      scopes: ETSY_SCOPES,
      authorizationUrl: prepared.authorizationUrl
    });
    return prepared;
  }

  async removeCredentials(connectionId: number) {
    logApiEvent("integration", "removeCredentials", "request", {
      connectionId
    });
    await deleteSecureItem(getStorageKey(connectionId));
    await deleteSecureItem(`${OAUTH_STATE_PREFIX}${connectionId}`);
    const connectionIndex = await this.getConnectionIndex();
    await this.saveConnectionIndex(connectionIndex.filter((entry) => entry !== connectionId));
    logApiEvent("integration", "removeCredentials", "response", {
      connectionId,
      removed: true
    });
  }

  async recordSyncResult(connectionId: number, syncedOrderCount: number) {
    logApiEvent("integration", "recordSyncResult", "request", {
      connectionId,
      syncedOrderCount
    });
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
    logApiEvent("integration", "recordSyncResult", "response", {
      connectionId,
      lastSyncedAt: nextRecord.lastSyncedAt,
      syncedOrderCount: nextRecord.syncedOrderCount
    });
  }
}
