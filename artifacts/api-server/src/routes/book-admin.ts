import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, booksTable, bookChangeRequestsTable } from "@workspace/db";
import { requireRole } from "../middlewares/auth";
import { sellingPriceFor } from "../lib/catalog";

const router: IRouter = Router();
const bookInput = z.object({
  title: z.string().min(1),
  arabicTitle: z.string().nullable().optional(),
  author: z.string().min(1),
  language: z.enum(["arabic", "english"]),
  category: z.string().min(1),
  sourcePrice: z.number().positive(),
  sellingPrice: z.number().positive().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  featured: z.boolean().optional(),
  coverTone: z.string().min(1).optional(),
});

function bookValues(input: z.infer<typeof bookInput>) {
  return {
    title: input.title,
    arabicTitle: input.arabicTitle ?? null,
    author: input.author,
    language: input.language,
    category: input.category,
    sourcePrice: input.sourcePrice,
    sellingPrice: input.sellingPrice ?? sellingPriceFor(input.sourcePrice),
    sourceUrl: "manual://school-bookshop",
    description: input.description ?? null,
    featured: input.featured ?? false,
    isRomance: false,
    coverTone: input.coverTone ?? "plum",
    imageUrl: input.imageUrl ?? null,
  };
}

router.post("/books", requireRole("owner", "moderator"), async (req, res): Promise<void> => {
  const currentUser = req.appUser!;
  const parsed = bookInput.safeParse(req.body);
  if (!parsed.success || req.appUser?.role === "student") {
    res.status(400).json({ error: "Invalid book" });
    return;
  }
  if (currentUser.role === "moderator") {
    const [request] = await db.insert(bookChangeRequestsTable).values({
      action: "add",
      ...bookValues(parsed.data),
      requestedBy: currentUser.id,
      status: "pending",
    }).returning();
    res.status(202).json({ request, message: "Sent to the owner for approval" });
    return;
  }
  const [book] = await db.insert(booksTable).values(bookValues(parsed.data)).returning();
  res.status(201).json(book);
});

router.patch("/books/:id", requireRole("owner", "moderator"), async (req, res): Promise<void> => {
  const currentUser = req.appUser!;
  const id = Number(req.params.id);
  const parsed = bookInput.partial().safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid book update" });
    return;
  }
  const [existing] = await db.select().from(booksTable).where(eq(booksTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  if (currentUser.role === "moderator") {
    const [request] = await db.insert(bookChangeRequestsTable).values({
      action: "update",
      bookId: id,
      ...parsed.data,
      sellingPrice: parsed.data.sellingPrice ?? (parsed.data.sourcePrice ? sellingPriceFor(parsed.data.sourcePrice) : existing.sellingPrice),
      requestedBy: currentUser.id,
      status: "pending",
    }).returning();
    res.status(202).json({ request, message: "Sent to the owner for approval" });
    return;
  }
  const [updated] = await db.update(booksTable).set({
    ...parsed.data,
    sellingPrice: parsed.data.sellingPrice ?? (parsed.data.sourcePrice ? sellingPriceFor(parsed.data.sourcePrice) : undefined),
  }).where(eq(booksTable.id, id)).returning();
  res.json(updated);
});

router.delete("/books/:id", requireRole("owner", "moderator"), async (req, res): Promise<void> => {
  const currentUser = req.appUser!;
  const id = Number(req.params.id);
  const [existing] = await db.select().from(booksTable).where(eq(booksTable.id, id));
  if (!Number.isInteger(id) || !existing) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  if (currentUser.role === "moderator") {
    const [request] = await db.insert(bookChangeRequestsTable).values({
      action: "delete",
      bookId: id,
      title: existing.title,
      requestedBy: currentUser.id,
      status: "pending",
    }).returning();
    res.status(202).json({ request, message: "Sent to the owner for approval" });
    return;
  }
  await db.delete(booksTable).where(eq(booksTable.id, id));
  res.json({ deleted: true });
});

export default router;