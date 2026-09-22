import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, booksTable, bookChangeRequestsTable } from "@workspace/db";
import { requireRole } from "../middlewares/auth";
import { sellingPriceFor } from "../lib/catalog";

const router: IRouter = Router();

router.get("/book-change-requests", requireRole("owner"), async (_req, res) => {
  const requests = await db.select().from(bookChangeRequestsTable);
  res.json(requests);
});

router.patch("/book-change-requests/:id", requireRole("owner"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = z.object({ decision: z.enum(["approve", "reject"]), reviewNote: z.string().nullable().optional() }).safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid review" });
    return;
  }
  const [request] = await db.select().from(bookChangeRequestsTable).where(eq(bookChangeRequestsTable.id, id));
  if (!request || request.status !== "pending") {
    res.status(404).json({ error: "Pending request not found" });
    return;
  }
  if (parsed.data.decision === "approve") {
    if (request.action === "delete" && request.bookId) {
      await db.delete(booksTable).where(eq(booksTable.id, request.bookId));
    } else if (request.action === "update" && request.bookId) {
      await db.update(booksTable).set({
        title: request.title ?? undefined,
        arabicTitle: request.arabicTitle,
        author: request.author ?? undefined,
        language: request.language ?? undefined,
        category: request.category ?? undefined,
        sourcePrice: request.sourcePrice ?? undefined,
        sellingPrice: request.sourcePrice ? sellingPriceFor(request.sourcePrice) : undefined,
        description: request.description,
        imageUrl: request.imageUrl,
        featured: request.featured,
        coverTone: request.coverTone,
      }).where(eq(booksTable.id, request.bookId));
    } else if (request.action === "add" && request.title && request.author && request.language && request.category && request.sourcePrice) {
      await db.insert(booksTable).values({
        title: request.title,
        arabicTitle: request.arabicTitle,
        author: request.author,
        language: request.language,
        category: request.category,
        sourcePrice: request.sourcePrice,
        sellingPrice: sellingPriceFor(request.sourcePrice),
        sourceUrl: `manual://request/${request.id}`,
        description: request.description,
        featured: request.featured,
        isRomance: false,
        coverTone: request.coverTone,
        imageUrl: request.imageUrl,
      });
    }
  }
  const [updated] = await db.update(bookChangeRequestsTable).set({
    status: parsed.data.decision === "approve" ? "approved" : "rejected",
    reviewNote: parsed.data.reviewNote ?? null,
    reviewedAt: new Date(),
  }).where(eq(bookChangeRequestsTable.id, id)).returning();
  res.json(updated);
});

export default router;