import { create } from "zustand";

export type AppLocale = "en" | "th";

type UiStore = {
  locale: AppLocale;
  sidebarCollapsed: boolean;
  setLocale: (locale: AppLocale) => void;
  toggleSidebar: () => void;
};

export const useUiStore = create<UiStore>((set) => ({
  locale: "en",
  sidebarCollapsed: false,
  setLocale: (locale) => set({ locale }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
}));
