export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36
};

export type AppearanceMode = "light" | "dark";
export type AccentColor = string;

type BaseColors = {
  background: string;
  backgroundAccent: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  muted: string;
  border: string;
  borderStrong: string;
  success: string;
  warning: string;
  danger: string;
  dangerSoft: string;
};

type AccentColors = {
  primary: string;
  primaryDark: string;
  accent: string;
  accentSoft: string;
};

export type AppTheme = {
  colors: BaseColors & AccentColors;
  spacing: typeof spacing;
};

export const defaultAppearance = {
  mode: "light" as AppearanceMode,
  accentColor: "#c56f2a" as AccentColor
};

const lightBase: BaseColors = {
  background: "#f3ecdf",
  backgroundAccent: "#e8dcc5",
  surface: "#fffaf2",
  surfaceRaised: "#fffdf9",
  text: "#201a14",
  muted: "#6f6253",
  border: "#d7c6ae",
  borderStrong: "#b49d80",
  success: "#2e7d32",
  warning: "#c17b1e",
  danger: "#c0392b",
  dangerSoft: "#fff1ec"
};

const darkBase: BaseColors = {
  background: "#171412",
  backgroundAccent: "#221d19",
  surface: "#211c18",
  surfaceRaised: "#2a241f",
  text: "#f7efe6",
  muted: "#c0b3a4",
  border: "#4d4035",
  borderStrong: "#7a6858",
  success: "#6fb56d",
  warning: "#d6a44f",
  danger: "#df7d6e",
  dangerSoft: "#3a221d"
};

type Rgb = {
  r: number;
  g: number;
  b: number;
};

function clamp(value: number, min = 0, max = 255) {
  return Math.min(Math.max(value, min), max);
}

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  const safeHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized.padEnd(6, "0").slice(0, 6);

  return {
    r: parseInt(safeHex.slice(0, 2), 16),
    g: parseInt(safeHex.slice(2, 4), 16),
    b: parseInt(safeHex.slice(4, 6), 16)
  };
}

function rgbToHex({ r, g, b }: Rgb) {
  return `#${[r, g, b]
    .map((value) => clamp(Math.round(value)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mix(hexA: string, hexB: string, amount: number) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);

  return rgbToHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount
  });
}

function darken(hex: string, amount: number) {
  return mix(hex, "#000000", amount);
}

function soften(hex: string, mode: AppearanceMode) {
  return mode === "dark" ? mix(hex, "#ffffff", 0.14) : mix(hex, "#ffffff", 0.76);
}

export function buildTheme(
  mode: AppearanceMode = defaultAppearance.mode,
  accentColor: AccentColor = defaultAppearance.accentColor
): AppTheme {
  const base = mode === "dark" ? darkBase : lightBase;

  return {
    colors: {
      ...base,
      primary: darken(accentColor, mode === "dark" ? 0.08 : 0.18),
      primaryDark: darken(accentColor, mode === "dark" ? 0.24 : 0.36),
      accent: accentColor,
      accentSoft: soften(accentColor, mode)
    },
    spacing
  };
}
