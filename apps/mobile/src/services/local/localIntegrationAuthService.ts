import type { IntegrationAuthService, IntegrationConnection } from "../interfaces";

export class LocalIntegrationAuthService implements IntegrationAuthService {
  async listConnections(): Promise<IntegrationConnection[]> {
    return [
      {
        integrationKey: "etsy",
        integrationName: "Etsy",
        connectedAt: "2026-04-17T10:00:00.000Z"
      },
      {
        integrationKey: "squarespace",
        integrationName: "Squarespace",
        connectedAt: "2026-04-17T10:00:00.000Z"
      }
    ];
  }
}
