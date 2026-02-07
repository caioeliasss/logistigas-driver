import axios from "axios";

const token =
  typeof window !== "undefined" ? localStorage.getItem("auth-token") : null;

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
});

export default api;
