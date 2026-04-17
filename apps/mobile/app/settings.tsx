import { useRef, useState } from "react";
import { useRouter } from "expo-router";
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
import {
  NAV_KEYS,
  NAV_PAGE_LABELS,
  type NavKey,
  type PageAccessLevel
} from "../src/accessControl/accessControl";
import { useAccessControl } from "../src/providers/AccessControlProvider";
import { useAppTheme } from "../src/providers/AppearanceProvider";
import { useToast } from "../src/providers/ToastProvider";
import type { AccentColor, AppTheme } from "../src/theme";

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

const MIN_RADIUS_SCALE = 0;
const MIN_SPACING_SCALE = 0.1;
const MAX_APPEARANCE_SCALE = 1.5;
const APPEARANCE_SCALE_STEP = 0.1;

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

function clampRadiusScale(value: number) {
  return Math.min(Math.max(value, MIN_RADIUS_SCALE), MAX_APPEARANCE_SCALE);
}

function clampSpacingScale(value: number) {
  return Math.min(Math.max(value, MIN_SPACING_SCALE), MAX_APPEARANCE_SCALE);
}

function formatScaleValue(value: number) {
  return `${Math.round(value * 100)}%`;
}

function describeSpacingScale(value: number) {
  if (value <= 0.2) {
    return "Ultra Compact";
  }
  if (value <= 0.85) {
    return "Compact";
  }
  if (value >= 1.2) {
    return "Relaxed";
  }
  return "Default";
}

function describeRadiusScale(value: number) {
  if (value === 0) {
    return "Square";
  }
  if (value <= 0.85) {
    return "Sharp";
  }
  if (value >= 1.2) {
    return "Soft";
  }
  return "Default";
}

