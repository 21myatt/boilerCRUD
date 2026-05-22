import { z } from "zod";

export const idSchema = z.string().min(1);
export const timestampSchema = z.string().min(1);

export const managedUserRoleSchema = z.enum(["admin", "editor", "reviewer", "viewer"]);
export const managedUserPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/\d/, "Password must include a number");

export const itemSchema = z.object({
  id: idSchema,
  name: z.string(),
  categoryId: idSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const itemCreateInputSchema = z.object({
  name: z.string().min(1),
  categoryId: idSchema.nullable().optional()
});

export const itemUpdateInputSchema = itemCreateInputSchema.partial();

export const categorySchema = z.object({
  id: idSchema,
  name: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const categoryCreateInputSchema = z.object({
  name: z.string().min(1)
});

export const categoryUpdateInputSchema = categoryCreateInputSchema.partial();

export const profileSchema = z.object({
  id: idSchema,
  email: z.string().min(1),
  role: managedUserRoleSchema,
  disabled: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const managedUserSchema = z.object({
  id: idSchema,
  email: z.string().min(1),
  cmsRole: managedUserRoleSchema,
  disabled: z.boolean(),
  lastSignInAt: z.string().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  protected: z.boolean()
});

export const managedUserCreateInputSchema = z.object({
  email: z.string().min(1),
  cmsRole: managedUserRoleSchema,
  password: managedUserPasswordSchema.optional(),
  redirectTo: z.string().url().optional()
});

export const managedUserUpdateInputSchema = z.object({
  cmsRole: managedUserRoleSchema.optional(),
  disabled: z.boolean().optional(),
  password: managedUserPasswordSchema.optional()
});

export const auditLogEntrySchema = z.object({
  id: idSchema,
  actorUserId: idSchema.nullable(),
  targetUserId: idSchema.nullable(),
  action: z.string(),
  resource: z.string(),
  payloadSummary: z.record(z.unknown()),
  createdAt: timestampSchema
});

export const diagnosticsCheckSchema = z.object({
  ok: z.boolean(),
  expected: z.string().nullable().optional(),
  actual: z.string().nullable().optional()
});
export type DiagnosticsCheck = z.infer<typeof diagnosticsCheckSchema>;

export const diagnosticsResponseSchema = z.object({
  checkedAt: timestampSchema,
  checks: z.record(diagnosticsCheckSchema)
});
export type DiagnosticsResponse = z.infer<typeof diagnosticsResponseSchema>;

export const schemaStateSchema = z.object({
  singleton_key: z.string().min(1),
  schema_version: z.string().min(1),
  updated_at: timestampSchema
});

export const apiEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema.optional(),
    error: z.string().optional()
  }).refine((value) => value.data !== undefined || value.error !== undefined, {
    message: "API envelope must include data or error"
  });

export const itemListSchema = z.array(itemSchema);
export const categoryListSchema = z.array(categorySchema);
export const managedUserListSchema = z.array(managedUserSchema);
export const auditLogListSchema = z.array(auditLogEntrySchema);
