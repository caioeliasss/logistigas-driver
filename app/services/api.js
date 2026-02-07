import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const getToken = async () => {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem("auth-token");
  }

  try {
    return await AsyncStorage.getItem("auth-token");
  } catch {
    return null;
  }
};

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});

export default api;
