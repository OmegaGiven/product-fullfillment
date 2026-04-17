import type { WorkflowStep, WorkflowTemplate } from "../domain";
import { DEFAULT_WORKFLOW_TEMPLATE } from "./defaultWorkflow";
import { createLocalRecordId } from "../utils";

function cloneStep(step: WorkflowStep): WorkflowStep {
  return {
    ...step,
    config: { ...step.config }
  };
}

export function cloneTemplate(template: WorkflowTemplate): WorkflowTemplate {
  return {
    ...template,
    stepOrder: [...template.stepOrder],
    steps: template.steps.map(cloneStep)
  };
}

export function createWorkflowFromTemplate(index: number): WorkflowTemplate {
  const steps = DEFAULT_WORKFLOW_TEMPLATE.steps.map((step) => ({
    ...cloneStep(step),
    id: `step_${createLocalRecordId()}`
  }));

  return {
    id: createLocalRecordId(),
    name: `Workflow ${index + 1}`,
    executionMode: "local",
    stepOrder: steps.map((step) => step.id),
    steps
  };
}

export function createBlankWorkflow(index: number): WorkflowTemplate {
  return {
    id: createLocalRecordId(),
    name: `Blank Workflow ${index + 1}`,
    executionMode: "local",
    stepOrder: [],
    steps: []
  };
}
