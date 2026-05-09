import { Navigate, Outlet, RouterProvider, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { canAccess } from "@imsys/auth";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "../components/ui/card";
import { useAuth } from "./auth/AuthProvider";
import { AssetsPage } from "../features/assets";
import { AuditLogsPage } from "../features/audit/AuditLogsPage";
import { CategoriesPage } from "../features/categories";
import { DiagnosticsPage } from "../features/diagnostics/DiagnosticsPage";
import { ItemsPage } from "../features/items/ItemsPage";
import { UsersPage } from "../features/users";
import { AuthScreen } from "./shell/AuthScreen";
import { AdminShell } from "./shell/AdminShell";

const RootLayout = () => {
  const { t } = useTranslation("common");
  const { status, session, permissionMap } = useAuth();

  if (status === "loading") {
    return (
      <section className="relative min-h-screen overflow-hidden">
        <div className="mx-auto max-w-[780px]">
          <Card className="rounded-[18px] p-[18px]">
            <CardContent className="py-1.5 text-[var(--muted)]">{t("loading")}</CardContent>
          </Card>
        </div>
      </section>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (
    !canAccess(permissionMap, "items", "read")
    && !canAccess(permissionMap, "categories", "read")
    && !canAccess(permissionMap, "assets", "read")
    && !canAccess(permissionMap, "users", "read")
  ) {
    return (
      <section className="relative min-h-screen overflow-hidden">
        <div className="mx-auto max-w-[780px]">
          <Card className="rounded-[18px] p-[18px]">
            <CardContent className="py-1.5 text-[var(--muted)]">No readable resources are available for this role.</CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
};

const rootRoute = createRootRoute({
  component: RootLayout
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/items" />
});

const itemsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/items",
  component: ItemsPage
});

const categoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/categories",
  component: CategoriesPage
});

const assetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/assets",
  component: AssetsPage
});

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users",
  component: UsersPage
});

const diagnosticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/diagnostics",
  component: DiagnosticsPage
});

const auditLogsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/audit-logs",
  component: AuditLogsPage
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  itemsRoute,
  categoriesRoute,
  assetsRoute,
  usersRoute,
  diagnosticsRoute,
  auditLogsRoute
]);

export const router = createRouter({
  routeTree
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export const WebRouter = () => <RouterProvider router={router} />;