export default function SettingsScreen() {
  const router = useRouter();
  const {
    activePosition,
    currentPageAccess,
    isOrgAdmin,
    personalNavVisibility,
    positions,
    setActivePositionId,
    setOrgAdmin,
    setPageAccessLevel,
    setPositionDescription,
    setPositionName,
    toggleNavVisibility,
    addPosition,
    removePosition
  } = useAccessControl();
  const {
    accentColor,
    mode,
    radiusScale,
    setAccentColor,
    setMode,
    setRadiusScale,
    setSpacingScale,
    spacingScale,
    theme
  } = useAppTheme();
  const { showToast } = useToast();
  const { colors } = theme;
  const styles = createStyles(theme);
  const [isAccentModalOpen, setIsAccentModalOpen] = useState(false);
  const [pendingAccentColor, setPendingAccentColor] = useState<AccentColor>(accentColor);
  const [pickerHue, setPickerHue] = useState(hexToHsv(accentColor).h);
  const [pickerSaturation, setPickerSaturation] = useState(hexToHsv(accentColor).s);
  const [pickerValue, setPickerValue] = useState(hexToHsv(accentColor).v);
  const colorAreaRef = useRef<HTMLDivElement | null>(null);
  const hueSliderRef = useRef<HTMLDivElement | null>(null);

  async function applyAccentColor() {
    await setAccentColor(normalizeHexColor(pendingAccentColor));
    setIsAccentModalOpen(false);
    showToast("Saved appearance");
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

  return (
    <>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AppNav title="User" active="user" />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>User Details</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Account</Text>
              <Text style={styles.metricValue}>Local User</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Organization</Text>
              <Text style={styles.metricValue}>Not Connected</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Data Scope</Text>
              <Text style={styles.metricValue}>Device Only</Text>
            </View>
          </View>
          <Text style={styles.metaText}>
            This device is currently operating in local mode. Shared organization access and
            server-backed accounts can be layered in later without changing the workflow screens.
          </Text>
          <Pressable onPress={() => router.push("/integrations")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Manage Integrations</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Navigation Visibility</Text>
          <Text style={styles.metaText}>
            Choose which top navigation tabs are visible for this device user. Tickers let you quickly hide or show pages without changing the underlying role permissions.
          </Text>
          <View style={styles.permissionGrid}>
            {NAV_KEYS.map((page) => {
              const isVisible = personalNavVisibility[page];
              return (
                <Pressable
                  key={`nav:${page}`}
                  onPress={() => void toggleNavVisibility(page)}
                  style={[
                    styles.permissionChip,
                    isVisible ? styles.permissionChipActive : null
                  ]}
                >
                  <Text
                    style={[
                      styles.permissionChipText,
                      isVisible ? styles.permissionChipTextActive : null
                    ]}
                  >
                    {isVisible ? "✓" : "○"} {NAV_PAGE_LABELS[page]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.metaText}>
            Effective position: {activePosition?.name ?? "None"} • Current page access on
            settings: {currentPageAccess("user")}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.cardTitle}>Organization Positions</Text>
            <View style={styles.sectionActionRow}>
              <Pressable
                onPress={() => void setOrgAdmin(!isOrgAdmin)}
                style={[styles.secondaryButton, isOrgAdmin ? styles.modeButtonActive : null]}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    isOrgAdmin ? styles.modeButtonTextActive : null
                  ]}
                >
                  {isOrgAdmin ? "Admin Enabled" : "Admin Disabled"}
                </Text>
              </Pressable>
              <Pressable onPress={() => void addPosition()} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Add Position</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.metaText}>
            Create named positions for your organization and decide whether each page is hidden, read-only, or action-enabled.
          </Text>
          <View style={styles.positionSelectorRow}>
            {positions.map((position) => {
              const isActive = activePosition?.id === position.id;
              return (
                <Pressable
                  key={`active-position:${position.id}`}
                  onPress={() => void setActivePositionId(position.id)}
                  style={[styles.permissionChip, isActive ? styles.permissionChipActive : null]}
                >
                  <Text
                    style={[
                      styles.permissionChipText,
                      isActive ? styles.permissionChipTextActive : null
                    ]}
                  >
                    {isActive ? "✓" : "○"} {position.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {positions.map((position) => (
          <View key={position.id} style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.cardTitle}>{position.name}</Text>
              {positions.length > 1 ? (
                <Pressable onPress={() => void removePosition(position.id)} style={styles.ghostButton}>
                  <Text style={styles.ghostButtonText}>Remove Position</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Position Name</Text>
              <TextInput
                value={position.name}
                onChangeText={(value) => void setPositionName(position.id, value)}
                placeholder="Position name"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                value={position.description}
                onChangeText={(value) => void setPositionDescription(position.id, value)}
                placeholder="Describe this role"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.textArea]}
                multiline
              />
            </View>
            {NAV_KEYS.map((page) => (
              <View key={`${position.id}:${page}`} style={styles.permissionRow}>
                <Text style={styles.permissionPageLabel}>{NAV_PAGE_LABELS[page]}</Text>
                <View style={styles.permissionGrid}>
                  {(["hidden", "read", "action"] as PageAccessLevel[]).map((level) => {
                    const isActive = position.pageAccess[page] === level;
                    return (
                      <Pressable
                        key={`${position.id}:${page}:${level}`}
                        onPress={() => void setPageAccessLevel(position.id, page, level)}
                        style={[styles.permissionChip, isActive ? styles.permissionChipActive : null]}
                      >
                        <Text
                          style={[
                            styles.permissionChipText,
                            isActive ? styles.permissionChipTextActive : null
                          ]}
                        >
                          {level}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appearance</Text>

          <View style={styles.modeRow}>
            <Pressable
              onPress={() => void setMode("light")}
              style={[
                styles.modeButton,
                styles.appearanceModeButton,
                mode === "light" ? styles.modeButtonActive : null
              ]}
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
              style={[
                styles.modeButton,
                styles.appearanceModeButton,
                mode === "dark" ? styles.modeButtonActive : null
              ]}
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
                <View style={styles.accentPreviewBar}>
                  <View style={styles.accentPreviewBarPrimary} />
                  <View style={styles.accentPreviewBarAccent} />
                </View>
              </View>
            </Pressable>
          </View>

          <View style={styles.appearanceControlsGrid}>
            <View style={styles.appearanceControlCard}>
              <View style={styles.appearanceControlHeader}>
                <Text style={styles.appearanceControlLabel}>Element Spacing</Text>
                <Text style={styles.appearanceControlValue}>
                  {describeSpacingScale(spacingScale)} {formatScaleValue(spacingScale)}
                </Text>
              </View>
              <View style={styles.appearanceStepperRow}>
                <Pressable
                  onPress={() =>
                    void setSpacingScale(
                      clampSpacingScale(spacingScale - APPEARANCE_SCALE_STEP)
                    )
                  }
                  style={styles.stepperButton}
                >
                  <Text style={styles.stepperButtonText}>-</Text>
                </Pressable>
                <View style={styles.appearanceTrack}>
                  <View
                    style={[
                      styles.appearanceTrackFill,
                      {
                        width: `${((spacingScale - MIN_SPACING_SCALE) /
                          (MAX_APPEARANCE_SCALE - MIN_SPACING_SCALE)) *
                          100}%`
                      }
                    ]}
                  />
                </View>
                <Pressable
                  onPress={() =>
                    void setSpacingScale(
                      clampSpacingScale(spacingScale + APPEARANCE_SCALE_STEP)
                    )
                  }
                  style={styles.stepperButton}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.appearanceControlCard}>
              <View style={styles.appearanceControlHeader}>
                <Text style={styles.appearanceControlLabel}>Rounded Edges</Text>
                <Text style={styles.appearanceControlValue}>
                  {describeRadiusScale(radiusScale)} {formatScaleValue(radiusScale)}
                </Text>
              </View>
              <View style={styles.appearanceStepperRow}>
                <Pressable
                  onPress={() =>
                    void setRadiusScale(clampRadiusScale(radiusScale - APPEARANCE_SCALE_STEP))
                  }
                  style={styles.stepperButton}
                >
                  <Text style={styles.stepperButtonText}>-</Text>
                </Pressable>
                <View style={styles.appearanceTrack}>
                  <View
                    style={[
                      styles.appearanceTrackFill,
                      {
                        width: `${((radiusScale - MIN_RADIUS_SCALE) /
                          (MAX_APPEARANCE_SCALE - MIN_RADIUS_SCALE)) *
                          100}%`
                      }
                    ]}
                  />
                </View>
                <Pressable
                  onPress={() =>
                    void setRadiusScale(clampRadiusScale(radiusScale + APPEARANCE_SCALE_STEP))
                  }
                  style={styles.stepperButton}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footerCard}>
          <View style={styles.versionPill}>
            <Text style={styles.versionText}>Version 0.1.0</Text>
          </View>
        </View>
      </ScrollView>

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

            {Platform.OS === "web" ? (
              <View style={styles.webWheelSection}>
                <div
                  style={{
                    background: `linear-gradient(to top, black, transparent), linear-gradient(to right, white, hsl(${pickerHue * 360}deg 100% 50%))`,
                    border: `1px solid ${colors.border}`,
                    borderRadius: `${theme.radius.md}px`,
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
                      borderRadius: `${theme.radius.pill}px`,
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
                    borderRadius: `${theme.radius.pill}px`,
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
                      borderRadius: `${theme.radius.pill}px`,
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
                  const wheelRadius = 104;
                  const itemSize = 34;
                  const left = 120 + Math.cos(angle) * wheelRadius - itemSize / 2;
                  const top = 120 + Math.sin(angle) * wheelRadius - itemSize / 2;
                  const isSelected =
                    normalizeHexColor(pendingAccentColor).toLowerCase() === value.toLowerCase();

                  return (
                    <Pressable
                      key={value}
                      onPress={() => setPendingAccentColor(value)}
                      style={[
                        styles.wheelColorButton,
                        { backgroundColor: value, left, top },
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
    </>
  );
}

function createStyles(theme: AppTheme) {
  const { colors, radius, spacing } = theme;

  return StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      flexGrow: 1,
      gap: spacing.lg,
      padding: spacing.xl
    },
    card: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: radius.xl,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.lg
    },
    footerCard: {
      alignItems: "flex-start",
      paddingBottom: spacing.xl
    },
    cardTitle: {
      color: colors.text,
      fontSize: 21,
      fontWeight: "700"
    },
    metricsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    sectionHeaderRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      justifyContent: "space-between"
    },
    sectionActionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    metricTile: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      flexGrow: 1,
      gap: spacing.xs,
      minWidth: 110,
      padding: spacing.md
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
      fontSize: 18,
      fontWeight: "700"
    },
    metaText: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20
    },
    permissionRow: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
      gap: spacing.sm,
      paddingTop: spacing.md
    },
    permissionPageLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700"
    },
    permissionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    permissionChip: {
      backgroundColor: colors.surface,
      borderColor: colors.borderStrong,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    permissionChipActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent
    },
    permissionChipText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "capitalize"
    },
    permissionChipTextActive: {
      color: colors.text
    },
    positionSelectorRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    modeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    modeButton: {
      alignItems: "center",
      borderColor: colors.borderStrong,
      borderRadius: radius.pill,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      minWidth: 116,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    appearanceModeButton: {
      minHeight: 42
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
    modeAccentButton: {
      flex: 1,
      minWidth: 180
    },
    accentPreviewCard: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      padding: spacing.md
    },
    accentPreviewHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.md
    },
    accentPreviewLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.8,
      minWidth: 96
    },
    accentPreviewBar: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      flex: 1,
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
    appearanceControlsGrid: {
      gap: spacing.sm
    },
    appearanceControlCard: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md
    },
    appearanceControlHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    appearanceControlLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700"
    },
    appearanceControlValue: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "700"
    },
    appearanceStepperRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm
    },
    stepperButton: {
      alignItems: "center",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderStrong,
      borderRadius: radius.pill,
      borderWidth: 1,
      height: 38,
      justifyContent: "center",
      width: 38
    },
    stepperButtonText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700"
    },
    appearanceTrack: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      flex: 1,
      height: 14,
      overflow: "hidden"
    },
    appearanceTrackFill: {
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      height: "100%"
    },
    versionPill: {
      alignSelf: "flex-start",
      backgroundColor: colors.background,
      borderColor: colors.borderStrong,
      borderRadius: radius.pill,
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
    secondaryButton: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
      textAlign: "center"
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md
    },
    primaryButtonText: {
      color: colors.surfaceRaised,
      fontSize: 15,
      fontWeight: "700",
      textAlign: "center"
    },
    ghostButton: {
      backgroundColor: colors.dangerSoft,
      borderColor: colors.danger,
      borderRadius: radius.md,
      borderWidth: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md
    },
    ghostButtonText: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "center"
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
      borderRadius: radius.xxl,
      borderWidth: 1,
      gap: spacing.md,
      maxWidth: 420,
      padding: spacing.xl,
      width: "100%"
    },
    modalHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    closeButton: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    closeButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700"
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
      borderRadius: radius.pill,
      height: 28,
      width: 28
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
      borderRadius: radius.pill,
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
      borderRadius: radius.pill,
      borderWidth: 2,
      height: 20,
      width: 20
    },
    wheelCenter: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      gap: spacing.xs,
      height: 120,
      justifyContent: "center",
      width: 120
    },
    wheelCenterLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase"
    },
    wheelCenterSwatch: {
      borderRadius: radius.pill,
      height: 34,
      width: 34
    },
    wheelCenterValue: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "700"
    },
    fieldGroup: {
      gap: spacing.xs
    },
    fieldLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700"
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      color: colors.text,
      fontSize: 15,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md
    },
    textArea: {
      minHeight: 84,
      textAlignVertical: "top"
    },
    modalActionRow: {
      flexDirection: "row",
      gap: spacing.sm
    }
  });
}
