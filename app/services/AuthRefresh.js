import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
const api = require("./api").default;

export function AuthRefresh() {
  useEffect(() => {
    const fetchRefreshToken = async () => {
      try {
        const refreshToken = await AsyncStorage.getItem("refresh-token");
        if (!refreshToken) {
          console.log("Nenhum refresh token encontrado");
          return;
        }
        const response = await api.post("/auth/refresh", {
          refreshToken: refreshToken,
        });
        const { token, refreshToken: newRefreshToken } = response.data;

        await AsyncStorage.setItem("auth-token", token);
        await AsyncStorage.setItem("refresh-token", newRefreshToken);
      } catch (error) {
        console.error("Erro ao renovar token:", error);
      }
    };
    fetchRefreshToken();
  }, []);

  return null;
}
