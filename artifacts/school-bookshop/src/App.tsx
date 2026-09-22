import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Redirect, Route, Switch, Router as WouterRouter, useParams, useLocation } from "wouter";
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, ClipboardList, Hand,
  Languages, LogIn, LogOut, Minus, Moon, PackagePlus, Plus, Search, ShieldAlert, ShoppingBag,
  Sun, Trash2, Truck, UserRound, X,
} from "lucide-react";
import {
  getGetBookQueryKey, getGetCatalogSummaryQueryKey, getGetOrderSummaryQueryKey,
  getListBooksQueryKey, getListOrdersQueryKey, useGetBook, useGetCatalogSummary,
  useListBooks, useListOrders, useUpdateOrderStatus, type Book, type ListBooksLanguage,
  type Order, type OrderStatusUpdateStatus,
} from "@workspace/api-client-react";
import { appFetch, type AppUser, type CartItem } from "./lib/app-api";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
type Lang = "en" | "ar";
type Theme = "light" | "dark";
type Status = "pending" | "sourcing" | "ready" | "handed";
const statusOrder: Status[] = ["pending", "sourcing", "ready", "handed"];

const copy = {
  en: {
    catalog: "The school shelf", subtitle: "Browse, request, and collect books inside school.",
    browse: "Browse the shelf", featured: "On the reading table", all: "All books", arabic: "Arabic", english: "English",
    search: "Search by title, author or subject", organizer: "Control room", language: "العربية", theme: "Theme",
    noBooks: "Nothing on this shelf yet", noBooksText: "Try a different search or clear the filters.",
    retry: "Try again", error: "The shelf is taking a moment.", final: "Your school price", by: "by",
    back: "Back to catalog", details: "Book details", quantity: "Copies", addToCart: "Add to cart",
    inCart: "Added to cart", cart: "Your cart", emptyCart: "Your cart is empty", continue: "Continue browsing",
    subtotal: "Books subtotal", delivery: "School handoff", total: "Total", halfDinar: "0.50 JOD",
    checkout: "Complete request", signInFirst: "Sign in with Google before requesting",
    studentName: "Student name", className: "Class / section", contact: "Contact at school",
    notes: "Note for the organizer (optional)", send: "Send request", sending: "Sending request…",
    requested: "Request sent", requestedText: "Your request is now visible to the school team inside the site.",
    history: "My requests", signIn: "Sign in", signUp: "Create account", signOut: "Sign out",
    schoolOnly: "School-only handoff", schoolOnlyText: "No home shipping or online payment. The team meets you at school.",
    statuses: { pending: "Pending", sourcing: "Sourcing", ready: "Ready at school", handed: "Handed over" },
    moveTo: "Move to", welcome: "Good morning, organizer.", boardText: "Orders, stock, and approvals in one place.",
    emptyOrders: "No requests here", noOrdersText: "New student requests will appear in this column.",
    allSubjects: "All subjects", loadMore: "Load more books", manageBooks: "Manage books", managePeople: "Manage people",
    approvals: "Approval inbox", addBook: "Add book", save: "Save book", title: "Title", author: "Author",
    category: "Category", sourcePrice: "Source price", imageUrl: "Cover image URL", description: "Description",
    role: "Role", moderator: "Moderator", student: "Student", owner: "Owner", flag: "Flag report",
    flagged: "Blocked permanently", approve: "Approve", reject: "Reject", pendingApproval: "Awaiting owner approval",
    blocked: "This account has been blocked from ordering.", orders: "Orders", ownerOnly: "Owner only", close: "Close",
  },
  ar: {
    catalog: "رفّ المدرسة", subtitle: "تصفّح الكتب واطلبها واستلمها داخل المدرسة.",
    browse: "تصفّح الرف", featured: "على طاولة القراءة", all: "كل الكتب", arabic: "العربية", english: "الإنجليزية",
    search: "ابحث بالعنوان أو المؤلف أو الموضوع", organizer: "غرفة التحكم", language: "English", theme: "المظهر",
    noBooks: "لا توجد كتب على الرف بعد", noBooksText: "جرّب بحثاً آخر أو أزل الفلاتر.",
    retry: "حاول مجدداً", error: "الرف يحتاج لحظة.", final: "سعرك المدرسي", by: "بقلم",
    back: "العودة إلى الكتالوج", details: "تفاصيل الكتاب", quantity: "النسخ", addToCart: "أضف إلى السلة",
    inCart: "أُضيف إلى السلة", cart: "سلة مشترياتك", emptyCart: "السلة فارغة", continue: "متابعة التصفح",
    subtotal: "مجموع الكتب", delivery: "تسليم داخل المدرسة", total: "الإجمالي", halfDinar: "0.50 د.أ",
    checkout: "إكمال الطلب", signInFirst: "سجّل الدخول عبر Google قبل الطلب",
    studentName: "اسم الطالب", className: "الصف / الشعبة", contact: "التواصل داخل المدرسة",
    notes: "ملاحظة للمنظّم (اختياري)", send: "أرسل الطلب", sending: "جارٍ إرسال الطلب…",
    requested: "تم إرسال الطلب", requestedText: "أصبح طلبك ظاهرًا لفريق المدرسة داخل الموقع.",
    history: "طلباتي", signIn: "تسجيل الدخول", signUp: "إنشاء حساب", signOut: "تسجيل الخروج",
    schoolOnly: "تسليم داخل المدرسة فقط", schoolOnlyText: "لا شحن منزلي ولا دفع إلكتروني. يلتقي بك الفريق داخل المدرسة.",
    statuses: { pending: "قيد الانتظار", sourcing: "جارٍ التوفير", ready: "جاهز في المدرسة", handed: "تم التسليم" },
    moveTo: "نقل إلى", welcome: "صباح الخير أيها المنظّم.", boardText: "الطلبات والمخزون والموافقات في مكان واحد.",
    emptyOrders: "لا توجد طلبات هنا", noOrdersText: "ستظهر طلبات الطلاب الجديدة في هذا العمود.",
    allSubjects: "كل المواضيع", loadMore: "عرض المزيد من الكتب", manageBooks: "إدارة الكتب", managePeople: "إدارة الأشخاص",
    approvals: "صندوق الموافقات", addBook: "إضافة كتاب", save: "حفظ الكتاب", title: "العنوان", author: "المؤلف",
    category: "التصنيف", sourcePrice: "سعر المصدر", imageUrl: "رابط صورة الغلاف", description: "الشرح",
    role: "الدور", moderator: "مشرف", student: "طالب", owner: "مالك", flag: "تبليغ وحظر",
    flagged: "محظور نهائياً", approve: "موافقة", reject: "رفض", pendingApproval: "بانتظار موافقة المالك",
    blocked: "تم حظر هذا الحساب من إرسال الطلبات.", orders: "الطلبات", ownerOnly: "للمالك فقط", close: "إغلاق",
  },
} as const;
type Copy = typeof copy.en | typeof copy.ar;

const PreferenceContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void; theme: Theme; setTheme: (theme: Theme) => void; t: Copy } | null>(null);
const CartContext = createContext<{ items: CartItem[]; add: (book: Book, quantity?: number) => void; remove: (id: number) => void; setQuantity: (id: number, quantity: number) => void; clear: () => void } | null>(null);

function usePreferences() {
  const value = useContext(PreferenceContext);
  if (!value) throw new Error("PreferenceProvider is missing");
  return value;
}

function PreferencesProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("school-bookshop-lang") as Lang) || "en");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("school-bookshop-theme") as Theme) || "light");
  useEffect(() => {
    localStorage.setItem("school-bookshop-lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  useEffect(() => {
    localStorage.setItem("school-bookshop-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return <PreferenceContext.Provider value={{ lang, setLang, theme, setTheme, t: copy[lang] }}>{children}</PreferenceContext.Provider>;
}

function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("CartProvider is missing");
  return value;
}

function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("school-bookshop-cart") || "[]") as CartItem[]; } catch { return []; }
  });
  useEffect(() => localStorage.setItem("school-bookshop-cart", JSON.stringify(items)), [items]);
  const add = (book: Book, quantity = 1) => setItems((current) => {
    const existing = current.find((item) => item.book.id === book.id);
    if (existing) return current.map((item) => item.book.id === book.id ? { ...item, quantity: Math.min(10, item.quantity + quantity) } : item);
    return [...current, { book: { ...book, imageUrl: book.imageUrl ?? null }, quantity: Math.min(10, quantity) }];
  });
  const remove = (id: number) => setItems((current) => current.filter((item) => item.book.id !== id));
  const setQuantity = (id: number, quantity: number) => quantity <= 0 ? remove(id) : setItems((current) => current.map((item) => item.book.id === id ? { ...item, quantity: Math.min(10, quantity) } : item));
  return <CartContext.Provider value={{ items, add, remove, setQuantity, clear: () => setItems([]) }}>{children}</CartContext.Provider>;
}

function useAppUser() {
  const { isSignedIn, isLoaded } = useUser();
  return useQuery<AppUser>({
    queryKey: ["app-user"],
    queryFn: () => appFetch<AppUser>("/api/me"),
    enabled: isLoaded && Boolean(isSignedIn),
    retry: false,
  });
}

