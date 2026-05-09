import { create } from "zustand";

export type MobileLocale = "en" | "th";
export type MobileRoute = "items" | "categories" | "assets";

type UiStore = {
  locale: MobileLocale;
  route: MobileRoute;
  setLocale: (locale: MobileLocale) => void;
  navigate: (route: MobileRoute) => void;
};

export const useMobileUiStore = create<UiStore>((set) => ({
  locale: "en",
  route: "items",
  setLocale: (locale) => set({ locale }),
  navigate: (route) => set({ route })
}));
