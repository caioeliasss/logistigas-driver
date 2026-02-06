import { Redirect } from "expo-router";
// import "./global.css";
import { verifyInstallation } from "nativewind";

export default function Index() {
  verifyInstallation();
  return <Redirect href="/(tabs)" />;
}
