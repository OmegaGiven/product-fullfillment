import {
  Platform,
  Pressable as RNPressable,
  StyleSheet,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle
} from "react-native";

function resolveStyle(
  style: PressableProps["style"],
  state: PressableStateCallbackType
): ViewStyle | undefined {
  if (typeof style === "function") {
    return StyleSheet.flatten(style(state));
  }

  return StyleSheet.flatten(style);
}

export function Pressable(props: PressableProps) {
  const { disabled, style, ...rest } = props;

  return (
    <RNPressable
      {...rest}
      disabled={disabled}
      style={(state) => {
        const interactiveState = state as PressableStateCallbackType & {
          hovered?: boolean;
        };

        return [
          resolveStyle(style, state),
          Platform.OS === "web" ? styles.webInteractive : null,
          disabled ? styles.disabled : null,
          interactiveState.hovered && Platform.OS === "web" && !disabled ? styles.hovered : null,
          state.pressed && !disabled ? styles.pressed : null
        ] as StyleProp<ViewStyle>;
      }}
    />
  );
}

const styles = StyleSheet.create({
  webInteractive: {
    cursor: "pointer" as const,
    boxShadow: "0px 0px 0px rgba(15, 23, 42, 0)"
  },
  hovered: {
    opacity: 0.96,
    transform: [{ translateY: -1 }],
    boxShadow: "0px 10px 24px rgba(15, 23, 42, 0.12)"
  },
  pressed: {
    opacity: 0.88,
    transform: [{ translateY: 0 }],
    boxShadow: "0px 6px 14px rgba(15, 23, 42, 0.08)"
  },
  disabled: {
    opacity: 0.6,
    boxShadow: "0px 0px 0px rgba(15, 23, 42, 0)"
  }
});
