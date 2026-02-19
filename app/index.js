import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
// import "./global.css";
import { verifyInstallation } from "nativewind";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

const AUTH_TOKEN_KEY = "auth-token";

export default function Index() {
  verifyInstallation();

  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (!isMounted) return;
        router.replace(token ? "/(tabs)" : "/login");
      } finally {
        if (isMounted) {
          setCheckingAuth(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checkingAuth) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  return null;
}
