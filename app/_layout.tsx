import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState } from "react-native";
import "react-native-reanimated";
import "../global.css";
import { AuthRefresh } from "./services/AuthRefresh";
import CheckUpdates from "./services/CheckUpdates";
import foregroundService from "./services/foregroundService";
export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  // const colorScheme = useColorScheme();
  const colorScheme = "light";

  useEffect(() => {
    const handleAppStateChange = async (nextState: string) => {
      if (nextState === "active") {
        await foregroundService.stop();
        return;
      }

      if (nextState === "background") {
        await foregroundService.start();
      }
    };

    handleAppStateChange(AppState.currentState);
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === "light" ? DefaultTheme : DarkTheme}>
      <AuthRefresh />
      <CheckUpdates />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
