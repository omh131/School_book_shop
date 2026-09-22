import { db, booksTable } from "@workspace/db";
import { count, eq, inArray } from "drizzle-orm";
import { logger } from "./logger";

const markup = (sourcePrice: number) => {
  if (sourcePrice <= 5) return 0.5;
  if (sourcePrice <= 10) return 1;
  if (sourcePrice <= 20) return 2;
  return Math.ceil(sourcePrice * 0.15 * 2) / 2;
};

export const sellingPriceFor = (sourcePrice: number) =>
  Math.round((sourcePrice + markup(sourcePrice)) * 2) / 2;

let seedPromise: Promise<void> | null = null;
let syncPromise: Promise<void> | null = null;
let romancePurgePromise: Promise<void> | null = null;

const seedBooks = [
  {
    title: "Great Expectations",
    arabicTitle: "آمال عظيمة",
    author: "Charles Dickens",
    language: "english",
    category: "Classic",
    sourcePrice: 8,
    description:
      "A sweeping coming-of-age story about ambition, loyalty, and the people who shape us.",
    featured: true,
    coverTone: "plum",
  },
  {
    title: "Pride and Prejudice",
    arabicTitle: "كبرياء وهوى",
    author: "Jane Austen",
    language: "english",
    category: "Classic",
    sourcePrice: 7,
    description:
      "Jane Austen's sharp, warm novel of first impressions, family, and unexpected love.",
    featured: true,
    coverTone: "coral",
  },
  {
    title: "The Little Prince",
    arabicTitle: "الأمير الصغير",
    author: "Antoine de Saint-Exupéry",
    language: "english",
    category: "Young adult",
    sourcePrice: 5,
    description:
      "A short, beautiful fable about friendship, wonder, and seeing what matters.",
    featured: true,
    coverTone: "lime",
  },
  {
    title: "Frankenstein",
    arabicTitle: "فرانكشتاين",
    author: "Mary Shelley",
    language: "english",
    category: "Classic",
    sourcePrice: 6,
    description:
      "Mary Shelley's atmospheric story asks what we owe the life we create.",
    featured: false,
    coverTone: "ink",
  },
  {
    title: "Jane Eyre",
    arabicTitle: "جين آير",
    author: "Charlotte Brontë",
    language: "english",
    category: "Classic",
    sourcePrice: 9,
    description:
      "A determined heroine searches for dignity, independence, and a place to belong.",
    featured: false,
    coverTone: "honey",
  },
  {
    title: "The Count of Monte Cristo",
    arabicTitle: "كونت مونت كريستو",
    author: "Alexandre Dumas",
    language: "english",
    category: "Adventure",
    sourcePrice: 12,
    description:
      "A grand adventure of betrayal, escape, and the long shadow of revenge.",
    featured: false,
    coverTone: "blue",
  },
  {
    title: "أرض زيكولا",
    arabicTitle: "أرض زيكولا",
    author: "عمرو عبد الحميد",
    language: "arabic",
    category: "Fantasy",
    sourcePrice: 4,
    description:
      "رواية خيالية عن أرض لا يتعامل أهلها بالمال، بل بوحدات الذكاء.",
    featured: true,
    coverTone: "lime",
  },
  {
    title: "الفيل الأزرق",
    arabicTitle: "الفيل الأزرق",
    author: "أحمد مراد",
    language: "arabic",
    category: "Mystery",
    sourcePrice: 5,
    description:
      "طبيب يعود إلى العمل في مستشفى الأمراض النفسية ليواجه ماضيه وأسرارًا غامضة.",
    featured: true,
    coverTone: "blue",
  },
  {
    title: "هيبتا",
    arabicTitle: "هيبتا",
    author: "محمد صادق",
    language: "arabic",
    category: "Contemporary",
    sourcePrice: 6,
    description:
      "أربع حكايات تحاول فهم المراحل المختلفة للحب والعلاقات الإنسانية.",
    featured: false,
    coverTone: "coral",
  },
  {
    title: "في قلبي أنثى عبرية",
    arabicTitle: "في قلبي أنثى عبرية",
    author: "خولة حمدي",
    language: "arabic",
    category: "Contemporary",
    sourcePrice: 7,
    description:
      "رواية عن الهوية والإيمان والروابط التي تنشأ بين أشخاص من عوالم مختلفة.",
    featured: false,
    coverTone: "plum",
  },
  {
    title: "رجال في الشمس",
    arabicTitle: "رجال في الشمس",
    author: "غسان كنفاني",
    language: "arabic",
    category: "Literature",
    sourcePrice: 4,
    description:
      "رواية قصيرة مؤثرة عن ثلاثة فلسطينيين يحاولون البحث عن حياة أفضل.",
    featured: false,
    coverTone: "honey",
  },
  {
    title: "رسائل من القرآن",
    arabicTitle: "رسائل من القرآن",
    author: "أدهم شرقاوي",
    language: "arabic",
    category: "Reflection",
    sourcePrice: 5,
    description:
      "تأملات أدبية وروحية تستلهم من القرآن رسائل للقلب والحياة اليومية.",
    featured: false,
    coverTone: "ink",
  },
];

