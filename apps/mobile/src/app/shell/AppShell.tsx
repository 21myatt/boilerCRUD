import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { canAccess } from "@imsys/auth";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthProvider";
import { useMobileUiStore } from "../store/ui-store";

const GlobeIcon = () => (
  <View style={styles.globeIcon}>
    <View style={styles.globeRing} />
    <View style={styles.globeLineHorizontal} />
    <View style={styles.globeLineVertical} />
  </View>
);

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { t, i18n } = useTranslation();
  const { viewerEmail, permissionMap, signOut } = useAuth();
  const { locale, route, navigate, setLocale } = useMobileUiStore();
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const availableRoutes = [
    canAccess(permissionMap, "items", "read") ? { key: "items", label: t("items") } : null,
    canAccess(permissionMap, "categories", "read") ? { key: "categories", label: t("categories") } : null,
    canAccess(permissionMap, "assets", "read") ? { key: "assets", label: t("assets") } : null
  ].filter(Boolean) as Array<{ key: "items" | "categories" | "assets"; label: string }>;

  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [i18n, locale]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{t("workspace")}</Text>
          <Text style={styles.title}>{t("appName")}</Text>
          <Text style={styles.session}>{viewerEmail}</Text>
        </View>

        <View style={styles.actions}>
          {availableRoutes.map((entry) => (
            <Pressable
              key={entry.key}
              onPress={() => navigate(entry.key)}
              style={[styles.secondaryButton, route === entry.key && styles.activeRouteButton]}
            >
              <Text style={[styles.secondaryButtonText, route === entry.key && styles.activeRouteButtonText]}>{entry.label}</Text>
            </Pressable>
          ))}
          <View style={styles.languageWrap}>
            <Pressable onPress={() => setLanguageMenuOpen((open) => !open)} style={styles.secondaryButton}>
              <GlobeIcon />
            </Pressable>
            {languageMenuOpen ? (
              <View style={styles.languageMenu}>
                <Pressable
                  onPress={() => {
                    setLocale("en");
                    setLanguageMenuOpen(false);
                  }}
                  style={[styles.languageMenuItem, locale === "en" && styles.languageMenuItemActive]}
                >
                  <Text style={[styles.languageMenuText, locale === "en" && styles.languageMenuTextActive]}>{t("languageEnglish")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setLocale("th");
                    setLanguageMenuOpen(false);
                  }}
                  style={[styles.languageMenuItem, locale === "th" && styles.languageMenuItemActive]}
                >
                  <Text style={[styles.languageMenuText, locale === "th" && styles.languageMenuTextActive]}>{t("languageThai")}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
          <Pressable onPress={() => void signOut()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{t("signOut")}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4efe7"
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(42, 29, 20, 0.08)",
    backgroundColor: "rgba(255, 252, 247, 0.94)"
  },
  eyebrow: {
    color: "#8d6743",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 2
  },
  title: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "800",
    color: "#171412"
  },
  session: {
    marginTop: 4,
    color: "#6f6458"
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 14,
    zIndex: 2
  },
  secondaryButton: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ecdcc9"
  },
  activeRouteButton: {
    borderWidth: 1,
    borderColor: "rgba(141, 103, 67, 0.22)",
    backgroundColor: "#eadac6"
  },
  secondaryButtonText: {
    color: "#171412",
    fontWeight: "700"
  },
  activeRouteButtonText: {
    color: "#171412"
  },
  languageWrap: {
    position: "relative"
  },
  languageMenu: {
    position: "absolute",
    top: 50,
    right: 0,
    minWidth: 120,
    padding: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255, 252, 247, 0.98)",
    borderWidth: 1,
    borderColor: "rgba(42, 29, 20, 0.08)"
  },
  languageMenuItem: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  languageMenuItemActive: {
    backgroundColor: "#eadac6"
  },
  languageMenuText: {
    color: "#171412",
    fontWeight: "700"
  },
  languageMenuTextActive: {
    color: "#171412"
  },
  globeIcon: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  globeRing: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 1.4,
    borderColor: "#171412"
  },
  globeLineHorizontal: {
    position: "absolute",
    width: 14,
    borderTopWidth: 1.2,
    borderTopColor: "#171412"
  },
  globeLineVertical: {
    position: "absolute",
    height: 14,
    borderLeftWidth: 1.2,
    borderLeftColor: "#171412"
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 18
  }
});
