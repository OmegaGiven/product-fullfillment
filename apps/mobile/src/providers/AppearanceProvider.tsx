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
};

type AppearanceContextValue = {
  accentColor: AccentColor;
  mode: AppearanceMode;
  setAccentColor: (accentColor: AccentColor) => Promise<void>;
  setMode: (mode: AppearanceMode) => Promise<void>;
  theme: AppTheme;
};

const APPEARANCE_KEY = "appearance-preferences";

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
              : defaultAppearance.accentColor
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
      setAccentColor: async (accentColor: AccentColor) => {
        await persist({ ...appearance, accentColor });
      },
      setMode: async (mode: AppearanceMode) => {
        await persist({ ...appearance, mode });
      },
      theme: buildTheme(appearance.mode, appearance.accentColor)
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
