import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SECURE_PREFIX = "product-fulfillment:secure:";

function getWebKey(key: string) {
  return `${SECURE_PREFIX}${key}`;
}

export async function isSecureStoreBacked() {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function getSecureJson<T>(key: string): Promise<T | null> {
  const raw = await getSecureItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setSecureJson(key: string, value: unknown) {
  await setSecureItem(key, JSON.stringify(value));
}

export async function deleteSecureItem(key: string) {
  if (await isSecureStoreBacked()) {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(getWebKey(key));
  }
}

async function getSecureItem(key: string) {
  if (await isSecureStoreBacked()) {
    return SecureStore.getItemAsync(key);
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(getWebKey(key));
}

async function setSecureItem(key: string, value: string) {
  if (await isSecureStoreBacked()) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(getWebKey(key), value);
  }
}
