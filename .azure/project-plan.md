# Project Plan

**Status**: Integrated
**Created**: 2026-10-13
**Mode**: NEW
**Execution Mode**: auto

---

## 1. Project Overview

**Goal**: Xây dựng cửa hàng D2C tiếng Việt chuyên bán khô bò thực vật High-Protein vị Tây Bắc, với storefront hiện đại cho khách hàng và khu vực quản trị mạnh mẽ cho nhân viên/admin. Mỗi module được thiết kế để kiểm thử độc lập và dễ mở rộng theo các luồng bán hàng, thanh toán, tồn kho và báo cáo doanh thu.

**App Type**: Full-stack SSR

**API Login**: Yes

**Mode**: NEW

**Deployment Plan**: No deployment plan found

---

## 2. Backend — API

| Component | Technology |
|-----------|-----------|
| **Language** | TypeScript |
| **Runtime** | Node |
| **Package Manager** | npm |
| **Test Runner** | vitest |
| **Mocking Library** | vi.mock |
| **Test Command** | npm test |
| **Orchestration** | docker-compose |

---

## 3. Frontend — Web App

| Component | Technology |
|-----------|-----------|
| **Language** | TypeScript |
| **Framework** | Next.js App Router |
| **Package Manager** | npm |
| **Test Runner** | vitest |
| **Mocking Library** | vi.mock |
| **Test Command** | npm test |

---

## 4. Services Required

| Azure Service | Role in App | Environment Variable | Default Value (Local) | Classification |
|---------------|------------|---------------------|----------------------|----------------|
| Blob Storage | Store product images, thumbnails, and uploaded media files | STORAGE_CONNECTION_STRING | UseDevelopmentStorage=true | Essential |
| PostgreSQL | Primary relational data store for users, products, inventory, orders, payment states, and reporting | DATABASE_URL | postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/bohoch | Essential |

---

## 5. Prerequisites

### Run

| Tool | Service(s) | Installed | Version |
|------|------------|-----------|---------|
| Node.js | frontend, backend | ✅ | v24.15.0 |
| npm | frontend, backend | ✅ | 11.12.1 |
| Docker Engine | frontend, backend | ✅ | Docker version 29.1.5, build 0e6fee6 |
| Docker Compose | frontend, backend | ✅ | v5.0.1 |
| pnpm | frontend, backend | ❓ | Unknown |
| Prisma CLI | backend | ❓ | Not confirmed by environment scan |

### Debug

| Tool | Service(s) | Installed | Version |
|------|------------|-----------|---------|
| ms-vscode.vscode-typescript-next | frontend, backend | ✅ | Installed in current VS Code session |
| Docker Desktop / Docker Engine | frontend, backend | ✅ | Docker version 29.1.5, build 0e6fee6 |
| VS Code Node debug tooling | frontend, backend | ❓ | Not confirmed |

---

## 6. Design System & UI

**Component Library**: Fluent UI v9
**Style Direction**: Mẫu storefront hiện đại với tông nâu đỏ ấm, không gian sáng, các card sản phẩm rõ ràng và nhấn mạnh trải nghiệm mua hàng nhanh, tin cậy, thương hiệu rõ nét.
**Typography**: Inter, system-ui

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | #9c4f2a | Màu thương hiệu chính cho CTA, nút thêm vào giỏ, active nav, tiêu điểm mua hàng |
| `accent`  | #f59e0b | Nổi bật ưu đãi, trạng thái bán chạy, badge khuyến mãi, highlight sản phẩm |
| `surface` | #f8f5f1 | Nền trang, card sản phẩm, khu vực danh sách, bố cục thanh lịch |
| `text` | #1f2937 | Văn bản chính cho tên sản phẩm, tiêu đề, mô tả và thông tin chi tiết |
| `muted` | #6b7280 | Văn bản phụ, nhãn chất lượng, mô tả phụ, thời gian, trạng thái |
| `border` | #e5e7eb | Chia tách vùng, viền card, khung input, bảng danh sách |

