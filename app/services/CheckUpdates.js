import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { useEffect } from "react";
import { Alert, Linking, Platform } from "react-native";
import api from "./api";

const currentVersion = require("../../package.json").version;

function compareVersions(first = "0", second = "0") {
  const firstParts = String(first)
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  const secondParts = String(second)
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);

  const maxLength = Math.max(firstParts.length, secondParts.length);
  for (let index = 0; index < maxLength; index += 1) {
    const left = firstParts[index] || 0;
    const right = secondParts[index] || 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }

  return 0;
}

async function startAndroidInstall(downloadUrl) {
  if (!downloadUrl) {
    Alert.alert("Atualização", "URL de download não disponível.");
    return;
  }

  const lowerUrl = String(downloadUrl).toLowerCase();
  if (!lowerUrl.endsWith(".apk")) {
    Alert.alert(
      "Atualização disponível",
      "Não foi possível iniciar a instalação automática. O link de atualização será aberto para download manual.",
    );
    await Linking.openURL(downloadUrl);
    return;
  }

  const destinationPath = `${FileSystem.documentDirectory}logistigas-driver-update.apk`;
  const download = await FileSystem.downloadAsync(downloadUrl, destinationPath);
  const contentUri = await FileSystem.getContentUriAsync(download.uri);

  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: contentUri,
    flags: 1 | 268435456,
    type: "application/vnd.android.package-archive",
  });
}

export default function CheckUpdates() {
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await api.get("/news/app-updates");
        const latestVersion = response?.data?.version;
        const downloadUrl = response?.data?.downloadUrl;
        const releaseNotes =
          response?.data?.releaseNotes ||
          "Melhorias de desempenho e correções.";

        if (!latestVersion) return;

        const hasNewVersion =
          compareVersions(latestVersion, currentVersion) > 0;
        if (!hasNewVersion) return;

        Alert.alert(
          "Nova versão disponível",
          `Versão atual: ${currentVersion}\nNova versão: ${latestVersion}\n\n${releaseNotes}`,
          [
            { text: "Depois", style: "cancel" },
            {
              text: "Atualizar",
              onPress: async () => {
                try {
                  if (Platform.OS === "android") {
                    await startAndroidInstall(downloadUrl);
                    return;
                  }

                  if (downloadUrl) {
                    await Linking.openURL(downloadUrl);
                  }
                } catch (installError) {
                  console.error("Erro ao instalar atualização:", installError);
                  Alert.alert(
                    "Erro na atualização",
                    "Não foi possível iniciar a atualização automática. Tente novamente mais tarde.",
                  );
                }
              },
            },
          ],
        );
      } catch (error) {
        if (error?.response?.status === 404) {
          return;
        }
        console.error("Erro ao verificar atualizações:", error);
      }
    };

    checkForUpdates();
  }, []);

  return null;
}
