type LogPhase = "request" | "response" | "error";

function redactValue(key: string, value: unknown): unknown {
  const lowerKey = key.toLowerCase();
  if (
    lowerKey.includes("secret") ||
    lowerKey.includes("token") ||
    lowerKey.includes("keystring") ||
    lowerKey.includes("apikey") ||
    lowerKey.includes("authorization") ||
    lowerKey.includes("codeverifier")
  ) {
    return typeof value === "string" && value.length > 0 ? "[redacted]" : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      item && typeof item === "object" ? sanitizePayload(item as Record<string, unknown>) : item
    );
  }

  if (value && typeof value === "object") {
    return sanitizePayload(value as Record<string, unknown>);
  }

  return value;
}

export function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, redactValue(key, value)])
  );
}

export function logApiEvent(
  scope: string,
  action: string,
  phase: LogPhase,
  payload?: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  const label = `[api:${scope}] ${timestamp} ${action} ${phase.toUpperCase()}`;

  if (!payload) {
    console.log(label);
    return;
  }

  console.log(label, sanitizePayload(payload));
}
