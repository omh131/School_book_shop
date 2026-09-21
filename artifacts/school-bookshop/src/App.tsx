import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, ClipboardList, Hand, Languages, LayoutGrid, Moon, Search, Sun, Truck, X } from 'lucide-react';
import {
  getGetBookQueryKey,
  getGetCatalogSummaryQueryKey,
  getGetOrderSummaryQueryKey,
  getListBooksQueryKey,
  getListOrdersQueryKey,
  useCreateOrder,
  useGetBook,
  useGetCatalogSummary,
  useGetOrderSummary,
  useListBooks,
  useListOrders,
  useUpdateOrderStatus,
  type Book,
  type ListBooksLanguage,
  type Order,
  type OrderStatusUpdateStatus,
} from '@workspace/api-client-react';

const queryClient = new QueryClient();
type Lang = 'en' | 'ar';
type Theme = 'light' | 'dark';
type Status = 'pending' | 'sourcing' | 'ready' | 'handed';
const statusOrder: Status[] = ['pending', 'sourcing', 'ready', 'handed'];
const copy = {
  en: {
    catalog: 'The school shelf', subtitle: 'A small, carefully chosen catalog for curious minds.',
    browse: 'Browse the shelf', featured: 'On the reading table', all: 'All books', arabic: 'Arabic', english: 'English',
    search: 'Search by title, author or subject', request: 'Request for hand delivery', schoolOnly: 'School-only handoff',
    schoolOnlyText: 'Every request is brought to school and handed to the student directly. No payment or shipping outside the school.',
    organizer: 'Organizer board', language: 'العربية', theme: 'Theme', noBooks: 'Nothing on this shelf yet',
    noBooksText: 'Try a different search or clear the filters to see the full catalog.',
    retry: 'Try again', loading: 'Setting the shelf…', error: 'The shelf is taking a moment.',
    source: 'Source price', final: 'Your school price', by: 'by', featuredLabel: 'Featured',
    readMore: 'Read the note', back: 'Back to catalog', details: 'Book details', quantity: 'Copies',
    yourName: 'Student name', className: 'Class / section', contact: 'Contact (school email or phone)',
    notes: 'A note for the organizer (optional)', send: 'Send request', sending: 'Sending request…',
    requested: 'Request received', requestedText: 'We’ll bring this book to school and find you in person.',
    another: 'Request another book', statuses: { pending: 'Pending', sourcing: 'Sourcing', ready: 'Ready at school', handed: 'Handed over' },
    moveTo: 'Move to', total: 'Total requests', welcome: 'Good morning, organizer.', boardText: 'Move each request along as the shelf comes together.',
    emptyOrders: 'No requests here', noOrdersText: 'New student requests will appear in this column.',
    close: 'Close', allSubjects: 'All subjects', handoff: 'Inside-school delivery, always.', loadMore: 'Load more books',
  },
  ar: {
    catalog: 'رفّ المدرسة', subtitle: 'مجموعة صغيرة منتقاة للعقول الفضولية.',
    browse: 'تصفّح الرف', featured: 'على طاولة القراءة', all: 'كل الكتب', arabic: 'العربية', english: 'الإنجليزية',
    search: 'ابحث بالعنوان أو المؤلف أو الموضوع', request: 'اطلب التوصيل داخل المدرسة', schoolOnly: 'تسليم داخل المدرسة',
    schoolOnlyText: 'كل طلب يصل إلى المدرسة ويُسلّم للطالب مباشرة. لا دفع أو شحن خارج المدرسة.',
    organizer: 'لوحة المنظّم', language: 'English', theme: 'المظهر', noBooks: 'لا توجد كتب على الرف بعد',
    noBooksText: 'جرّب بحثاً آخر أو أزل الفلاتر لرؤية القائمة كاملة.',
    retry: 'حاول مجدداً', loading: 'نرتّب الرف…', error: 'الرف يحتاج لحظة.',
    source: 'سعر المصدر', final: 'سعرك المدرسي', by: 'بقلم', featuredLabel: 'مختار',
    readMore: 'اقرأ النبذة', back: 'العودة إلى الكتالوج', details: 'تفاصيل الكتاب', quantity: 'النسخ',
    yourName: 'اسم الطالب', className: 'الصف / الشعبة', contact: 'التواصل (بريد المدرسة أو الهاتف)',
    notes: 'ملاحظة للمنظّم (اختياري)', send: 'أرسل الطلب', sending: 'جارٍ إرسال الطلب…',
    requested: 'تم استلام الطلب', requestedText: 'سنحضر الكتاب إلى المدرسة ونبحث عنك شخصياً.',
    another: 'اطلب كتاباً آخر', statuses: { pending: 'قيد الانتظار', sourcing: 'جارٍ التوفير', ready: 'جاهز في المدرسة', handed: 'تم التسليم' },
    moveTo: 'نقل إلى', total: 'إجمالي الطلبات', welcome: 'صباح الخير أيها المنظّم.', boardText: 'انقل كل طلب مع اكتمال الرف.',
    emptyOrders: 'لا توجد طلبات هنا', noOrdersText: 'ستظهر طلبات الطلاب الجديدة في هذا العمود.',
    close: 'إغلاق', allSubjects: 'كل المواضيع', handoff: 'توصيل داخل المدرسة دائماً.', loadMore: 'عرض المزيد من الكتب',
  },
} as const;
type Copy = typeof copy.en | typeof copy.ar;

