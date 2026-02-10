import { Redirect } from "expo-router";
// import "./global.css";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { verifyInstallation } from "nativewind";
import { NativeModules, Platform } from "react-native";

const { LocationModule } = NativeModules;
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://logistigas-production.up.railway.app/api";
const AUTH_TOKEN_KEY = "auth-token";

export async function startTracking() {
  if (Platform.OS === "android" && LocationModule) {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      LocationModule.start(API_BASE_URL, token);
    } catch (error) {
      console.warn("Failed to start native location tracking:", error);
    }
  }
}

export function stopTracking() {
  if (Platform.OS === "android" && LocationModule) {
    try {
      LocationModule.stop();
    } catch (error) {
      console.warn("Failed to stop native location tracking:", error);
    }
  }
}

export default function Index() {
  verifyInstallation();
  return <Redirect href="/(tabs)" />;
}
