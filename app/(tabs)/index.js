import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Image,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../services/api";
import foregroundService from "../services/foregroundService";

const AUTH_TOKEN_KEY = "auth-token";
const BRAND_ORANGE = "#F97316";

export default function HomeScreen() {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  React.useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const response = await api.get("/orders/driver");
        setPedidos(response.data);
      } catch (error) {
        console.error("Failed to fetch pedidos:", error);
      }
    };

    requestPermissions();
    fetchPedidos();
    const interval = setInterval(() => {
      void fetchPedidos();
    }, 30000); // Atualiza a cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const checkPermissions = async () => {
      const foreground = await Location.getForegroundPermissionsAsync();
      const background = await Location.getBackgroundPermissionsAsync();
      const notificationsAllowed = await requestNotificationPermission();

      setPermissionsGranted(
        foreground.status === "granted" &&
          background.status === "granted" &&
          notificationsAllowed,
      );
    };

    checkPermissions();
  }, []);

  // requestLocationPermission();

  const handleStatusChange = useCallback(
    async (pedidoId) => {
      try {
        setRefreshing(true);
        const pedido = pedidos.find((p) => p._id === pedidoId);
        if (!pedido) return;

        const newStatus =
          pedido.status === "pendente" ? "carregado" : "descarregando";

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
    // setIsEnabled(foregroundService.isRunning());
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

  const requestNotificationPermission = useCallback(async () => {
    if (Platform.OS !== "android") return true;
    if (Number(Platform.Version) < 33) return true;

    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (status !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert("Permissão negada", "Ative as notificações para continuar.");
      return false;
    }

    return true;
  }, []);

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

    const notificationsAllowed = await requestNotificationPermission();
    if (!notificationsAllowed) return false;

    setPermissionsGranted(true);
    return true;
  }, [requestNotificationPermission]);

  const enableBackgroundLocation = useCallback(
    async (status) => {
      if (Platform.OS === "web") {
        Alert.alert(
          "Não suportado",
          "Localização em background não está disponível na web.",
        );
        return;
      }

      if (status === "ativar") {
        //adicionar verificação de permissões antes de ativar
        const allowed = await requestPermissions();
        if (!allowed) return;
        await foregroundService.start();
        setIsEnabled(true);
      } else {
        await foregroundService.stop();
        setIsEnabled(false);
      }
      // const allowed = await requestPermissions();
      // if (!allowed) return;

      // // await foregroundService.start();

      // await refreshStatus();
    },
    [refreshStatus, requestPermissions],
  );

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(["auth-token", "refresh-token"]);
    router.replace("/login");
  };

  const disableBackgroundLocation = useCallback(async () => {
    await foregroundService.stop();
    // setPermissionsGranted(false);
    await refreshStatus();
  }, [refreshStatus]);

  const handleToggle = useCallback(
    async (value) => {
      if (value) {
        await enableBackgroundLocation("ativar");
      } else {
        await enableBackgroundLocation("desativar");
      }
    },
    [disableBackgroundLocation, enableBackgroundLocation],
  );

  if (refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-orange-600 text-lg">Atualizando...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white p-6 pt-24">
      <View className="items-center pb-4">
        <Image
          source={require("../../assets/images/icon_logistigas.png")}
          resizeMode="contain"
          style={{ width: 170, height: 80 }}
        />
      </View>

      <View className="bg-white rounded-2xl p-6 space-y-4 border border-orange-200">
        <Text className="text-orange-600 text-2xl font-bold">Bem-vindo</Text>
        {isEnabled ? (
          <Text className="text-slate-700 pt-4 pb-4">Localizador ativado.</Text>
        ) : (
          <Text className="text-slate-700 pt-4 pb-4">
            Localizador desativado.
          </Text>
        )}

        <TouchableOpacity
          onPress={() => handleToggle(!isEnabled)}
          className="rounded-xl py-3 items-center"
          style={{ backgroundColor: BRAND_ORANGE }}
        >
          <Text className="text-white font-semibold">
            {isEnabled ? "Desativar localizador" : "Ativar localizador"}
          </Text>
        </TouchableOpacity>
      </View>
      {/* <Text className="text-white text-2xl font-bold mb-2">
        Localizador de Motoristas
      </Text>
      <Text className="text-slate-300 mb-6">
        Ative ou desative o envio da localização.
      </Text> */}

      {/* <View className="bg-slate-950 rounded-2xl p-5 space-y-4">
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
          <Text className="text-slate-200 text-base font-medium">Ativar</Text>
          <Switch value={isEnabled} onValueChange={handleToggle} />
        </View>
      </View> */}

      <View className="p-4">
        <Text className="text-orange-600 mt-6 text-2xl">Proximos pedidos</Text>
        <View>
          {pedidos.length === 0 ? (
            <Text className="text-slate-500 mt-4">
              Nenhum pedido encontrado.
            </Text>
          ) : null}
          {pedidos.map((pedido) => (
            <View
              key={pedido._id}
              className="bg-white rounded-2xl p-4 mt-4 border border-orange-100"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-slate-900 font-semibold text-base">
                  {pedido.distribuidora?.nome}
                </Text>
                <Text
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    pedido.status === "pendente"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-orange-200 text-orange-800"
                  }`}
                >
                  {pedido.status === "pendente"
                    ? "Pendente"
                    : pedido.status === "carregado"
                      ? "Carregando"
                      : "Descarregando"}
                </Text>
              </View>

              <View className="mt-3 flex-row items-center justify-between">
                <View>
                  <Text className="text-slate-500 text-xs">
                    Data de Carregamento
                  </Text>
                  <Text className="text-slate-800 font-medium">
                    {pedido.dataEntrega
                      ? pedido.dataEntrega
                          .split("T")[0]
                          .split("-")
                          .reverse()
                          .join("/")
                      : "N/A"}
                  </Text>
                  <Text className="text-slate-500 text-xs">Quantidade</Text>
                  <Text className="text-slate-800 font-medium">
                    {pedido.quantidade}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-slate-500 text-xs">Posto</Text>
                  <Text className="text-slate-800 font-medium">
                    {pedido.tanque?.posto?.nome || "N/A"}
                  </Text>

                  <Text className="text-slate-500 text-xs">Cidade</Text>
                  <Text className="text-slate-800 font-medium">
                    {pedido.tanque?.posto?.localizacao || "N/A"}
                  </Text>
                  <Text className="text-slate-500 text-xs">Combustivel</Text>
                  <Text className="text-slate-800 font-medium">
                    {pedido.tanque?.combustivel}
                  </Text>
                </View>
              </View>

              <View className="mt-4">
                <Button
                  color={BRAND_ORANGE}
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

      {/* <View className="mt-6">
        <Button
          color={BRAND_ORANGE}
          title="Sair"
          onPress={() => handleLogout()}
        />
      </View> */}

      <View className="flex col-2 items-center justify-center mt-6">
        <Text className="text-orange-500 text-sm text-center">
          Versão: {require("../../package.json").version}
        </Text>
        <TouchableOpacity
          onPress={() => handleLogout()}
          className="mt-2 rounded-xl px-5 py-2"
          style={{ borderColor: BRAND_ORANGE }}
        >
          <Text
            className="text-sm font-semibold underline"
            style={{ color: BRAND_ORANGE }}
          >
            Sair
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
