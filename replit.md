# School Bookshop

Private school book catalog where students browse Arabic and English books, see the final JOD selling price, and request hand delivery inside school.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/school-bookshop` — React/Vite catalog, book details, request form, organizer board, Arabic/English UI, and light/dark theme.
- `artifacts/api-server/src/routes/books.ts` and `orders.ts` — catalog and school handoff request endpoints.
- `lib/api-spec/openapi.yaml` — source of truth for the API contract and generated client hooks.
- `lib/db/src/schema/books.ts` and `orders.ts` — persisted catalog and request tables.
- `artifacts/api-server/src/lib/catalog.ts` — seed catalog and the selling-price markup rule.

## Architecture decisions

- The displayed price is a school selling price, not the Reshehbook source price: low-cost books receive a small fixed margin and higher-priced books receive a capped percentage-style margin rounded to the nearest half dinar.
- The product intentionally supports browsing and school handoff requests, not shipping, carts, online payments, or public marketplace behavior.
- Cover tones provide a reliable visual fallback when Reshehbook does not expose a permitted product image.

## Product

- Students can search and filter a bilingual catalog, open book details, and request copies for collection at school.
- The organizer can view requests and move them from pending to sourcing, ready, and handed over.
- The interface remembers Arabic/English and light/dark preferences.

## User preferences

- Keep the product focused on books for the user's school and hand delivery inside school.
- Show final selling prices with a modest, transparent margin over source prices.

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI contract.
- The Vite build requires workflow-provided `PORT` and `BASE_PATH`; use the managed workflow or set both when running a manual build.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
