import type { ImportedOrder, MatchCandidate, RunId, WorkflowRunState } from "../../domain";
import type { MatchService } from "../interfaces";
import { nowIso } from "../../utils";

import type { LocalStorageService } from "./localStorageService";

function scoreCandidate(
  label: WorkflowRunState["ocrExtraction"],
  order: ImportedOrder
): MatchCandidate {
  const reasons: string[] = [];
  let confidence = 0.15;

  if (!label) {
    return { orderId: order.id, confidence, reasons: ["No OCR extraction available."] };
  }

  if (label.recipient.name && label.recipient.name.toLowerCase() === order.shippingAddress.name.toLowerCase()) {
    confidence += 0.35;
    reasons.push("Recipient name matches.");
  }

  if (label.recipient.postalCode === order.shippingAddress.postalCode) {
    confidence += 0.25;
    reasons.push("Postal code matches.");
  }

  if (label.recipient.address1 && label.recipient.address1.toLowerCase() === order.shippingAddress.address1.toLowerCase()) {
    confidence += 0.2;
    reasons.push("Street address matches.");
  }

  if (label.recipient.phone && label.recipient.phone === order.shippingAddress.phone) {
    confidence += 0.1;
    reasons.push("Phone matches.");
  }

  return { orderId: order.id, confidence, reasons };
}

export class LocalMatchService implements MatchService {
  constructor(private storageService: LocalStorageService) {}

  async findMatchCandidates(runId: RunId) {
    const state = await this.storageService.getRunState(runId);
    if (!state) {
      throw new Error("Fulfillment run not found.");
    }

    const orders = await this.storageService.listOrders();
    const candidates = orders
      .map((order) => scoreCandidate(state.ocrExtraction, order))
      .sort((a, b) => b.confidence - a.confidence);

    await this.storageService.saveRunState({
      ...state,
      candidates
    });

    return candidates;
  }

  async confirmMatchedOrder(runId: RunId, orderId: string) {
    const state = await this.storageService.getRunState(runId);
    if (!state) {
      throw new Error("Fulfillment run not found.");
    }

    const nextState = {
      ...state,
      run: {
        ...state.run,
        matchedOrderId: orderId,
        updatedAt: nowIso()
      }
    };

    await this.storageService.saveRunState(nextState);
    return nextState;
  }
}
