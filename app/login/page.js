import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

import api from "../services/api";

const AUTH_TOKEN_KEY = "auth-token";
const AUTH_USER_KEY = "auth-user";

const emailPattern = /^\S+@\S+\.\S+$/;

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const checkSession = async () => {
			const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
			if (token) {
				api.defaults.headers.common.Authorization = `Bearer ${token}`;
				router.replace("/(tabs)");
			}
		};

		void checkSession();
	}, [router]);

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
			Alert.alert("Senha invalida", "A senha deve ter pelo menos 6 caracteres.");
			return;
		}

		setLoading(true);
		try {
			const response = await api.post("/api/auth/login", {
				email: email.trim().toLowerCase(),
				password,
			});

			const { token, user } = response.data || {};
			if (!token) {
				throw new Error("Token nao retornado");
			}

			await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
			await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user ?? {}));
			api.defaults.headers.common.Authorization = `Bearer ${token}`;

			router.replace("/(tabs)");
		} catch (error) {
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
		<View className="flex-1 bg-slate-900 px-6 justify-center">
			<View className="bg-slate-950 rounded-2xl p-6 space-y-4">
				<View>
					<Text className="text-white text-2xl font-bold">Bem-vindo</Text>
					<Text className="text-slate-300">
						Acesse com seu email e senha.
					</Text>
				</View>

				<View className="space-y-3">
					<View>
						<Text className="text-slate-200 mb-2">Email</Text>
						<TextInput
							value={email}
							onChangeText={setEmail}
							placeholder="email@exemplo.com"
							placeholderTextColor="#64748B"
							keyboardType="email-address"
							autoCapitalize="none"
							autoCorrect={false}
							className="bg-slate-900 text-white px-4 py-3 rounded-xl"
						/>
					</View>

					<View>
						<Text className="text-slate-200 mb-2">Senha</Text>
						<TextInput
							value={password}
							onChangeText={setPassword}
							placeholder="********"
							placeholderTextColor="#64748B"
							secureTextEntry
							className="bg-slate-900 text-white px-4 py-3 rounded-xl"
						/>
					</View>
				</View>

				<TouchableOpacity
					onPress={handleLogin}
					disabled={!canSubmit}
					className={`rounded-xl py-3 items-center ${
						canSubmit ? "bg-blue-600" : "bg-slate-700"
					}`}
				>
					{loading ? (
						<ActivityIndicator color="#FFFFFF" />
					) : (
						<Text className="text-white font-semibold">Entrar</Text>
					)}
				</TouchableOpacity>
			</View>
		</View>
	);
}
