# BÁO CÁO QUÉT TOÀN BỘ HỆ THỐNG (FULL SYSTEM X-RAY)
Tổng số file code: 353 | Tổng số dòng code: 48109

## 1. CẤU TRÚC THƯ MỤC
[DIR] account/
  page.tsx (4L)
[DIR] admin/
  admin-header.tsx (16L)
  admin-navigation.tsx (45L)
  [DIR] affiliates/
    affiliate-manager.tsx (203L)
    page.tsx (14L)
  [DIR] audit-logs/
    page.tsx (5L)
  [DIR] b2b/
    b2b-inquiry-manager.tsx (134L)
    page.tsx (16L)
  [DIR] cai-dat/
    page.tsx (5L)
  [DIR] customers/
    page.tsx (66L)
  [DIR] dashboard/
    page.tsx (160L)
  [DIR] inventory/
    inventory-manager.tsx (137L)
    page.tsx (43L)
  layout.tsx (35L)
  [DIR] media/
    page.tsx (24L)
    site-asset-manager.tsx (142L)
  [DIR] monitoring/
    page.tsx (5L)
  [DIR] orders/
    create-shipment-button.tsx (73L)
    orders-manager.test.ts (90L)
    orders-manager.tsx (419L)
    page.tsx (41L)
    [DIR] print/
      [DIR] [orderCode]/
        page.tsx (173L)
    print-button.tsx (5L)
  page.tsx (1L)
  [DIR] products/
    page.tsx (36L)
    products-manager.tsx (572L)
    stock-control.tsx (71L)
  [DIR] reconciliation/
    page.tsx (43L)
    reconciliation-manager.tsx (77L)
  [DIR] reports/
    cro-funnel-widget.tsx (144L)
    page.tsx (74L)
  [DIR] returns/
    page.tsx (17L)
    return-requests-manager.tsx (381L)
  [DIR] reviews/
    page.tsx (18L)
    reviews-manager.tsx (83L)
  [DIR] settings/
    core-content-settings-form.tsx (71L)
    page.tsx (37L)
    settings-tabs.tsx (247L)
  [DIR] vouchers/
    page.tsx (24L)
    voucher-manager.tsx (233L)
[DIR] affiliate/
  affiliate-dashboard.tsx (115L)
  page.tsx (22L)
[DIR] api/
  [DIR] account/
    [DIR] orders/
      route.test.ts (53L)
      route.ts (32L)
    [DIR] profile/
      route.ts (29L)
  [DIR] admin/
    [DIR] affiliates/
      [DIR] [affiliateId]/
        [DIR] payout/
          route.test.ts (57L)
          route.ts (86L)
        route.test.ts (98L)
        route.ts (63L)
      route.test.ts (103L)
      route.ts (129L)
    [DIR] ai-sentiment/
      route.ts (13L)
    [DIR] audit-logs/
      route.ts (34L)
    [DIR] b2b/
      [DIR] inquiries/
        [DIR] [id]/
          route.ts (54L)
        route.test.ts (79L)
        route.ts (65L)
    [DIR] content-settings/
      route.test.ts (96L)
      route.ts (99L)
    [DIR] inventory/
      route.test.ts (190L)
      route.ts (185L)
    [DIR] media/
      [DIR] upload/
        route.test.ts (69L)
        route.ts (69L)
    [DIR] monitoring/
      route.ts (30L)
    [DIR] orders/
      admin-safety.test.ts (128L)
      route.test.ts (395L)
      route.ts (265L)
      [DIR] shipment/
        route.ts (47L)
    [DIR] products/
      [DIR] [id]/
        route.test.ts (34L)
        route.ts (21L)
      route.test.ts (81L)
      route.ts (37L)
    [DIR] reconciliation/
      route.test.ts (94L)
      route.ts (153L)
    [DIR] reports/
      [DIR] funnel/
        route.test.ts (90L)
        route.ts (72L)
      [DIR] overview/
        route.test.ts (140L)
        route.ts (139L)
    [DIR] reviews/
      [DIR] [id]/
        [DIR] reply/
          route.test.ts (72L)
          route.ts (51L)
      route.test.ts (47L)
      route.ts (38L)
    [DIR] sepay/
      [DIR] simulate/
        route.test.ts (68L)
        route.ts (74L)
    [DIR] settings/
      route.test.ts (77L)
      route.ts (105L)
    [DIR] site-assets/
      route.test.ts (91L)
      route.ts (84L)
    [DIR] vouchers/
      route.test.ts (138L)
      route.ts (189L)
  [DIR] affiliate/
    [DIR] click/
      route.test.ts (35L)
      route.ts (25L)
    [DIR] dashboard/
      route.test.ts (41L)
      route.ts (68L)
  [DIR] ai-chat/
    route.test.ts (28L)
    route.ts (85L)
  [DIR] analytics/
    [DIR] funnel/
      route.test.ts (39L)
      route.ts (39L)
  [DIR] auth/
    [DIR] forgot-password/
      route.ts (55L)
    [DIR] login/
      route.test.ts (159L)
      route.ts (89L)
    [DIR] logout/
      route.test.ts (13L)
      route.ts (22L)
    password-reset.test.ts (163L)
    [DIR] register/
      route.test.ts (62L)
      route.ts (41L)
    [DIR] reset-password/
      route.ts (46L)
    [DIR] session/
      route.ts (17L)
  [DIR] b2b/
    [DIR] inquiries/
      route.test.ts (66L)
      route.ts (68L)
  [DIR] cart/
    [DIR] items/
      route.test.ts (167L)
      route.ts (178L)
    route.ts (50L)
  [DIR] chat/
  [DIR] checkout/
    route.ts (1L)
    [DIR] voucher/
      route.test.ts (97L)
      route.ts (103L)
  [DIR] cron/
    [DIR] affiliate-commission-holds/
      route.test.ts (45L)
      route.ts (31L)
    [DIR] ai-sentiment/
      route.ts (15L)
    [DIR] cleanup-holds/
      route.test.ts (72L)
      route.ts (73L)
  [DIR] diag/
    route.test.ts (58L)
    route.ts (36L)
  [DIR] health/
    route.test.ts (26L)
    route.ts (16L)
  [DIR] orders/
    [DIR] [orderId]/
      [DIR] clear-cart/
        route.test.ts (35L)
        route.ts (28L)
      [DIR] confirm-payment/
        route.test.ts (65L)
        route.ts (30L)
      route.test.ts (54L)
      route.ts (48L)
    route.test.ts (810L)
    route.ts (594L)
  [DIR] payment/
    [DIR] momo/
      [DIR] ipn/
    [DIR] sepay/
      [DIR] webhook/
        route.test.ts (150L)
        route.ts (135L)
    [DIR] webhook/
      route.test.ts (119L)
      route.ts (137L)
  [DIR] payments/
    [DIR] payos/
      [DIR] create/
  [DIR] products/
    [DIR] [slug]/
      route.ts (33L)
    route.test.ts (358L)
    route.ts (503L)
  [DIR] public/
    [DIR] settings/
      route.test.ts (65L)
      route.ts (25L)
    [DIR] site-assets/
      route.test.ts (27L)
      route.ts (24L)
  [DIR] returns/
    route.test.ts (441L)
    route.ts (379L)
  [DIR] reviews/
    [DIR] [id]/
      [DIR] replies/
        route.test.ts (54L)
        route.ts (44L)
    route.test.ts (101L)
    route.ts (47L)
  [DIR] sentry-example-api/
    route.ts (18L)
  [DIR] traceability/
    [DIR] [batchCode]/
      route.test.ts (66L)
      route.ts (53L)
    route.test.ts (45L)
    route.ts (32L)
  [DIR] tracking/
    route.test.ts (81L)
    route.ts (79L)
    [DIR] warranty/
      route.test.ts (58L)
      route.ts (52L)
  [DIR] vouchers/
    route.test.ts (52L)
    route.ts (39L)
  [DIR] webhooks/
    [DIR] payos/
auth-form.tsx (102L)
[DIR] cam-on/
  page.tsx (20L)
[DIR] cart/
  cart-content.tsx (217L)
  page.tsx (18L)