### Pages

| Page | Route | Purpose | Layout |
|------|-------|---------|--------|
| Home | `/` | Trang chủ giới thiệu thương hiệu, sản phẩm bán chạy và ưu đãi mới | `hero + grid + card-list` |
| Products | `/products` | Danh sách sản phẩm theo danh mục, lọc và sắp xếp | `header + filter + grid` |
| Product Detail | `/products/bo-kho-tay-bac` | Trang chi tiết sản phẩm, mô tả, biến thể và thêm giỏ hàng | `two-column(media+meta) + action-bar` |
| Cart | `/cart` | Giỏ hàng và tổng đơn hàng | `table + action-bar` |
| Checkout | `/checkout` | Thanh toán, giao hàng và xác nhận đơn | `form + two-column(summary+delivery)` |
| Account | `/account` | Thông tin khách hàng, theo dõi đơn hàng và lịch sử mua hàng | `tabs + table` |
| Admin Dashboard | `/admin` | Tổng quan doanh thu, đơn hàng và tồn kho | `hero + kpi-row + table` |

### Sample Content

```
Home — best sellers:
| Sản phẩm | Giá | Đánh giá | Trạng thái |
| Bò khô Tây Bắc 250g | 249.000đ | 4.9/5 | Còn hàng |
| Bò khô hương sả 200g | 219.000đ | 4.8/5 | Còn hàng |
| Bò khô tỏi ớt 300g | 269.000đ | 4.9/5 | Sắp hết |

Products — inventory:
| Sản phẩm | Danh mục | Giá | Tồn kho | Trạng thái |
| Bò khô Tây Bắc 250g | Cao protein | 249.000đ | 128 | Còn hàng |
| Bò khô vị cay 200g | Thưởng thức | 219.000đ | 87 | Còn hàng |
| Bò khô nướng 300g | Gia đình | 269.000đ | 24 | Sắp hết |

Product Detail — bo-kho-tay-bac:
| Tùy chọn | Giá | Khối lượng | Trạng thái |
| 250g | 249.000đ | 250g | Còn hàng |
| 500g | 459.000đ | 500g | Còn hàng |
| Combo 2 hộp | 890.000đ | 500g x2 | Khuyến mãi |

Cart — line items:
| Sản phẩm | Số lượng | Đơn giá | Thành tiền |
| Bò khô Tây Bắc 250g | 2 | 249.000đ | 498.000đ |
| Bò khô hương sả 200g | 1 | 219.000đ | 219.000đ |
| Vận chuyển | 1 | 35.000đ | 35.000đ |

Checkout — fulfillment:
| Họ tên | Địa chỉ | Phương thức | Trạng thái |
| Nguyễn Thị Hà | 118 Trần Hưng Đạo, Hải Phòng | Giao hàng nhanh | Chưa thanh toán |
| Lê Văn Dũng | 12 Nguyễn Thị Minh Khai, Hà Nội | VietQR | Đã xác nhận |

Account — recent purchases:
| Mã đơn | Tổng tiền | Trạng thái | Ngày |
| #BKH-2041 | 698.000đ | Đang giao | 12/10/2026 |
| #BKH-2039 | 1.240.000đ | Đã thanh toán | 09/10/2026 |
| #BKH-2035 | 480.000đ | Hoàn tất | 04/10/2026 |

Admin Dashboard — revenue summary:
| Mục tiêu | Giá trị | So với tháng trước |
| Doanh thu ngày | 58.400.000đ | +18.4% |
| Số đơn hoàn tất | 462 | +12.1% |
| Tồn kho cảnh báo | 24 SKU | -5 SKU |
```

---

## 7. Project Structure

