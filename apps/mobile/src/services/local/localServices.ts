import type { AppServices } from "../interfaces";

import { LocalIntegrationAuthService } from "./localIntegrationAuthService";
import { LocalMatchService } from "./localMatchService";
import { LocalMessageService } from "./localMessageService";
import { LocalOcrService } from "./localOcrService";
import { LocalOrderSyncService } from "./localOrderSyncService";
import { LocalStorageService } from "./localStorageService";
import { LocalWorkflowService } from "./localWorkflowService";

export function createLocalServices(): AppServices {
  const storageService = new LocalStorageService();
  const integrationAuthService = new LocalIntegrationAuthService();

  return {
    storageService,
    workflowService: new LocalWorkflowService(storageService),
    orderSyncService: new LocalOrderSyncService(storageService, integrationAuthService),
    ocrService: new LocalOcrService(storageService),
    matchService: new LocalMatchService(storageService),
    messageService: new LocalMessageService(storageService),
    integrationAuthService
  };
}