[DIR] checkout/
  checkout-form.tsx (380L)
  checkout-order-summary.tsx (29L)
  [DIR] momo/
    [DIR] [orderCode]/
  [DIR] momo-mock/
    [DIR] [orderCode]/
  page.tsx (69L)
  [DIR] payment/
    page.tsx (11L)
    payment-confirmation.tsx (126L)
  vietnam-address-fields.tsx (82L)
  [DIR] vietqr/
    [DIR] [orderCode]/
      page.tsx (93L)
      payment-details.tsx (86L)
      payment-status-poller.test.ts (78L)
      payment-status-poller.tsx (78L)
    copy-payment-details.tsx (30L)
[DIR] chinh-sach-bao-mat/
  page.tsx (17L)
  privacy-policy-content.tsx (89L)
[DIR] dang-ky/
  page.tsx (9L)
[DIR] dang-nhap/
  page.tsx (9L)
[DIR] dat-lai-mat-khau/
  page.tsx (17L)
  reset-password-form.tsx (55L)
floating-contact.tsx (39L)
global-error.tsx (28L)
globals.css (17450L)
[DIR] hop-tac-b2b/
  client-page.tsx (131L)
  [DIR] documents/
    [DIR] [documentId]/
      page.tsx (9L)
      preview.tsx (63L)
  page.tsx (7L)
[DIR] khuyen-mai/
  page.tsx (157L)
layout.tsx (66L)
logout-button.tsx (16L)
not-found.tsx (28L)
[DIR] order-success/
  page.tsx (35L)
page.tsx (152L)
[DIR] products/
  [DIR] [slug]/
    add-to-cart.test.ts (78L)
    add-to-cart.tsx (201L)
    localized-product-name.tsx (8L)
    page.tsx (236L)
    product-image-gallery.tsx (61L)
    review-form.tsx (71L)
  page.tsx (63L)
[DIR] quen-mat-khau/
  page.tsx (50L)
[DIR] san-pham/
  [DIR] [slug]/
    page.tsx (4L)
  page.tsx (3L)
[DIR] sentry-example-page/
  page.tsx (238L)
site-footer-server.tsx (28L)
site-footer.tsx (87L)
[DIR] tai-khoan/
  account-dashboard.tsx (130L)
  page.tsx (31L)
[DIR] terms/
  page.tsx (47L)
[DIR] tra-cuu/
  page.tsx (98L)
  return-request-form.tsx (246L)
  tracking-form.tsx (383L)
  warranty-request.tsx (65L)
[DIR] tra-cuu-don/
  page.tsx (5L)
[DIR] truy-xuat/
  page.tsx (143L)
CartToast.tsx (36L)
CheckoutEmptyState.test.ts (19L)
CheckoutEmptyState.tsx (22L)
CroEventTracker.tsx (42L)
ExitIntentPopup.tsx (76L)
Hero3DCanvas.tsx (195L)
Hero3DCanvasLoader.tsx (42L)
HomeHeroReveal.tsx (46L)
HomeTransparencyTabs.tsx (52L)
LocalizedHeroImage.tsx (12L)
LocalizedText.tsx (9L)
ProductCard.tsx (102L)
ProductCatalogFilter.tsx (105L)
ProductHighlights.test.ts (27L)
ProductHighlights.tsx (21L)
ProductQuickView.tsx (51L)
ProductRating.tsx (25L)
ProductReviewsSection.test.ts (34L)
ProductReviewsSection.tsx (325L)
ScrollReveal.tsx (58L)
SmoothScroll.tsx (32L)
ValidatedPhoneInput.tsx (34L)
[DIR] b2b/
  ContainerFreightCalculator.tsx (38L)
[DIR] cart/
  CartDrawer.tsx (146L)
  CartSync.tsx (107L)
  CartUpsell.tsx (53L)
[DIR] checkout/
  TasteGuarantee.tsx (16L)
[DIR] common/
  CookieConsent.tsx (46L)
  SoundEffect.tsx (62L)
[DIR] home/
  BeforeAfterSlider.tsx (60L)
  HorizontalShowcase.tsx (97L)
  MarqueeBanner.tsx (36L)
  ProductCylinder3D.tsx (179L)
  ProductCylinder3DLoader.tsx (56L)
  PromoVoucherCode.tsx (26L)
[DIR] layout/
  CartLink.tsx (48L)
  ForbiddenNotice.tsx (14L)
  Header.tsx (5L)
  HeaderContent.tsx (98L)
  LiveProductSearch.tsx (79L)
  LocaleCurrencySwitcher.tsx (30L)
  MobileBottomDock.tsx (59L)
  SiteHeaderVisibility.tsx (10L)
[DIR] marketing/
  AffiliateTracker.tsx (49L)
[DIR] product/
  FlavorPairingGuide.tsx (89L)
  NutriGradeBadge.tsx (30L)
  ProductEditorialDetails.tsx (56L)
  StickyQuickBuyBar.tsx (55L)
  TasteSensoryMeter.test.ts (45L)
  TasteSensoryMeter.tsx (60L)
admin-auth.test.ts (45L)
admin-auth.ts (20L)
affiliate-attribution.test.ts (38L)
affiliate-attribution.ts (58L)
affiliate-auth.test.ts (51L)
affiliate-auth.ts (45L)
affiliate-fraud.test.ts (36L)
affiliate-fraud.ts (30L)
ai-chat.test.ts (28L)
ai-chat.ts (49L)
api-database.ts (30L)
api-metrics.ts (35L)
audit-log.ts (37L)
auth.test.ts (48L)
auth.ts (66L)
b2b-export-documents.ts (26L)
cart-server.ts (62L)
checkout-idempotency.test.ts (22L)
checkout-idempotency.ts (18L)
container-freight.test.ts (32L)
container-freight.ts (26L)
crypto-order.test.ts (19L)
crypto-order.ts (9L)
default-products.ts (179L)
email.test.ts (162L)
email.ts (92L)
ensure-core-vouchers.test.ts (44L)
ensure-core-vouchers.ts (42L)
error-message.test.ts (19L)
error-message.ts (19L)
esg-impact.test.ts (31L)
esg-impact.ts (35L)
i18n-context.tsx (100L)
money.test.ts (18L)
money.ts (25L)
nutritionData.test.ts (23L)
nutritionData.ts (32L)
order-workflow.test.ts (18L)
order-workflow.ts (20L)
payment-celebration.ts (9L)
payment-status-cache.ts (50L)
prisma.ts (81L)
request-timeout.test.ts (38L)
request-timeout.ts (14L)
request-url.test.ts (30L)
request-url.ts (16L)
sensory-profile.test.ts (17L)
sensory-profile.ts (8L)
sentiment-analysis.ts (95L)
server-api.ts (34L)
[DIR] services/
  inventory-ledger.test.ts (89L)
  inventory-ledger.ts (108L)
  shipping-carrier.test.ts (92L)
  shipping-carrier.ts (117L)
  telegram-notifier.ts (77L)
