import * as MailComposer from "expo-mail-composer";

import type { MessageService } from "../interfaces";
import { createId, nowIso } from "../../utils";

import type { LocalStorageService } from "./localStorageService";
import { seededTemplates } from "./seedData";

function fillTemplate(templateBody: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (body, [key, value]) => body.replaceAll(`{{${key}}}`, value),
    templateBody
  );
}

export class LocalMessageService implements MessageService {
  constructor(private storageService: LocalStorageService) {}

  async generateMessagePreview(runId: string) {
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

    const template = seededTemplates[0];
    const channel = order.availableChannels.includes("integration-message")
      ? "integration-message"
      : order.buyerEmail
        ? "email"
        : "manual";

    const preview = {
      id: createId("message"),
      runId,
      channel,
      status: channel === "manual" ? "blocked" : "pending",
      subject: fillTemplate(template.subject, {
        orderNumber: order.orderNumber,
        buyerName: order.buyerName
      }),
      body: fillTemplate(template.body, {
        orderNumber: order.orderNumber,
        buyerName: order.buyerName
      }),
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

  async approveAndSend(runId: string, channel: "integration-message" | "email" | "manual") {
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