```
.
├─ app/
│  ├─ (shop)/
│  │  ├─ page.tsx
│  │  ├─ products/page.tsx
│  │  ├─ products/[slug]/page.tsx
│  │  ├─ cart/page.tsx
│  │  ├─ checkout/page.tsx
│  │  └─ account/page.tsx
│  ├─ admin/
│  │  ├─ dashboard/page.tsx
│  │  ├─ products/page.tsx
│  │  ├─ orders/page.tsx
│  │  ├─ inventory/page.tsx
│  │  └─ reports/page.tsx
│  ├─ api/
│  │  ├─ auth/[...nextauth]/route.ts
│  │  ├─ health/route.ts
│  │  ├─ products/route.ts
│  │  ├─ products/[slug]/route.ts
│  │  ├─ cart/route.ts
│  │  ├─ orders/route.ts
│  │  └─ payment/sepay/webhook/route.ts
│  ├─ globals.css
│  └─ layout.tsx
├─ components/
│  ├─ storefront/
│  ├─ admin/
│  ├─ cart/
│  ├─ checkout/
│  └─ ui/
├─ lib/
│  ├─ auth.ts
│  ├─ prisma.ts
│  ├─ utils.ts
│  └─ payment-status-cache.ts
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ public/
│  └─ images/
├─ types/
│  └─ index.ts
├─ .env.example
├─ next.config.mjs
├─ package.json
├─ tsconfig.json
├─ postcss.config.js
├─ tailwind.config.ts
├─ vitest.config.ts
├─ README.md
└─ docker-compose.yml
```

---

## 8. Route Definitions

| # | Method | Path | Description | Request Body | Response Body | Status Codes |
|---|--------|------|-------------|-------------|--------------|-------------|
| 1 | GET | `/api/health` | Health check | — | `{ status, services }` | 200, 503 |
| 2 | GET | `/api/products` | List products with filters, categories and stock availability | — | `{ items, pagination, filters }` | 200 |
| 3 | GET | `/api/products/[slug]` | Fetch a single product detail for storefront | — | `{ product, variants, reviews }` | 200, 404 |
| 4 | GET | `/api/cart` | Get active cart with line items and totals | — | `{ items, subtotal, shipping, total }` | 200 |
| 5 | POST | `/api/cart/items` | Add or update cart item | `{ productId, variantId, quantity }` | `{ item, totals }` | 200, 400 |
| 6 | POST | `/api/orders` | Create checkout order and reserve stock | `{ customer, delivery, items, paymentMethod }` | `{ orderId, status, total }` | 201, 400 |
| 7 | POST | `/api/payment/sepay/webhook` | Acknowledge and reconcile SePay bank-transfer notifications | SePay transfer payload | `{ success: true }` | 200 |
| 8 | GET | `/api/admin/reports/overview` | Aggregated revenue, order count, and inventory summary | — | `{ revenue, orders, lowStock, channelMix }` | 200, 403 |

---

## 9. Next Steps

1. Run **azure-project-scaffold** to execute this plan
2. Run **azure-project-integrate** to wire the frontend to live data, smoke-test the backend, and create the migrations
3. Run **azure-debug-plan** → **azure-debug-generate** for Docker emulators and VS Code debugging
4. Run the **azure-deploy** agent when ready; it uses **azure-app-onboard** for architecture, cost estimation, IaC generation, provisioning, and health verification

## Integration Results (2026-10-13)

- Added and applied Prisma migrations for products, variants, carts, customers, orders, and payments. The initial cloud schema was confirmed drift-free before its migration history was reconciled. No seed data was created by the integration workflow.
- Replaced page-level catalog, cart, order, inventory, and report examples with live API requests; checkout creates orders and displays dynamic VietQR payment details verified by SePay.
- `npm run build`, `npm test`, Prisma client generation, and `npm run migrate:status` pass. Every API route was smoke-tested against Neon; storefront/admin pages returned HTTP 200 and server logs confirmed live API calls. Missing-product/order and invalid-webhook paths returned expected structured 4xx responses.
- SePay webhook handling validates the order code and transferred amount before marking an order paid. No test orders or inventory changes were added.
- Neon currently contains no products or orders, so catalog, cart, and reports show live empty/zero values. Blob storage is not configured; application health reports `storage: not_configured`.
