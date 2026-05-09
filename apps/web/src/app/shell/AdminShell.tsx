import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { canAccess } from "@imsys/auth";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { useAuth } from "../auth/AuthProvider";
import { useUiStore } from "../store/ui-store";

const SidebarToggleIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2.5" y="3" width="15" height="14" rx="2.5" />
    <path d="M7 3v14" />
    {collapsed ? <path d="m11 10 2.5-2.5M11 10l2.5 2.5" /> : <path d="m13.5 10-2.5-2.5M13.5 10l-2.5 2.5" />}
  </svg>
);

const GlobeIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="10" cy="10" r="7" />
    <path d="M3.5 10h13" />
    <path d="M10 3a11.5 11.5 0 0 1 0 14" />
    <path d="M10 3a11.5 11.5 0 0 0 0 14" />
  </svg>
);

const ResourceIcon = ({ resource }: { resource: "items" | "categories" | "assets" }) => {
  if (resource === "items") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 5.5h10M6 10h10M6 14.5h10" />
        <circle cx="3.5" cy="5.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="3.5" cy="10" r="1" fill="currentColor" stroke="none" />
        <circle cx="3.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (resource === "categories") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 5.5h5l1.4 1.8H16a1 1 0 0 1 1 1v5.7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 3.5h7l3 3V15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z" />
      <path d="M12 3.5V7h3" />
    </svg>
  );
};