shipping.test.ts (26L)
shipping.ts (9L)
site-asset-client.ts (11L)
site-asset-defaults.json
site-assets.ts (28L)
store-data.ts (118L)
system-settings.ts (136L)
translations.test.ts (23L)
translations.ts (493L)
vietnam-addresses.test.ts (23L)
vietnam-addresses.ts (22L)
voucher-api.ts (13L)
vouchers.test.ts (54L)
vouchers.ts (63L)
[DIR] migrations/
  [DIR] 20261013000000_initial_schema/
    migration.sql
  [DIR] 20261013010000_payos_order_code/
    migration.down.sql
    migration.sql
  [DIR] 20261013020000_accounts_orders_reviews/
    migration.sql
  [DIR] 20261014000000_product_protein_text/
    migration.sql
  [DIR] 20261014010000_viettel_post_carrier/
    migration.sql
  [DIR] 20261014020000_momo_checkout_method/
    migration.sql
  [DIR] 20261014030000_delivery_warranty/
    migration.sql
  [DIR] 20261014040000_password_reset_token/
    migration.sql
  [DIR] 20261014070000_return_requests/
    migration.sql
  [DIR] 20261014100000_return_refund_details/
    migration.sql
  [DIR] 20261015100000_order_fulfillment_statuses/
    migration.sql
  [DIR] 20261015120000_admin_ops_audit_lots/
    migration.sql
  [DIR] 20261015130000_refund_human_approval/
    migration.sql
  [DIR] 20261015140000_refund_operations/
    migration.sql
  [DIR] 20261015150000_admin_portal_hardening/
    migration.sql
  [DIR] 20261015160000_compensation_vouchers/
    migration.sql
  [DIR] 20261015170000_product_catalog_fields/
    migration.sql
  [DIR] 20261015180000_product_highlights/
    migration.sql
  [DIR] 20261015190000_order_returned_status/
    migration.sql
  [DIR] 20261015200000_review_order_uniqueness/
    migration.sql
  [DIR] 20261016000000_admin_vouchers/
    migration.sql
  [DIR] 20261016100000_refund_completion_audit/
    migration.sql
  [DIR] 20261016110000_voucher_usage_limit/
    migration.sql
  [DIR] 20261016120000_return_completed_status/
    migration.sql
  [DIR] 20261016130000_product_badge_nutrition/
    migration.sql
  [DIR] 20261016140000_voucher_promo_visibility/
    migration.sql
  [DIR] 20261016150000_core_public_vouchers/
    migration.sql
  [DIR] 20261016160000_review_replies_and_merchant_reply/
    migration.sql
  [DIR] 20261016170000_payment_status_refunded/
    migration.sql
  [DIR] 20261016171000_order_refund_fields/
    migration.sql
  [DIR] 20261016172000_return_credit_voucher_relation/
    migration.sql
  [DIR] 20261016180000_product_ingredients/
    migration.sql
  [DIR] 20261018000000_product_variant_catalog_fields/
    migration.sql
  [DIR] 20261020100000_b2b_inquiries/
    migration.sql
  [DIR] 20261028100000_product_featured/
    migration.sql
  [DIR] 20261103120000_cro_funnel_events/
    migration.sql
  [DIR] 20261103140000_affiliate_attribution/
    migration.sql
  [DIR] 20261103150000_affiliate_portal/
    migration.sql
  [DIR] 20261104100000_system_settings_business_profile/
    migration.sql
  [DIR] 20261104110000_system_setting_representative_name/
    migration.sql
  [DIR] 20261105100000_sepay_transaction_id/
    migration.sql
  [DIR] 20261105110000_database_audit_triggers/
    migration.sql
  [DIR] 20261105130000_product_sensory_axes/
    migration.sql
  [DIR] 20261105140000_checkout_fingerprint/
    migration.sql
  [DIR] 20261113130000_inventory_movement_ledger/
    migration.sql
  [DIR] 20261114090000_site_assets/
    migration.sql
  [DIR] 20261114120000_system_setting_key_value/
    migration.sql
  [DIR] 20261116100000_b2b_inquiry_management/
    migration.sql
  [DIR] 20261117120000_order_shipping_status/
    migration.sql
  [DIR] 20261117130000_financial_immutability/
    migration.sql
  [DIR] 20261117150000_fefo_lot_allocation/
    migration.sql
  [DIR] 20261117160000_product_sensory_cms/
    migration.sql
rollback.mjs (20L)
schema.prisma (620L)
seed-mac-khen-products.js (126L)
seed.js (302L)
[DIR] artifacts/
  01-pass.png
  02-pass.png
  03-pass.png
  04-pass.png
  05-pass.png
  06-fail.png
  06-pass.png
  07-fail.png
  07-pass.png
  08-pass.png
  09-pass.png
  10-fail.png
  10-pass.png
  11-pass.png
  12-fail.png
  12-pass.png
  13-pass.png
  14-fail.png
  14-pass.png
  [DIR] admin/
    01_dashboard.png
    02_orders.png
    03_affiliates_created.png
    04_products.png
    05_inventory_atp.png
    06_vouchers.png
    07_returns.png
    08_reconciliation.png
    09_cro_funnel.png
    10_apm_monitoring.png
  [DIR] god-mode/
    act-01-webhook-invalid-authorization-returns-401.png
    act-01-webhook-missing-authorization-returns-401.png
    act-02-sgd-locale-renders-and-submits-the-singapore-b2b-form.png
    act-03-admin-creates-koc-test-voucher-and-sets-scarce-stock.png
    act-05-underpaid-authenticated-webhook-does-not-pay-the-order.png
    act-08-customer-submits-a-verified-five-star-product-review.png
    act-08-customer-tracking-invoice-is-rendered-and-printable-to-pdf.png
    act-10-returned-koc-order-contributes-zero-payable-commission.png
    act-10-voucher-redemption-has-an-audit-event.png
    invoice-MKF-586367.pdf
[DIR] e2e/
  01_admin_enterprise.spec.ts (250L)
  02_storefront_legal.spec.ts (329L)
  03_god_mode_chaos.spec.ts (303L)
ai-full-audit.ts (436L)
bootstrap-admin.js (32L)
ensure-admin.mjs (42L)
god-mode-e2e.ts (734L)
mark-completed-orders-paid.mjs (33L)
patch-seed.js (7L)
promote-admin.js (18L)
qa-audit.mjs (55L)
stress-test.mjs (147L)
test-admin-all.ts (444L)
test-db-connection.mjs (19L)
with-env.mjs (29L)

## 2. PHÂN TÍCH API ROUTES (65 routes)
- app/api/account/orders/route.ts [GET] => Prisma, Auth
- app/api/account/profile/route.ts [PATCH] => Prisma, Auth
- app/api/admin/affiliates/[affiliateId]/payout/route.ts [POST] => Prisma, TX, Auth
- app/api/admin/affiliates/[affiliateId]/route.ts [DELETE] => Prisma, TX, Auth
- app/api/admin/affiliates/route.ts [GET,POST,PATCH] => Prisma, TX, Auth
- app/api/admin/ai-sentiment/route.ts [POST] => Auth
- app/api/admin/audit-logs/route.ts [GET] => Prisma, Auth
- app/api/admin/b2b/inquiries/[id]/route.ts [PATCH] => Prisma, Auth
- app/api/admin/b2b/inquiries/route.ts [GET] => Prisma, Auth
- app/api/admin/content-settings/route.ts [PATCH] => Prisma, Auth
- app/api/admin/inventory/route.ts [GET,PATCH] => Prisma, TX, Auth
- app/api/admin/media/upload/route.ts [POST] => Auth
- app/api/admin/monitoring/route.ts [GET] => Prisma, Auth
- app/api/admin/orders/route.ts [GET,PATCH] => Prisma, TX, Sentry, Auth
- app/api/admin/orders/shipment/route.ts [POST] => Auth
- app/api/admin/products/[id]/route.ts [PATCH] => Basic
- app/api/admin/products/route.ts [GET,POST,PATCH,DELETE] => Prisma, Auth
- app/api/admin/reconciliation/route.ts [GET,POST] => Prisma, TX, Auth
- app/api/admin/reports/funnel/route.ts [GET] => Prisma, Auth
- app/api/admin/reports/overview/route.ts [GET] => Prisma, Auth
- app/api/admin/reviews/[id]/reply/route.ts [PATCH] => Prisma, Auth
- app/api/admin/reviews/route.ts [GET] => Prisma, Auth
- app/api/admin/sepay/simulate/route.ts [POST] => Prisma, Auth
- app/api/admin/settings/route.ts [GET,PATCH] => Prisma, Auth
- app/api/admin/site-assets/route.ts [GET,PATCH] => Prisma, Auth
- app/api/admin/vouchers/route.ts [GET,POST,PATCH,DELETE] => Prisma, Auth
- app/api/affiliate/click/route.ts [POST] => Prisma
- app/api/affiliate/dashboard/route.ts [GET] => Prisma
- app/api/ai-chat/route.ts [POST] => Basic
- app/api/analytics/funnel/route.ts [POST] => Prisma, Auth
- app/api/auth/forgot-password/route.ts [POST] => Prisma, TX
- app/api/auth/login/route.ts [POST] => Prisma, Auth
- app/api/auth/logout/route.ts [GET,POST] => Basic
- app/api/auth/register/route.ts [POST] => Prisma, Auth
- app/api/auth/reset-password/route.ts [POST] => Prisma, TX
- app/api/auth/session/route.ts [GET] => Prisma, Auth
- app/api/b2b/inquiries/route.ts [POST] => Prisma
- app/api/cart/items/route.ts [POST,PATCH,DELETE] => Prisma, TX
- app/api/cart/route.ts [GET] => Prisma
- app/api/checkout/route.ts [?] => Basic
- app/api/checkout/voucher/route.ts [POST] => Prisma, Auth
- app/api/cron/affiliate-commission-holds/route.ts [GET,POST] => Prisma
- app/api/cron/ai-sentiment/route.ts [POST] => Basic
- app/api/cron/cleanup-holds/route.ts [POST] => Prisma, TX
- app/api/diag/route.ts [GET] => Prisma
- app/api/health/route.ts [GET] => Prisma
- app/api/orders/[orderId]/clear-cart/route.ts [POST] => Prisma
- app/api/orders/[orderId]/confirm-payment/route.ts [POST] => Prisma
- app/api/orders/[orderId]/route.ts [POST] => Prisma
- app/api/orders/route.ts [POST] => Prisma, TX, Auth
- app/api/payment/sepay/webhook/route.ts [POST] => Prisma, TX
- app/api/payment/webhook/route.ts [POST] => Prisma, TX
- app/api/products/[slug]/route.ts [GET] => Prisma
- app/api/products/route.ts [GET,POST,PATCH,DELETE] => Prisma, Auth
- app/api/public/settings/route.ts [GET] => Basic
- app/api/public/site-assets/route.ts [GET] => Basic
- app/api/returns/route.ts [GET,POST,PATCH] => Prisma, TX, Auth
- app/api/reviews/[id]/replies/route.ts [POST] => Prisma, Auth
- app/api/reviews/route.ts [POST] => Prisma
- app/api/sentry-example-api/route.ts [GET] => Sentry
- app/api/traceability/[batchCode]/route.ts [GET] => Prisma
- app/api/traceability/route.ts [GET] => Prisma
- app/api/tracking/route.ts [POST] => Prisma
- app/api/tracking/warranty/route.ts [POST] => Prisma
- app/api/vouchers/route.ts [GET] => Prisma

