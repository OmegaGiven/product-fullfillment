import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { getSecureJson, setSecureJson } from "../services/local/localSecureStore";
import {
  buildTheme,
  defaultAppearance,
  type AccentColor,
  type AppearanceMode,
  type AppTheme
} from "../theme";

type AppearanceState = {
  mode: AppearanceMode;
  accentColor: AccentColor;
  radiusScale: number;
  spacingScale: number;
};

type AppearanceContextValue = {
  accentColor: AccentColor;
  mode: AppearanceMode;
  radiusScale: number;
  setAccentColor: (accentColor: AccentColor) => Promise<void>;
  setMode: (mode: AppearanceMode) => Promise<void>;
  setRadiusScale: (radiusScale: number) => Promise<void>;
  setSpacingScale: (spacingScale: number) => Promise<void>;
  spacingScale: number;
  theme: AppTheme;
};

const APPEARANCE_KEY = "appearance-preferences";
const MIN_RADIUS_SCALE = 0;
const MIN_SPACING_SCALE = 0.1;
const MAX_SCALE = 1.5;

function clampRadiusScale(value: number) {
  return Math.min(Math.max(value, MIN_RADIUS_SCALE), MAX_SCALE);
}

function clampSpacingScale(value: number) {
  return Math.min(Math.max(value, MIN_SPACING_SCALE), MAX_SCALE);
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: PropsWithChildren) {
  const [appearance, setAppearance] = useState<AppearanceState>(defaultAppearance);

  useEffect(() => {
    let isMounted = true;

    async function loadAppearance() {
      const stored = await getSecureJson<AppearanceState>(APPEARANCE_KEY);
      if (stored && isMounted) {
        setAppearance({
          mode: stored.mode ?? defaultAppearance.mode,
          accentColor:
            typeof stored.accentColor === "string"
              ? stored.accentColor
              : defaultAppearance.accentColor,
          radiusScale:
            typeof stored.radiusScale === "number"
              ? clampRadiusScale(stored.radiusScale)
              : defaultAppearance.radiusScale,
          spacingScale:
            typeof stored.spacingScale === "number"
              ? clampSpacingScale(stored.spacingScale)
              : defaultAppearance.spacingScale
        });
      }
    }

    void loadAppearance();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AppearanceContextValue>(() => {
    async function persist(nextAppearance: AppearanceState) {
      setAppearance(nextAppearance);
      await setSecureJson(APPEARANCE_KEY, nextAppearance);
    }

    return {
      accentColor: appearance.accentColor,
      mode: appearance.mode,
      radiusScale: appearance.radiusScale,
      setAccentColor: async (accentColor: AccentColor) => {
        await persist({ ...appearance, accentColor });
      },
      setMode: async (mode: AppearanceMode) => {
        await persist({ ...appearance, mode });
      },
      setRadiusScale: async (radiusScale: number) => {
        await persist({ ...appearance, radiusScale: clampRadiusScale(radiusScale) });
      },
      setSpacingScale: async (spacingScale: number) => {
        await persist({ ...appearance, spacingScale: clampSpacingScale(spacingScale) });
      },
      spacingScale: appearance.spacingScale,
      theme: buildTheme(
        appearance.mode,
        appearance.accentColor,
        appearance.spacingScale,
        appearance.radiusScale
      )
    };
  }, [appearance]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const backgroundColor = value.theme.colors.background;
    const root = document.documentElement;
    const body = document.body;
    const appRoot = document.getElementById("root");
    const expoRoot = document.querySelector("[data-expo-root]") as HTMLElement | null;
    const firstBodyChild = body.firstElementChild as HTMLElement | null;
    const previousRootBackground = root.style.backgroundColor;
    const previousBodyBackground = body.style.backgroundColor;
    const previousAppRootBackground = appRoot?.style.backgroundColor ?? "";
    const previousExpoRootBackground = expoRoot?.style.backgroundColor ?? "";
    const previousFirstBodyChildBackground = firstBodyChild?.style.backgroundColor ?? "";

    root.style.backgroundColor = backgroundColor;
    body.style.backgroundColor = backgroundColor;
    if (appRoot) {
      appRoot.style.backgroundColor = backgroundColor;
    }
    if (expoRoot) {
      expoRoot.style.backgroundColor = backgroundColor;
    }
    if (firstBodyChild) {
      firstBodyChild.style.backgroundColor = backgroundColor;
    }

    return () => {
      root.style.backgroundColor = previousRootBackground;
      body.style.backgroundColor = previousBodyBackground;
      if (appRoot) {
        appRoot.style.backgroundColor = previousAppRootBackground;
      }
      if (expoRoot) {
        expoRoot.style.backgroundColor = previousExpoRootBackground;
      }
      if (firstBodyChild) {
        firstBodyChild.style.backgroundColor = previousFirstBodyChildBackground;
      }
    };
  }, [value.theme.colors.background]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppTheme must be used inside AppearanceProvider.");
  }
  return context;
}
