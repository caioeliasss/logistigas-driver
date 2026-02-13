import { Redirect } from "expo-router";
// import "./global.css";
import { verifyInstallation } from "nativewind";
import { useEffect } from "react";
import { PermissionsAndroid, Platform } from "react-native";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://logistigas-production.up.railway.app/api";
const AUTH_TOKEN_KEY = "auth-token";

export default function Index() {
  verifyInstallation();

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const requestPermissions = async () => {
      try {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE,
          {
            title: "Permissão de Serviço em Primeiro Plano",
            message:
              "Este aplicativo precisa de permissão para executar um serviço em primeiro plano para rastrear sua localização mesmo quando o aplicativo estiver fechado.",
            buttonNeutral: "Pergunte-me depois",
            buttonNegative: "Cancelar",
            buttonPositive: "OK",
          },
        );

        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: "Permissão de Localização em Segundo Plano",
            message:
              "Este aplicativo precisa de permissão para acessar sua localização em segundo plano para rastrear sua localização mesmo quando o aplicativo estiver fechado.",
            buttonNeutral: "Pergunte-me depois",
            buttonNegative: "Cancelar",
            buttonPositive: "OK",
          },
        );

        if (Platform.Version >= 33) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: "Permissão de Notificações",
              message:
                "Este aplicativo precisa de permissão para enviar notificações para mantê-lo informado sobre o status do rastreamento de localização.",
              buttonNeutral: "Pergunte-me depois",
              buttonNegative: "Cancelar",
              buttonPositive: "OK",
            },
          );
        }
      } catch (error) {
        console.log("Permission request error:", error);
      }
    };

    requestPermissions();
  }, []);

  return <Redirect href="/(tabs)" />;
}
