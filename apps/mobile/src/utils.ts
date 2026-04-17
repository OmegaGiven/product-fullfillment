export function createLocalRecordId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export const LOCAL_DEVICE_USER_ID = "local-device-user";

export function nowIso() {
  return new Date().toISOString();
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function appendTouchedByUser(users: string[] | null | undefined, userId: string) {
  const normalizedUsers = Array.isArray(users)
    ? users.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  return normalizedUsers.includes(userId) ? normalizedUsers : [...normalizedUsers, userId];
}
