import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, booksTable, ordersTable } from "@workspace/db";
import {
  CreateOrderBody,
  CreateOrderResponse,
  GetOrderSummaryResponse,
  ListOrdersQueryParams,
  ListOrdersResponse,
  UpdateOrderStatusBody,
  UpdateOrderStatusParams,
  UpdateOrderStatusResponse,
} from "@workspace/api-zod";
import { ensureBooksSeeded } from "../lib/catalog";
import { requireAuthUser, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/orders", requireRole("owner", "moderator"), async (req, res): Promise<void> => {
  const parsed = ListOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const orders = await db
    .select()
    .from(ordersTable)
    .where(
      parsed.data.status && parsed.data.status !== "all"
        ? eq(ordersTable.status, parsed.data.status)
        : undefined,
    )
    .orderBy(desc(ordersTable.createdAt));
  res.json(ListOrdersResponse.parse(orders));
});

router.get("/orders/mine", requireAuthUser, async (req, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, req.appUser!.id))
    .orderBy(desc(ordersTable.createdAt));
  res.json(ListOrdersResponse.parse(orders));
});

router.post("/orders", requireAuthUser, async (req, res): Promise<void> => {
  await ensureBooksSeeded();
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [book] = await db
    .select()
    .from(booksTable)
    .where(eq(booksTable.id, parsed.data.bookId));
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  const [order] = await db
    .insert(ordersTable)
    .values({
      bookId: book.id,
      userId: req.appUser!.id,
      clerkUserId: req.clerkUserId!,
      bookTitle: book.arabicTitle
        ? `${book.title} / ${book.arabicTitle}`
        : book.title,
      studentName: parsed.data.studentName,
      className: parsed.data.className,
      contact: parsed.data.contact,
      quantity: parsed.data.quantity,
      price: book.sellingPrice,
      status: "pending",
      notes: parsed.data.notes ?? null,
    })
    .returning();
  res.status(201).json(CreateOrderResponse.parse(order));
});

router.get("/orders/summary", requireRole("owner", "moderator"), async (_req, res): Promise<void> => {
  const grouped = await db
    .select({
      status: ordersTable.status,
      total: sql<number>`count(*)`,
    })
    .from(ordersTable)
    .groupBy(ordersTable.status);
  const counts = Object.fromEntries(
    grouped.map((row) => [row.status, Number(row.total)]),
  );
  res.json(
    GetOrderSummaryResponse.parse({
      total: Object.values(counts).reduce((sum, value) => sum + value, 0),
      pending: counts.pending ?? 0,
      sourcing: counts.sourcing ?? 0,
      ready: counts.ready ?? 0,
      handed: counts.handed ?? 0,
    }),
  );
});

router.patch("/orders/:id/status", requireRole("owner", "moderator"), async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  const body = UpdateOrderStatusBody.safeParse(req.body);
  if (!params.success || !body.success) {
    const error = !params.success
      ? params.error.message
      : body.success
        ? "Invalid request"
        : body.error.message;
    res.status(400).json({
      error,
    });
    return;
  }
  const [order] = await db
    .update(ordersTable)
    .set({ status: body.data.status })
    .where(eq(ordersTable.id, params.data.id))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(UpdateOrderStatusResponse.parse(order));
});

export default router;