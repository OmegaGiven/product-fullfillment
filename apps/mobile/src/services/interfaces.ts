import type {
  FulfillmentPhoto,
  FulfillmentRun,
  ImportedOrder,
  MatchCandidate,
  MessageAttempt,
  MessageTemplate,
  MessageChannel,
  OcrExtraction,
  RunId,
  WorkflowRunState,
  WorkflowTemplate
} from "../domain";

export type IntegrationConnection = {
  connectionId: string;
  connectionName: string;
  integrationKey: string;
  integrationName: string;
  description: string;
  mode: "mock" | "live";
  connectedAt: string | null;
  lastSyncedAt: string | null;
  syncedOrderCount: number;
  hasStoredCredentials: boolean;
  fields: IntegrationCredentialField[];
  usesSecureStorage: boolean;
};

export type IntegrationDefinition = {
  integrationKey: string;
  integrationName: string;
  description: string;
  fields: IntegrationCredentialField[];
};

export type IntegrationCredentialField = {
  key: string;
  label: string;
  placeholder: string;
  secret: boolean;
};

export type IntegrationCredentialInput = {
  connectionId?: string;
  connectionName: string;
  integrationKey: string;
  mode: "mock" | "live";
  values: Record<string, string>;
};

export type OrderRunLink = {
  orderId: string;
  runId: RunId;
};

export interface StorageService {
  bootstrap(): Promise<void>;
  listRuns(): Promise<FulfillmentRun[]>;
  getRunState(runId: RunId): Promise<WorkflowRunState | null>;
  saveRunState(state: WorkflowRunState): Promise<void>;
  deleteRunState(runId: RunId): Promise<void>;
  listOrders(): Promise<ImportedOrder[]>;
  listOrderRunLinks(): Promise<OrderRunLink[]>;
  replaceOrders(orders: ImportedOrder[]): Promise<void>;
  saveOrders(orders: ImportedOrder[]): Promise<void>;
  saveOrderRunLink(orderId: string, runId: RunId): Promise<void>;
  listWorkflowTemplates(): Promise<WorkflowTemplate[]>;
  getWorkflowTemplate(templateId: string): Promise<WorkflowTemplate | null>;
  saveWorkflowTemplate(template: WorkflowTemplate): Promise<void>;
  deleteWorkflowTemplate(templateId: string): Promise<void>;
  listMessageTemplates(): Promise<MessageTemplate[]>;
  getMessageTemplate(templateId: string): Promise<MessageTemplate | null>;
  saveMessageTemplate(template: MessageTemplate): Promise<void>;
  deleteMessageTemplate(templateId: string): Promise<void>;
}

export interface WorkflowService {
  getDefaultWorkflow(): Promise<WorkflowTemplate>;
  listWorkflowTemplates(): Promise<WorkflowTemplate[]>;
  saveWorkflowTemplate(template: WorkflowTemplate): Promise<WorkflowTemplate>;
  deleteWorkflowTemplate(templateId: string): Promise<void>;
  createFulfillmentRun(templateId?: string): Promise<FulfillmentRun>;
  getRunState(runId: RunId): Promise<WorkflowRunState | null>;
  saveRunState(state: WorkflowRunState): Promise<void>;
  deleteFulfillmentRun(runId: RunId): Promise<void>;
  goToPreviousStep(runId: RunId): Promise<WorkflowRunState>;
  advanceStep(runId: RunId): Promise<WorkflowRunState>;
}

export interface OrderSyncService {
  syncOrders(connectionId?: string): Promise<ImportedOrder[]>;
}

export interface OcrService {
  runOcr(runId: RunId): Promise<OcrExtraction>;
}

export interface MatchService {
  findMatchCandidates(runId: RunId): Promise<MatchCandidate[]>;
  confirmMatchedOrder(runId: RunId, orderId: string): Promise<WorkflowRunState>;
}

export interface MessageService {
  generateMessagePreview(runId: RunId): Promise<MessageAttempt>;
  approveAndSend(runId: RunId, channel: MessageChannel): Promise<WorkflowRunState>;
}

export interface IntegrationAuthService {
  listConnections(): Promise<IntegrationConnection[]>;
  listIntegrationCatalog(): Promise<IntegrationDefinition[]>;
  saveCredentials(input: IntegrationCredentialInput): Promise<IntegrationConnection>;
  removeCredentials(connectionId: string): Promise<void>;
  recordSyncResult(connectionId: string, syncedOrderCount: number): Promise<void>;
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
