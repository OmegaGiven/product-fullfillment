import type { ImportedOrder, MessageTemplate } from "../domain";

function fillTemplate(templateBody: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (body, [key, value]) => body.split(`{{${key}}}`).join(value),
    templateBody
  );
}

export function buildMessageTemplateValues(order: ImportedOrder) {
  return {
    buyerEmail: order.buyerEmail ?? "",
    buyerName: order.buyerName,
    orderNumber: order.orderNumber,
    platformName: order.integrationName,
    storeName: order.integrationConnectionName ?? order.integrationName
  };
}

export function renderMessageTemplate(template: MessageTemplate, order: ImportedOrder) {
  const values = buildMessageTemplateValues(order);

  return {
    body: fillTemplate(template.body, values),
    subject: fillTemplate(template.subject, values)
  };
}
