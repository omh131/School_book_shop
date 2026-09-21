import { boolean, integer, pgTable, real, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const booksTable = pgTable("books", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  arabicTitle: text("arabic_title"),
  author: text("author").notNull(),
  language: text("language").notNull(),
  category: text("category").notNull(),
  sourcePrice: real("source_price").notNull(),
  sellingPrice: real("selling_price").notNull(),
  sourceUrl: text("source_url").notNull(),
  description: text("description"),
  featured: boolean("featured").notNull().default(false),
  coverTone: text("cover_tone").notNull().default("plum"),
  imageUrl: text("image_url"),
});

export const insertBookSchema = createInsertSchema(booksTable);
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof booksTable.$inferSelect;