## 3. PHÂN TÍCH PAGES & CACHING (46 pages)
- app/account/page.tsx (Server)
- app/admin/affiliates/page.tsx (Server | Dynamic)
- app/admin/audit-logs/page.tsx (Server)
- app/admin/b2b/page.tsx (Server | Dynamic)
- app/admin/cai-dat/page.tsx (Server)
- app/admin/customers/page.tsx (Server | Dynamic)
- app/admin/dashboard/page.tsx (Server)
- app/admin/inventory/page.tsx (Server)
- app/admin/media/page.tsx (Server | Dynamic)
- app/admin/monitoring/page.tsx (Server)
- app/admin/orders/page.tsx (Server)
- app/admin/orders/print/[orderCode]/page.tsx (Server | Dynamic)
- app/admin/page.tsx (Server)
- app/admin/products/page.tsx (Server | Dynamic)
- app/admin/reconciliation/page.tsx (Server | Dynamic)
- app/admin/reports/page.tsx (Server)
- app/admin/returns/page.tsx (Server)
- app/admin/reviews/page.tsx (Server | Dynamic)
- app/admin/settings/page.tsx (Server | Dynamic)
- app/admin/vouchers/page.tsx (Server | Dynamic)
- app/affiliate/page.tsx (Server | Dynamic)
- app/cam-on/page.tsx (Server | Dynamic)
- app/cart/page.tsx (Server)
- app/checkout/page.tsx (Server)
- app/checkout/payment/page.tsx (Server | Dynamic)
- app/checkout/vietqr/[orderCode]/page.tsx (Server | Dynamic)
- app/chinh-sach-bao-mat/page.tsx (Server)
- app/dang-ky/page.tsx (Server | Dynamic)
- app/dang-nhap/page.tsx (Server | Dynamic)
- app/dat-lai-mat-khau/page.tsx (Server)
- app/hop-tac-b2b/documents/[documentId]/page.tsx (Server)
- app/hop-tac-b2b/page.tsx (Server | ISR)
- app/khuyen-mai/page.tsx (Client)
- app/order-success/page.tsx (Server | Dynamic)
- app/page.tsx (Server | ISR)
- app/products/[slug]/page.tsx (Server | ISR+SSG)
- app/products/page.tsx (Server | ISR)
- app/quen-mat-khau/page.tsx (Client)
- app/san-pham/[slug]/page.tsx (Server | ISR+SSG)
- app/san-pham/page.tsx (Server | ISR)
- app/sentry-example-page/page.tsx (Client)
- app/tai-khoan/page.tsx (Server | Dynamic)
- app/terms/page.tsx (Server)
- app/tra-cuu/page.tsx (Server | Dynamic+Suspense)
- app/tra-cuu-don/page.tsx (Server)
- app/truy-xuat/page.tsx (Client)

## 4. MODULES & COMPONENTS (89 files)
- components/CartToast.tsx: CartToast
- components/CheckoutEmptyState.tsx: CheckoutEmptyState
- components/CroEventTracker.tsx: CroEventType, recordCroEvent, CroEventTracker
- components/ExitIntentPopup.tsx: ExitIntentPopup
- components/Hero3DCanvas.tsx: Hero3DCanvas
- components/Hero3DCanvasLoader.tsx: Hero3DCanvasLoader
- components/HomeHeroReveal.tsx: HomeHeroReveal
- components/HomeTransparencyTabs.tsx: HomeTransparencyTabs
- components/LocalizedHeroImage.tsx: LocalizedHeroImage
- components/LocalizedText.tsx: LocalizedText
- components/ProductCard.tsx: ProductCard
- components/ProductCatalogFilter.tsx: CatalogProduct, ProductCatalogFilter
- components/ProductHighlights.tsx: ProductHighlights
- components/ProductQuickView.tsx: ProductQuickView
- components/ProductRating.tsx: ProductRating
- components/ProductReviewsSection.tsx: ProductReviewsSection
- components/ScrollReveal.tsx: ScrollReveal, ScrollRevealItem
- components/SmoothScroll.tsx: SmoothScroll
- components/ValidatedPhoneInput.tsx: ValidatedPhoneInput
- components/b2b/ContainerFreightCalculator.tsx: ContainerFreightCalculator
- components/cart/CartDrawer.tsx: CartDrawer
- components/cart/CartSync.tsx: CartSync
- components/cart/CartUpsell.tsx: CartUpsellProduct, CartUpsell
- components/checkout/TasteGuarantee.tsx: TasteGuarantee
- components/common/CookieConsent.tsx: CookieConsent
- components/common/SoundEffect.tsx: playClickSound, useSoundEffect, SoundEffect
- components/home/BeforeAfterSlider.tsx: BeforeAfterSlider
- components/home/HorizontalShowcase.tsx: HorizontalShowcase
- components/home/MarqueeBanner.tsx: MarqueeBanner
- components/home/ProductCylinder3D.tsx: ProductCylinder3D
- components/home/ProductCylinder3DLoader.tsx: ProductCylinder3DLoader
- components/home/PromoVoucherCode.tsx: PromoVoucherCode
- components/layout/CartLink.tsx: CartLink
- components/layout/ForbiddenNotice.tsx: ForbiddenNotice
- components/layout/Header.tsx: Header
- components/layout/HeaderContent.tsx: HeaderContent
- components/layout/LiveProductSearch.tsx: LiveProductSearch
- components/layout/LocaleCurrencySwitcher.tsx: LocaleCurrencySwitcher
- components/layout/MobileBottomDock.tsx: MobileBottomDock
- components/layout/SiteHeaderVisibility.tsx: SiteHeaderVisibility
- components/marketing/AffiliateTracker.tsx: AffiliateTracker
- components/product/FlavorPairingGuide.tsx: FlavorPairingGuide
- components/product/NutriGradeBadge.tsx: NutriGradeBadge
- components/product/ProductEditorialDetails.tsx: ProductEditorialDetails
- components/product/StickyQuickBuyBar.tsx: StickyQuickBuyBar
- components/product/TasteSensoryMeter.tsx: TasteSensoryMeter
- lib/admin-auth.ts: requireAdmin
- lib/affiliate-attribution.ts: COOKIE_CONSENT_KEY, hasAffiliateConsent, clearAffiliateCode, normalizeAffiliateCode, storeAffiliateCode, getStoredAffiliateCode
- lib/affiliate-auth.ts: requireAffiliate
- lib/affiliate-fraud.ts: getClientIpHash, normalizeAffiliatePhone, isSelfReferral
- lib/ai-chat.ts: assistantSystemPrompt, getKnowledgeReply
- lib/api-database.ts: withDatabase
- lib/api-metrics.ts: recordApiMetric, getApiMetrics
- lib/audit-log.ts: writeAuditLog
- lib/auth.ts: SESSION_COOKIE, ADMIN_EMAIL, SessionPayload, getAuthSecret, createSessionToken, verifySessionToken, sessionCookieOptions, getRequestSession
- lib/b2b-export-documents.ts: exportDocuments, ExportDocument, getExportDocument
- lib/cart-server.ts: CartUpsellProduct, CartSnapshotItem, readCartSnapshot
- lib/checkout-idempotency.ts: CheckoutFingerprintItem, createCheckoutFingerprint
- lib/container-freight.ts: MASTER_CARTON, CONTAINER_20FT_CAPACITY_CBM, calculateContainerFreight
- lib/crypto-order.ts: createOrderChecksum
- lib/default-products.ts: DefaultProduct, DEFAULT_PRODUCTS
- lib/email.ts: sendPasswordResetEmail, sendCompensationVoucherEmail, sendB2bInquiryEmail
- lib/ensure-core-vouchers.ts: ensureCoreVouchers
- lib/error-message.ts: getErrorMessage
- lib/esg-impact.ts: DEFAULT_ESG_PACKAGE_WEIGHT_GRAMS, EsgImpactItem, parsePackageWeightGrams, calculateEsgImpact
- lib/i18n-context.tsx: LocaleCurrencyProvider, useLocaleCurrency
- lib/money.ts: calculatePercentageAmount, convertVndToSgdCents, formatSgdCents
- lib/nutritionData.ts: NutritionValues, NUTRITION_MAP, FALLBACK_NUTRITION
- lib/order-workflow.ts: orderStatuses, OrderWorkflowStatus, allowedTransitions, getAllowedNextStatuses
- lib/payment-celebration.ts: celebratePayment
- lib/payment-status-cache.ts: CachedPaymentStatus, rememberPendingPayment, rememberPaidPayment, getCachedPaymentStatus
- lib/prisma.ts: prisma, reportPrismaConnectivityIssue
- lib/request-timeout.ts: createAbortSignal
- lib/request-url.ts: resolveRequestBaseUrl
- lib/sensory-profile.ts: SensoryScores, normalizeSensoryScores
- lib/sentiment-analysis.ts: SentimentInput, analyzeNewSentiment
- lib/server-api.ts: ApiRequestError, fetchApi, fetchApiWithFallback
- lib/services/inventory-ledger.ts: RecordInventoryMovementInput, orderMovementKey, recordMovement, FEFOAllocation, allocateStockFEFO
- lib/services/shipping-carrier.ts: createShipmentOrder
- lib/services/telegram-notifier.ts: notifyPaidOrder, notifyB2bLead, notifyCustomerCase
- lib/shipping.ts: FREE_SHIPPING_PRODUCT_SLUG, calculateShipping
- lib/site-asset-client.ts: PublicSiteAssetKey, fetchPublicSiteAsset
- lib/site-assets.ts: SITE_ASSET_DEFAULTS, ensureSiteAssets, getSiteAsset
- lib/store-data.ts: ProductVariant, NutritionFacts, SensoryProfile, PairingGuide, normalizeSensoryProfile, normalizePairingGuide, normalizeNutritionFacts, Product...
- lib/system-settings.ts: CoreContentSettings, SystemSettings, PublicSystemSettings, DEFAULT_CORE_CONTENT_SETTINGS, CORE_CONTENT_SETTING_KEYS, DEFAULT_SYSTEM_SETTINGS, getCoreContentSettings, getSystemSettings
- lib/translations.ts: Locale, Currency, SGD_TO_VND, translations, TranslationKey, translateContent, translateProductName, formatCurrency...
- lib/vietnam-addresses.ts: VietnamProvince, VietnamDistrict, VietnamCommune, VietnamAddressData, getVietnamAddressData
- lib/voucher-api.ts: withVoucherDatabase
- lib/vouchers.ts: VOUCHER_CODES, ManagedVoucherRule, getManagedVoucherValidationError, calculateManagedVoucherDiscount, calculateManagedVoucherDiscountAmount, getVoucherValidationError, calculateVoucherDiscount

