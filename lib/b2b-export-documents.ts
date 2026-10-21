export const exportDocuments = [
  {
    id: 'product-specification',
    title: 'Product Specification',
    detail: 'Thành phần, quy cách đóng gói và thông tin sản phẩm.',
    reference: 'MKF-PS-2026-01',
  },
  {
    id: 'coa',
    title: 'COA (Certificate of Analysis)',
    detail: 'Mẫu chứng nhận phân tích chất lượng sản phẩm.',
    reference: 'MKF-COA-28-ATTP-MKF',
  },
  {
    id: 'packing-list',
    title: 'Packing List',
    detail: 'Thông tin đóng gói tham khảo cho lô hàng xuất khẩu.',
    reference: 'MKF-PL-2026-02',
  },
] as const;

export type ExportDocument = (typeof exportDocuments)[number];

export function getExportDocument(documentId: string): ExportDocument | undefined {
  return exportDocuments.find((document) => document.id === documentId);
}