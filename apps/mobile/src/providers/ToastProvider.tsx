import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "./AppearanceProvider";

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const TOAST_DURATION_MS = 2200;

export function ToastProvider({ children }: PropsWithChildren) {
  const { theme } = useAppTheme();
  const { colors, radius, spacing } = theme;
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast: (nextMessage: string) => {
        setMessage(nextMessage);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setMessage(null);
          timeoutRef.current = null;
        }, TOAST_DURATION_MS);
      }
    }),
    []
  );

  const styles = StyleSheet.create({
    overlay: {
      left: 0,
      paddingHorizontal: spacing.lg,
      pointerEvents: "none",
      position: "absolute",
      right: 0,
      top: Platform.OS === "web" ? spacing.lg : spacing.xl,
      zIndex: 999
    },
    toast: {
      alignSelf: "center",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.accent,
      borderRadius: radius.md,
      borderWidth: 1,
      maxWidth: 420,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md
    },
    toastText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "center"
    }
  });

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <View style={styles.overlay}>
          <View style={styles.toast}>
            <Text style={styles.toastText}>{message}</Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }
  return context;
}
