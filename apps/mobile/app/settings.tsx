import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { AppNav } from "../src/components/AppNav";
import type { IntegrationConnection, IntegrationDefinition } from "../src/services/interfaces";
import { useAppTheme } from "../src/providers/AppearanceProvider";
import { useServices } from "../src/providers/AppProviders";
import { spacing, type AccentColor, type AppTheme } from "../src/theme";

type DraftModes = Record<string, "mock" | "live">;
type DraftValues = Record<string, Record<string, string>>;
type DraftNames = Record<string, string>;
const FALLBACK_INTEGRATION_CATALOG: IntegrationDefinition[] = [
  {
    integrationKey: "etsy",
    integrationName: "Etsy",
    description: "Primary V1 integration. Supports mock mode now and live API credentials later.",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        placeholder: "Enter Etsy API key",
        secret: true
      },
      {
        key: "shopId",
        label: "Shop ID",
        placeholder: "Enter Etsy shop ID",
        secret: false
      }
    ]
  },
  {
    integrationKey: "squarespace",
    integrationName: "Squarespace",
    description: "Follow-up integration for pulling order data into the same local workflow.",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        placeholder: "Enter Squarespace API key",
        secret: true
      },
      {
        key: "siteId",
        label: "Site ID",
        placeholder: "Enter Squarespace site ID",
        secret: false
      }
    ]
  }
];
const ACCENT_WHEEL: AccentColor[] = [
  "#ff5a5f",
  "#ff7a45",
  "#ff9f1c",
  "#ffbf00",
  "#d4c200",
  "#99c24d",
  "#52b788",
  "#2a9d8f",
  "#00a6fb",
  "#4d84cb",
  "#5e60ce",
  "#7b61ff",
  "#9d4edd",
  "#cb6987",
  "#d65db1",
  "#f15bb5"
];

function buildDraftValues(connections: IntegrationConnection[]) {
  return Object.fromEntries(
    connections.map((connection) => [
      connection.connectionId,
      Object.fromEntries(connection.fields.map((field) => [field.key, ""]))
    ])
  ) as DraftValues;
}

function normalizeHexColor(value: string) {
  const cleaned = value.trim().replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
  if (cleaned.length === 3) {
    return `#${cleaned
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toUpperCase()}`;
  }
  return `#${cleaned.padEnd(6, "0").toUpperCase()}`;
}

