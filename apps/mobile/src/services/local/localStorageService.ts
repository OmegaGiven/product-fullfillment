import type {
  FulfillmentRun,
  ImportedOrder,
  WorkflowRunState,
  WorkflowTemplate
} from "../../domain";
import { workflowRunStateSchema } from "../../domain";
import type { StorageService } from "../interfaces";
import { DEFAULT_WORKFLOW_TEMPLATE } from "../../workflow/defaultWorkflow";

import { bootstrapDb, getRecord, listRecords, saveRecord } from "./localDb";
import { seededOrders } from "./seedData";

const ORDER_NAMESPACE = "orders";
const RUN_NAMESPACE = "runs";
const WORKFLOW_NAMESPACE = "workflows";

export class LocalStorageService implements StorageService {
  async bootstrap() {
    await bootstrapDb();
    const existingWorkflow = await this.getWorkflowTemplate(DEFAULT_WORKFLOW_TEMPLATE.id);
    if (!existingWorkflow) {
      await this.saveWorkflowTemplate(DEFAULT_WORKFLOW_TEMPLATE);
    }

    const existingOrders = await this.listOrders();
    if (existingOrders.length === 0) {
      await this.saveOrders(seededOrders);
    }
  }

  async listRuns(): Promise<FulfillmentRun[]> {
    const rows = await listRecords(RUN_NAMESPACE);
    return rows.map((row) => workflowRunStateSchema.parse(JSON.parse(row)).run);
  }

  async getRunState(runId: string): Promise<WorkflowRunState | null> {
    const row = await getRecord(RUN_NAMESPACE, runId);
    if (!row) {
      return null;
    }
    return workflowRunStateSchema.parse(JSON.parse(row));
  }

  async saveRunState(state: WorkflowRunState) {
    await saveRecord(RUN_NAMESPACE, state.run.id, JSON.stringify(state));
  }

  async listOrders(): Promise<ImportedOrder[]> {
    const rows = await listRecords(ORDER_NAMESPACE);
    return rows.map((row) => JSON.parse(row) as ImportedOrder);
  }

  async saveOrders(orders: ImportedOrder[]) {
    await Promise.all(
      orders.map((order) => saveRecord(ORDER_NAMESPACE, order.id, JSON.stringify(order)))
    );
  }

  async getWorkflowTemplate(templateId: string) {
    const row = await getRecord(WORKFLOW_NAMESPACE, templateId);
    return row ? (JSON.parse(row) as WorkflowTemplate) : null;
  }

  async saveWorkflowTemplate(template: WorkflowTemplate) {
    await saveRecord(WORKFLOW_NAMESPACE, template.id, JSON.stringify(template));
  }
}