export async function ensureBooksSeeded() {
  await purgeRomanceBooks();
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    const [{ total }] = await db.select({ total: count() }).from(booksTable);
    if (Number(total) > 0) return;

    await db.insert(booksTable).values(
      seedBooks.map((book) => ({
        ...book,
        sellingPrice: sellingPriceFor(book.sourcePrice),
        sourceUrl: `https://reshehbook.com/search?q=${encodeURIComponent(book.title)}`,
        imageUrl: null,
      })),
    );
  })();

  try {
    await seedPromise;
  } catch (error) {
    seedPromise = null;
    throw error;
  }
}

function isRomanceBook(book: { title: string; arabicTitle?: string | null; category?: string | null }) {
  const text = `${book.title} ${book.arabicTitle ?? ""} ${book.category ?? ""}`.toLowerCase();
  return /(romance|romantic|love story|pride and prejudice|jane eyre|رومانسي|رومانس|عشق|حب|كبرياء وهوى)/i.test(text);
}

async function purgeRomanceBooks() {
  if (romancePurgePromise) return romancePurgePromise;
  romancePurgePromise = (async () => {
    const books = await db
      .select({ id: booksTable.id, title: booksTable.title, arabicTitle: booksTable.arabicTitle, category: booksTable.category, isRomance: booksTable.isRomance })
      .from(booksTable);
    const ids = books.filter((book) => book.isRomance || isRomanceBook(book)).map((book) => book.id);
    if (ids.length) await db.delete(booksTable).where(inArray(booksTable.id, ids));
  })();
  try {
    await romancePurgePromise;
  } finally {
    romancePurgePromise = null;
  }
}

type ReshehProduct = {
  id: number;
  title: string;
  handle: string;
  body_html?: string;
  product_type?: string;
  vendor?: string;
  tags?: string[];
  variants?: Array<{ price?: string }>;
  images?: Array<{ src?: string }>;
};

const arabicText = /[\u0600-\u06ff]/;

function categoryFor(product: ReshehProduct) {
  const category = product.product_type?.trim();
  if (category) return category.slice(0, 80);
  const title = product.title.toLowerCase();
  if (/(رواية|novel|fiction|story)/i.test(title)) return "Literature";
  if (/(أطفال|طفل|children|young|kids)/i.test(title)) return "Young readers";
  if (/(دين|قرآن|إسلام|islam|quran|faith)/i.test(title)) return "Reflection";
  if (/(تاريخ|history|war|حرب)/i.test(title)) return "History";
  return "Books";
}

function descriptionFor(product: ReshehProduct) {
  if (!product.body_html) return null;
  const text = product.body_html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 500) : null;
}

export async function syncReshehbookCatalog() {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    await ensureBooksSeeded();
    const existing = await db
      .select({ sourceUrl: booksTable.sourceUrl })
      .from(booksTable);
    const known = new Set(existing.map((book) => book.sourceUrl));
    const incoming: Array<typeof booksTable.$inferInsert> = [];

    for (let page = 1; page <= 120; page += 1) {
      const response = await fetch(
        `https://reshehbook.com/products.json?limit=250&page=${page}`,
      );
      if (!response.ok) {
        throw new Error(`Reshehbook returned ${response.status} on page ${page}`);
      }
      const payload = (await response.json()) as { products?: ReshehProduct[] };
      const products = payload.products ?? [];
      if (products.length === 0) break;

      for (const product of products) {
        const sourceUrl = `https://reshehbook.com/products/${product.handle}`;
        const sourcePrice = Number(product.variants?.[0]?.price ?? 0);
        if (!product.title || !sourcePrice || known.has(sourceUrl)) continue;
        incoming.push({
          title: product.title,
          arabicTitle: arabicText.test(product.title) ? product.title : null,
          author: product.tags?.[0] || product.vendor || "Reshehbook",
          language: arabicText.test(product.title) ? "arabic" : "english",
          category: categoryFor(product),
          sourcePrice,
          sellingPrice: sellingPriceFor(sourcePrice),
          sourceUrl,
          description: descriptionFor(product),
          featured: false,
          isRomance: isRomanceBook({
            title: product.title,
            arabicTitle: arabicText.test(product.title) ? product.title : null,
            category: categoryFor(product),
          }),
          coverTone: arabicText.test(product.title) ? "coral" : "plum",
          imageUrl: product.images?.[0]?.src || null,
        });
        if (incoming[incoming.length - 1].isRomance) incoming.pop();
        known.add(sourceUrl);
      }

      if (products.length < 250) break;
    }

    for (let index = 0; index < incoming.length; index += 100) {
      await db.insert(booksTable).values(incoming.slice(index, index + 100));
    }
    logger.info({ imported: incoming.length }, "Reshehbook catalog sync complete");
  })();

  try {
    await syncPromise;
  } catch (error) {
    logger.warn({ err: error }, "Reshehbook catalog sync failed; keeping current catalog");
  } finally {
    syncPromise = null;
  }
}