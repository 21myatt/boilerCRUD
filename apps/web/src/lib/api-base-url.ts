const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

if (!configuredApiUrl && !import.meta.env.DEV) {
  throw new Error("VITE_API_URL is required outside local development");
}

export const apiBaseUrl = configuredApiUrl || "http://localhost:4000";