function usePreferences() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('school-bookshop-lang') as Lang) || 'en');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('school-bookshop-theme') as Theme) || 'light');
  useEffect(() => { localStorage.setItem('school-bookshop-lang', lang); document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; }, [lang]);
  useEffect(() => { localStorage.setItem('school-bookshop-theme', theme); document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);
  return { lang, setLang, theme, setTheme, t: copy[lang] };
}

function Shell({ children }: { children: ReactNode }) {
  const { lang, setLang, theme, setTheme, t } = usePreferences();
  return (
    <div className="grain min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-4 lg:px-10">
          <Link href="/" className="group flex items-center gap-3" data-testid="link-home">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-6"><BookOpen size={19} /></span>
            <span><span className="block font-serif text-lg font-semibold tracking-tight">School Bookshop</span><span className="hidden font-mono text-[9px] uppercase tracking-[.22em] text-muted-foreground sm:block">read / request / receive</span></span>
          </Link>
          <nav className="flex items-center gap-1.5">
            <Link href="/organizer" className="hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex" data-testid="link-organizer"><ClipboardList size={15} /> {t.organizer}</Link>
            <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold transition-colors hover:border-primary hover:text-primary" data-testid="button-toggle-language"><Languages size={15} /> {t.language}</button>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="grid h-9 w-9 place-items-center rounded-full border border-border transition-colors hover:border-primary hover:text-primary" aria-label={t.theme} data-testid="button-toggle-theme">{theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}</button>
          </nav>
        </div>
      </header>
      {children}
      <footer className="mx-auto mt-24 flex max-w-[1380px] flex-col gap-3 border-t border-border px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <span className="font-serif text-base text-foreground">School Bookshop</span><span>{t.handoff}</span><span className="font-mono">JOD · {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}

function Cover({ book, large = false, lang = 'en' }: { book: Book; large?: boolean; lang?: Lang }) {
  const initials = book.title.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  const coverTitle = lang === 'ar' && book.arabicTitle ? book.arabicTitle : book.title;
  return (
    <div className={`book-cover relative overflow-hidden rounded-[3px] ${large ? 'aspect-[4/5] w-full max-w-[390px]' : 'aspect-[4/5] w-full'}`} style={{ background: book.coverTone || '#b75a3c' }}>
      {book.imageUrl ? <img src={book.imageUrl} alt={coverTitle} className="h-full w-full object-cover" /> : <><span className="absolute -right-8 -top-8 h-28 w-28 rounded-full border-[16px] border-background/15" /><span className="absolute bottom-5 left-5 font-mono text-xs tracking-[.28em] text-background/75">{initials}</span><span className={`absolute inset-x-5 bottom-12 font-serif text-2xl leading-tight text-background sm:text-3xl ${lang === 'ar' ? 'font-sans' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>{coverTitle}</span></>}
      {book.featured && <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-accent-foreground">{copy[lang].featuredLabel}</span>}
    </div>
  );
}

function Price({ book, compact = false, lang = 'en' }: { book: Book; compact?: boolean; lang?: Lang }) {
  return <div className={compact ? '' : 'border-t border-border pt-3'}><span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{copy[lang].final}</span><span className="font-serif text-2xl font-semibold text-primary">{book.sellingPrice.toFixed(2)} <small className="font-sans text-xs font-medium">JOD</small></span>{!compact && <span className="ms-2 font-mono text-[10px] text-muted-foreground line-through">{book.sourcePrice.toFixed(2)} JOD</span>}</div>;
}

function Skeletons() { return <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{[1, 2, 3, 4].map((n) => <div key={n} className="animate-pulse" data-testid={`skeleton-book-${n}`}><div className="skeleton aspect-[4/5] rounded-[3px]" /><div className="mt-4 h-4 w-3/4 rounded skeleton" /><div className="mt-2 h-3 w-1/2 rounded skeleton" /></div>)}</div>; }

function Problem({ message, retry, t }: { message: string; retry: () => void; t: Copy }) { return <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center" data-testid="state-error"><CircleHelp className="mx-auto mb-3 text-destructive" size={24} /><p className="font-serif text-xl">{message}</p><button onClick={retry} className="mt-4 rounded-full border border-destructive/40 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10" data-testid="button-retry">{t.retry}</button></div>; }

function BookCard({ book, lang, t }: { book: Book; lang: Lang; t: Copy }) {
  return <Link href={`/book/${book.id}`} className="group block" data-testid={`card-book-${book.id}`}><Cover book={book} lang={lang} /><div className="pt-4"><div className="mb-2 flex items-center justify-between gap-2"><span className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">{book.language === 'arabic' ? t.arabic : t.english}</span><span className="text-[10px] text-muted-foreground">{book.category}</span></div><h3 className={`font-serif text-lg leading-tight transition-colors group-hover:text-primary ${lang === 'ar' ? 'font-sans' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>{lang === 'ar' && book.arabicTitle ? book.arabicTitle : book.title}</h3><p className="mt-1 text-xs text-muted-foreground">{t.by} {book.author}</p><div className="mt-3"><Price book={book} lang={lang} compact /></div></div></Link>;
}

function Home() {
  const { lang, t } = usePreferences();
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState<ListBooksLanguage>('all');
  const [featured, setFeatured] = useState(false);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search, language, category, featured]);
  const params = useMemo(() => ({ search: search || undefined, language: language === 'all' ? undefined : language, category: category || undefined, featured: featured || undefined, page, limit: page * 60 }), [search, language, category, featured, page]);
  const booksQuery = useListBooks(params, { query: { queryKey: getListBooksQueryKey(params) } });
  const summaryQuery = useGetCatalogSummary({ query: { queryKey: getGetCatalogSummaryQueryKey() } });
  const books = booksQuery.data || [];
  const categories = Array.from(new Set(books.map((book) => book.category))).sort();
  return <Shell><main className="mx-auto max-w-[1380px] px-5 pb-8 lg:px-10">
    <section className="relative grid min-h-[430px] items-end gap-12 overflow-hidden border-b border-border py-16 lg:grid-cols-[1.3fr_.7fr] lg:py-24">
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full border-[42px] border-primary/10" /><div className="pointer-events-none absolute right-20 top-24 hidden h-28 w-28 rotate-12 border border-secondary/40 lg:block" />
      <div className="relative animate-rise"><p className="mb-5 font-mono text-[10px] uppercase tracking-[.3em] text-primary">08:17 · library corner / school edition</p><h1 className="max-w-3xl font-serif text-5xl leading-[.93] tracking-[-.045em] sm:text-7xl lg:text-[7.6rem]">{t.catalog}</h1><p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">{t.subtitle}</p><a href="#shelf" className="mt-9 inline-flex items-center gap-2 border-b border-primary pb-1 text-sm font-semibold text-primary transition-all hover:gap-4" data-testid="link-browse">{t.browse} <ArrowRight size={16} /></a></div>
      <div className="relative hidden justify-self-end lg:block"><div className="rotate-[-6deg] rounded-sm border border-border bg-card p-3 shadow-xl"><div className="grid h-56 w-44 place-items-center bg-secondary/20 text-center"><BookOpen className="mb-3 text-secondary" size={30} /><span className="font-serif text-2xl">A good<br />place to<br />begin.</span></div><p className="px-1 pb-1 pt-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">library note / 001</p></div></div>
    </section>
    <section className="grid gap-5 border-b border-border py-8 sm:grid-cols-4" data-testid="catalog-summary">{[['total', summaryQuery.data?.total ?? '—', t.all], ['arabic', summaryQuery.data?.arabic ?? '—', t.arabic], ['english', summaryQuery.data?.english ?? '—', t.english], ['featured', summaryQuery.data?.featured ?? '—', t.featured]].map(([key, value, label], i) => <div key={key} className={`flex items-baseline justify-between sm:block ${i > 0 ? 'sm:border-s border-border sm:ps-5' : ''}`}><span className="font-mono text-3xl text-foreground">{value}</span><span className="ms-3 text-xs text-muted-foreground">{label}</span></div>)}</section>
    <section id="shelf" className="scroll-mt-24 pt-12"><div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.26em] text-primary">01 / {t.browse}</p><h2 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">{featured ? t.featured : t.all}</h2></div><div className="relative w-full lg:max-w-sm"><Search className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} className="h-12 w-full rounded-full border border-border bg-card ps-11 pe-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary" data-testid="input-search-books" /></div></div>
      <div className="mb-10 flex flex-wrap items-center gap-2 border-y border-border py-3"><button onClick={() => setLanguage('all')} className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${language === 'all' ? 'bg-foreground text-background' : 'hover:bg-muted'}`} data-testid="button-filter-all">{t.all}</button><button onClick={() => setLanguage('arabic')} className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${language === 'arabic' ? 'bg-foreground text-background' : 'hover:bg-muted'}`} data-testid="button-filter-arabic">{t.arabic}</button><button onClick={() => setLanguage('english')} className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${language === 'english' ? 'bg-foreground text-background' : 'hover:bg-muted'}`} data-testid="button-filter-english">{t.english}</button><select value={category} onChange={(event) => setCategory(event.target.value)} className="ms-auto rounded-full border border-border bg-background px-4 py-2 text-xs outline-none focus:border-primary" data-testid="select-filter-category"><option value="">{t.allSubjects}</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><button onClick={() => setFeatured(!featured)} className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${featured ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary'}`} data-testid="button-filter-featured">{t.featured}</button></div>
      {booksQuery.isLoading ? <Skeletons /> : booksQuery.isError ? <Problem message={t.error} retry={() => booksQuery.refetch()} t={t} /> : books.length === 0 ? <div className="border border-dashed border-border px-6 py-20 text-center" data-testid="state-empty-books"><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-muted"><Search size={18} /></div><h3 className="font-serif text-2xl">{t.noBooks}</h3><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{t.noBooksText}</p></div> : <><div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">{books.map((book, index) => <div key={book.id} className="animate-rise" style={{ animationDelay: `${Math.min(index * 55, 330)}ms` }}><BookCard book={book} lang={lang} t={t} /></div>)}</div>{books.length === params.limit && <div className="mt-14 text-center"><button onClick={() => setPage((current) => current + 1)} className="rounded-full border border-border px-5 py-3 text-xs font-semibold transition-colors hover:border-primary hover:text-primary" data-testid="button-load-more">{t.loadMore}</button></div>}</>}
    </section>
    <section className="mt-24 grid gap-8 border-y border-border py-12 md:grid-cols-[.7fr_1.3fr] md:items-center"><div><p className="font-mono text-[10px] uppercase tracking-[.26em] text-primary">02 / {t.schoolOnly}</p><h2 className="mt-3 max-w-sm font-serif text-4xl leading-tight">{t.schoolOnly}</h2></div><div className="flex max-w-xl gap-4 text-sm leading-7 text-muted-foreground"><Truck className="mt-1 shrink-0 text-secondary" size={21} /><p>{t.schoolOnlyText}</p></div></section>
  </main></Shell>;
}

