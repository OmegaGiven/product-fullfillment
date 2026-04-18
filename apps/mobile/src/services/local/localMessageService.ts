import type { FulfillmentId, MessageTemplate } from "../../domain";
import { renderMessageTemplate } from "../../messages/renderMessageTemplate";
import type { MessageService } from "../interfaces";
import { createLocalRecordId, nowIso } from "../../utils";

import type { LocalStorageService } from "./localStorageService";
import { logApiEvent } from "./apiLogger";
import { seededTemplates } from "./seedData";

export class LocalMessageService implements MessageService {
  constructor(private storageService: LocalStorageService) {}

  private async resolveTemplate(fulfillmentId: FulfillmentId): Promise<MessageTemplate> {
    const state = await this.storageService.getRunState(fulfillmentId);
    if (!state) {
      throw new Error("Fulfillment run not found.");
    }

    const workflow = await this.storageService.getWorkflowTemplate(state.run.workflowTemplateId);
    const selectedTemplateId = workflow?.steps.find(
      (step) =>
        (step.type === "message-customer" || step.type === "approve-send") &&
        typeof step.config.messageTemplateId === "number"
    )?.config.messageTemplateId;

    if (typeof selectedTemplateId === "number") {
      const selectedTemplate = await this.storageService.getMessageTemplate(selectedTemplateId);
      if (selectedTemplate) {
        return selectedTemplate;
      }
    }

    const storedTemplates = await this.storageService.listMessageTemplates();
    return storedTemplates[0] ?? seededTemplates[0];
  }

  async generateMessagePreview(fulfillmentId: FulfillmentId) {
    logApiEvent("message", "generateMessagePreview", "request", {
      fulfillmentId
    });
    const state = await this.storageService.getRunState(fulfillmentId);
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

    const template = await this.resolveTemplate(fulfillmentId);
    const channel = order.availableChannels.includes("integration-message")
      ? "integration-message"
      : order.buyerEmail
        ? "email"
        : "manual";

    const rendered = renderMessageTemplate(template, order);
    const preview = {
      id: createLocalRecordId(),
      fulfillmentId,
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

    logApiEvent("message", "generateMessagePreview", "response", {
      fulfillmentId,
      orderId: order.id,
      channel: preview.channel,
      status: preview.status,
      subject: preview.subject
    });
    return preview;
  }

  async approveAndSend(fulfillmentId: FulfillmentId, channel: "integration-message" | "email" | "manual") {
    logApiEvent("message", "approveAndSend", "request", {
      fulfillmentId,
      channel
    });
    const state = await this.storageService.getRunState(fulfillmentId);
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
      const MailComposer = await import("expo-mail-composer");
      logApiEvent("message", "emailCompose", "request", {
        fulfillmentId,
        recipients: order.buyerEmail ? [order.buyerEmail] : [],
        subject: state.previewMessage.subject
      });
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
        fulfillmentId,
        approvedAt: nowIso(),
        approvedBy: "local-device-user"
      }
    };

    await this.storageService.saveRunState(nextState);
    logApiEvent("message", "approveAndSend", "response", {
      fulfillmentId,
      orderId: order.id,
      channel,
      status,
      runStatus: nextState.run.status
    });
    return nextState;
  }
}
