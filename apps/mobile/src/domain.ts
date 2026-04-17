import { z } from "zod";

export const recordIdSchema = z.number().int().positive();
export type RecordId = z.infer<typeof recordIdSchema>;

export const fulfillmentIdSchema = recordIdSchema;
export type FulfillmentId = z.infer<typeof fulfillmentIdSchema>;

export const executionModeSchema = z.enum(["local", "remote"]);
export type ExecutionMode = z.infer<typeof executionModeSchema>;

export const stepTypeSchema = z.enum([
  "start-job",
  "capture-photos",
  "review-photos",
  "ocr-match",
  "select-order-manual",
  "confirm-order",
  "message-customer",
  "approve-send",
  "custom-checkpoint",
  "text-display",
  "input-step",
  "api-request"
]);
export type StepType = z.infer<typeof stepTypeSchema>;

export const messageChannelSchema = z.enum(["integration-message", "email", "manual"]);
export type MessageChannel = z.infer<typeof messageChannelSchema>;

export const addressSchema = z.object({
  name: z.string(),
  address1: z.string(),
  address2: z.string().optional().default(""),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  phone: z.string().optional().default("")
});
export type Address = z.infer<typeof addressSchema>;

export const importedOrderSchema = z.object({
  id: recordIdSchema,
  externalOrderId: z.string(),
  integrationConnectionId: recordIdSchema.optional(),
  integrationConnectionName: z.string().optional(),
  integrationKey: z.string(),
  integrationName: z.string(),
  orderNumber: z.string(),
  buyerName: z.string(),
  buyerEmail: z.string().optional(),
  shippingAddress: addressSchema,
  availableChannels: z.array(messageChannelSchema),
  createdAt: z.string()
});
export type ImportedOrder = z.infer<typeof importedOrderSchema>;

export const fulfillmentPhotoSchema = z.object({
  id: recordIdSchema,
  fulfillmentId: fulfillmentIdSchema,
  uri: z.string(),
  label: z.enum(["product", "label"]),
  createdAt: z.string()
});
export type FulfillmentPhoto = z.infer<typeof fulfillmentPhotoSchema>;

export const ocrExtractionSchema = z.object({
  fulfillmentId: fulfillmentIdSchema,
  sourcePhotoId: recordIdSchema.optional(),
  text: z.string(),
  recipient: addressSchema.partial(),
  confidence: z.number()
});
export type OcrExtraction = z.infer<typeof ocrExtractionSchema>;

export const matchCandidateSchema = z.object({
  orderId: recordIdSchema,
  confidence: z.number(),
  reasons: z.array(z.string())
});
export type MatchCandidate = z.infer<typeof matchCandidateSchema>;

export const messageTemplateSchema = z.object({
  id: recordIdSchema,
  name: z.string(),
  subject: z.string(),
  body: z.string()
});
export type MessageTemplate = z.infer<typeof messageTemplateSchema>;

export const messageAttemptSchema = z.object({
  id: recordIdSchema,
  fulfillmentId: fulfillmentIdSchema,
  channel: messageChannelSchema,
  status: z.enum(["pending", "approved", "sent", "blocked"]),
  subject: z.string(),
  body: z.string(),
  createdAt: z.string()
});
export type MessageAttempt = z.infer<typeof messageAttemptSchema>;

export const workflowStepSchema = z.object({
  id: z.string(),
  type: stepTypeSchema,
  title: z.string(),
  description: z.string(),
  required: z.boolean().default(true),
  optional: z.boolean().default(false),
  config: z.record(z.any()).default({})
});
export type WorkflowStep = z.infer<typeof workflowStepSchema>;

export const workflowTemplateSchema = z.object({
  id: recordIdSchema,
  name: z.string(),
  executionMode: executionModeSchema,
  stepOrder: z.array(z.string()),
  steps: z.array(workflowStepSchema)
});
export type WorkflowTemplate = z.infer<typeof workflowTemplateSchema>;

export const approvalRecordSchema = z.object({
  fulfillmentId: fulfillmentIdSchema,
  approvedAt: z.string().nullable(),
  approvedBy: z.string().nullable()
});
export type ApprovalRecord = z.infer<typeof approvalRecordSchema>;

export const workflowRunStepStateSchema = z.object({
  stepId: z.string(),
  status: z.enum(["locked", "ready", "in-progress", "completed"]),
  note: z.string().optional()
});
export type WorkflowRunStepState = z.infer<typeof workflowRunStepStateSchema>;

export const fulfillmentRunSchema = z.object({
  id: fulfillmentIdSchema,
  name: z.string(),
  executionMode: executionModeSchema,
  workflowTemplateId: recordIdSchema,
  currentStepIndex: z.number(),
  stepOrder: z.array(z.string()),
  status: z.enum(["draft", "in-progress", "review", "completed"]),
  matchedOrderId: recordIdSchema.nullable(),
  selectedChannel: messageChannelSchema.nullable(),
  touchedByUsers: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type FulfillmentRun = z.infer<typeof fulfillmentRunSchema>;

export const workflowRunStateSchema = z.object({
  run: fulfillmentRunSchema,
  stepStates: z.array(workflowRunStepStateSchema),
  photos: z.array(fulfillmentPhotoSchema),
  ocrExtraction: ocrExtractionSchema.nullable(),
  candidates: z.array(matchCandidateSchema),
  previewMessage: messageAttemptSchema.nullable(),
  approval: approvalRecordSchema
});
export type WorkflowRunState = z.infer<typeof workflowRunStateSchema>;
