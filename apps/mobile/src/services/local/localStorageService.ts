import type {
  FulfillmentRun,
  ImportedOrder,
  MessageTemplate,
  RunId,
  WorkflowRunState,
  WorkflowTemplate
} from "../../domain";
import { workflowRunStateSchema } from "../../domain";
import type { StorageService } from "../interfaces";
import { DEFAULT_WORKFLOW_TEMPLATE } from "../../workflow/defaultWorkflow";
import { seededTemplates } from "./seedData";

import { bootstrapDb, deleteRecord, deleteRecords, getRecord, listRecords, saveRecord } from "./localDb";
const ORDER_NAMESPACE = "orders";
const ORDER_RUN_LINK_NAMESPACE = "order_run_links";
const RUN_NAMESPACE = "runs";
const WORKFLOW_NAMESPACE = "workflows";
const MESSAGE_TEMPLATE_NAMESPACE = "message_templates";

export class LocalStorageService implements StorageService {
  async bootstrap() {
    await bootstrapDb();
    const existingWorkflow = await this.getWorkflowTemplate(DEFAULT_WORKFLOW_TEMPLATE.id);
    if (!existingWorkflow) {
      await this.saveWorkflowTemplate(DEFAULT_WORKFLOW_TEMPLATE);
    }
    const existingTemplates = await this.listMessageTemplates();
    if (existingTemplates.length === 0) {
      await Promise.all(seededTemplates.map((template) => this.saveMessageTemplate(template)));
    }
  }

  async listRuns(): Promise<FulfillmentRun[]> {
    const rows = await listRecords(RUN_NAMESPACE);
    return rows.map((row: string) => workflowRunStateSchema.parse(JSON.parse(row)).run);
  }

  async getRunState(runId: RunId): Promise<WorkflowRunState | null> {
    const row = await getRecord(RUN_NAMESPACE, String(runId));
    if (!row) {
      return null;
    }
    return workflowRunStateSchema.parse(JSON.parse(row));
  }

  async saveRunState(state: WorkflowRunState) {
    await saveRecord(RUN_NAMESPACE, String(state.run.id), JSON.stringify(state));
  }

  async deleteRunState(runId: RunId) {
    await deleteRecord(RUN_NAMESPACE, String(runId));
  }

  async listOrders(): Promise<ImportedOrder[]> {
    const rows = await listRecords(ORDER_NAMESPACE);
    return rows.map((row: string) => JSON.parse(row) as ImportedOrder);
  }

  async listOrderRunLinks() {
    const rows = await listRecords(ORDER_RUN_LINK_NAMESPACE);
    return rows.map((row: string) => JSON.parse(row) as { orderId: string; runId: RunId });
  }

  async replaceOrders(orders: ImportedOrder[]) {
    await deleteRecords(ORDER_NAMESPACE);
    await this.saveOrders(orders);
  }

  async saveOrders(orders: ImportedOrder[]) {
    await Promise.all(
      orders.map((order) => saveRecord(ORDER_NAMESPACE, order.id, JSON.stringify(order)))
    );
  }

  async saveOrderRunLink(orderId: string, runId: RunId) {
    await saveRecord(ORDER_RUN_LINK_NAMESPACE, orderId, JSON.stringify({ orderId, runId }));
  }

  async listWorkflowTemplates(): Promise<WorkflowTemplate[]> {
    const rows = await listRecords(WORKFLOW_NAMESPACE);
    return rows.map((row: string) => JSON.parse(row) as WorkflowTemplate);
  }

  async getWorkflowTemplate(templateId: string) {
    const row = await getRecord(WORKFLOW_NAMESPACE, templateId);
    return row ? (JSON.parse(row) as WorkflowTemplate) : null;
  }

  async saveWorkflowTemplate(template: WorkflowTemplate) {
    await saveRecord(WORKFLOW_NAMESPACE, template.id, JSON.stringify(template));
  }

  async deleteWorkflowTemplate(templateId: string) {
    await deleteRecord(WORKFLOW_NAMESPACE, templateId);
  }

  async listMessageTemplates(): Promise<MessageTemplate[]> {
    const rows = await listRecords(MESSAGE_TEMPLATE_NAMESPACE);
    return rows.map((row: string) => JSON.parse(row) as MessageTemplate);
  }

  async getMessageTemplate(templateId: string) {
    const row = await getRecord(MESSAGE_TEMPLATE_NAMESPACE, templateId);
    return row ? (JSON.parse(row) as MessageTemplate) : null;
  }

  async saveMessageTemplate(template: MessageTemplate) {
    await saveRecord(MESSAGE_TEMPLATE_NAMESPACE, template.id, JSON.stringify(template));
  }

  async deleteMessageTemplate(templateId: string) {
    await deleteRecord(MESSAGE_TEMPLATE_NAMESPACE, templateId);
  }
}
