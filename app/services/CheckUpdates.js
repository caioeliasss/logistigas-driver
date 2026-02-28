import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/theme";
import api from "./api";

const currentVersion = require("../../package.json").version;
const BRAND_ORANGE = Colors.light.tint;
const BORDER_ORANGE = "#FDBA74";
const SURFACE_ORANGE = "#FFF7ED";

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
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCancelUpdate = useCallback(() => {
    if (isUpdating) return;
    setUpdateInfo(null);
  }, [isUpdating]);

  const handleStartUpdate = useCallback(async () => {
    if (!updateInfo?.downloadUrl || isUpdating) return;

    setIsUpdating(true);
    try {
      if (Platform.OS === "android") {
        await startAndroidInstall(updateInfo.downloadUrl);
      } else {
        await Linking.openURL(updateInfo.downloadUrl);
      }
      setUpdateInfo(null);
    } catch (installError) {
      console.error("Erro ao instalar atualização:", installError);
      Alert.alert(
        "Erro na atualização",
        "Não foi possível iniciar a atualização automática. Tente novamente mais tarde.",
      );
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating, updateInfo]);

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

        setUpdateInfo({
          latestVersion,
          downloadUrl,
          releaseNotes,
        });
      } catch (error) {
        if (error?.response?.status === 404) {
          return;
        }
        console.error("Erro ao verificar atualizações:", error);
      }
    };

    checkForUpdates();
  }, []);

  return (
    <Modal
      transparent
      visible={Boolean(updateInfo)}
      animationType="fade"
      onRequestClose={handleCancelUpdate}
    >
      <View className="flex-1 items-center justify-center bg-black/45 px-5">
        <View
          className="w-full rounded-2xl border p-5"
          style={{
            backgroundColor: "white",
            borderColor: BORDER_ORANGE,
            maxWidth: 420,
          }}
        >
          <Text className="text-lg font-bold" style={{ color: BRAND_ORANGE }}>
            Nova versão disponível
          </Text>

          <View
            className="mt-3 rounded-xl border p-3"
            style={{ backgroundColor: SURFACE_ORANGE, borderColor: "#FED7AA" }}
          >
            <Text style={{ color: Colors.light.text }}>
              Versão atual: {currentVersion}
            </Text>
            <Text style={{ color: Colors.light.text }}>
              Nova versão: {updateInfo?.latestVersion}
            </Text>
          </View>

          <Text
            className="mt-4 mb-2 font-semibold"
            style={{ color: Colors.light.text }}
          >
            O que mudou
          </Text>

          <ScrollView className="max-h-36" showsVerticalScrollIndicator={false}>
            <Text className="text-sm leading-5" style={{ color: "#475569" }}>
              {updateInfo?.releaseNotes}
            </Text>
          </ScrollView>

          <View className="mt-5 flex-row justify-end gap-3">
            <TouchableOpacity
              onPress={handleCancelUpdate}
              disabled={isUpdating}
              className="rounded-xl border px-4 py-2"
              style={{ borderColor: "#CBD5E1" }}
            >
              <Text style={{ color: "#334155", fontWeight: "600" }}>
                Depois
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleStartUpdate}
              disabled={isUpdating || !updateInfo?.downloadUrl}
              className="min-w-[110px] items-center rounded-xl px-4 py-2"
              style={{
                backgroundColor:
                  isUpdating || !updateInfo?.downloadUrl
                    ? "#FDBA74"
                    : BRAND_ORANGE,
              }}
            >
              {isUpdating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                  Atualizar
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
