import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().default(sql`auth.uid()`),
  bucketId: text("bucket_id").notNull(),
  path: text("path").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  kind: text("kind").notNull(),
  title: text("title"),
  altText: text("alt_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  userIdCreatedAtIdx: index("assets_user_id_created_at_idx").on(table.userId, table.createdAt),
  userIdPathIdx: index("assets_user_id_path_idx").on(table.userId, table.path)
}));

export type AssetRow = typeof assets.$inferSelect;