export const AdminShell = ({ children }: { children: ReactNode }) => {
  const { t, i18n } = useTranslation(["common", "nav"]);
  const { viewerEmail, permissionMap, signOut } = useAuth();
  const { locale, sidebarCollapsed, setLocale, toggleSidebar } = useUiStore();
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  useEffect(() => {
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
  }, [i18n, locale]);

  return (
    <div className={sidebarCollapsed ? "grid min-h-screen grid-cols-[80px_minmax(0,1fr)]" : "grid min-h-screen grid-cols-[232px_minmax(0,1fr)]"}>
      <aside className="sticky top-0 min-h-screen border-r border-[rgba(42,29,20,0.08)] bg-[rgba(255,250,244,0.78)] px-3 py-4 backdrop-blur-[12px]">
        <div className={sidebarCollapsed ? "mb-[18px] flex justify-center gap-2.5" : "mb-[18px] flex items-center justify-between gap-2.5"}>
          <div className={sidebarCollapsed ? "hidden" : undefined}>
            <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#8d6743]">Admin foundation</p>
            <h2 className="mt-1 text-[1.1rem] font-bold">{t("common:appName")}</h2>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={toggleSidebar}
            className="h-8 w-8 p-0"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <SidebarToggleIcon collapsed={sidebarCollapsed} />
          </Button>
        </div>

        <nav className={sidebarCollapsed ? "flex flex-col items-center gap-1.5" : "flex flex-col gap-1.5"}>
          {canAccess(permissionMap, "items", "read") ? (
            <Link
              to="/items"
              className="flex min-h-[42px] items-center gap-3 rounded-[14px] px-3 font-bold text-[var(--muted)] no-underline"
              activeProps={{ className: "flex min-h-[42px] items-center gap-3 rounded-[14px] border border-[rgba(141,103,67,0.22)] bg-[#eadac6] px-3 font-bold text-[#171412] no-underline shadow-[0_8px_18px_rgba(21,18,16,0.08)]" }}
            >
              <span className="inline-flex h-5 w-5 flex-none items-center justify-center"><ResourceIcon resource="items" /></span>
              {!sidebarCollapsed ? <span className="whitespace-nowrap">{t("nav:items")}</span> : null}
            </Link>
          ) : null}
          {canAccess(permissionMap, "categories", "read") ? (
            <Link
              to="/categories"
              className="flex min-h-[42px] items-center gap-3 rounded-[14px] px-3 font-bold text-[var(--muted)] no-underline"
              activeProps={{ className: "flex min-h-[42px] items-center gap-3 rounded-[14px] border border-[rgba(141,103,67,0.22)] bg-[#eadac6] px-3 font-bold text-[#171412] no-underline shadow-[0_8px_18px_rgba(21,18,16,0.08)]" }}
            >
              <span className="inline-flex h-5 w-5 flex-none items-center justify-center"><ResourceIcon resource="categories" /></span>
              {!sidebarCollapsed ? <span className="whitespace-nowrap">{t("nav:categories")}</span> : null}
            </Link>
          ) : null}
          {canAccess(permissionMap, "assets", "read") ? (
            <Link
              to="/assets"
              className="flex min-h-[42px] items-center gap-3 rounded-[14px] px-3 font-bold text-[var(--muted)] no-underline"
              activeProps={{ className: "flex min-h-[42px] items-center gap-3 rounded-[14px] border border-[rgba(141,103,67,0.22)] bg-[#eadac6] px-3 font-bold text-[#171412] no-underline shadow-[0_8px_18px_rgba(21,18,16,0.08)]" }}
            >
              <span className="inline-flex h-5 w-5 flex-none items-center justify-center"><ResourceIcon resource="assets" /></span>
              {!sidebarCollapsed ? <span className="whitespace-nowrap">{t("nav:assets")}</span> : null}
            </Link>
          ) : null}
          {canAccess(permissionMap, "users", "read") ? (
            <Link
              to="/users"
              className="flex min-h-[42px] items-center gap-3 rounded-[14px] px-3 font-bold text-[var(--muted)] no-underline"
              activeProps={{ className: "flex min-h-[42px] items-center gap-3 rounded-[14px] border border-[rgba(141,103,67,0.22)] bg-[#eadac6] px-3 font-bold text-[#171412] no-underline shadow-[0_8px_18px_rgba(21,18,16,0.08)]" }}
            >
              <span className="inline-flex h-5 w-5 flex-none items-center justify-center">
                <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M10 10a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm-5.5 6a5.5 5.5 0 0 1 11 0" />
                  <path d="M15.5 8.5a2 2 0 1 0-1.5-3.4" />
                </svg>
              </span>
              {!sidebarCollapsed ? <span className="whitespace-nowrap">{t("nav:users")}</span> : null}
            </Link>
          ) : null}
          {canAccess(permissionMap, "users", "read") ? (
            <Link
              to="/diagnostics"
              className="flex min-h-[42px] items-center gap-3 rounded-[14px] px-3 font-bold text-[var(--muted)] no-underline"
              activeProps={{ className: "flex min-h-[42px] items-center gap-3 rounded-[14px] border border-[rgba(141,103,67,0.22)] bg-[#eadac6] px-3 font-bold text-[#171412] no-underline shadow-[0_8px_18px_rgba(21,18,16,0.08)]" }}
            >
              <span className="inline-flex h-5 w-5 flex-none items-center justify-center">
                <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 10h12" />
                  <path d="M10 4v12" />
                  <circle cx="10" cy="10" r="6.5" />
                </svg>
              </span>
              {!sidebarCollapsed ? <span className="whitespace-nowrap">Diagnostics</span> : null}
            </Link>
          ) : null}
          {canAccess(permissionMap, "users", "read") ? (
            <Link
              to="/audit-logs"
              className="flex min-h-[42px] items-center gap-3 rounded-[14px] px-3 font-bold text-[var(--muted)] no-underline"
              activeProps={{ className: "flex min-h-[42px] items-center gap-3 rounded-[14px] border border-[rgba(141,103,67,0.22)] bg-[#eadac6] px-3 font-bold text-[#171412] no-underline shadow-[0_8px_18px_rgba(21,18,16,0.08)]" }}
            >
              <span className="inline-flex h-5 w-5 flex-none items-center justify-center">
                <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M5 5.5h10M5 10h10M5 14.5h10" />
                  <path d="M3.5 5.5h0M3.5 10h0M3.5 14.5h0" />
                </svg>
              </span>
              {!sidebarCollapsed ? <span className="whitespace-nowrap">Audit Log</span> : null}
            </Link>
          ) : null}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-[rgba(42,29,20,0.08)] bg-[rgba(247,242,234,0.9)] px-4 py-3 backdrop-blur-[12px] md:flex-row md:items-center md:justify-between md:px-[18px]">
          <div />

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setLanguageMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={languageMenuOpen}
                aria-label={t("common:language")}
              >
                <GlobeIcon />
              </Button>
              {languageMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+8px)] grid min-w-[132px] gap-1 rounded-[14px] border border-[rgba(42,29,20,0.08)] bg-[rgba(255,252,247,0.98)] p-1.5 shadow-[0_14px_34px_rgba(21,18,16,0.12)]">
                  <button
                    type="button"
                    className={locale === "en" ? "rounded-[10px] bg-[#eadac6] px-3 py-2 text-left text-sm font-bold text-[#171412]" : "rounded-[10px] px-3 py-2 text-left text-sm font-bold text-[var(--text)]"}
                    onClick={() => {
                      setLocale("en");
                      setLanguageMenuOpen(false);
                    }}
                  >
                    {t("common:english")}
                  </button>
                  <button
                    type="button"
                    className={locale === "th" ? "rounded-[10px] bg-[#eadac6] px-3 py-2 text-left text-sm font-bold text-[#171412]" : "rounded-[10px] px-3 py-2 text-left text-sm font-bold text-[var(--text)]"}
                    onClick={() => {
                      setLocale("th");
                      setLanguageMenuOpen(false);
                    }}
                  >
                    {t("common:thai")}
                  </button>
                </div>
              ) : null}
            </div>
            <span>{viewerEmail}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => void signOut()}>
              {t("common:signOut")}
            </Button>
          </div>
        </header>

        <main className="p-4 md:p-[18px]">{children}</main>
      </div>
    </div>
  );
};
