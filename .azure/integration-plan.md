# Integration hand-off

## Backend
- Project folder: .
- Run command: npm run dev
- Build command: npm run build
- Port: 3000
- Health endpoint: /api/health
- Auth: local UI-only session, no external auth provider configured

## Frontend
- Project folder: .
- Dev command: npm run dev
- Build command: npm run build
- API seam: server-rendered pages call `lib/server-api.ts`; route handlers in `app/api/*` use Prisma/PostgreSQL.
- Mock-data pages reviewed: app/page.tsx, app/products/page.tsx, app/products/[slug]/page.tsx, app/cart/page.tsx, app/checkout/page.tsx, app/account/page.tsx, app/admin/**. Demo product/order/report data has been removed from active pages.
- `lib/store-data.ts` contains shared types and currency formatting only; no mock-client subsystem is used.

## API routes
- GET /api/health
- GET /api/products
- GET /api/products/[slug]
- GET /api/cart
- POST /api/cart/items
- POST /api/orders
- POST /api/payments/payos/create
- POST /api/webhooks/payos
- GET /api/admin/reports/overview
- GET /api/admin/orders
- GET /api/admin/inventory

## Database
- Type: PostgreSQL
- Migration tool: Prisma (recommended)
- Directory: prisma/
- Connection env: DATABASE_URL
- No seed data to add during integration.

## Shared types
- Shared store data lives in lib/store-data.ts.
- Shared types for app data can be promoted to a dedicated types module if needed during integration.

## Services
- Essential: database, storage, product catalog, orders, payments, report overview
- Enhancement: webhook validation, customer history, analytics drilldowns

## Integration Results
- Initial schema migration was verified against Neon with a read-only diff, reconciled as applied, and the additive PayOS order-code migration was deployed. `npm run migrate:status` reports the database schema is up to date. No integration seed data was created.
- `npm run build`, `npm test`, and Prisma client generation pass. All 11 API routes were exercised against Neon without HTTP 500s; all available pages rendered successfully and made live API calls. Product detail returned the expected 404 because the catalog is empty.
- PayOS SDK now creates hosted links for persisted orders and verifies webhook signatures with the configured checksum key. The invalid-signature response was verified; no valid order exists to exercise a successful payment redirect without adding test rows.
- Neon currently has no product/order rows; live catalog/cart/report responses are empty/zero. Storage reports `not_configured` and remains outside this integration run.
- Project status: Integrated. Local development handoff follows.
