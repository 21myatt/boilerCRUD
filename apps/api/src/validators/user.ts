import { z } from "zod";

const cmsRoleSchema = z.enum(["admin", "editor", "reviewer", "viewer"]);
const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/\d/, "Password must include a number");

export const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: passwordSchema.optional(),
  redirectTo: z.string().trim().url().optional(),
  cmsRole: cmsRoleSchema
});

export const updateUserSchema = z.object({
  cmsRole: cmsRoleSchema.optional(),
  disabled: z.boolean().optional(),
  password: passwordSchema.optional()
}).refine((value) => value.cmsRole !== undefined || value.disabled !== undefined || value.password !== undefined, {
  message: "At least one user field must be updated"
});
