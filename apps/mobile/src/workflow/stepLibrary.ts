import type { StepType, WorkflowStep } from "../domain";

type StepPreset = {
  description: string;
  title: string;
  type: StepType;
  config?: WorkflowStep["config"];
};

export const STEP_LIBRARY: StepPreset[] = [
  {
    type: "start-job",
    title: "Start Fulfillment",
    description: "Confirm the workflow and prepare the run."
  },
  {
    type: "capture-photos",
    title: "Capture Product And Label Photos",
    description: "Take at least one product photo and one label photo.",
    config: {
      minProductPhotos: 1,
      requireLabelPhoto: true
    }
  },
  {
    type: "review-photos",
    title: "Review Photos",
    description: "Check the packet before OCR and matching."
  },
  {
    type: "ocr-match",
    title: "Run OCR, Review, And Confirm Match",
    description: "Extract recipient details, review ranked candidates, and confirm the selected order."
  },
  {
    type: "select-order-manual",
    title: "Select Order Manually",
    description: "Search and choose an order directly when OCR matching is not the right path."
  },
  {
    type: "confirm-order",
    title: "Confirm Matched Order",
    description: "Require a human to approve the selected order."
  },
  {
    type: "message-customer",
    title: "Message Customer",
    description: "Generate, review, and send the outbound customer message."
  },
  {
    type: "approve-send",
    title: "Approve And Send",
    description: "Approve the final message and send it."
  },
  {
    type: "custom-checkpoint",
    title: "Custom Checkpoint",
    description: "Add a manual pause or confirmation step."
  },
  {
    type: "text-display",
    title: "Text Display",
    description: "Show static instructions or context to the operator."
  },
  {
    type: "input-step",
    title: "Input Step",
    description: "Collect operator input for this flow."
  },
  {
    type: "api-request",
    title: "API Request (WIP)",
    description: "Future module for configured API request actions."
  }
];

export function getDefaultStepPreset(type: StepType) {
  return STEP_LIBRARY.find((step) => step.type === type) ?? STEP_LIBRARY[0];
}
