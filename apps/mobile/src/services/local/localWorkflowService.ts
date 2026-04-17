import type { RunId, WorkflowRunState, WorkflowTemplate } from "../../domain";
import type { WorkflowService } from "../interfaces";
import { DEFAULT_WORKFLOW_TEMPLATE } from "../../workflow/defaultWorkflow";
import { clamp, nowIso } from "../../utils";

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

  private async createRunId() {
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

  async deleteWorkflowTemplate(templateId: string) {
    await this.storageService.deleteWorkflowTemplate(templateId);
  }

  async createFulfillmentRun(templateId?: string) {
    const workflow =
      templateId == null
        ? await this.getDefaultWorkflow()
        : ((await this.storageService.getWorkflowTemplate(templateId)) ?? (await this.getDefaultWorkflow()));
    const timestamp = nowIso();
    const runId = await this.createRunId();
    const run = {
      id: runId,
      name: `${workflow.name}: #${runId}`,
      executionMode: workflow.executionMode,
      workflowTemplateId: workflow.id,
      currentStepIndex: 0,
      stepOrder: workflow.stepOrder,
      status: "draft" as const,
      matchedOrderId: null,
      selectedChannel: null,
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
        runId: run.id,
        approvedAt: null,
        approvedBy: null
      }
    };

    await this.storageService.saveRunState(state);
    return run;
  }

  async getRunState(runId: RunId) {
    return this.storageService.getRunState(runId);
  }

  async saveRunState(state: WorkflowRunState) {
    await this.storageService.saveRunState({
      ...state,
      run: {
        ...state.run,
        updatedAt: nowIso()
      }
    });
  }

  async deleteFulfillmentRun(runId: RunId) {
    await this.storageService.deleteRunState(runId);
  }

  async goToPreviousStep(runId: RunId) {
    const state = await this.storageService.getRunState(runId);
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
        updatedAt: nowIso()
      },
      stepStates
    };

    await this.storageService.saveRunState(updatedState);
    return updatedState;
  }

  async advanceStep(runId: RunId) {
    const state = await this.storageService.getRunState(runId);
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
        updatedAt: nowIso()
      },
      stepStates
    };

    await this.storageService.saveRunState(updatedState);
    return updatedState;
  }
}
