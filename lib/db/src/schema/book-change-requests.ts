import { boolean, integer, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookChangeRequestsTable = pgTable("book_change_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  action: text("action").notNull(),
  bookId: integer("book_id"),
  title: text("title"),
  arabicTitle: text("arabic_title"),
  author: text("author"),
  language: text("language"),
  category: text("category"),
  sourcePrice: real("source_price"),
  sellingPrice: real("selling_price"),
  description: text("description"),
  imageUrl: text("image_url"),
  featured: boolean("featured").notNull().default(false),
  coverTone: text("cover_tone").notNull().default("plum"),
  requestedBy: integer("requested_by").notNull(),
  status: text("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const insertBookChangeRequestSchema = createInsertSchema(bookChangeRequestsTable);
export type InsertBookChangeRequest = z.infer<typeof insertBookChangeRequestSchema>;
export type BookChangeRequest = typeof bookChangeRequestsTable.$inferSelect;