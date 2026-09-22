import { Router, type IRouter } from "express";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db, booksTable } from "@workspace/db";
import {
  GetBookParams,
  GetBookResponse,
  GetCatalogSummaryResponse,
  ListBooksQueryParams,
  ListBooksResponse,
} from "@workspace/api-zod";
import { ensureBooksSeeded } from "../lib/catalog";

const router: IRouter = Router();

router.get("/books", async (req, res): Promise<void> => {
  await ensureBooksSeeded();
  const parsed = ListBooksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, language, category, featured, page = 1, limit = 60 } = parsed.data;
  const filters = [eq(booksTable.isRomance, false)];
  if (search) {
    const searchFilter = or(
      ilike(booksTable.title, `%${search}%`),
      ilike(booksTable.arabicTitle, `%${search}%`),
      ilike(booksTable.author, `%${search}%`),
      ilike(booksTable.category, `%${search}%`),
    );
    if (searchFilter) filters.push(searchFilter);
  }
  if (language && language !== "all") {
    filters.push(eq(booksTable.language, language));
  }
  if (category && category !== "all") {
    filters.push(eq(booksTable.category, category));
  }
  if (featured) filters.push(eq(booksTable.featured, true));

  const books = await db
    .select()
    .from(booksTable)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(asc(booksTable.featured), asc(booksTable.id));

  const sorted = books.reverse();
  const offset = (page - 1) * limit;
  res.json(ListBooksResponse.parse(sorted.slice(offset, offset + limit)));
});

router.get("/books/:id", async (req, res): Promise<void> => {
  await ensureBooksSeeded();
  const parsed = GetBookParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [book] = await db
    .select()
    .from(booksTable)
    .where(and(eq(booksTable.id, parsed.data.id), eq(booksTable.isRomance, false)));
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  res.json(GetBookResponse.parse(book));
});

router.get("/catalog/summary", async (_req, res): Promise<void> => {
  await ensureBooksSeeded();
  const books = await db.select().from(booksTable).where(eq(booksTable.isRomance, false));
  res.json(
    GetCatalogSummaryResponse.parse({
      total: books.length,
      arabic: books.filter((book) => book.language === "arabic").length,
      english: books.filter((book) => book.language === "english").length,
      featured: books.filter((book) => book.featured).length,
    }),
  );
});

export default router;