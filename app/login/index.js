import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../services/api";

const AUTH_TOKEN_KEY = "auth-token";
const AUTH_USER_KEY = "auth-user";
const BRAND_ORANGE = "#F97316";

const emailPattern = /^\S+@\S+\.\S+$/;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const foreground = await Location.requestForegroundPermissionsAsync();
        if (foreground.status !== "granted") {
          Alert.alert(
            "Permissão negada",
            "É necessário permitir localização para continuar.",
          );
          return;
        }

        const background = await Location.requestBackgroundPermissionsAsync();
        if (background.status !== "granted") {
          Alert.alert(
            "Permissão em background negada",
            "Ative a permissão de localização em background nas configurações do sistema.",
          );
          return;
        }

        if (Platform.OS === "android" && Platform.Version >= 33) {
          const status = await PermissionsAndroid.request(
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

          if (status !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              "Permissão negada",
              "Ative as notificações para continuar.",
            );
          }
        }
      } catch (error) {
        console.log("Permission request error:", error);
      }
    };

    requestPermissions();
  }, []);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !loading,
    [email, password, loading],
  );

  const handleLogin = useCallback(async () => {
    if (!emailPattern.test(email.trim())) {
      Alert.alert("Email invalido", "Informe um email valido.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Senha invalida",
        "A senha deve ter pelo menos 6 caracteres.",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const { token, user } = response.data || {};
      if (!token) {
        throw new Error("Token nao retornado");
      }

      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user ?? {}));
      await AsyncStorage.setItem("refresh-token", response.data.refreshToken);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      // Iniciar rastreamento nativo em background (Android)

      router.replace("/(tabs)");
    } catch (error) {
      console.log("Login error:", error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Nao foi possivel fazer login.";
      Alert.alert("Falha no login", message);
    } finally {
      setLoading(false);
    }
  }, [email, password, router]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6">
          <View className="bg-white rounded-2xl p-6 space-y-4 border border-orange-200">
            <View className="items-center">
              <Image
                source={require("../../assets/images/icon-logistigas2.png")}
                resizeMode="contain"
                style={{ width: 170, height: 80 }}
              />
            </View>

            <View>
              <Text className="text-orange-600 text-2xl font-bold">
                Bem-vindo
              </Text>
              <Text className="text-slate-600">
                Acesse com seu email e senha.
              </Text>
            </View>

            <View className="space-y-3">
              <View>
                <Text className="text-slate-800 mb-2">Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email@exemplo.com"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="bg-orange-50 text-slate-900 px-4 py-3 rounded-xl border border-orange-200"
                />
              </View>

              <View>
                <Text className="text-slate-800 mb-2">Senha</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="********"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                  className="bg-orange-50 text-slate-900 px-4 py-3 rounded-xl border border-orange-200"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={!canSubmit}
              className={`rounded-xl py-3 mt-3 items-center ${
                canSubmit ? "bg-orange-500" : "bg-orange-200"
              }`}
              style={canSubmit ? { backgroundColor: BRAND_ORANGE } : undefined}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-semibold">Entrar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
