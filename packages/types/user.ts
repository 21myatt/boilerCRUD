import type { ID, Timestamped } from "./common";

export type User = Timestamped & {
  id: ID;
  email: string;
  name: string;
};

export type ManagedUserRole = "admin" | "editor" | "reviewer" | "viewer";

export type Profile = Timestamped & {
  id: ID;
  email: string;
  role: ManagedUserRole;
  disabled: boolean;
};

export type ManagedUser = Timestamped & {
  id: ID;
  email: string;
  cmsRole: ManagedUserRole;
  disabled: boolean;
  lastSignInAt: string | null;
  protected: boolean;
};

export type ManagedUserCreateInput = {
  email: string;
  cmsRole: ManagedUserRole;
  password?: string;
  redirectTo?: string;
};

export type ManagedUserUpdateInput = {
  cmsRole?: ManagedUserRole;
  disabled?: boolean;
  password?: string;
};

export type AuditLogEntry = {
  id: ID;
  actorUserId: ID | null;
  targetUserId: ID | null;
  action: string;
  resource: string;
  payloadSummary: Record<string, unknown>;
  createdAt: string;
};
