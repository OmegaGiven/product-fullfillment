import type { ImportedOrder, MessageTemplate } from "../../domain";

export const seededOrders: ImportedOrder[] = [
  {
    id: "order_etsy_1001",
    integrationKey: "etsy",
    integrationName: "Etsy",
    orderNumber: "ETSY-1001",
    buyerName: "Avery Stone",
    buyerEmail: "avery@example.com",
    shippingAddress: {
      name: "Avery Stone",
      address1: "145 Market Street",
      address2: "Suite 9",
      city: "Savannah",
      state: "GA",
      postalCode: "31401",
      phone: "9125550133"
    },
    availableChannels: ["integration-message", "email"],
    createdAt: "2026-04-17T10:00:00.000Z"
  },
  {
    id: "order_squarespace_2001",
    integrationKey: "squarespace",
    integrationName: "Squarespace",
    orderNumber: "SQSP-2001",
    buyerName: "Mara Lopez",
    buyerEmail: "mara@example.com",
    shippingAddress: {
      name: "Mara Lopez",
      address1: "88 River Road",
      address2: "",
      city: "Austin",
      state: "TX",
      postalCode: "78702",
      phone: "5125550178"
    },
    availableChannels: ["email"],
    createdAt: "2026-04-17T10:00:00.000Z"
  }
];

export function getSeededOrdersForIntegration(integrationKey: string) {
  return seededOrders.filter((order) => order.integrationKey === integrationKey);
}

export const seededTemplates: MessageTemplate[] = [
  {
    id: "template_default",
    name: "Default Shipment Confirmation",
    subject: "Your order {{orderNumber}} is packed",
    body:
      "Hi {{buyerName}},\n\nYour order {{orderNumber}} has been packed. We attached product and label photos for confirmation.\n\nThanks for shopping with us."
  }
];
