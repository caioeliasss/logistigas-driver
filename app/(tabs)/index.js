import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import * as TaskManager from "expo-task-manager";
import { useCallback, useEffect, useState } from "react";
import { Alert, Platform, Switch, Text, View } from "react-native";
import api from "../services/api";

const BACKGROUND_LOCATION_TASK = "background-location-task";
const LAST_SENT_KEY = "last-location-sent-at";
const AUTH_TOKEN_KEY = "auth-token";

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      return;
    }

    const taskData = data;
    const latest = taskData?.locations?.[0];
    if (latest) {
      try {
        await api.patch("/users/drivers/coordinates", {
          lat: latest.coords.latitude,
          lng: latest.coords.longitude,
        });
      } catch (sendError) {
        console.error("Failed to send location (bg):", sendError);
      }

      await AsyncStorage.setItem(
        LAST_SENT_KEY,
        new Date(latest.timestamp).toISOString(),
      );
    }
  });
}

function formatTimestamp(value) {
  if (!value) return "Nunca";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nunca";
  return date.toLocaleString();
}

export default function HomeScreen() {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(null);

  const refreshStatus = useCallback(async () => {
    const started = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    );
    setIsEnabled(started);
    const stored = await AsyncStorage.getItem(LAST_SENT_KEY);
    setLastSentAt(stored);
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const ensureAuthenticated = async () => {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        router.replace("/login");
      }
    };

    void ensureAuthenticated();
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshStatus();
    }, 15000);

    return () => clearInterval(timer);
  }, [refreshStatus]);

  const requestPermissions = useCallback(async () => {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== "granted") {
      Alert.alert(
        "Permissão negada",
        "É necessário permitir localização para continuar.",
      );
      return false;
    }

    const background = await Location.requestBackgroundPermissionsAsync();
    if (background.status !== "granted") {
      Alert.alert(
        "Permissão em background negada",
        "Ative a permissão de localização em background nas configurações do sistema.",
      );
      return false;
    }

    return true;
  }, []);

  const enableBackgroundLocation = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Não suportado",
        "Localização em background não está disponível na web.",
      );
      return;
    }

    const allowed = await requestPermissions();
    if (!allowed) return;

    const locationOptions = {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000, // 1 minuto
      distanceInterval: 5, // por enquanto 5m (pode ser ajustado depois)
      pausesUpdatesAutomatically: false,
    };

    if (Platform.OS === "android") {
      locationOptions.foregroundService = {
        notificationTitle: "Localização ativa",
        notificationBody: "Enviando localização em segundo plano.",
        notificationColor: "#1D4ED8",
      };
    } else {
      locationOptions.showsBackgroundLocationIndicator = true;
    }

    await Location.startLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
      locationOptions,
    );

    // try {
    //   const position = await Location.getCurrentPositionAsync({
    //     accuracy: Location.Accuracy.Balanced,
    //   });
    //   const response = await api.patch("/users/drivers/coordinates", {
    //     lat: position.coords.latitude,
    //     lng: position.coords.longitude,
    //   });
    //   console.log("Location sent:", response.data);
    //   await AsyncStorage.setItem(LAST_SENT_KEY, new Date().toISOString());
    // } catch (error) {
    //   console.error("Failed to send location:", error);
    // }

    await refreshStatus();
  }, [refreshStatus, requestPermissions]);

  const disableBackgroundLocation = useCallback(async () => {
    const started = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    );
    if (started) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
    await refreshStatus();
  }, [refreshStatus]);

  const handleToggle = useCallback(
    async (value) => {
      if (value) {
        await enableBackgroundLocation();
      } else {
        await disableBackgroundLocation();
      }
    },
    [disableBackgroundLocation, enableBackgroundLocation],
  );

  return (
    <View className="flex-1 bg-slate-900 p-6 pt-24">
      <Text className="text-white text-2xl font-bold mb-2">
        Localização em background
      </Text>
      <Text className="text-slate-300 mb-6">
        Ative ou desative o envio da localização.
      </Text>

      <View className="bg-slate-950 rounded-2xl p-5 space-y-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-slate-200 text-base font-medium">Status</Text>
          <Text
            className={`text-base font-semibold ${
              isEnabled ? "text-green-400" : "text-orange-400"
            }`}
          >
            {isEnabled ? "Ativo" : "Inativo"}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-slate-200 text-base font-medium">
            Último envio
          </Text>
          <Text className="text-white text-base font-semibold">
            {formatTimestamp(lastSentAt)}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-slate-200 text-base font-medium">Ativar</Text>
          <Switch value={isEnabled} onValueChange={handleToggle} />
        </View>
      </View>
      <Text className="text-slate-400 text-sm mt-4">Versão: 1.0.3</Text>
    </View>
  );
}