## 5. DẤU HIỆU TODO / MOCK / CẦN RÀ SOÁT (22 items)
- app/admin/orders/orders-manager.tsx:208 -> async function simulateSepayPayment(order: AdminOrder) {
- app/admin/orders/orders-manager.tsx:212 -> const response = await fetch('/api/admin/sepay/simulate', {
- app/admin/orders/orders-manager.tsx:385 -> {order.paymentMethod === 'VIETQR' && order.paymentStatus === 'PENDING' && ['PENDING', 'CONFIRMED'].i
- app/api/admin/sepay/simulate/route.test.ts:14 -> return new Request('https://mackhen.example/api/admin/sepay/simulate', {
- app/api/admin/sepay/simulate/route.test.ts:21 -> describe('POST /api/admin/sepay/simulate', () => {
- app/checkout/checkout-form.tsx:256 -> : `mkf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
- components/Hero3DCanvas.tsx:106 -> phase: Math.random() * Math.PI * 2,
- components/cart/CartSync.tsx:34 -> const fullMessage = { ...message, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` } as Sy
- tests/e2e/01_admin_enterprise.spec.ts:43 -> orderCode: `MKF-${String(Math.floor(100000 + Math.random() * 900000))}`,
- tests/e2e/02_storefront_legal.spec.ts:62 -> const code = Math.floor(100000 + Math.random() * 900000);
- tests/e2e/03_god_mode_chaos.spec.ts:46 -> orderCode: `MKF-${Math.floor(100000 + Math.random() * 900000)}`,
- tests/e2e/03_god_mode_chaos.spec.ts:92 -> customer: { name: 'Playwright Chaos', phone: `09${String(Math.floor(Math.random() * 100_000_000)).pa
- scripts/ai-full-audit.ts:140 -> const auditPhone = process.env.AUDIT_PHONE ?? `09${String(Math.floor(Math.random() * 10_000_000)).pa
- scripts/ai-full-audit.ts:295 -> const auditPhone = process.env.AUDIT_PHONE ?? `09${String(Math.floor(Math.random() * 10_000_000)).pa
- scripts/ai-full-audit.ts:341 -> const reason = 'Thiếu AUDIT_ADMIN_PASSWORD; không hardcode mật khẩu quản trị trong script.';
- scripts/god-mode-e2e.ts:94 -> if (!adminPassword) return 'Thiếu AUDIT_ADMIN_PASSWORD; không hardcode thông tin đăng nhập trong sui
- scripts/god-mode-e2e.ts:522 -> const simulated = await jsonRequest(context!.request, 'POST', '/api/admin/sepay/simulate', { orderCo
- scripts/god-mode-e2e.ts:523 -> assert(simulated.response.ok(), `SePay simulation returned HTTP ${simulated.response.status()}: ${St
- scripts/god-mode-e2e.ts:624 -> const paid = await jsonRequest(context!.request, 'POST', '/api/admin/sepay/simulate', { orderCode: r
- scripts/test-admin-all.ts:264 -> const simulateCount = await page!.locator('.admin-order-simulate-button').count();
- scripts/test-admin-all.ts:265 -> if (simulateCount === 0) {
- scripts/test-admin-all.ts:271 -> return `Bộ lọc hiển thị; ${printCount} nút In phiếu và ${simulateCount} nút mô phỏng VietQR.`;

## 6. CONFIGS (package.json, next.config.mjs, vercel.json)
--- package.json ---
{
  "name": "bohoch-store",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "postinstall": "node scripts/with-env.mjs prisma generate",
    "dev": "node scripts/with-env.mjs next dev",
    "build": "prisma generate && next build",
    "vercel-build": "npx prisma generate && next build",
    "start": "node scripts/with-env.mjs next start",
    "test": "vitest run",
    "test:qa": "node scripts/qa-audit.mjs",
    "test:audit": "tsx scripts/ai-full-audit.ts",
    "test:admin": "tsx scripts/test-admin-all.ts",
    "test:god-mode": "tsx scripts/god-mode-e2e.ts",
    "stress-test": "node scripts/stress-test.mjs",
    "db:generate": "node scripts/with-env.mjs prisma generate",
    "migrate": "node scripts/with-env.mjs prisma migrate deploy",
    "migrate:dev": "node scripts/with-env.mjs prisma migrate dev",
    "migrate:status": "node scripts/with-env.mjs prisma migrate status",
    "migrate:rollback": "node scripts/with-env.mjs rollback",
    "db:seed": "node scripts/with-env.mjs seed",
    "db:seed:mac-khen": "node scripts/with-env.mjs seedMacKhen",
    "db:fix-completed-order-payments": "node scripts/with-env.mjs markCompletedOrdersPaid",
    "admin:promote": "node scripts/promote-admin.js",
    "admin:bootstrap": "node scripts/bootstrap-admin.js",
    "emulators:start": "docker compose up -d",
    "emulators:stop": "docker compose down"
  },
  "prisma": {
    "seed": "node prisma/seed.js"
  },
  "dependencies": {
    "@formkit/auto-animate": "^0.10.0",
    "@gsap/react": "^2.1.2",
    "@prisma/client": "^6.19.0",
    "@sentry/nextjs": "^11.8.0",
    "@upstash/ratelimit": "^2.2.1",
    "@upstash/redis": "^1.41.0",
    "@vercel/blob": "^2.9.0",
    "bcryptjs": "^3.0.3",
    "canvas-confetti": "^1.9.4",
    "dotenv": "^16.4.7",
    "framer-motion": "^14.2.0",
    "gsap": "^3.15.0",
    "lenis": "^1.3.27",
    "lucide-react": "^0.468.0",
    "next": "14.2.15",
    "nodemailer": "^10.1.2",
    "qrcode": "^1.5.4",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "sonner": "^2.0.8",
    "three": "^0.186.1",
    "vietnam-address-data": "^1.0.0",
    "vietnam-divisions-js": "^3.0.0"
  },
  "devDependencies": {
    "@browserbasehq/stagehand": "^4.3.0",
    "@playwright/test": "^1.64.1",
    "@types/canvas-confetti": "^1.9.0",
    "@types/node": "^20.14.12",
    "@types/nodemailer": "^8.0.2",
    "@types/qrcode": "^1.5.6",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/three": "^0.186.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.6.2",
    "chalk": "^4.1.2",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.15",
    "jsdom": "^24.1.0",
    "postcss": "^8.5.32",
    "prisma": "^6.19.0",
    "tailwindcss": "^3.4.17",
    "tailwindcss-animate": "^1.0.7",
    "tsx": "^4.23.15",
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  }
}

--- next.config.mjs ---
import { withSentryConfig } from '@sentry/nextjs/config';
/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    // Bỏ qua cảnh báo ESLint khi build
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "mackhen-farm",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});

--- vercel.json ---
{
  "framework": "nextjs",
  "buildCommand": "npx prisma generate && next build",
  "installCommand": "npm install",
  "crons": [
    {
      "path": "/api/cron/affiliate-commission-holds",
      "schedule": "0 0 * * *"
    }
  ]
}

## 7. MIDDLEWARE
import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const rateLimitBuckets = new Map<string, number[]>();
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  '/api/checkout': { limit: 3, windowMs: 10_000 },
  '/api/orders': { limit: 3, windowMs: 10_000 },
  '/api/auth/login': { limit: 10, windowMs: 60_000 },
};
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisLimiters = new Map<string, Ratelimit>();
if (redisUrl && redisToken) {
  const redis = new Redis({ url: redisUrl, token: redisToken });
  for (const [pathname, rule] of Object.entries(RATE_LIMITS)) {
    redisLimiters.set(pathname, new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowMs / 1000} s`),
      prefix: `mackhen-farm:middleware:${pathname}`,
    }));
  }
}
let warnedMissingRateLimitStore = false;
const LOCALE_CURRENCY_COOKIE = 'mackhen_locale_currency';

type LocalePreference = { locale: 'vi' | 'en'; currency: 'VND' | 'SGD' };

function clientIp(request: NextRequest): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const cloudflareIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cloudflareIp) return cloudflareIp;

  const proxyHeadersTrusted = process.env.VERCEL === '1' || process.env.TRUST_PROXY_HEADERS === '1';
  if (!proxyHeadersTrusted) return 'unknown';

  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function rateLimitedResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: { code: 'RATE_LIMITED', message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' } },
    { status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' } },
  );
}

function warnRateLimitFallback(reason: string): void {
  if (warnedMissingRateLimitStore) return;
  console.warn(`[RATE_LIMIT_LOCAL_FALLBACK] ${reason}`);
  warnedMissingRateLimitStore = true;
}

async function rateLimitResponse(request: NextRequest): Promise<NextResponse | null> {
  if (request.method !== 'POST') return null;
  const rule = RATE_LIMITS[request.nextUrl.pathname];
  if (!rule) return null;

  const ip = clientIp(request);
  const key = `${request.nextUrl.pathname}:${ip}`;
  const limiter = redisLimiters.get(request.nextUrl.pathname);
  if (limiter) {
    try {
      const result = await limiter.limit(ip);
      return result.success ? null : rateLimitedResponse(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)));
    } catch (error) {
      warnRateLimitFallback(`Redis unavailable (${error instanceof Error ? error.name : 'UnknownError'}); using in-memory limits.`);
    }
  } else {
    warnRateLimitFallback('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not configured; using in-memory limits.');
  }

  const now = Date.now();
  const windowStart = now - rule.windowMs;
  const requests = (rateLimitBuckets.get(key) ?? []).filter((timestamp) => timestamp > windowStart);
  if (requests.length >= rule.limit) {
    const retryAfter = Math.max(1, Math.ceil((requests[0] + rule.windowMs - now) / 1000));
    return rateLimitedResponse(retryAfter);
  }

  requests.push(now);
  rateLimitBuckets.set(key, requests);
  if (rateLimitBuckets.size > 5_000) {
    for (const [bucketKey, timestamps] of rateLimitBuckets) {
      if (!timestamps.some((timestamp) => timestamp > now - 60_000)) rateLimitBuckets.delete(bucketKey);
    }
    while (rateLimitBuckets.size > 5_000) {
      const oldestKey = rateLimitBuckets.keys().next().value;
      if (!oldestKey) break;
      rateLimitBuckets.delete(oldestKey);
    }
  }
  return null;
}

function geoPreference(request: NextRequest): LocalePreference | null {
  if (request.cookies.has(LOCALE_CURRENCY_COOKIE)) return null;

  const country = request.headers.get('x-vercel-ip-country')?.toUpperCase();
  const firstLanguage = request.headers.get('accept-language')?.split(',')[0]?.split(';')[0]?.trim().toLowerCase();
  if (country === 'SG' || country === 'US' || firstLanguage?.startsWith('en')) {
    return { locale: 'en', currency: 'SGD' };
  }
  return null;
}

function nextWithGeoPreference(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  const preference = geoPreference(request);
  if (preference) {
    response.cookies.set(LOCALE_CURRENCY_COOKIE, encodeURIComponent(JSON.stringify(preference)), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
    });
  }
  return response;
}

function decodeBase64Url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)).buffer as ArrayBuffer;
}

type MiddlewareSession = { userId?: string; role?: string; expiresAt?: number };

async function readSession(token: string | undefined, secret: string | undefined): Promise<MiddlewareSession | null> {
  if (!token || !secret || secret.length < 32) return null;
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) return null;

  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, decodeBase64Url(signature), new TextEncoder().encode(encoded));
    if (!valid) return null;
    const session = JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded))) as MiddlewareSession;
    if (!session.userId || !['CUSTOMER', 'ADMIN'].includes(session.role ?? '') || typeof session.expiresAt !== 'number' || session.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const limited = await rateLimitResponse(request);
  if (limited) return limited;

  const isAdminApi = pathname === '/api/admin' || pathname.startsWith('/api/admin/');
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAccountPage = pathname === '/tai-khoan' || pathname.startsWith('/tai-khoan/');
  const token = request.cookies.get('mkf_session')?.value;
  const sessionSecret = [process.env.AUTH_SECRET, process.env.NEXTAUTH_SECRET]
    .find((secret) => Boolean(secret && secret.length >= 32));
  const session = await readSession(token, sessionSecret);

  if (isAdminApi) {
    if (session?.role === 'ADMIN') return nextWithGeoPreference(request);
    return NextResponse.json({ error: 'Truy cập bị từ chối' }, { status: 403 });
  }

  if (isAdminPage && session?.role === 'ADMIN') return nextWithGeoPreference(request);
  if (isAdminPage) {
    const loginUrl = new URL('/dang-nhap', request.url);
    loginUrl.searchParams.set('callbackUrl', '/admin');
    return NextResponse.redirect(loginUrl);
  }
  if (isAccountPage && session) return nextWithGeoPreference(request);
  if (!isAccountPage) return nextWithGeoPreference(request);

  const loginUrl = new URL('/dang-nhap', request.url);
  loginUrl.searchParams.set('callbackUrl', isAdminPage ? '/admin' : '/tai-khoan');
  return NextResponse.redirect(loginUrl);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)'] };

## 8. PRISMA SCHEMA
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PAID
  PROCESSING
  HANDED_OFF
  IN_TRANSIT
  SHIPPING
  COMPLETED
  DELIVERED
  RETURNED
  CANCELLED
}

enum InventoryMovementType {
  RECEIPT
  ALLOCATION
  RESERVATION
  RELEASE
  SHIPMENT
  RETURN
  ADJUSTMENT
}

enum PaymentStatus {
  PENDING
  PAID
  REFUNDED
  FAILED
  CANCELLED
}

enum AffiliateCommissionStatus {
  PENDING
  ELIGIBLE
  PAID
  CANCELLED
}

enum VoucherDiscountType {
  PERCENTAGE
  FIXED
}

enum UserRole {
  CUSTOMER
  ADMIN
  AFFILIATE
}

enum CheckoutPaymentMethod {
  COD
  VIETQR
  MOMO
}

enum ShippingCarrier {
  GHTK
  SPX
  VIETTEL_POST
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  phone     String?
  address   String?
  signupIpHash String?
  role      UserRole @default(CUSTOMER)
  orders    Order[]
  affiliate Affiliate?
  reviewReplies ReviewReply[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  email     String
  token     String
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([email])
  @@index([expiresAt])
}

model Product {
  id            String           @id @default(cuid())
  slug          String           @unique
  name          String
  category      String
  price         Int
  originalPrice Int?
  unit          String?
  weight        Int?
  protein       String?
  calories      Int?
  images        String[]         @default([])
  rating        Float            @default(0)
  spiciness     Int              @default(3)
  chewiness     Int              @default(4)
  aroma         Int              @default(5)
  labelAxis1    String           @default("Độ cay")
  labelAxis2    String           @default("Độ dai giòn")
  labelAxis3    String           @default("Hương Mắc Khén")
  valueAxis1    Int              @default(60)
  valueAxis2    Int              @default(80)
  valueAxis3    Int              @default(100)
  stock         Int              @default(0)
  description   String
  ingredients   String?          @db.Text
  image         String
  highlight     String
  badge         String?
  badgeText     String?          @default("Upcycled Soy")
  upsellProductId String?
  upsellProduct Product?         @relation("ProductUpsell", fields: [upsellProductId], references: [id], onDelete: SetNull)
  upsellSources Product[]        @relation("ProductUpsell")
  highlights    String[]         @default([])
  nutritionFacts Json?
  sensoryProfile Json?
  pairingGuide Json?
  originRegion String? @default("Sơn La, Tây Bắc")
  waxSealCode String? @default("BATCH-CRAFT-2026")
  active        Boolean          @default(true)
  isFeatured    Boolean          @default(false)
  variants      ProductVariant[]
  cartItems     CartItem[]
  orderItems    OrderItem[]
  reviews       Review[]
  inventoryMovements InventoryMovement[]
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
    productionLots ProductionLot[]

  @@index([active, category])
  @@index([active, isFeatured])
  @@index([upsellProductId])
}

model StoreProfileSettings {
  id                    String   @id @default("default")
  freeShippingThreshold Int      @default(250000)
  tasteGuaranteeText    String   @default("Bảo hiểm vị giác 100%: Ăn thử gói đầu tiên không hợp khẩu vị Tây Bắc, hoàn tiền hoặc đổi vị mới trong 24h.")
  companyName           String   @default("CÔNG TY CỔ PHẦN NÔNG SẢN SINH THÁI MẮC KHÉN FARM")
  taxCode               String   @default("0110892644 do Sở KH&ĐT cấp ngày 15/01/2026")
  representativeName    String   @default("Trần Trung Châu")
  address               String   @default("Bản Hua Tạt, Xã Vân Hồ, Tỉnh Sơn La")
  hotline               String   @default("0762.793.244")
  email                 String   @default("contact@mackhenfarm.vn")
  b2bItemsPerCarton     Int      @default(24)
  b2bCartonWeightKg     Float    @default(3.6)
  dppSupplyGPS          String   @default("20.738°N, 104.912°E (Sơn La)")
  dppLabResult          String   @default("Salmonella: Âm tính | E.Coli: < 10 CFU/g | Aflatoxin: ND")
  updatedAt             DateTime @updatedAt

  @@map("SystemSetting")
}

model SystemSetting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt

  @@map("SystemSettingKV")
}

model ProductVariant {
  id            String      @id @default(cuid())
  productId     String
  title         String      @map("label")
  price         Int
  originalPrice Int?
  weight        String
  inventory     Int         @default(0) @map("stock")
  sku           String?
  product       Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  cartItems     CartItem[]
  orderItems    OrderItem[]
  productionLots ProductionLot[]
  inventoryMovements InventoryMovement[]
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@unique([productId, title], map: "ProductVariant_productId_label_key")
  @@index([productId])
}

model ProductionLot {
  id              String           @id @default(cuid())
  batchCode       String           @unique @map("lotCode")
  productId       String
  productVariantId String?
  mfgDate         DateTime
  expDate         DateTime
  receivedQty     Int
  availableQty    Int
  status          String           @default("ACTIVE")
  testReportUrl   String?
  receivingNote   String?
  product         Product          @relation(fields: [productId], references: [id], onDelete: Restrict)
  variant         ProductVariant?  @relation(fields: [productVariantId], references: [id], onDelete: SetNull)
  orderItems      OrderItem[]
  inventoryMovements InventoryMovement[]
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([productId, status, expDate])
  @@index([productVariantId, status, expDate])
}
model Cart {
  id        String     @id
  items     CartItem[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model CartItem {
  id               String          @id @default(cuid())
  cartId           String
  productId        String
  productVariantId String?
  quantity         Int
  unitPrice        Int
  productName      String
  cart             Cart            @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product          Product         @relation(fields: [productId], references: [id], onDelete: Restrict)
  variant          ProductVariant? @relation(fields: [productVariantId], references: [id], onDelete: SetNull)
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  @@index([cartId])
  @@index([productId])
}

model FunnelEvent {
  id        String   @id @default(cuid())
  eventType String   @db.VarChar(24)
  sessionId String   @db.VarChar(36)
  productId String?
  createdAt DateTime @default(now())

  @@index([eventType, createdAt])
  @@index([sessionId, eventType, createdAt])
}

model Customer {
  id        String   @id @default(cuid())
  name      String
  email     String?  @unique
  phone     String?
  address   String?
  orders    Order[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Affiliate {
  id             String           @id @default(cuid())
  userId         String           @unique
  affiliateCode  String           @unique
  commissionRate Int              @default(10)
  bankAccount    String
  active         Boolean          @default(true)
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  clicks         AffiliateClick[]
  payouts        AffiliatePayout[]
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  @@index([active, createdAt])
}

model AffiliateClick {
  id          String    @id @default(cuid())
  affiliateId String
  createdAt   DateTime  @default(now())
  affiliate   Affiliate @relation(fields: [affiliateId], references: [id], onDelete: Cascade)

  @@index([affiliateId, createdAt])
}

model AffiliatePayout {
  id                  String    @id @default(cuid())
  affiliateId         String
  amount              Int
  orderCount          Int
  bankAccountSnapshot String
  paymentReference    String?
  paidBy              String
  paidAt              DateTime  @default(now())
  affiliate           Affiliate @relation(fields: [affiliateId], references: [id], onDelete: Restrict)
  orders              Order[]

  @@index([affiliateId, paidAt])
}

enum ReturnRequestStatus {
  PENDING
  REPLACEMENT_APPROVED
  VOUCHER_ISSUED
  REFUND_APPROVED
  REFUNDED
  COMPLETED
  REJECTED
}

model Order {
  id            String               @id @default(cuid())
  orderCode     String               @unique
  numericCode   Int                  @unique @default(autoincrement())
  userId        String?
  customerId    String?
  customerName  String
  phone         String
  address       String
  orderStatus   OrderStatus          @default(PENDING) @map("status")
  paymentMethod CheckoutPaymentMethod @default(COD)
  paymentStatus PaymentStatus        @default(PENDING)
  sepayTransactionId String?          @unique
  refundAmount  Int                  @default(0)
  refundedAt    DateTime?
  subtotal      Int
  shippingFee   Float                @map("shipping")
  discountAmount Float               @default(0)
  voucherCode   String?
  affiliateCode String?
  affiliateCommissionRate Int?
  affiliateCommissionPaidAt DateTime?
  affiliatePayoutId String?
  affiliateCommissionStatus AffiliateCommissionStatus?
  affiliateCommissionEligibleAt DateTime?
  totalAmount   Int                  @map("total")
  idempotencyKey String?              @unique
  checkoutFingerprint String?
  lotCode       String?
  grossAmount   Float                 @default(0)
  netAmount     Float                 @default(0)
  reconciled    Boolean               @default(false)
  holdExpiresAt DateTime?
  note          String?
  trackingCode  String?
  shippingStatus String?
  shippingLabelUrl String?
  deliveredAt   DateTime?
  carrier       ShippingCarrier?
  customer      Customer?            @relation(fields: [customerId], references: [id], onDelete: SetNull)
  user          User?                @relation(fields: [userId], references: [id], onDelete: SetNull)
  items         OrderItem[]
  inventoryMovements InventoryMovement[]
  payments      Payment[]
  warrantyRequest WarrantyRequest?
  returnRequests ReturnRequest[]
  refundOperations RefundOperation[]
  compensationVouchers CompensationVoucher[]
  reviews       Review[]
  affiliatePayout AffiliatePayout? @relation(fields: [affiliatePayoutId], references: [id], onDelete: SetNull)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([orderStatus, createdAt])
  @@index([customerId, createdAt])
  @@index([userId, createdAt])
  @@index([phone, createdAt])
  @@index([affiliateCode, createdAt])
  @@index([checkoutFingerprint, createdAt])
}

model OrderItem {
  id               String          @id @default(cuid())
  orderId          String
  productId        String
  productVariantId String?
  productName      String
  variantLabel     String?
  titleSnapshot       String  @default("")
  variantNameSnapshot String  @default("")
  skuSnapshot      String?
  quantity         Int
  unitPrice        Int
  discountAllocated Int            @default(0)
  finalPrice            Int      @default(0)
  lineTotal        Int
  lotCode          String?
  lotId            String?
  order            Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product          Product         @relation(fields: [productId], references: [id], onDelete: Restrict)
  variant          ProductVariant? @relation(fields: [productVariantId], references: [id], onDelete: SetNull)
  lot              ProductionLot?  @relation(fields: [lotId], references: [id], onDelete: SetNull)

  @@index([orderId])
}

model InventoryMovement {
  id               String                @id @default(cuid())
  idempotencyKey   String?               @unique
  productId        String
  productVariantId String?
  lotId            String?               @map("productionLotId")
  orderId          String?
  type             InventoryMovementType
  delta            Int
  reference        String?
  createdAt        DateTime              @default(now())
  product          Product               @relation(fields: [productId], references: [id], onDelete: Restrict)
  productVariant   ProductVariant?       @relation(fields: [productVariantId], references: [id], onDelete: SetNull)
  productionLot    ProductionLot?        @relation(fields: [lotId], references: [id], onDelete: SetNull)
  order            Order?                @relation(fields: [orderId], references: [id], onDelete: SetNull)

  @@index([productId, createdAt])
  @@index([productVariantId, createdAt])
  @@index([lotId, createdAt], map: "InventoryMovement_productionLotId_createdAt_idx")
  @@index([orderId, createdAt])
}

model B2bInquiry {
  id             String   @id @default(cuid())
  companyName    String   @map("company_name")
  country        String   @db.VarChar(80)
  contactName    String   @map("contact_name")
  email          String   @db.VarChar(254)
  phone          String?  @db.VarChar(32)
  expectedVolume String   @map("moq")
  message        String?  @db.Text @map("notes")
  adminNotes     String?  @db.Text @map("admin_notes")
  status         String   @default("PENDING")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@index([status, createdAt], map: "b2b_inquiries_status_created_at_idx")
  @@index([email, createdAt], map: "b2b_inquiries_email_created_at_idx")
  @@map("b2b_inquiries")
}

model Review {
  id           String   @id @default(cuid())
  orderId      String?
  productId    String
  customerName String
  rating       Int
  comment      String
  riskTag      String?
  riskAnalyzedAt DateTime?
  adminReply   String?  @db.Text
  adminReplyAt DateTime?
  createdAt    DateTime @default(now())
  product      Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  order        Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)
  replies      ReviewReply[]

  @@unique([orderId, productId])
  @@index([productId, createdAt])
}

model ReviewReply {
  id         String   @id @default(cuid())
  reviewId   String
  review     Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  userId     String?
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  authorName String
  authorRole String   @default("USER")
  content    String   @db.Text
  createdAt  DateTime @default(now())

  @@index([reviewId])
}

model Payment {
  id          String        @id @default(cuid())
  orderId     String
  orderCode   Int           @unique @default(autoincrement())
  externalId  String?       @unique
  amount      Int
  currency    String        @default("VND")
  status      PaymentStatus @default(PENDING)
  checkoutUrl String?
  order       Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([orderId, status])
}

model WarrantyRequest {
  id        String   @id @default(cuid())
  orderId   String   @unique
  reason    String
  status    String   @default("OPEN")
  createdAt DateTime @default(now())
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
}

model ReturnRequest {
  id            String              @id @default(cuid())
  orderId       String
  customerPhone String
  issueType     String
  description   String
  imageUrl      String?
  refundBankName String?
  refundAccountNumber String?
  refundAccountHolder String?
  refundApprovedBy String?
  refundApprovedAt DateTime?
  refundCompletedBy String?
  refundTransferReference String?
  riskTag       String?
  riskAnalyzedAt DateTime?
  status        ReturnRequestStatus @default(PENDING)
  adminNote     String?
  createdAt     DateTime            @default(now())
  order         Order               @relation(fields: [orderId], references: [id], onDelete: Cascade)
  refundOperations RefundOperation[]
  compensationVoucher CompensationVoucher?
  issuedVoucher Voucher?

  @@index([status, createdAt])
  @@index([orderId])
}

model AuditLog {
  id           String   @id @default(cuid())
  adminEmail   String
  action       String
  targetEntity String
  targetId     String
  oldValue     Json?
  newValue     Json?
  ipAddress    String?
  createdAt    DateTime @default(now())

  @@index([targetEntity, targetId, createdAt])
  @@index([adminEmail, createdAt])
}

model RefundOperation {
  id                   String   @id @default(cuid())
  orderId              String
  returnRequestId      String?
  amount               Int
  bankName             String
  accountNumber        String
  accountHolder        String
  reason               String
  status               String   @default("PENDING_APPROVAL")
  requestedBy          String
  approvedBy           String?
  approvedAt           DateTime?
  transferReference    String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  order                Order    @relation(fields: [orderId], references: [id], onDelete: Restrict)
  returnRequest        ReturnRequest? @relation(fields: [returnRequestId], references: [id], onDelete: SetNull)

  @@index([status, createdAt])
  @@index([orderId, createdAt])
}

model CompensationVoucher {
  id              String        @id @default(cuid())
  code            String        @unique
  orderId         String
  returnRequestId String        @unique
  customerPhone   String
  discountPercent Int           @default(50)
  expiresAt       DateTime
  redeemedAt      DateTime?
  createdBy       String
  createdAt       DateTime      @default(now())
  order           Order         @relation(fields: [orderId], references: [id], onDelete: Restrict)
  returnRequest   ReturnRequest @relation(fields: [returnRequestId], references: [id], onDelete: Restrict)

  @@index([customerPhone, expiresAt, redeemedAt])
}

model Voucher {
  id             String              @id @default(cuid())
  code           String              @unique
  name           String?
  discountType   VoucherDiscountType
  value          Int
  maxDiscount    Int?
  minSpend       Int                 @default(0)
  expiresAt      DateTime?
  isActive       Boolean             @default(true)
  usedCount      Int                 @default(0)
  usageLimit     Int?
  freeShipping   Boolean             @default(false)
  firstOrderOnly Boolean             @default(false)
  showOnPromoPage Boolean            @default(false)
  returnRequestId String?             @unique
  returnRequest   ReturnRequest?      @relation(fields: [returnRequestId], references: [id], onDelete: SetNull)
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  @@index([isActive, expiresAt])
}

model SiteAsset {
  id        String   @id @default(cuid())
  key       String   @unique
  label     String
  category  String   @default("STOREFRONT")
  imageUrl  String
  altText   String?
  updatedAt DateTime @updatedAt
}