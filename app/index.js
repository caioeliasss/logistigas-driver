import { Redirect } from "expo-router";
// import "./global.css";
import { verifyInstallation } from "nativewind";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://logistigas-production.up.railway.app/api";
const AUTH_TOKEN_KEY = "auth-token";

export default function Index() {
  verifyInstallation();

  return <Redirect href="/login" />;
}
