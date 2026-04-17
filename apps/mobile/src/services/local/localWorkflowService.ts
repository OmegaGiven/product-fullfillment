import type { FulfillmentId, WorkflowRunState, WorkflowTemplate } from "../../domain";
import type { WorkflowService } from "../interfaces";
import { DEFAULT_WORKFLOW_TEMPLATE } from "../../workflow/defaultWorkflow";
import { appendTouchedByUser, clamp, LOCAL_DEVICE_USER_ID, nowIso } from "../../utils";

import type { LocalStorageService } from "./localStorageService";

function buildInitialStepStates(stepOrder: string[]) {
  return stepOrder.map((stepId, index) => ({
    stepId,
    status: index === 0 ? "ready" : "locked",
    note: ""
  })) as WorkflowRunState["stepStates"];
}

export class LocalWorkflowService implements WorkflowService {
  constructor(private storageService: LocalStorageService) {}

  private async createFulfillmentId() {
    const runs = await this.storageService.listRuns();
    const numericIds = runs
      .map((run) => (typeof run.id === "number" ? run.id : null))
      .filter((value): value is number => value !== null);

    return (numericIds.length === 0 ? 0 : Math.max(...numericIds)) + 1;
  }

  async getDefaultWorkflow() {
    const workflow = await this.storageService.getWorkflowTemplate(DEFAULT_WORKFLOW_TEMPLATE.id);
    return workflow ?? DEFAULT_WORKFLOW_TEMPLATE;
  }

  async listWorkflowTemplates() {
    const templates = await this.storageService.listWorkflowTemplates();
    return templates.sort((a, b) => {
      if (a.id === DEFAULT_WORKFLOW_TEMPLATE.id) {
        return -1;
      }
      if (b.id === DEFAULT_WORKFLOW_TEMPLATE.id) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  async saveWorkflowTemplate(template: WorkflowTemplate) {
    await this.storageService.saveWorkflowTemplate(template);
    return template;
  }

  async deleteWorkflowTemplate(templateId: number) {
    await this.storageService.deleteWorkflowTemplate(templateId);
  }

  async createFulfillmentRun(templateId?: number) {
    const workflow =
      templateId == null
        ? await this.getDefaultWorkflow()
        : ((await this.storageService.getWorkflowTemplate(templateId)) ?? (await this.getDefaultWorkflow()));
    const timestamp = nowIso();
    const fulfillmentId = await this.createFulfillmentId();
    const run = {
      id: fulfillmentId,
      name: `${workflow.name}: #${fulfillmentId}`,
      executionMode: workflow.executionMode,
      workflowTemplateId: workflow.id,
      currentStepIndex: 0,
      stepOrder: workflow.stepOrder,
      status: "draft" as const,
      matchedOrderId: null,
      selectedChannel: null,
      touchedByUsers: [LOCAL_DEVICE_USER_ID],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const state: WorkflowRunState = {
      run,
      stepStates: buildInitialStepStates(workflow.stepOrder),
      photos: [],
      ocrExtraction: null,
      candidates: [],
      previewMessage: null,
      approval: {
        fulfillmentId: run.id,
        approvedAt: null,
        approvedBy: null
      }
    };

    await this.storageService.saveRunState(state);
    return run;
  }

  async getRunState(fulfillmentId: FulfillmentId) {
    return this.storageService.getRunState(fulfillmentId);
  }

  async saveRunState(state: WorkflowRunState) {
    await this.storageService.saveRunState({
      ...state,
      run: {
        ...state.run,
        touchedByUsers: appendTouchedByUser(state.run.touchedByUsers, LOCAL_DEVICE_USER_ID),
        updatedAt: nowIso()
      }
    });
  }

  async deleteFulfillmentRun(fulfillmentId: FulfillmentId) {
    await this.storageService.deleteRunState(fulfillmentId);
  }

  async goToPreviousStep(fulfillmentId: FulfillmentId) {
    const state = await this.storageService.getRunState(fulfillmentId);
    if (!state) {
      throw new Error("Fulfillment run not found.");
    }

    const previousIndex = clamp(state.run.currentStepIndex - 1, 0, state.run.stepOrder.length - 1);
    const stepStates = state.stepStates.map((stepState, index) => {
      if (index < previousIndex) {
        return { ...stepState, status: "completed" as const };
      }
      if (index === previousIndex) {
        return { ...stepState, status: "ready" as const };
      }
      return { ...stepState, status: "locked" as const };
    });

    const updatedState: WorkflowRunState = {
      ...state,
      run: {
        ...state.run,
        currentStepIndex: previousIndex,
        status: previousIndex === 0 ? "draft" : "in-progress",
        touchedByUsers: appendTouchedByUser(state.run.touchedByUsers, LOCAL_DEVICE_USER_ID),
        updatedAt: nowIso()
      },
      stepStates
    };

    await this.storageService.saveRunState(updatedState);
    return updatedState;
  }

  async advanceStep(fulfillmentId: FulfillmentId) {
    const state = await this.storageService.getRunState(fulfillmentId);
    if (!state) {
      throw new Error("Fulfillment run not found.");
    }

    const nextIndex = clamp(state.run.currentStepIndex + 1, 0, state.run.stepOrder.length - 1);
    const stepStates = state.stepStates.map((stepState, index) => {
      if (index < nextIndex) {
        return { ...stepState, status: "completed" as const };
      }
      if (index === nextIndex) {
        return { ...stepState, status: "ready" as const };
      }
      return { ...stepState, status: "locked" as const };
    });

    const updatedState: WorkflowRunState = {
      ...state,
      run: {
        ...state.run,
        currentStepIndex: nextIndex,
        status: nextIndex === state.run.stepOrder.length - 1 ? "review" : "in-progress",
        touchedByUsers: appendTouchedByUser(state.run.touchedByUsers, LOCAL_DEVICE_USER_ID),
        updatedAt: nowIso()
      },
      stepStates
    };

    await this.storageService.saveRunState(updatedState);
    return updatedState;
  }
}
