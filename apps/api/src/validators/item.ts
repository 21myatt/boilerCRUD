import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().uuid().nullable()
});

export const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.string().uuid().nullable().optional()
});
