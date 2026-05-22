const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const useLegacyLocalApi = import.meta.env.VITE_USE_LOCAL_API?.trim() === "true";

export const apiBaseUrl = useLegacyLocalApi
  ? (configuredApiUrl || "http://localhost:4000")
  : (configuredApiUrl && configuredApiUrl !== "http://localhost:4000" ? configuredApiUrl : "/api");