function clampUnit(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex).slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) =>
      Math.round(Math.min(Math.max(value, 0), 255))
        .toString(16)
        .padStart(2, "0")
    )
    .join("")
    .toUpperCase()}`;
}

function hexToHsv(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
  }

  return {
    h: ((hue * 60 + 360) % 360) / 360,
    s: max === 0 ? 0 : delta / max,
    v: max
  };
}

function hsvToHex(h: number, s: number, v: number) {
  const hue = ((h % 1) + 1) % 1;
  const sector = Math.floor(hue * 6);
  const fraction = hue * 6 - sector;
  const p = v * (1 - s);
  const q = v * (1 - fraction * s);
  const t = v * (1 - (1 - fraction) * s);
  const palette = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q]
  ][sector % 6];

  return rgbToHex(palette[0] * 255, palette[1] * 255, palette[2] * 255);
}

export default function SettingsScreen() {
  const {
    accentColor,
    mode,
    setAccentColor,
    setMode,
    theme: { colors }
  } = useAppTheme();
  const styles = createStyles(colors);
  const { integrationAuthService, orderSyncService } = useServices();
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [catalog, setCatalog] = useState<IntegrationDefinition[]>([]);
  const [draftModes, setDraftModes] = useState<DraftModes>({});
  const [draftNames, setDraftNames] = useState<DraftNames>({});
  const [draftValues, setDraftValues] = useState<DraftValues>({});
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddIntegrationModalOpen, setIsAddIntegrationModalOpen] = useState(false);
  const [selectedIntegrationKey, setSelectedIntegrationKey] = useState<string | null>(null);
  const [isAccentModalOpen, setIsAccentModalOpen] = useState(false);
  const [pendingAccentColor, setPendingAccentColor] = useState<AccentColor>(accentColor);
  const [pickerHue, setPickerHue] = useState(0);
  const [pickerSaturation, setPickerSaturation] = useState(1);
  const [pickerValue, setPickerValue] = useState(1);
  const colorAreaRef = useRef<HTMLDivElement | null>(null);
  const hueSliderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPendingAccentColor(accentColor);
  }, [accentColor]);

  useEffect(() => {
    if (!isAccentModalOpen) {
      return;
    }

    const next = hexToHsv(pendingAccentColor);
    setPickerHue(next.h);
    setPickerSaturation(next.s);
    setPickerValue(next.v);
  }, [isAccentModalOpen]);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setIsLoading(true);
    setError(null);

    try {
      const nextConnections = await integrationAuthService.listConnections();
      const nextCatalog =
        typeof integrationAuthService.listIntegrationCatalog === "function"
          ? await integrationAuthService.listIntegrationCatalog()
          : FALLBACK_INTEGRATION_CATALOG;
      setCatalog(nextCatalog);
      setConnections(nextConnections);
      setDraftModes(
        Object.fromEntries(
          nextConnections.map((connection) => [connection.connectionId, connection.mode])
        ) as DraftModes
      );
      setDraftNames(
        Object.fromEntries(
          nextConnections.map((connection) => [connection.connectionId, connection.connectionName])
        ) as DraftNames
      );
      setDraftValues(buildDraftValues(nextConnections));
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function updateField(integrationKey: string, fieldKey: string, value: string) {
    setDraftValues((current) => ({
      ...current,
      [integrationKey]: {
        ...current[integrationKey],
        [fieldKey]: value
      }
    }));
  }

  function updateConnectionName(connectionId: string, value: string) {
    setDraftNames((current) => ({
      ...current,
      [connectionId]: value
    }));
  }

  function openAddIntegration() {
    setSelectedIntegrationKey(null);
    setIsAddIntegrationModalOpen(true);
  }

  async function saveConnection(integrationKey: string) {
    const connection = connections.find((entry) => entry.connectionId === integrationKey);
    if (!connection) {
      return;
    }

    setBusyKey(integrationKey);
    setError(null);

    try {
      await integrationAuthService.saveCredentials({
        connectionId: connection.connectionId,
        connectionName:
          draftNames[connection.connectionId] ?? connection.connectionName,
        integrationKey: connection.integrationKey,
        mode: draftModes[connection.connectionId] ?? "mock",
        values: draftValues[connection.connectionId] ?? {}
      });
      await orderSyncService.syncOrders(connection.connectionId);
      await refresh();
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setBusyKey(null);
    }
  }

  async function completeIntegrationSetup() {
    if (!selectedIntegrationKey) {
      return;
    }

    const setupKey = `new:${selectedIntegrationKey}`;
    setBusyKey(setupKey);
    setError(null);

    try {
      const connection = await integrationAuthService.saveCredentials({
        connectionName: draftNames[setupKey] ?? "",
        integrationKey: selectedIntegrationKey,
        mode: draftModes[setupKey] ?? "mock",
        values: draftValues[setupKey] ?? {}
      });
      await orderSyncService.syncOrders(connection.connectionId);
      await refresh();
      setIsAddIntegrationModalOpen(false);
      setSelectedIntegrationKey(null);
      setDraftModes((current) => {
        const next = { ...current };
        delete next[setupKey];
        return next;
      });
      setDraftNames((current) => {
        const next = { ...current };
        delete next[setupKey];
        return next;
      });
      setDraftValues((current) => {
        const next = { ...current };
        delete next[setupKey];
        return next;
      });
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setBusyKey(null);
    }
  }

  async function removeConnection(connectionId: string) {
    setBusyKey(connectionId);
    setError(null);

    try {
      await integrationAuthService.removeCredentials(connectionId);
      await orderSyncService.syncOrders();
      await refresh();
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setBusyKey(null);
    }
  }

  async function syncConnection(connectionId: string) {
    setBusyKey(connectionId);
    setError(null);

    try {
      await orderSyncService.syncOrders(connectionId);
      await refresh();
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setBusyKey(null);
    }
  }

  async function applyAccentColor() {
    await setAccentColor(normalizeHexColor(pendingAccentColor));
    setIsAccentModalOpen(false);
  }

  function updatePickerColor(hue: number, saturation: number, value: number) {
    const nextHue = clampUnit(hue);
    const nextSaturation = clampUnit(saturation);
    const nextValue = clampUnit(value);
    setPickerHue(nextHue);
    setPickerSaturation(nextSaturation);
    setPickerValue(nextValue);
    setPendingAccentColor(hsvToHex(nextHue, nextSaturation, nextValue));
  }

  function startDrag(
    onMove: (clientX: number, clientY: number) => void,
    clientX: number,
    clientY: number
  ) {
    onMove(clientX, clientY);

    if (Platform.OS !== "web") {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => onMove(event.clientX, event.clientY);
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function updateFromColorArea(clientX: number, clientY: number) {
    if (!colorAreaRef.current) {
      return;
    }

    const rect = colorAreaRef.current.getBoundingClientRect();
    const saturation = clampUnit((clientX - rect.left) / rect.width);
    const value = clampUnit(1 - (clientY - rect.top) / rect.height);
    updatePickerColor(pickerHue, saturation, value);
  }

  function updateFromHueSlider(clientX: number) {
    if (!hueSliderRef.current) {
      return;
    }

    const rect = hueSliderRef.current.getBoundingClientRect();
    const hue = clampUnit((clientX - rect.left) / rect.width);
    updatePickerColor(hue, pickerSaturation, pickerValue);
  }

  const configuredConnections = connections;
  const selectedIntegration =
    catalog.find((connection) => connection.integrationKey === selectedIntegrationKey) ?? null;

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <AppNav title="User" active="user" />

      <View style={styles.heroCard}>
        <View style={styles.versionPill}>
          <Text style={styles.versionText}>Version 0.1.0</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Appearance</Text>

        <View style={styles.modeRow}>
          <Pressable
            onPress={() => void setMode("light")}
            style={[styles.modeButton, mode === "light" ? styles.modeButtonActive : null]}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === "light" ? styles.modeButtonTextActive : null
              ]}
            >
              Light
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void setMode("dark")}
            style={[styles.modeButton, mode === "dark" ? styles.modeButtonActive : null]}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === "dark" ? styles.modeButtonTextActive : null
              ]}
            >
              Dark
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setIsAccentModalOpen(true)}
            style={[styles.accentPreviewCard, styles.modeAccentButton]}
          >
            <View style={styles.accentPreviewHeader}>
              <Text style={styles.accentPreviewLabel}>Accent Color</Text>
              <Text style={styles.accentPreviewValue}>Customize</Text>
            </View>
            <View style={styles.accentPreviewBar}>
              <View style={styles.accentPreviewBarPrimary} />
              <View style={styles.accentPreviewBarAccent} />
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.cardTitle}>Integrations</Text>
        </View>
        <Pressable onPress={openAddIntegration} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Add Integration</Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isAddIntegrationModalOpen}
        onRequestClose={() => {
          setIsAddIntegrationModalOpen(false);
          setSelectedIntegrationKey(null);
        }}
      >
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.cardTitle}>
                {selectedIntegration ? selectedIntegration.integrationName : "Add Integration"}
              </Text>
              <Pressable
                onPress={() => {
                  setIsAddIntegrationModalOpen(false);
                  setSelectedIntegrationKey(null);
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>

            {!selectedIntegration ? (
              catalog.map((connection) => (
                  <Pressable
                    key={connection.integrationKey}
                    onPress={() => setSelectedIntegrationKey(connection.integrationKey)}
                    style={styles.integrationChoiceCard}
                  >
                    <Text style={styles.integrationChoiceTitle}>{connection.integrationName}</Text>
                  </Pressable>
                ))
            ) : (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Connection Name</Text>
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={(value) =>
                      setDraftNames((current) => ({
                        ...current,
                        [`new:${selectedIntegration.integrationKey}`]: value
                      }))
                    }
                    placeholder={`${selectedIntegration.integrationName} Store`}
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={draftNames[`new:${selectedIntegration.integrationKey}`] ?? ""}
                  />
                </View>

                <View style={styles.modeRow}>
                  <Pressable
                    onPress={() =>
                      setDraftModes((current) => ({
                        ...current,
                        [`new:${selectedIntegration.integrationKey}`]: "mock"
                      }))
                    }
                    style={[
                      styles.modeButton,
                      (draftModes[`new:${selectedIntegration.integrationKey}`] ?? "mock") === "mock"
                        ? styles.modeButtonActive
                        : null
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        (draftModes[`new:${selectedIntegration.integrationKey}`] ?? "mock") === "mock"
                          ? styles.modeButtonTextActive
                          : null
                      ]}
                    >
                      Mock Mode
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      setDraftModes((current) => ({
                        ...current,
                        [`new:${selectedIntegration.integrationKey}`]: "live"
                      }))
                    }
                    style={[
                      styles.modeButton,
                      (draftModes[`new:${selectedIntegration.integrationKey}`] ?? "mock") === "live"
                        ? styles.modeButtonActive
                        : null
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        (draftModes[`new:${selectedIntegration.integrationKey}`] ?? "mock") === "live"
                          ? styles.modeButtonTextActive
                          : null
                      ]}
                    >
                      Live Mode
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.modeNotice}>
                  <Text style={styles.modeNoticeTitle}>
                    {(draftModes[`new:${selectedIntegration.integrationKey}`] ?? "mock") === "mock"
                      ? "Mock mode setup"
                      : "Live mode setup"}
                  </Text>
                </View>

                {selectedIntegration.fields.map((field) => (
                  <View key={field.key} style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={(value) =>
                        updateField(`new:${selectedIntegration.integrationKey}`, field.key, value)
                      }
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.muted}
                      secureTextEntry={field.secret}
                      style={styles.input}
                      value={draftValues[`new:${selectedIntegration.integrationKey}`]?.[field.key] ?? ""}
                    />
                  </View>
                ))}

                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => setSelectedIntegrationKey(null)}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>Back</Text>
                  </Pressable>
                  <Pressable
                    disabled={busyKey === `new:${selectedIntegration.integrationKey}`}
                    onPress={() => void completeIntegrationSetup()}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryButtonText}>
                      {busyKey === `new:${selectedIntegration.integrationKey}`
                        ? "Saving..."
                        : "Add Integration"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={isAccentModalOpen}
        onRequestClose={() => setIsAccentModalOpen(false)}
      >
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.cardTitle}>Accent Color</Text>
              <Pressable onPress={() => setIsAccentModalOpen(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>
            <Text style={styles.cardBody}>
              Choose an accent from the color wheel and apply it to the interface.
            </Text>

            {Platform.OS === "web" ? (
              <View style={styles.webWheelSection}>
                <div
                  style={{
                    background: `linear-gradient(to top, black, transparent), linear-gradient(to right, white, hsl(${pickerHue * 360}deg 100% 50%))`,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "18px",
                    display: "flex",
                    height: "220px",
                    position: "relative",
                    width: "100%"
                  }}
                  ref={colorAreaRef}
                  onMouseDown={(event) =>
                    startDrag(updateFromColorArea, event.clientX, event.clientY)
                  }
                >
                  <div
                    style={{
                      border: `2px solid ${colors.surfaceRaised}`,
                      borderRadius: "999px",
                      boxShadow: `0 0 0 1px ${colors.text}`,
                      height: "18px",
                      left: `calc(${pickerSaturation * 100}% - 9px)`,
                      position: "relative",
                      top: `calc(${(1 - pickerValue) * 100}% - 9px)`,
                      width: "18px"
                    }}
                  />
                </div>

                <div
                  style={{
                    background:
                      "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                    border: `1px solid ${colors.border}`,
                    borderRadius: "999px",
                    height: "18px",
                    position: "relative",
                    width: "100%"
                  }}
                  ref={hueSliderRef}
                  onMouseDown={(event) =>
                    startDrag(
                      (clientX) => updateFromHueSlider(clientX),
                      event.clientX,
                      event.clientY
                    )
                  }
                >
                  <div
                    style={{
                      background: colors.surfaceRaised,
                      border: `2px solid ${colors.text}`,
                      borderRadius: "999px",
                      boxShadow: `0 0 0 1px ${colors.surfaceRaised}`,
                      height: "22px",
                      left: `calc(${pickerHue * 100}% - 11px)`,
                        position: "absolute",
                      top: "-3px",
                      width: "22px"
                    }}
                  />
                </div>

                <View style={styles.webPickerMetaRow}>
                  <View
                    style={[
                      styles.webPickerPreview,
                      { backgroundColor: normalizeHexColor(pendingAccentColor) }
                    ]}
                  />
                  <Text style={styles.metaText}>{normalizeHexColor(pendingAccentColor)}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.colorWheel}>
                {ACCENT_WHEEL.map((value, index) => {
                  const angle = (Math.PI * 2 * index) / ACCENT_WHEEL.length - Math.PI / 2;
                  const radius = 104;
                  const itemSize = 34;
                  const left = 120 + Math.cos(angle) * radius - itemSize / 2;
                  const top = 120 + Math.sin(angle) * radius - itemSize / 2;
                  const isSelected =
                    normalizeHexColor(pendingAccentColor).toLowerCase() === value.toLowerCase();

                  return (
                    <Pressable
                      key={value}
                      onPress={() => setPendingAccentColor(value)}
                      style={[
                        styles.wheelColorButton,
                        {
                          backgroundColor: value,
                          left,
                          top
                        },
                        isSelected ? styles.wheelColorButtonSelected : null
                      ]}
                    >
                      {isSelected ? <View style={styles.wheelColorInnerRing} /> : null}
                    </Pressable>
                  );
                })}
                <View style={styles.wheelCenter}>
                  <Text style={styles.wheelCenterLabel}>Preview</Text>
                  <View
                    style={[
                      styles.wheelCenterSwatch,
                      { backgroundColor: normalizeHexColor(pendingAccentColor) }
                    ]}
                  />
                  <Text style={styles.wheelCenterValue}>
                    {normalizeHexColor(pendingAccentColor)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Hex Color</Text>
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={(value) => setPendingAccentColor(normalizeHexColor(value))}
                placeholder="#C56F2A"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={normalizeHexColor(pendingAccentColor)}
              />
            </View>

            <View style={styles.modalActionRow}>
              <Pressable
                onPress={() => {
                  setPendingAccentColor(normalizeHexColor(accentColor));
                  setIsAccentModalOpen(false);
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void applyAccentColor()} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Apply Accent</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.card}>
          <Text style={styles.cardBody}>Loading integrations...</Text>
        </View>
      ) : configuredConnections.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>No integrations added yet</Text>
          <Text style={styles.cardBody}>
            Start with mock mode if you want to test the workflow before entering live API credentials.
          </Text>
          <Pressable onPress={openAddIntegration} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Add Your First Integration</Text>
          </Pressable>
        </View>
      ) : (
        configuredConnections.map((connection) => {
          const activeMode = draftModes[connection.connectionId] ?? connection.mode;
          const isBusy = busyKey === connection.connectionId;

          return (
            <View key={connection.connectionId} style={styles.card}>
              <View style={styles.fieldGroup}>
                <Text style={styles.integrationTypeText}>
                  Integration Type: {connection.integrationName}
                </Text>
                <View style={styles.inlineFieldRow}>
                  <Text style={styles.fieldLabel}>Connection Name</Text>
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={(value) => updateConnectionName(connection.connectionId, value)}
                    placeholder={`${connection.integrationName} Store`}
                    placeholderTextColor={colors.muted}
                    style={styles.inlineInput}
                    value={draftNames[connection.connectionId] ?? connection.connectionName}
                  />
                </View>
              </View>

              <View style={styles.metricsGrid}>
                <View style={[styles.metricTile, styles.metricTileMode]}>
                  <Text style={styles.metricLabel}>Mode</Text>
                  <Text style={[styles.metricValue, styles.metricValueMode]}>{activeMode}</Text>
                </View>
                <View style={styles.metricTile}>
                  <Text style={styles.metricLabel}>Orders</Text>
                  <Text style={styles.metricValue}>{connection.syncedOrderCount}</Text>
                </View>
                <View style={styles.metricTile}>
                  <Text style={styles.metricLabel}>Stored</Text>
                  <Text style={styles.metricValue}>
                    {connection.hasStoredCredentials ? "Yes" : "No"}
                  </Text>
                </View>
              </View>

              <Text style={styles.metaText}>
                Storage:{" "}
                {connection.usesSecureStorage
                  ? "Secure device storage"
                  : "Browser local storage fallback"}
              </Text>
              <Text style={styles.metaText}>
                Last saved: {connection.connectedAt ?? "No saved configuration"}
              </Text>
              <Text style={styles.metaText}>
                Last sync: {connection.lastSyncedAt ?? "No sync yet"}
              </Text>

              <View style={styles.modeRow}>
                <Pressable
                  onPress={() =>
                    setDraftModes((current) => ({
                      ...current,
                      [connection.connectionId]: "mock"
                    }))
                  }
                  style={[
                    styles.modeButton,
                    activeMode === "mock" ? styles.modeButtonActive : null
                  ]}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      activeMode === "mock" ? styles.modeButtonTextActive : null
                    ]}
                  >
                    Mock Mode
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setDraftModes((current) => ({
                      ...current,
                      [connection.connectionId]: "live"
                    }))
                  }
                  style={[
                    styles.modeButton,
                    activeMode === "live" ? styles.modeButtonActive : null
                  ]}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      activeMode === "live" ? styles.modeButtonTextActive : null
                    ]}
                  >
                    Live Mode
                  </Text>
                </Pressable>
              </View>

              {connection.fields.map((field) => (
                <View key={field.key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    autoCapitalize="none"
                    onChangeText={(value) =>
                      updateField(connection.connectionId, field.key, value)
                    }
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.muted}
                    secureTextEntry={field.secret}
                    style={styles.input}
                    value={draftValues[connection.connectionId]?.[field.key] ?? ""}
                  />
                </View>
              ))}

              <View style={styles.actionRow}>
                <Pressable
                  disabled={isBusy}
                  onPress={() => syncConnection(connection.connectionId)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>
                    {isBusy ? "Working..." : "Sync Orders"}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={isBusy}
                  onPress={() => saveConnection(connection.connectionId)}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>
                    {isBusy ? "Saving..." : "Save Configuration"}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={isBusy}
                  onPress={() => removeConnection(connection.connectionId)}
                  style={styles.ghostButton}
                >
                  <Text style={styles.ghostButtonText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function createStyles(colors: AppTheme["colors"]) {
return StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    gap: spacing.lg,
    padding: spacing.xl
  },
  heroCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 30,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  sectionHeaderText: {
    flex: 1,
    gap: spacing.xs
  },
  versionPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.background,
    borderColor: colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  versionText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36
  },
  body: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  legendPill: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  legendPillAccent: {
    backgroundColor: colors.accentSoft
  },
  legendText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  infoCard: {
    backgroundColor: "#eef6ef",
    borderColor: "#bfd6c4",
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg
  },
  infoTitle: {
    color: colors.success,
    fontSize: 16,
    fontWeight: "700"
  },
  infoText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22
  },
  errorCard: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.md
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  },
  emptyStateCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl
  },
  emptyStateTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700"
  },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  cardHeader: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  cardHeaderText: {
    flex: 1,
    gap: spacing.xs
  },
  cardTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "700"
  },
  cardBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  statusPillConfigured: {
    backgroundColor: "#dff1e4"
  },
  statusPillIdle: {
    backgroundColor: colors.accentSoft
  },
  statusPillText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700"
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metricTile: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 90,
    padding: spacing.md
  },
  metricTileMode: {
    flexGrow: 0,
    width: 120
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  metricValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    textTransform: "capitalize"
  },
  metricValueMode: {
    minWidth: 52
  },
  metaText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  modeAccentButton: {
    flex: 1,
    minWidth: 180
  },
  accentPreviewCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  accentPreviewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  accentPreviewLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  accentPreviewValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700"
  },
  accentPreviewBar: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden"
  },
  accentPreviewBarPrimary: {
    backgroundColor: colors.primary,
    flex: 2,
    height: 14
  },
  accentPreviewBarAccent: {
    backgroundColor: colors.accent,
    flex: 3,
    height: 14
  },
  modalScrim: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg
  },
  modalCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderStrong,
    borderRadius: 28,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 420,
    padding: spacing.xl,
    width: "100%"
  },
  integrationChoiceCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  integrationChoiceTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  closeButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  closeButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700"
  },
  colorWheel: {
    alignItems: "center",
    height: 240,
    justifyContent: "center",
    position: "relative"
  },
  wheelColorButton: {
    alignItems: "center",
    borderColor: colors.surfaceRaised,
    borderRadius: 999,
    borderWidth: 2,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    width: 34
  },
  wheelColorButtonSelected: {
    borderColor: colors.text,
    borderWidth: 3
  },
  wheelColorInnerRing: {
    borderColor: colors.surfaceRaised,
    borderRadius: 999,
    borderWidth: 2,
    height: 20,
    width: 20
  },
  wheelCenter: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    gap: spacing.xs,
    height: 120,
    justifyContent: "center",
    width: 120
  },
  webWheelSection: {
    alignItems: "stretch",
    gap: spacing.md
  },
  webPickerMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  webPickerPreview: {
    borderRadius: 999,
    height: 28,
    width: 28
  },
  wheelCenterLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  wheelCenterSwatch: {
    borderRadius: 999,
    height: 34,
    width: 34
  },
  wheelCenterValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700"
  },
  modalActionRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  accentSwatchGreen: {
    backgroundColor: "#2f8e6b"
  },
  accentSwatchAmber: {
    backgroundColor: "#c56f2a"
  },
  accentSwatchBlue: {
    backgroundColor: "#4d84cb"
  },
  accentSwatchRose: {
    backgroundColor: "#cb6987"
  },
  modeButton: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minWidth: 116,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  modeButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center"
  },
  modeButtonTextActive: {
    color: colors.surfaceRaised
  },
  modeNotice: {
    backgroundColor: colors.backgroundAccent,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  modeNoticeTitle: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "700"
  },
  modeNoticeText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20
  },
  fieldGroup: {
    gap: spacing.xs
  },
  fieldHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  integrationTypeText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  inlineFieldRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700"
  },
  fieldMetaText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  inlineInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  primaryButtonText: {
    color: colors.surfaceRaised,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center"
  },
  secondaryButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700"
  },
  ghostButton: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#f0c3bf",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  ghostButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "700"
  }
});
}
