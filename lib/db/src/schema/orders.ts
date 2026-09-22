import { integer, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  bookId: integer("book_id").notNull(),
  userId: integer("user_id"),
  clerkUserId: text("clerk_user_id"),
  bookTitle: text("book_title").notNull(),
  studentName: text("student_name").notNull(),
  className: text("class_name").notNull(),
  contact: text("contact").notNull(),
  quantity: integer("quantity").notNull().default(1),
  price: real("price").notNull(),
  deliveryFee: real("delivery_fee").notNull().default(0.5),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable);
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;