import { z } from "zod";

const cmsRoleSchema = z.enum(["admin", "editor", "reviewer", "viewer"]);

export const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(4).optional(),
  redirectTo: z.string().trim().url().optional(),
  cmsRole: cmsRoleSchema
});

export const updateUserSchema = z.object({
  cmsRole: cmsRoleSchema.optional(),
  disabled: z.boolean().optional(),
  password: z.string().min(4).optional()
}).refine((value) => value.cmsRole !== undefined || value.disabled !== undefined || value.password !== undefined, {
  message: "At least one user field must be updated"
});