function RequestForm({ book, lang, t }: { book: Book; lang: Lang; t: Copy }) {
  const queryClient = useQueryClient();
  const create = useCreateOrder();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ studentName: '', className: '', contact: '', quantity: 1, notes: '' });
  const update = (key: keyof typeof form, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); create.mutate({ data: { bookId: book.id, studentName: form.studentName, className: form.className, contact: form.contact, quantity: Number(form.quantity), notes: form.notes || null } }, { onSuccess: () => { setSent(true); void queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ status: 'all' }) }); void queryClient.invalidateQueries({ queryKey: getGetOrderSummaryQueryKey() }); } }); };
  if (sent) return <div className="rounded-2xl border border-secondary/30 bg-secondary/10 p-7 text-center animate-rise" data-testid="state-request-success"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary text-secondary-foreground"><Check size={22} /></div><h3 className="mt-5 font-serif text-3xl">{t.requested}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{t.requestedText}</p><button onClick={() => setSent(false)} className="mt-6 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:border-primary hover:text-primary" data-testid="button-request-another">{t.another}</button></div>;
  return <form onSubmit={submit} className="space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}><div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold">{t.yourName}<input required minLength={2} value={form.studentName} onChange={(e) => update('studentName', e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-student-name" /></label><label className="block text-xs font-semibold">{t.className}<input required value={form.className} onChange={(e) => update('className', e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-class-name" /></label></div><div className="grid gap-4 sm:grid-cols-[1fr_110px]"><label className="block text-xs font-semibold">{t.contact}<input required minLength={3} value={form.contact} onChange={(e) => update('contact', e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-contact" /></label><label className="block text-xs font-semibold">{t.quantity}<input required min={1} max={10} type="number" value={form.quantity} onChange={(e) => update('quantity', Number(e.target.value))} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-quantity" /></label></div><label className="block text-xs font-semibold">{t.notes}<textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} className="mt-2 w-full resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-primary" data-testid="input-notes" /></label>{create.isError && <p className="text-xs text-destructive" data-testid="status-request-error">{t.error}</p>}<button type="submit" disabled={create.isPending} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60" data-testid="button-submit-request">{create.isPending ? t.sending : <>{t.send}<ArrowRight size={16} /></>}</button></form>;
}

function BookDetail() {
  const { lang, t } = usePreferences();
  const params = useParams<{ id?: string }>();
  const id = Number(params.id);
  const bookQuery = useGetBook(id, { query: { enabled: Number.isFinite(id), queryKey: getGetBookQueryKey(id) } });
  if (bookQuery.isLoading) return <Shell><main className="mx-auto max-w-[1100px] px-5 py-16 lg:px-10"><div className="grid gap-12 md:grid-cols-2"><div className="skeleton aspect-[4/5] max-w-[390px]" /><div className="space-y-5"><div className="skeleton h-5 w-28" /><div className="skeleton h-20 w-full" /><div className="skeleton h-4 w-2/3" /></div></div></main></Shell>;
  if (bookQuery.isError || !bookQuery.data) return <Shell><main className="mx-auto max-w-[1100px] px-5 py-20 lg:px-10"><Problem message={t.error} retry={() => bookQuery.refetch()} t={t} /></main></Shell>;
  const book = bookQuery.data;
  return <Shell><main className="mx-auto max-w-[1100px] px-5 pb-12 pt-8 lg:px-10"><Link href="/" className="mb-12 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary" data-testid="link-back-catalog"><ArrowLeft size={15} /> {t.back}</Link><div className="grid gap-12 md:grid-cols-[.8fr_1.2fr] lg:gap-20"><div><Cover book={book} lang={lang} large /></div><div className="animate-rise"><div className="flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase tracking-[.2em] text-muted-foreground"><span>{book.language === 'arabic' ? t.arabic : t.english}</span><span className="h-1 w-1 rounded-full bg-primary" /><span>{book.category}</span></div><h1 className={`mt-5 font-serif text-5xl leading-[.95] tracking-tight sm:text-7xl ${lang === 'ar' ? 'font-sans leading-tight' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>{lang === 'ar' && book.arabicTitle ? book.arabicTitle : book.title}</h1><p className="mt-5 text-sm text-muted-foreground">{t.by} <span className="text-foreground">{book.author}</span></p><div className="my-8"><Price book={book} lang={lang} /></div><div className="border-t border-border pt-7"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">{t.details}</p><p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground">{book.description || t.readMore}</p></div><div className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8"><div className="mb-6 flex items-start justify-between gap-5"><div><p className="font-serif text-2xl">{t.request}</p><p className="mt-1 text-xs text-muted-foreground">{t.schoolOnly}</p></div><Hand className="text-primary" size={22} /></div><RequestForm book={book} lang={lang} t={t} /></div></div></div></main></Shell>;
}

function Organizer() {
  const { t } = usePreferences();
  const queryClient = useQueryClient();
  const ordersQuery = useListOrders({ status: 'all' }, { query: { queryKey: getListOrdersQueryKey({ status: 'all' }) } });
  const summaryQuery = useGetOrderSummary({ query: { queryKey: getGetOrderSummaryQueryKey() } });
  const update = useUpdateOrderStatus();
  const orders = ordersQuery.data || [];
  const move = (order: Order, status: Status) => update.mutate({ id: order.id, data: { status: status as OrderStatusUpdateStatus } }, { onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ status: 'all' }) }); void queryClient.invalidateQueries({ queryKey: getGetOrderSummaryQueryKey() }); } });
  return <Shell><main className="mx-auto max-w-[1380px] px-5 pb-12 pt-12 lg:px-10"><div className="mb-12 flex flex-col justify-between gap-6 border-b border-border pb-10 md:flex-row md:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.28em] text-primary">organizer / live shelf</p><h1 className="mt-3 font-serif text-5xl tracking-tight sm:text-7xl">{t.welcome}</h1><p className="mt-3 text-sm text-muted-foreground">{t.boardText}</p></div><div className="grid grid-cols-4 gap-4 rounded-2xl border border-border bg-card p-4">{statusOrder.map((status) => <div key={status} className="min-w-[48px] text-center"><span className="block font-mono text-xl">{summaryQuery.data?.[status] ?? '—'}</span><span className="mt-1 block text-[10px] text-muted-foreground">{t.statuses[status]}</span></div>)}</div></div>{ordersQuery.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{statusOrder.map((status) => <div key={status} className="h-60 rounded-2xl skeleton" />)}</div> : ordersQuery.isError ? <Problem message={t.error} retry={() => ordersQuery.refetch()} t={t} /> : orders.length === 0 ? <div className="border border-dashed border-border px-6 py-20 text-center" data-testid="state-empty-orders"><ClipboardList className="mx-auto mb-4 text-muted-foreground" size={28} /><h2 className="font-serif text-3xl">{t.emptyOrders}</h2><p className="mt-2 text-sm text-muted-foreground">{t.noOrdersText}</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{statusOrder.map((status, columnIndex) => <section key={status} className="min-h-[300px] rounded-2xl bg-muted/50 p-3" data-testid={`column-status-${status}`}><div className="mb-3 flex items-center justify-between px-2 py-2"><h2 className="text-xs font-bold">{t.statuses[status]}</h2><span className="grid h-6 min-w-6 place-items-center rounded-full bg-background px-1 font-mono text-[10px]">{orders.filter((order) => order.status === status).length}</span></div><div className="space-y-3">{orders.filter((order) => order.status === status).map((order) => <article key={order.id} className="rounded-xl border border-border bg-card p-4 shadow-sm transition-transform hover:-translate-y-0.5" data-testid={`card-order-${order.id}`}><div className="flex items-start justify-between gap-3"><p className="font-serif text-lg leading-tight">{order.bookTitle}</p><span className="font-mono text-[10px] text-muted-foreground">#{order.id}</span></div><p className="mt-3 text-xs font-semibold">{order.studentName} <span className="font-normal text-muted-foreground">· {order.className}</span></p><p className="mt-1 text-xs text-muted-foreground">{order.contact} · {order.quantity} {t.quantity.toLowerCase()}</p>{order.notes && <p className="mt-3 border-s-2 border-primary/40 ps-2 text-xs italic text-muted-foreground">{order.notes}</p>}<div className="mt-4 flex items-center justify-between border-t border-border pt-3"><span className="font-mono text-xs text-primary">{order.price.toFixed(2)} JOD</span>{columnIndex < statusOrder.length - 1 && <button disabled={update.isPending} onClick={() => move(order, statusOrder[columnIndex + 1])} className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline disabled:opacity-50" data-testid={`button-move-order-${order.id}`}>{t.moveTo} {t.statuses[statusOrder[columnIndex + 1]]} <ChevronRight size={13} /></button>}{columnIndex === statusOrder.length - 1 && <span className="flex items-center gap-1 text-[10px] text-secondary"><Check size={13} /> {t.statuses.handed}</span>}</div></article>)}</div></section>)}</div>}</main></Shell>;
}

function NotFound() { const { t } = usePreferences(); return <Shell><main className="mx-auto max-w-[700px] px-5 py-28 text-center"><p className="font-mono text-xs text-primary">404 / shelf gap</p><h1 className="mt-4 font-serif text-6xl">This page wandered off.</h1><Link href="/" className="mt-8 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground" data-testid="link-not-found-home">{t.back}</Link></main></Shell>; }

function Router() { return <Switch><Route path="/" component={Home} /><Route path="/book/:id" component={BookDetail} /><Route path="/organizer" component={Organizer} /><Route component={NotFound} /></Switch>; }

function App() { return <QueryClientProvider client={queryClient}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter></QueryClientProvider>; }

export default App;
