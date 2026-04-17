import fs from "node:fs";
import path from "node:path";

const ORDER_NAMESPACE_KEY = "product-fulfillment:orders";
const DEFAULT_COUNT = 24;
const DEFAULT_START_ID = 500001;

const firstNames = [
  "Avery",
  "Mara",
  "Jordan",
  "Casey",
  "Riley",
  "Taylor",
  "Morgan",
  "Drew",
  "Parker",
  "Sydney"
];

const lastNames = [
  "Stone",
  "Lopez",
  "Nguyen",
  "Patel",
  "Foster",
  "Brooks",
  "Rivera",
  "Price",
  "Coleman",
  "Diaz"
];

const streets = [
  "Maple Street",
  "River Road",
  "Cedar Avenue",
  "Elm Drive",
  "Oak Lane",
  "Highland Way",
  "Market Street",
  "Broad Street"
];

const cities = [
  { city: "Savannah", state: "GA", postalBase: "314" },
  { city: "Austin", state: "TX", postalBase: "787" },
  { city: "Nashville", state: "TN", postalBase: "372" },
  { city: "Boise", state: "ID", postalBase: "837" },
  { city: "Madison", state: "WI", postalBase: "537" },
  { city: "Phoenix", state: "AZ", postalBase: "850" }
];

const integrations = [
  {
    integrationKey: "etsy",
    integrationName: "Etsy",
    integrationConnectionId: 9101,
    integrationConnectionName: "Etsy Main Shop",
    channels: ["integration-message", "email"]
  },
  {
    integrationKey: "squarespace",
    integrationName: "Squarespace",
    integrationConnectionId: 9201,
    integrationConnectionName: "Squarespace Store",
    channels: ["email"]
  }
];

function parseArgs(argv) {
  const options = {
    count: DEFAULT_COUNT,
    startId: DEFAULT_START_ID,
    mode: "replace",
    outFile: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (/^\d+$/.test(arg) && index === 0) {
      options.count = Number(arg);
      continue;
    }

    if (arg === "--count") {
      options.count = Number(argv[index + 1] ?? DEFAULT_COUNT);
      index += 1;
      continue;
    }

    if (arg === "--start-id") {
      options.startId = Number(argv[index + 1] ?? DEFAULT_START_ID);
      index += 1;
      continue;
    }

    if (arg === "--mode") {
      const nextMode = argv[index + 1] ?? "replace";
      options.mode = nextMode === "append" ? "append" : "replace";
      index += 1;
      continue;
    }

    if (arg === "--out") {
      options.outFile = argv[index + 1] ?? null;
      index += 1;
    }
  }

  if (!Number.isInteger(options.count) || options.count <= 0) {
    throw new Error("`count` must be a positive integer.");
  }

  if (!Number.isInteger(options.startId) || options.startId <= 0) {
    throw new Error("`start-id` must be a positive integer.");
  }

  return options;
}

function buildOrder(index, startId) {
  const orderId = startId + index;
  const integration = integrations[index % integrations.length];
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[(index * 3) % lastNames.length];
  const location = cities[index % cities.length];
  const streetNumber = 100 + index * 7;
  const street = streets[index % streets.length];
  const createdAt = new Date(Date.UTC(2026, 3, 1 + (index % 20), 12, index % 60, 0)).toISOString();
  const buyerName = `${firstName} ${lastName}`;
  const orderNumberPrefix = integration.integrationKey === "etsy" ? "ETSY" : "SQSP";

  return {
    id: orderId,
    externalOrderId: `${integration.integrationKey}_external_${orderId}`,
    integrationConnectionId: integration.integrationConnectionId,
    integrationConnectionName: integration.integrationConnectionName,
    integrationKey: integration.integrationKey,
    integrationName: integration.integrationName,
    orderNumber: `${orderNumberPrefix}-${orderId}`,
    buyerName,
    buyerEmail: `${firstName}.${lastName}${orderId}@example.com`.toLowerCase(),
    shippingAddress: {
      name: buyerName,
      address1: `${streetNumber} ${street}`,
      address2: index % 4 === 0 ? `Unit ${index + 1}` : "",
      city: location.city,
      state: location.state,
      postalCode: `${location.postalBase}${String(10 + (index % 89)).padStart(2, "0")}`,
      phone: `55501${String(1000 + index).slice(-4)}`
    },
    availableChannels: integration.channels,
    createdAt
  };
}

function buildStoredRecords(orders) {
  return orders.map((order, index) => ({
    id: String(order.id),
    payload: JSON.stringify(order),
    updatedAt: Date.now() + index
  }));
}

function buildSnippet(records, mode) {
  const serializedRecords = JSON.stringify(records);

  return `(() => {
  const storageKey = ${JSON.stringify(ORDER_NAMESPACE_KEY)};
  const nextRecords = ${serializedRecords};
  const mode = ${JSON.stringify(mode)};
  const existing = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
  const incomingIds = new Set(nextRecords.map((record) => record.id));
  const merged =
    mode === "append"
      ? [...existing.filter((record) => !incomingIds.has(record.id)), ...nextRecords]
      : nextRecords;

  window.localStorage.setItem(storageKey, JSON.stringify(merged));
  console.log(
    "[product-fulfillment] seeded orders:",
    nextRecords.length,
    "| mode:",
    mode,
    "| total stored:",
    merged.length
  );
})();`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const orders = Array.from({ length: options.count }, (_, index) =>
    buildOrder(index, options.startId)
  );
  const snippet = buildSnippet(buildStoredRecords(orders), options.mode);

  if (options.outFile) {
    const outputPath = path.resolve(process.cwd(), options.outFile);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, snippet);
    console.error(`Wrote browser seed snippet to ${outputPath}`);
    return;
  }

  process.stdout.write(`${snippet}\n`);
}

main();