function Shell({ children }: { children: ReactNode }) {
  const { lang, setLang, theme, setTheme, t } = usePreferences();
  const { items } = useCart();
  const { isSignedIn } = useUser();
  const { data: appUser } = useAppUser();
  const { signOut } = useClerk();
  return <div className="grain min-h-[100dvh] bg-background text-foreground">
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-4 lg:px-10">
        <Link href="/" className="group flex items-center gap-3" data-testid="link-home">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-6"><BookOpen size={19} /></span>
          <span><span className="block font-serif text-lg font-semibold tracking-tight">School Bookshop</span><span className="hidden font-mono text-[9px] uppercase tracking-[.22em] text-muted-foreground sm:block">read / request / receive</span></span>
        </Link>
        <nav className="flex items-center gap-1.5">
          {appUser && (appUser.role === "owner" || appUser.role === "moderator") && <Link href="/organizer" className="hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"><ClipboardList size={15} /> {t.organizer}</Link>}
          {isSignedIn && <Link href="/orders" className="hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted sm:flex"><PackagePlus size={15} /> {t.history}</Link>}
          <Link href="/cart" className="relative grid h-9 w-9 place-items-center rounded-full border border-border hover:border-primary hover:text-primary" aria-label={t.cart}><ShoppingBag size={16} />{items.length > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] text-primary-foreground">{items.reduce((sum, item) => sum + item.quantity, 0)}</span>}</Link>
          {isSignedIn ? <button onClick={() => void signOut({ redirectUrl: basePath || "/" })} className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold hover:border-primary sm:flex"><LogOut size={14} /> {t.signOut}</button> : <Link href="/sign-in" className="flex items-center gap-1.5 rounded-full border border-primary px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"><LogIn size={14} /> {t.signIn}</Link>}
          <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold hover:border-primary hover:text-primary" data-testid="button-toggle-language"><Languages size={15} /> {t.language}</button>
          <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="grid h-9 w-9 place-items-center rounded-full border border-border hover:border-primary hover:text-primary" aria-label={t.theme}>{theme === "light" ? <Moon size={15} /> : <Sun size={15} />}</button>
        </nav>
      </div>
    </header>
    {children}
    <footer className="mx-auto mt-24 flex max-w-[1380px] flex-col gap-3 border-t border-border px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-10"><span className="font-serif text-base text-foreground">School Bookshop</span><span>{t.schoolOnlyText}</span><span className="font-mono">JOD · {new Date().getFullYear()}</span></footer>
  </div>;
}

function Cover({ book, large = false, lang = "en" }: { book: Book; large?: boolean; lang?: Lang }) {
  const initials = book.title.split(" ").slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const title = lang === "ar" && book.arabicTitle ? book.arabicTitle : book.title;
  return <div className={`book-cover relative overflow-hidden rounded-[3px] ${large ? "aspect-[4/5] w-full max-w-[390px]" : "aspect-[4/5] w-full"}`} style={{ background: book.coverTone || "#b75a3c" }}>
    {book.imageUrl ? <img src={book.imageUrl} alt={title} className="h-full w-full object-cover" /> : <><span className="absolute -right-8 -top-8 h-28 w-28 rounded-full border-[16px] border-background/15" /><span className="absolute bottom-5 left-5 font-mono text-xs tracking-[.28em] text-background/75">{initials}</span><span className="absolute inset-x-5 bottom-12 font-serif text-2xl leading-tight text-background sm:text-3xl" dir={lang === "ar" ? "rtl" : "ltr"}>{title}</span></>}
    {book.featured && <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-accent-foreground">{copy[lang].featured}</span>}
  </div>;
}

function Price({ book, compact = false, lang = "en" }: { book: Book; compact?: boolean; lang?: Lang }) {
  return <div className={compact ? "" : "border-t border-border pt-3"}><span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{copy[lang].final}</span><span className="font-serif text-2xl font-semibold text-primary">{book.sellingPrice.toFixed(2)} <small className="font-sans text-xs font-medium">JOD</small></span>{!compact && <span className="ms-2 font-mono text-[10px] text-muted-foreground line-through">{book.sourcePrice.toFixed(2)} JOD</span>}</div>;
}

function Problem({ message, retry, t }: { message: string; retry: () => void; t: Copy }) {
  return <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center"><CircleHelp className="mx-auto mb-3 text-destructive" size={24} /><p className="font-serif text-xl">{message}</p><button onClick={retry} className="mt-4 rounded-full border border-destructive/40 px-4 py-2 text-xs font-semibold text-destructive">{t.retry}</button></div>;
}

function BookCard({ book, lang, t }: { book: Book; lang: Lang; t: Copy }) {
  return <Link href={`/book/${book.id}`} className="group block"><Cover book={book} lang={lang} /><div className="pt-4"><div className="mb-2 flex items-center justify-between gap-2"><span className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">{book.language === "arabic" ? t.arabic : t.english}</span><span className="text-[10px] text-muted-foreground">{book.category}</span></div><h3 className={`font-serif text-lg leading-tight transition-colors group-hover:text-primary ${lang === "ar" ? "font-sans" : ""}`} dir={lang === "ar" ? "rtl" : "ltr"}>{lang === "ar" && book.arabicTitle ? book.arabicTitle : book.title}</h3><p className="mt-1 text-xs text-muted-foreground">{t.by} {book.author}</p><div className="mt-3"><Price book={book} lang={lang} compact /></div></div></Link>;
}

function Home() {
  const { lang, t } = usePreferences();
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState<ListBooksLanguage>("all");
  const [featured, setFeatured] = useState(false);
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search, language, category, featured]);
  const params = useMemo(() => ({ search: search || undefined, language: language === "all" ? undefined : language, category: category || undefined, featured: featured || undefined, page, limit: page * 60 }), [search, language, category, featured, page]);
  const booksQuery = useListBooks(params, { query: { queryKey: getListBooksQueryKey(params) } });
  const summaryQuery = useGetCatalogSummary({ query: { queryKey: getGetCatalogSummaryQueryKey() } });
  const books = booksQuery.data || [];
  const categories = Array.from(new Set(books.map((book) => book.category))).sort();
  return <Shell><main className="mx-auto max-w-[1380px] px-5 pb-8 lg:px-10">
    <section className="relative grid min-h-[430px] items-end gap-12 overflow-hidden border-b border-border py-16 lg:grid-cols-[1.3fr_.7fr] lg:py-24">
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 animate-[spin_22s_linear_infinite] rounded-full border-[42px] border-primary/10" /><div className="pointer-events-none absolute right-20 top-24 hidden h-28 w-28 rotate-12 border border-secondary/40 lg:block" />
      <div className="relative animate-rise"><p className="mb-5 font-mono text-[10px] uppercase tracking-[.3em] text-primary">08:17 · library corner / school edition</p><h1 className="max-w-3xl font-serif text-5xl leading-[.93] tracking-[-.045em] sm:text-7xl lg:text-[7.6rem]">{t.catalog}</h1><p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">{t.subtitle}</p><a href="#shelf" className="mt-9 inline-flex items-center gap-2 border-b border-primary pb-1 text-sm font-semibold text-primary transition-all hover:gap-4">{t.browse} <ArrowRight size={16} /></a></div>
      <div className="relative hidden justify-self-end lg:block"><div className="rotate-[-6deg] rounded-sm border border-border bg-card p-3 shadow-xl transition-transform duration-500 hover:rotate-2 hover:scale-105"><div className="grid h-56 w-44 place-items-center bg-secondary/20 text-center"><BookOpen className="mb-3 text-secondary" size={30} /><span className="font-serif text-2xl">A good<br />place to<br />begin.</span></div><p className="px-1 pb-1 pt-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">library note / 001</p></div></div>
    </section>
    <section className="grid gap-5 border-b border-border py-8 sm:grid-cols-4">{[["total", summaryQuery.data?.total ?? "—", t.all], ["arabic", summaryQuery.data?.arabic ?? "—", t.arabic], ["english", summaryQuery.data?.english ?? "—", t.english], ["featured", summaryQuery.data?.featured ?? "—", t.featured]].map(([key, value, label], index) => <div key={key} className={`flex items-baseline justify-between sm:block ${index > 0 ? "sm:border-s sm:border-border sm:ps-5" : ""}`}><span className="font-mono text-3xl">{value}</span><span className="ms-3 text-xs text-muted-foreground">{label}</span></div>)}</section>
    <section id="shelf" className="scroll-mt-24 pt-12"><div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.26em] text-primary">01 / {t.browse}</p><h2 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">{featured ? t.featured : t.all}</h2></div><div className="relative w-full lg:max-w-sm"><Search className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} className="h-12 w-full rounded-full border border-border bg-card ps-11 pe-4 text-sm outline-none focus:border-primary" /></div></div>
      <div className="mb-10 flex flex-wrap items-center gap-2 border-y border-border py-3"><button onClick={() => setLanguage("all")} className={`rounded-full px-4 py-2 text-xs font-semibold ${language === "all" ? "bg-foreground text-background" : "hover:bg-muted"}`}>{t.all}</button><button onClick={() => setLanguage("arabic")} className={`rounded-full px-4 py-2 text-xs font-semibold ${language === "arabic" ? "bg-foreground text-background" : "hover:bg-muted"}`}>{t.arabic}</button><button onClick={() => setLanguage("english")} className={`rounded-full px-4 py-2 text-xs font-semibold ${language === "english" ? "bg-foreground text-background" : "hover:bg-muted"}`}>{t.english}</button><select value={category} onChange={(event) => setCategory(event.target.value)} className="ms-auto rounded-full border border-border bg-background px-4 py-2 text-xs outline-none"><option value="">{t.allSubjects}</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><button onClick={() => setFeatured(!featured)} className={`rounded-full border px-4 py-2 text-xs font-semibold ${featured ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{t.featured}</button></div>
      {booksQuery.isLoading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="animate-pulse"><div className="skeleton aspect-[4/5] rounded" /><div className="mt-4 h-4 w-3/4 rounded skeleton" /></div>)}</div> : booksQuery.isError ? <Problem message={t.error} retry={() => void booksQuery.refetch()} t={t} /> : books.length === 0 ? <div className="border border-dashed border-border px-6 py-20 text-center"><Search className="mx-auto mb-4" /><h3 className="font-serif text-2xl">{t.noBooks}</h3><p className="mt-2 text-sm text-muted-foreground">{t.noBooksText}</p></div> : <><div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">{books.map((book, index) => <div key={book.id} className="animate-rise" style={{ animationDelay: `${Math.min(index * 35, 260)}ms` }}><BookCard book={book} lang={lang} t={t} /></div>)}</div>{books.length === params.limit && <div className="mt-14 text-center"><button onClick={() => setPage((current) => current + 1)} className="rounded-full border border-border px-5 py-3 text-xs font-semibold hover:border-primary hover:text-primary">{t.loadMore}</button></div>}</>}
    </section>
    <section className="mt-24 grid gap-8 border-y border-border py-12 md:grid-cols-[.7fr_1.3fr] md:items-center"><div><p className="font-mono text-[10px] uppercase tracking-[.26em] text-primary">02 / {t.schoolOnly}</p><h2 className="mt-3 max-w-sm font-serif text-4xl leading-tight">{t.schoolOnly}</h2></div><div className="flex max-w-xl gap-4 text-sm leading-7 text-muted-foreground"><Truck className="mt-1 shrink-0 text-secondary" size={21} /><p>{t.schoolOnlyText}</p></div></section>
  </main></Shell>;
}

function AddToCart({ book }: { book: Book }) {
  const { t } = usePreferences();
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  return <div className="flex flex-wrap items-center gap-3"><div className="flex items-center rounded-full border border-border"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="grid h-11 w-10 place-items-center"><Minus size={14} /></button><span className="w-8 text-center font-mono text-sm">{quantity}</span><button type="button" onClick={() => setQuantity(Math.min(10, quantity + 1))} className="grid h-11 w-10 place-items-center"><Plus size={14} /></button></div><button type="button" onClick={() => { add(book, quantity); setAdded(true); }} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:-translate-y-0.5">{added ? <><Check size={16} /> {t.inCart}</> : <><ShoppingBag size={16} /> {t.addToCart}</>}</button></div>;
}

function BookDetail() {
  const { lang, t } = usePreferences();
  const params = useParams<{ id?: string }>();
  const id = Number(params.id);
  const bookQuery = useGetBook(id, { query: { enabled: Number.isFinite(id), queryKey: getGetBookQueryKey(id) } });
  if (bookQuery.isLoading) return <Shell><main className="mx-auto max-w-[1100px] px-5 py-16"><div className="skeleton aspect-[4/5] max-w-[390px]" /></main></Shell>;
  if (bookQuery.isError || !bookQuery.data) return <Shell><main className="mx-auto max-w-[1100px] px-5 py-20"><Problem message={t.error} retry={() => void bookQuery.refetch()} t={t} /></main></Shell>;
  const book = bookQuery.data;
  return <Shell><main className="mx-auto max-w-[1100px] px-5 pb-12 pt-8 lg:px-10"><Link href="/" className="mb-12 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary"><ArrowLeft size={15} /> {t.back}</Link><div className="grid gap-12 md:grid-cols-[.8fr_1.2fr] lg:gap-20"><div><Cover book={book} lang={lang} large /></div><div className="animate-rise"><div className="flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase tracking-[.2em] text-muted-foreground"><span>{book.language === "arabic" ? t.arabic : t.english}</span><span className="h-1 w-1 rounded-full bg-primary" /><span>{book.category}</span></div><h1 className={`mt-5 font-serif text-5xl leading-[.95] tracking-tight sm:text-7xl ${lang === "ar" ? "font-sans leading-tight" : ""}`} dir={lang === "ar" ? "rtl" : "ltr"}>{lang === "ar" && book.arabicTitle ? book.arabicTitle : book.title}</h1><p className="mt-5 text-sm text-muted-foreground">{t.by} <span className="text-foreground">{book.author}</span></p><div className="my-8"><Price book={book} lang={lang} /></div><div className="border-t border-border pt-7"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">{t.details}</p><p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground">{book.description || t.details}</p></div><div className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8"><div className="mb-6 flex items-start justify-between gap-5"><div><p className="font-serif text-2xl">{t.addToCart}</p><p className="mt-1 text-xs text-muted-foreground">{t.schoolOnly}</p></div><Hand className="text-primary" size={22} /></div><AddToCart book={book} /></div></div></div></main></Shell>;
}

function CartPage() {
  const { t, lang } = usePreferences();
  const { items, remove, setQuantity } = useCart();
  const subtotal = items.reduce((sum, item) => sum + item.book.sellingPrice * item.quantity, 0);
  const delivery = items.length ? 0.5 : 0;
  return <Shell><main className="mx-auto max-w-[1000px] px-5 pb-16 pt-12 lg:px-10"><p className="font-mono text-[10px] uppercase tracking-[.28em] text-primary">cart / school handoff</p><h1 className="mt-3 font-serif text-5xl tracking-tight sm:text-7xl">{t.cart}</h1>{items.length === 0 ? <div className="mt-12 rounded-2xl border border-dashed border-border px-6 py-20 text-center"><ShoppingBag className="mx-auto mb-4 text-muted-foreground" size={32} /><h2 className="font-serif text-3xl">{t.emptyCart}</h2><Link href="/" className="mt-7 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">{t.continue}</Link></div> : <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_330px]"><div className="space-y-4">{items.map((item) => <article key={item.book.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4"><div className="w-20 shrink-0"><Cover book={item.book as Book} lang={lang} /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-4"><div><h2 className="font-serif text-xl leading-tight">{lang === "ar" && item.book.arabicTitle ? item.book.arabicTitle : item.book.title}</h2><p className="mt-1 text-xs text-muted-foreground">{item.book.author}</p></div><button onClick={() => remove(item.book.id)} aria-label={t.emptyCart} className="text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button></div><div className="mt-5 flex items-center justify-between"><div className="flex items-center rounded-full border border-border"><button onClick={() => setQuantity(item.book.id, item.quantity - 1)} className="grid h-8 w-8 place-items-center"><Minus size={13} /></button><span className="w-8 text-center font-mono text-xs">{item.quantity}</span><button onClick={() => setQuantity(item.book.id, item.quantity + 1)} className="grid h-8 w-8 place-items-center"><Plus size={13} /></button></div><span className="font-mono text-sm text-primary">{(item.book.sellingPrice * item.quantity).toFixed(2)} JOD</span></div></div></article>)}</div><aside className="h-fit rounded-2xl border border-border bg-card p-6"><h2 className="font-serif text-2xl">{t.total}</h2><div className="mt-6 space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">{t.subtotal}</span><span>{subtotal.toFixed(2)} JOD</span></div><div className="flex justify-between"><span className="text-muted-foreground">{t.delivery}</span><span>{delivery.toFixed(2)} JOD</span></div><div className="flex justify-between border-t border-border pt-3 font-semibold"><span>{t.total}</span><span className="text-primary">{(subtotal + delivery).toFixed(2)} JOD</span></div></div><Link href="/checkout" className="mt-7 flex h-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{t.checkout} <ArrowRight size={16} className="ms-2" /></Link><p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">{t.schoolOnlyText}</p></aside></div>}</main></Shell>;
}

function Checkout() {
  const { t, lang } = usePreferences();
  const { items, clear } = useCart();
  const { isSignedIn } = useUser();
  const { data: appUser } = useAppUser();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ studentName: "", className: "", contact: "", notes: "" });
  const subtotal = items.reduce((sum, item) => sum + item.book.sellingPrice * item.quantity, 0);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  if (!isSignedIn) return <Shell><main className="mx-auto max-w-[680px] px-5 py-20 text-center"><LogIn className="mx-auto mb-4 text-primary" size={34} /><h1 className="font-serif text-4xl">{t.signInFirst}</h1><Link href="/sign-in" className="mt-7 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">{t.signIn}</Link></main></Shell>;
  if (appUser?.blocked) return <Shell><main className="mx-auto max-w-[680px] px-5 py-20 text-center"><ShieldAlert className="mx-auto mb-4 text-destructive" size={34} /><h1 className="font-serif text-4xl">{t.blocked}</h1></main></Shell>;
  if (sent) return <Shell><main className="mx-auto max-w-[680px] px-5 py-24 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary text-secondary-foreground"><Check size={24} /></div><h1 className="mt-6 font-serif text-4xl">{t.requested}</h1><p className="mt-3 text-sm text-muted-foreground">{t.requestedText}</p><Link href="/orders" className="mt-7 inline-flex rounded-full border border-border px-5 py-3 text-sm font-semibold">{t.history}</Link></main></Shell>;
  if (!items.length) return <Shell><main className="mx-auto max-w-[680px] px-5 py-20 text-center"><h1 className="font-serif text-4xl">{t.emptyCart}</h1><Link href="/" className="mt-7 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">{t.continue}</Link></main></Shell>;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setPending(true); setError("");
    try {
      for (const item of items) await appFetch("/api/orders", { method: "POST", body: JSON.stringify({ bookId: item.book.id, studentName: form.studentName, className: form.className, contact: form.contact, quantity: item.quantity, notes: form.notes || null }) });
      clear(); setSent(true);
    } catch (err) { setError(err instanceof Error ? err.message : t.error); } finally { setPending(false); }
  };
  return <Shell><main className="mx-auto max-w-[760px] px-5 pb-16 pt-12 lg:px-10"><Link href="/cart" className="mb-10 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary"><ArrowLeft size={15} /> {t.cart}</Link><h1 className="font-serif text-5xl tracking-tight">{t.checkout}</h1><div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8"><div className="mb-7 flex items-center justify-between border-b border-border pb-5"><span className="text-sm text-muted-foreground">{t.total}</span><span className="font-serif text-2xl text-primary">{(subtotal + 0.5).toFixed(2)} JOD</span></div><form onSubmit={submit} className="space-y-4" dir={lang === "ar" ? "rtl" : "ltr"}><div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold">{t.studentName}<input required minLength={2} value={form.studentName} onChange={(event) => update("studentName", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" /></label><label className="block text-xs font-semibold">{t.className}<input required value={form.className} onChange={(event) => update("className", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" /></label></div><label className="block text-xs font-semibold">{t.contact}<input required minLength={3} value={form.contact} onChange={(event) => update("contact", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" /></label><label className="block text-xs font-semibold">{t.notes}<textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-primary" /></label>{error && <p className="text-xs text-destructive">{error}</p>}<button disabled={pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{pending ? t.sending : <>{t.send}<ArrowRight size={16} /></>}</button></form></div></main></Shell>;
}

function MyOrders() {
  const { t } = usePreferences();
  const { isSignedIn } = useUser();
  const ordersQuery = useQuery<Order[]>({ queryKey: ["my-orders"], queryFn: () => appFetch<Order[]>("/api/orders/mine"), enabled: isSignedIn });
  if (!isSignedIn) return <Shell><main className="mx-auto max-w-[700px] px-5 py-20 text-center"><h1 className="font-serif text-4xl">{t.signInFirst}</h1><Link href="/sign-in" className="mt-7 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">{t.signIn}</Link></main></Shell>;
  return <Shell><main className="mx-auto max-w-[900px] px-5 pb-16 pt-12 lg:px-10"><h1 className="font-serif text-5xl">{t.history}</h1>{ordersQuery.isLoading ? <div className="mt-8 h-40 rounded-2xl skeleton" /> : !ordersQuery.data?.length ? <div className="mt-8 rounded-2xl border border-dashed border-border p-16 text-center text-sm text-muted-foreground">{t.emptyOrders}</div> : <div className="mt-8 space-y-3">{ordersQuery.data.map((order) => <article key={order.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-serif text-xl">{order.bookTitle}</p><p className="mt-1 text-xs text-muted-foreground">{order.quantity} {t.quantity.toLowerCase()} · {order.price.toFixed(2)} JOD</p></div><span className="rounded-full bg-muted px-3 py-2 text-xs font-semibold">{t.statuses[order.status as Status]}</span></article>)}</div>}</main></Shell>;
}

type BookDraft = {
  title: string; arabicTitle: string; author: string; language: "arabic" | "english";
  category: string; sourcePrice: string; imageUrl: string; description: string;
};
const emptyDraft: BookDraft = { title: "", arabicTitle: "", author: "", language: "english", category: "Books", sourcePrice: "", imageUrl: "", description: "" };

function BookManager() {
  const { t } = usePreferences();
  const { data: appUser } = useAppUser();
  const [draft, setDraft] = useState<BookDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const booksQuery = useListBooks({ page: 1, limit: 60 }, { query: { queryKey: getListBooksQueryKey({ page: 1, limit: 60 }) } });
  const update = (key: keyof BookDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage("");
    const body = { ...draft, sourcePrice: Number(draft.sourcePrice), arabicTitle: draft.arabicTitle || null, imageUrl: draft.imageUrl || null, description: draft.description || null };
    try {
      await appFetch(`/api/books${editingId ? `/${editingId}` : ""}`, { method: editingId ? "PATCH" : "POST", body: JSON.stringify(body) });
      setDraft(emptyDraft); setEditingId(null); setMessage(appUser?.role === "moderator" ? t.pendingApproval : t.save);
      await booksQuery.refetch();
    } catch (error) { setMessage(error instanceof Error ? error.message : t.error); }
  };
  const edit = (book: Book) => { setEditingId(book.id); setDraft({ title: book.title, arabicTitle: book.arabicTitle || "", author: book.author, language: book.language, category: book.category, sourcePrice: String(book.sourcePrice), imageUrl: book.imageUrl || "", description: book.description || "" }); };
  const remove = async (id: number) => { if (!window.confirm("Delete this book?")) return; try { await appFetch(`/api/books/${id}`, { method: "DELETE" }); await booksQuery.refetch(); setMessage(appUser?.role === "moderator" ? t.pendingApproval : t.save); } catch (error) { setMessage(error instanceof Error ? error.message : t.error); } };
  return <section className="rounded-2xl border border-border bg-card p-5 sm:p-7"><div className="mb-6 flex items-center justify-between gap-4"><h2 className="font-serif text-3xl">{t.manageBooks}</h2><PackagePlus className="text-primary" /></div><form onSubmit={submit} className="grid gap-3 md:grid-cols-2"><input required placeholder={t.title} value={draft.title} onChange={(event) => update("title", event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm" /><input placeholder={t.title + " (AR)"} value={draft.arabicTitle} onChange={(event) => update("arabicTitle", event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm" /><input required placeholder={t.author} value={draft.author} onChange={(event) => update("author", event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm" /><select value={draft.language} onChange={(event) => update("language", event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm"><option value="english">{t.english}</option><option value="arabic">{t.arabic}</option></select><input required placeholder={t.category} value={draft.category} onChange={(event) => update("category", event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm" /><input required type="number" min="0.1" step="0.5" placeholder={t.sourcePrice} value={draft.sourcePrice} onChange={(event) => update("sourcePrice", event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm" /><input type="url" placeholder={t.imageUrl} value={draft.imageUrl} onChange={(event) => update("imageUrl", event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm md:col-span-2" /><textarea placeholder={t.description} value={draft.description} onChange={(event) => update("description", event.target.value)} rows={3} className="rounded-xl border border-input bg-background px-3 py-3 text-sm md:col-span-2" /><div className="flex items-center gap-3 md:col-span-2"><button className="rounded-full bg-primary px-5 py-3 text-xs font-semibold text-primary-foreground">{editingId ? t.save : t.addBook}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft); }} className="rounded-full border border-border px-5 py-3 text-xs font-semibold"><X size={14} className="me-1 inline" />{t.close}</button>}<span className="text-xs text-muted-foreground">{message}</span></div></form><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(booksQuery.data || []).slice(0, 12).map((book) => <article key={book.id} className="flex items-center gap-3 rounded-xl border border-border p-3"><div className="h-14 w-11 shrink-0"><Cover book={book} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{book.title}</p><p className="text-[11px] text-muted-foreground">{book.sellingPrice.toFixed(2)} JOD</p></div><button onClick={() => edit(book)} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-primary"><Plus size={14} /></button><button onClick={() => void remove(book.id)} className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button></article>)}</div></section>;
}

function PeopleManager() {
  const { t } = usePreferences();
  const usersQuery = useQuery<AppUser[]>({ queryKey: ["admin-users"], queryFn: () => appFetch<AppUser[]>("/api/users") });
  const refresh = () => void usersQuery.refetch();
  const changeRole = async (id: number, role: "student" | "moderator") => { await appFetch(`/api/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }); refresh(); };
  const flag = async (id: number) => { await appFetch(`/api/users/${id}/flag`, { method: "POST", body: JSON.stringify({ reason: "Repeated unfulfilled requests" }) }); refresh(); };
  const removeModerator = async (id: number) => { await appFetch(`/api/users/${id}`, { method: "DELETE" }); refresh(); };
  return <section className="rounded-2xl border border-border bg-card p-5 sm:p-7"><div className="mb-6 flex items-center justify-between"><h2 className="font-serif text-3xl">{t.managePeople}</h2><UserRound className="text-primary" /></div><div className="space-y-3">{(usersQuery.data || []).map((user) => <article key={user.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted">{user.imageUrl ? <img src={user.imageUrl} alt="" className="h-full w-full rounded-full object-cover" /> : <UserRound size={16} />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div><span className="rounded-full bg-muted px-3 py-1 text-[10px] font-semibold">{user.role === "owner" ? t.owner : user.role === "moderator" ? t.moderator : t.student}</span>{user.role !== "owner" && <><select value={user.role} onChange={(event) => void changeRole(user.id, event.target.value as "student" | "moderator")} className="rounded-full border border-border bg-background px-3 py-2 text-xs"><option value="student">{t.student}</option><option value="moderator">{t.moderator}</option></select>{user.role === "moderator" && <button onClick={() => void removeModerator(user.id)} className="rounded-full border border-border px-3 py-2 text-xs">{t.reject}</button>}{!user.blocked && <button onClick={() => void flag(user.id)} className="flex items-center gap-1 rounded-full border border-destructive/40 px-3 py-2 text-xs text-destructive"><ShieldAlert size={13} />{t.flag}</button>}{user.blocked && <span className="text-xs text-destructive">{t.flagged}</span>}</>}</article>)}</div></section>;
}

type ChangeRequest = { id: number; action: string; bookId: number | null; title: string | null; requestedBy: number; status: string; createdAt: string };
function ApprovalManager() {
  const { t } = usePreferences();
  const requestsQuery = useQuery<ChangeRequest[]>({ queryKey: ["book-change-requests"], queryFn: () => appFetch<ChangeRequest[]>("/api/book-change-requests") });
  const decide = async (id: number, decision: "approve" | "reject") => { await appFetch(`/api/book-change-requests/${id}`, { method: "PATCH", body: JSON.stringify({ decision }) }); void requestsQuery.refetch(); };
  return <section className="rounded-2xl border border-border bg-card p-5 sm:p-7"><div className="mb-6 flex items-center justify-between"><h2 className="font-serif text-3xl">{t.approvals}</h2><ShieldAlert className="text-primary" /></div>{!requestsQuery.data?.filter((request) => request.status === "pending").length ? <p className="text-sm text-muted-foreground">{t.emptyOrders}</p> : <div className="space-y-3">{requestsQuery.data.filter((request) => request.status === "pending").map((request) => <article key={request.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center"><div className="flex-1"><p className="font-semibold">{request.action} {request.title || `#${request.bookId}`}</p><p className="text-xs text-muted-foreground">{t.pendingApproval}</p></div><button onClick={() => void decide(request.id, "approve")} className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground">{t.approve}</button><button onClick={() => void decide(request.id, "reject")} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">{t.reject}</button></article>)}</div>}</section>;
}

function Organizer() {
  const { t } = usePreferences();
  const { data: appUser, isLoading: userLoading } = useAppUser();
  const queryClient = useQueryClient();
  const isStaff = appUser?.role === "owner" || appUser?.role === "moderator";
  const ordersQuery = useListOrders({ status: "all" }, { query: { enabled: isStaff, queryKey: getListOrdersQueryKey({ status: "all" }) } });
  const summaryQuery = useQuery<{ total: number; pending: number; sourcing: number; ready: number; handed: number }>({ queryKey: ["orders-summary"], queryFn: () => appFetch("/api/orders/summary"), enabled: isStaff });
  const update = useUpdateOrderStatus();
  const orders = ordersQuery.data || [];
  const move = (order: Order, status: Status) => update.mutate({ id: order.id, data: { status: status as OrderStatusUpdateStatus } }, { onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ status: "all" }) }); void queryClient.invalidateQueries({ queryKey: ["orders-summary"] }); } });
  if (userLoading) return <Shell><main className="mx-auto max-w-[1100px] px-5 py-20"><div className="h-40 rounded-2xl skeleton" /></main></Shell>;
  if (!isStaff) return <Shell><main className="mx-auto max-w-[700px] px-5 py-24 text-center"><ShieldAlert className="mx-auto mb-4 text-destructive" /><h1 className="font-serif text-4xl">{t.ownerOnly}</h1><p className="mt-3 text-sm text-muted-foreground">{t.signInFirst}</p></main></Shell>;
  return <Shell><main className="mx-auto max-w-[1380px] px-5 pb-16 pt-12 lg:px-10"><div className="mb-12 flex flex-col justify-between gap-6 border-b border-border pb-10 md:flex-row md:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.28em] text-primary">organizer / live shelf</p><h1 className="mt-3 font-serif text-5xl tracking-tight sm:text-7xl">{t.welcome}</h1><p className="mt-3 text-sm text-muted-foreground">{t.boardText}</p></div><div className="grid grid-cols-4 gap-4 rounded-2xl border border-border bg-card p-4">{statusOrder.map((status) => <div key={status} className="min-w-[48px] text-center"><span className="block font-mono text-xl">{summaryQuery.data?.[status] ?? "—"}</span><span className="mt-1 block text-[10px] text-muted-foreground">{t.statuses[status]}</span></div>)}</div></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{statusOrder.map((status, columnIndex) => <section key={status} className="min-h-[260px] rounded-2xl bg-muted/50 p-3"><div className="mb-3 flex items-center justify-between px-2 py-2"><h2 className="text-xs font-bold">{t.statuses[status]}</h2><span className="grid h-6 min-w-6 place-items-center rounded-full bg-background px-1 font-mono text-[10px]">{orders.filter((order) => order.status === status).length}</span></div><div className="space-y-3">{orders.filter((order) => order.status === status).map((order) => <article key={order.id} className="rounded-xl border border-border bg-card p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><p className="font-serif text-lg leading-tight">{order.bookTitle}</p><span className="font-mono text-[10px] text-muted-foreground">#{order.id}</span></div><p className="mt-3 text-xs font-semibold">{order.studentName} <span className="font-normal text-muted-foreground">· {order.className}</span></p><p className="mt-1 text-xs text-muted-foreground">{order.contact} · {order.quantity} {t.quantity.toLowerCase()}</p><div className="mt-4 flex items-center justify-between border-t border-border pt-3"><span className="font-mono text-xs text-primary">{(order.price * order.quantity).toFixed(2)} JOD</span>{columnIndex < statusOrder.length - 1 && <button disabled={update.isPending} onClick={() => move(order, statusOrder[columnIndex + 1])} className="flex items-center gap-1 text-[10px] font-bold text-primary disabled:opacity-50">{t.moveTo} {t.statuses[statusOrder[columnIndex + 1]]}<ChevronRight size={13} /></button>}</div></article>)}</div></section>)}</div><div className="mt-10 grid gap-6 xl:grid-cols-2"><BookManager />{appUser.role === "owner" && <PeopleManager />}{appUser.role === "owner" && <ApprovalManager />}</div></main></Shell>;
}

function SignInPage() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}

function SignUpPage() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}

function NotFound() {
  const { t } = usePreferences();
  return <Shell><main className="mx-auto max-w-[700px] px-5 py-28 text-center"><p className="font-mono text-xs text-primary">404 / shelf gap</p><h1 className="mt-4 font-serif text-6xl">This page wandered off.</h1><Link href="/" className="mt-8 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">{t.back}</Link></main></Shell>;
}

function Router() {
  return <Switch>
    <Route path="/sign-in/*?" component={SignInPage} />
    <Route path="/sign-up/*?" component={SignUpPage} />
    <Route path="/" component={Home} />
    <Route path="/catalog" component={Home} />
    <Route path="/book/:id" component={BookDetail} />
    <Route path="/cart" component={CartPage} />
    <Route path="/checkout" component={Checkout} />
    <Route path="/orders" component={MyOrders} />
    <Route path="/organizer" component={Organizer} />
    <Route component={NotFound} />
  </Switch>;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#b75a3c",
    colorForeground: "#202633",
    colorMutedForeground: "#68707b",
    colorDanger: "#b43f35",
    colorBackground: "#fbf9f4",
    colorInput: "#fbf9f4",
    colorInputForeground: "#202633",
    colorNeutral: "#d8d0c4",
    fontFamily: "DM Sans, sans-serif",
    borderRadius: "0.85rem",
  },
  elements: {
    cardBox: "bg-[#fbf9f4] rounded-2xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#202633] font-serif",
    headerSubtitle: "text-[#68707b]",
    socialButtonsBlockButtonText: "text-[#202633]",
    formFieldLabel: "text-[#202633]",
    footerActionLink: "text-[#b75a3c]",
    footerActionText: "text-[#68707b]",
    dividerText: "text-[#68707b]",
    logoBox: "bg-transparent",
    logoImage: "rounded-full",
    formButtonPrimary: "bg-[#b75a3c] hover:bg-[#9e4a31]",
    formFieldInput: "bg-[#fbf9f4] text-[#202633] border-[#d8d0c4]",
    main: "bg-transparent",
  },
};

function ClerkRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{ signIn: { start: { title: "Welcome back", subtitle: "Sign in with Google to request school books" } }, signUp: { start: { title: "Join the school shelf", subtitle: "Create your student account" } } }}
    routerPush={(to) => setLocation(to.startsWith(basePath) ? to.slice(basePath.length) || "/" : to)}
    routerReplace={(to) => setLocation(to.startsWith(basePath) ? to.slice(basePath.length) || "/" : to, { replace: true })}
  >
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider><CartProvider><Router /></CartProvider></PreferencesProvider>
    </QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  if (!clerkPubKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
  return <WouterRouter base={basePath}><ClerkRoutes /></WouterRouter>;
}

export default App;