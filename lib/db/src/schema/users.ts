import { boolean, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable(
  "users",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    clerkId: text("clerk_id").notNull(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    role: text("role").notNull().default("student"),
    blocked: boolean("blocked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clerkIdUnique: uniqueIndex("users_clerk_id_unique").on(table.clerkId),
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
  }),
);

export const insertUserSchema = createInsertSchema(usersTable);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;