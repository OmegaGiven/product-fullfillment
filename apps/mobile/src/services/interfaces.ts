import type {
  FulfillmentPhoto,
  FulfillmentRun,
  ImportedOrder,
  MatchCandidate,
  MessageAttempt,
  MessageChannel,
  OcrExtraction,
  WorkflowRunState,
  WorkflowTemplate
} from "../domain";

export type IntegrationConnection = {
  integrationKey: string;
  integrationName: string;
  connectedAt: string;
};

export interface StorageService {
  bootstrap(): Promise<void>;
  listRuns(): Promise<FulfillmentRun[]>;
  getRunState(runId: string): Promise<WorkflowRunState | null>;
  saveRunState(state: WorkflowRunState): Promise<void>;
  listOrders(): Promise<ImportedOrder[]>;
  saveOrders(orders: ImportedOrder[]): Promise<void>;
  getWorkflowTemplate(templateId: string): Promise<WorkflowTemplate | null>;
  saveWorkflowTemplate(template: WorkflowTemplate): Promise<void>;
}

export interface WorkflowService {
  getDefaultWorkflow(): Promise<WorkflowTemplate>;
  createFulfillmentRun(): Promise<FulfillmentRun>;
  getRunState(runId: string): Promise<WorkflowRunState | null>;
  saveRunState(state: WorkflowRunState): Promise<void>;
  advanceStep(runId: string): Promise<WorkflowRunState>;
}

export interface OrderSyncService {
  syncOrders(): Promise<ImportedOrder[]>;
}

export interface OcrService {
  runOcr(runId: string): Promise<OcrExtraction>;
}

export interface MatchService {
  findMatchCandidates(runId: string): Promise<MatchCandidate[]>;
  confirmMatchedOrder(runId: string, orderId: string): Promise<WorkflowRunState>;
}

export interface MessageService {
  generateMessagePreview(runId: string): Promise<MessageAttempt>;
  approveAndSend(runId: string, channel: MessageChannel): Promise<WorkflowRunState>;
}

export interface IntegrationAuthService {
  listConnections(): Promise<IntegrationConnection[]>;
}

export interface AppServices {
  storageService: StorageService;
  workflowService: WorkflowService;
  orderSyncService: OrderSyncService;
  ocrService: OcrService;
  matchService: MatchService;
  messageService: MessageService;
  integrationAuthService: IntegrationAuthService;
}
