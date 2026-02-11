import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import * as TaskManager from "expo-task-manager";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Platform, Switch, Text, View } from "react-native";
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
        const response = await api.patch("/users/drivers/coordinates", {
          lat: latest.coords.latitude,
          lng: latest.coords.longitude,
        });
        if (response.status === 401) {
          console.warn("Unauthorized background request");
        }
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
  const [pedidos, setPedidos] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const response = await api.get("/orders/driver");
        setPedidos(response.data);
      } catch (error) {
        console.error("Failed to fetch pedidos:", error);
      }
    };

    // fetchPedidos();
    const interval = setInterval(() => {
      void fetchPedidos();
    }, 30000); // Atualiza a cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = useCallback(
    async (pedidoId) => {
      try {
        setRefreshing(true);
        const pedido = pedidos.find((p) => p._id === pedidoId);
        if (!pedido) return;

        const newStatus =
          pedido.status === "pendente" ? "carregando" : "descarregando";

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const pos = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        };

        await api.patch(`/orders/${pedidoId}/driver-status`, {
          status: newStatus,
          pos,
        });

        setPedidos((prev) =>
          prev.map((p) =>
            p._id === pedidoId ? { ...p, status: newStatus } : p,
          ),
        );
      } catch (error) {
        console.error("Failed to change status:", error);
        Alert.alert("Erro", "Não foi possível atualizar o status do pedido.");
      } finally {
        setRefreshing(false);
      }
    },
    [pedidos],
  );

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
      distanceInterval: 100, // por enquanto 100m
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

  const handleLogout = async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    router.replace("/login");
  };

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

  if (refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <Text className="text-white text-lg">Atualizando...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900 p-6 pt-24">
      <Text className="text-white text-2xl font-bold mb-2">
        Localizador de Motoristas
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

      <View>
        <Text className="text-slate-300 mt-6">Proximos pedidos</Text>
        <View>
          {pedidos.length === 0 ? (
            <Text className="text-slate-500 mt-4">
              Nenhum pedido encontrado.
            </Text>
          ) : null}
          {pedidos.map((pedido) => (
            <View
              key={pedido._id}
              className="bg-slate-950 rounded-2xl p-4 mt-4 border border-slate-800"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-semibold text-base">
                  {pedido.distribuidora?.nome}
                </Text>
                <Text
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    pedido.status === "pendente"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-emerald-500/20 text-emerald-300"
                  }`}
                >
                  {pedido.status === "pendente" ? "Pendente" : "Em andamento"}
                </Text>
              </View>

              <View className="mt-3 flex-row items-center justify-between">
                <View>
                  <Text className="text-slate-500 text-xs">
                    Data de Carregamento
                  </Text>
                  <Text className="text-slate-200 font-medium">
                    {pedido.dataEntrega
                      ? pedido.dataEntrega
                          .split("T")[0]
                          .split("-")
                          .reverse()
                          .join("/")
                      : "N/A"}
                  </Text>
                  <Text className="text-slate-500 text-xs">Quantidade</Text>
                  <Text className="text-slate-200 font-medium">
                    {pedido.quantidade}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-slate-500 text-xs">Posto</Text>
                  <Text className="text-slate-200 font-medium">
                    {pedido.tanque?.posto?.nome || "N/A"}
                  </Text>

                  <Text className="text-slate-500 text-xs">Cidade</Text>
                  <Text className="text-slate-200 font-medium">
                    {pedido.tanque?.posto?.localizacao || "N/A"}
                  </Text>
                  <Text className="text-slate-500 text-xs">Combustivel</Text>
                  <Text className="text-slate-200 font-medium">
                    {pedido.tanque?.combustivel}
                  </Text>
                </View>
              </View>

              <View className="mt-4">
                <Button
                  title={
                    pedido.status === "pendente"
                      ? "Iniciar carregamento"
                      : "Iniciar descarregamento"
                  }
                  onPress={() => handleStatusChange(pedido._id)}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="mt-6">
        <Button title="Sair" onPress={() => handleLogout()} />
      </View>

      <Text className="text-slate-400 text-sm mt-4 text-center">
        Versão: 1.0.9
      </Text>
    </View>
  );
}
