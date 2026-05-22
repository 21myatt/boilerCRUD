export type AppEnv = "development" | "staging" | "production";

export const normalizeAppEnv = (value?: string | null): AppEnv => {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "staging" || normalized === "production") {
    return normalized;
  }

  return "development";
};
