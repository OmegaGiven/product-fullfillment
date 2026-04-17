import type { WorkflowTemplate } from "../domain";

export const DEFAULT_WORKFLOW_TEMPLATE: WorkflowTemplate = {
  id: "workflow_default_v1",
  name: "Default Product Fulfillment Workflow",
  executionMode: "local",
  stepOrder: [
    "step_start",
    "step_capture",
    "step_review_photos",
    "step_ocr_match",
    "step_confirm_order",
    "step_preview_message",
    "step_approve_send"
  ],
  steps: [
    {
      id: "step_start",
      type: "start-job",
      title: "Start Fulfillment",
      description: "Create a new fulfillment run and confirm the workflow path.",
      required: true,
      optional: false,
      config: {}
    },
    {
      id: "step_capture",
      type: "capture-photos",
      title: "Capture Product And Label Photos",
      description: "Take at least one product photo and one label photo.",
      required: true,
      optional: false,
      config: {
        minProductPhotos: 1,
        requireLabelPhoto: true
      }
    },
    {
      id: "step_review_photos",
      type: "review-photos",
      title: "Review Photos",
      description: "Confirm the photo set is complete before matching.",
      required: true,
      optional: false,
      config: {}
    },
    {
      id: "step_ocr_match",
      type: "ocr-match",
      title: "Run OCR And Order Matching",
      description: "Extract recipient data from the label and rank matching orders.",
      required: true,
      optional: false,
      config: {}
    },
    {
      id: "step_confirm_order",
      type: "confirm-order",
      title: "Confirm Matched Order",
      description: "Require human approval of the best match before messaging.",
      required: true,
      optional: false,
      config: {}
    },
    {
      id: "step_preview_message",
      type: "preview-message",
      title: "Preview Message",
      description: "Render the best channel and message content for review.",
      required: true,
      optional: false,
      config: {}
    },
    {
      id: "step_approve_send",
      type: "approve-send",
      title: "Approve And Send",
      description: "Approve the final message and send through the selected channel.",
      required: true,
      optional: false,
      config: {}
    }
  ]
};
