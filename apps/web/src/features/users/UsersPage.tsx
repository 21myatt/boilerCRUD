import { useMemo, useState } from "react";
import { canAccess } from "@imsys/auth";
import type { ManagedUserRole } from "@imsys/types";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../app/auth/AuthProvider";
import { ResourceCollectionCard } from "../../design-system/patterns/resources/ResourceCollectionCard";
import { ResourceCreateCard } from "../../design-system/patterns/resources/ResourceCreateCard";
import { ResourceEmptyState } from "../../design-system/patterns/resources/ResourceEmptyState";
import { ResourcePageHeader } from "../../design-system/patterns/resources/ResourcePageHeader";
import { usersResource } from "./definition";
import { useUsersResource } from "./hooks";

const formatDateTime = (value: string | null) => value ? new Date(value).toLocaleString() : "-";

const roleOptions: ManagedUserRole[] = ["admin", "editor", "reviewer", "viewer"];
const inviteMode = import.meta.env.PROD ? "invite" : "temporary_password";
const isProductionInviteMode = inviteMode === "invite";

export const UsersPage = () => {
  const { t } = useTranslation(["common", "resources", "errors", "nav"]);
  const { session, permissionMap } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cmsRole, setCmsRole] = useState<ManagedUserRole>("viewer");
  const [search, setSearch] = useState("");
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});

  const accessToken = session?.access_token ?? null;
  const { usersQuery, createUserMutation, updateUserMutation } = useUsersResource(accessToken);

  if (!session || !canAccess(permissionMap, "users", "read")) {
    return null;
  }

  const users = usersQuery.data ?? [];
  const visibleUsers = useMemo(
    () => users.filter((user) => {
      const query = search.toLowerCase();
      return user.email.toLowerCase().includes(query) || user.cmsRole.toLowerCase().includes(query);
    }),
    [search, users]
  );
  const busy = createUserMutation.isPending || updateUserMutation.isPending;

  const handleCreate = async () => {
    const nextEmail = email.trim();

    if (!nextEmail || (inviteMode === "temporary_password" && !password.trim())) {
      return;
    }

    try {
      await createUserMutation.mutateAsync({
        email: nextEmail,
        ...(password.trim() ? { password: password.trim() } : {}),
        cmsRole
      });
      setEmail("");
      setPassword("");
      setCmsRole("viewer");
      toast.success(t("resources:usersCreated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors:createUser"));
    }
  };

  const handleRoleChange = async (id: string, nextRole: ManagedUserRole) => {
    try {
      await updateUserMutation.mutateAsync({
        id,
        input: {
          cmsRole: nextRole
        }
      });
      toast.success(t("resources:usersUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors:updateUser"));
    }
  };

  const handleStatusToggle = async (id: string, disabled: boolean) => {
    try {
      await updateUserMutation.mutateAsync({
        id,
        input: {
          disabled: !disabled
        }
      });
      toast.success(t("resources:usersUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors:updateUser"));
    }
  };

  const handlePasswordReset = async (id: string) => {
    const nextPassword = resetPasswords[id]?.trim() ?? "";

    if (!nextPassword) {
      return;
    }

    try {
      await updateUserMutation.mutateAsync({
        id,
        input: {
          password: nextPassword
        }
      });
      setResetPasswords((current) => ({
        ...current,
        [id]: ""
      }));
      toast.success(t("resources:usersUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors:updateUser"));
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden">
      <ResourcePageHeader
        resource={usersResource}
        totalCount={users.length}
        latestLabel="-"
      />

      <div className="flex flex-col gap-3">
        <ResourceCreateCard resource={usersResource}>
          <div className="grid gap-2.5 md:grid-cols-3">
            <Input
              placeholder={t("resources:usersCreatePlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
            />
            <Input
              placeholder={inviteMode === "invite" ? "Optional in production invite mode" : t("resources:usersPasswordPlaceholder")}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
            />
            <select
              className="w-full rounded-[14px] border border-[rgba(42,29,20,0.12)] bg-[var(--panel-strong)] px-3.5 py-3 text-[var(--text)] outline-none transition focus:border-[rgba(28,23,20,0.34)] focus:shadow-[0_0_0_4px_rgba(28,23,20,0.08)]"
              value={cmsRole}
              onChange={(event) => setCmsRole(event.target.value as ManagedUserRole)}
              disabled={busy}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <p className="m-0 text-sm text-[var(--muted)]">
            {inviteMode === "invite"
              ? "Production creates users with an invite email. Temporary password is optional."
              : "Local/dev creates users with a temporary password."}
          </p>
          <p className="m-0 text-sm text-[var(--muted)]">
            Passwords must be at least 12 characters and include uppercase, lowercase, and number.
          </p>
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!email.trim() || (inviteMode === "temporary_password" && !password.trim()) || busy}
          >
            {t("common:create")}
          </Button>
        </ResourceCreateCard>

        <ResourceCollectionCard
          resource={usersResource}
          totalCount={users.length}
          isFetching={usersQuery.isFetching}
          toolbar={(
            <div className="flex justify-start">
              <Input
                className="max-w-[320px]"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("resources:usersSearch")}
              />
            </div>
          )}
          error={usersQuery.error ? (
            <div className="rounded-2xl border border-[rgba(167,58,42,0.22)] bg-[#f8ddd5] px-4 py-3.5 text-[#7b2317]" role="alert">
              {usersQuery.error instanceof Error ? usersQuery.error.message : t("errors:loadUsers")}
            </div>
          ) : undefined}
          loading={usersQuery.isLoading ? <p className="text-[var(--muted)]">Loading...</p> : undefined}
          empty={!usersQuery.isLoading && visibleUsers.length === 0 ? <ResourceEmptyState resource={usersResource} /> : undefined}
        >
          {visibleUsers.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleUsers.map((user) => (
                <article className="grid gap-3 rounded-[18px] border border-[rgba(42,29,20,0.08)] bg-[rgba(255,253,249,0.86)] p-4 shadow-[0_6px_16px_rgba(21,18,16,0.04)]" key={user.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#191513] text-[0.96rem] font-extrabold text-[#fff7ef]" aria-hidden="true">
                      {user.email.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="grid gap-0.5">
                      <h3 className="m-0 text-[1.04rem] leading-[1.3]">{user.email}</h3>
                      <p className="m-0 text-[0.88rem] text-[var(--muted)]">Created {formatDateTime(user.createdAt)}</p>
                      <p className="m-0 text-[0.88rem] text-[var(--muted)]">Last sign-in {formatDateTime(user.lastSignInAt)}</p>
                    </div>
                  </div>

                  <div className="grid gap-2.5 md:grid-cols-2">
                    <label className="grid gap-1.5 text-sm text-[var(--muted)]">
                      <span>{t("resources:usersRoleLabel")}</span>
                      <select
                        className="w-full rounded-[14px] border border-[rgba(42,29,20,0.12)] bg-[var(--panel-strong)] px-3.5 py-3 text-[var(--text)] outline-none transition focus:border-[rgba(28,23,20,0.34)] focus:shadow-[0_0_0_4px_rgba(28,23,20,0.08)]"
                        value={user.cmsRole}
                        disabled={busy || user.protected}
                        onChange={(event) => {
                          void handleRoleChange(user.id, event.target.value as ManagedUserRole);
                        }}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1.5 text-sm text-[var(--muted)]">
                      <span>{t("resources:usersStatusLabel")}</span>
                      <div className="rounded-[14px] border border-[rgba(42,29,20,0.12)] bg-[var(--panel-strong)] px-3.5 py-3 text-[var(--text)]">
                        {user.disabled ? t("resources:usersDisabled") : t("resources:usersEnabled")}
                      </div>
                    </label>
                  </div>

                  {isProductionInviteMode ? (
                    <div className="grid gap-1.5 text-sm text-[var(--muted)]">
                      <span>Password setup</span>
                      <p className="m-0">
                        Production onboarding should use invite links. Temporary password resets are hidden in this mode.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-1.5 text-sm text-[var(--muted)]">
                      <span>Temporary password</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          className="min-w-[220px] flex-1"
                          type="password"
                          value={resetPasswords[user.id] ?? ""}
                          onChange={(event) => setResetPasswords((current) => ({
                            ...current,
                            [user.id]: event.target.value
                          }))}
                          placeholder="Set a new temporary password"
                          disabled={busy}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={busy || !(resetPasswords[user.id]?.trim())}
                          onClick={() => {
                            void handlePasswordReset(user.id);
                          }}
                        >
                          Reset password
                        </Button>
                      </div>
                      <p className="m-0">
                        Passwords must be at least 12 characters and include uppercase, lowercase, and number.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={busy || user.protected}
                      onClick={() => {
                        void handleStatusToggle(user.id, user.disabled);
                      }}
                    >
                      {user.disabled ? "Reactivate" : "Suspend"}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </ResourceCollectionCard>
      </div>
    </section>
  );
};
