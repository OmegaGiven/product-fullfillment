import * as MailComposer from "expo-mail-composer";

import type { MessageTemplate, RunId } from "../../domain";
import { renderMessageTemplate } from "../../messages/renderMessageTemplate";
import type { MessageService } from "../interfaces";
import { createId, nowIso } from "../../utils";

import type { LocalStorageService } from "./localStorageService";
import { seededTemplates } from "./seedData";

export class LocalMessageService implements MessageService {
  constructor(private storageService: LocalStorageService) {}

  private async resolveTemplate(runId: RunId): Promise<MessageTemplate> {
    const state = await this.storageService.getRunState(runId);
    if (!state) {
      throw new Error("Fulfillment run not found.");
    }

    const workflow = await this.storageService.getWorkflowTemplate(state.run.workflowTemplateId);
    const selectedTemplateId = workflow?.steps.find(
      (step) =>
        (step.type === "preview-message" || step.type === "approve-send") &&
        typeof step.config.messageTemplateId === "string"
    )?.config.messageTemplateId;

    if (typeof selectedTemplateId === "string") {
      const selectedTemplate = await this.storageService.getMessageTemplate(selectedTemplateId);
      if (selectedTemplate) {
        return selectedTemplate;
      }
    }

    const storedTemplates = await this.storageService.listMessageTemplates();
    return storedTemplates[0] ?? seededTemplates[0];
  }

  async generateMessagePreview(runId: RunId) {
    const state = await this.storageService.getRunState(runId);
    if (!state) {
      throw new Error("Fulfillment run not found.");
    }
    if (!state.run.matchedOrderId) {
      throw new Error("Confirm the order match before previewing the message.");
    }

    const orders = await this.storageService.listOrders();
    const order = orders.find((item) => item.id === state.run.matchedOrderId);
    if (!order) {
      throw new Error("Matched order was not found.");
    }

    const template = await this.resolveTemplate(runId);
    const channel = order.availableChannels.includes("integration-message")
      ? "integration-message"
      : order.buyerEmail
        ? "email"
        : "manual";

    const rendered = renderMessageTemplate(template, order);
    const preview = {
      id: createId("message"),
      runId,
      channel,
      status: channel === "manual" ? "blocked" : "pending",
      subject: rendered.subject,
      body: rendered.body,
      createdAt: nowIso()
    } as const;

    await this.storageService.saveRunState({
      ...state,
      run: {
        ...state.run,
        selectedChannel: preview.channel
      },
      previewMessage: preview
    });

    return preview;
  }

  async approveAndSend(runId: RunId, channel: "integration-message" | "email" | "manual") {
    const state = await this.storageService.getRunState(runId);
    if (!state || !state.previewMessage) {
      throw new Error("Generate a preview before sending.");
    }

    const orders = await this.storageService.listOrders();
    const order = orders.find((item) => item.id === state.run.matchedOrderId);
    if (!order) {
      throw new Error("Matched order was not found.");
    }

    let status: "approved" | "sent" | "blocked" = "approved";

    if (channel === "email") {
      await MailComposer.composeAsync({
        recipients: order.buyerEmail ? [order.buyerEmail] : [],
        subject: state.previewMessage.subject,
        body: state.previewMessage.body
      });
      status = "sent";
    } else if (channel === "integration-message") {
      status = "sent";
    } else {
      status = "blocked";
    }

    const nextState = {
      ...state,
      run: {
        ...state.run,
        status: status === "sent" ? ("completed" as const) : state.run.status,
        selectedChannel: channel,
        updatedAt: nowIso()
      },
      previewMessage: {
        ...state.previewMessage,
        channel,
        status
      },
      approval: {
        runId,
        approvedAt: nowIso(),
        approvedBy: "local-device-user"
      }
    };

    await this.storageService.saveRunState(nextState);
    return nextState;
  }
}
