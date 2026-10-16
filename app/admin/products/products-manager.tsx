'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Link2, PackagePlus, Pencil, Trash2, Upload, X } from 'lucide-react';

import { getErrorMessage } from '@/lib/error-message';
import type { NutritionFacts } from '@/lib/store-data';
import type { CatalogProduct } from '@/components/ProductCatalogFilter';
import StockControl from './stock-control';

type AdminProduct = CatalogProduct & { active: boolean };

type ProductDraft = {
  name: string;
  category: 'Khô bò thực vật' | 'Gia vị';
  price: string;
  originalPrice: string;
  weight: string;
  protein: string;
  stock: string;
  imageUrl: string;
  description: string;
  badge: string;
  nutritionFacts: NutritionFacts;
};

function defaultNutritionFacts(enabled: boolean, protein = ''): NutritionFacts {
  return {
    enabled,
    servingSize: 'Trên 100g',
    calories: 'Xem trên bao bì',
    protein: protein || 'Xem trên bao bì',
    fat: 'Xem trên bao bì',
    cholesterol: '0 mg',
    fiber: 'Xem trên bao bì',
    carbohydrates: 'Xem trên bao bì',
    sodium: 'Xem trên bao bì',
  };
}

const emptyDraft: ProductDraft = {
  name: '',
  category: 'Khô bò thực vật',
  price: '',
  originalPrice: '',
  weight: '',
  protein: '',
  stock: '0',
  imageUrl: '',
  description: '',
  badge: '',
  nutritionFacts: defaultNutritionFacts(true),
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ProductsManager({ initialProducts }: { initialProducts: AdminProduct[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [showImageUrl, setShowImageUrl] = useState(false);
  const [onlineImageUrl, setOnlineImageUrl] = useState('');
  const [draggingImage, setDraggingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  function readImageFile(file?: File) {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFormError('Vui lòng chọn ảnh JPG, PNG hoặc WEBP.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setFormError('Ảnh tải lên không được vượt quá 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraft((current) => ({ ...current, imageUrl: reader.result as string }));
        setOnlineImageUrl('');
        setFormError('');
      }
    };
    reader.onerror = () => setFormError('Không thể đọc ảnh này. Vui lòng thử lại.');
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setDraft((current) => ({ ...current, imageUrl: '' }));
    setOnlineImageUrl('');
    if (imageInputRef.current) imageInputRef.current.value = '';
  }

  function startEditingProduct(product: AdminProduct) {
    setEditingProduct(product);
    setDraft({
      name: product.name,
      category: product.category === 'Gia vị Tây Bắc' ? 'Gia vị' : 'Khô bò thực vật',
      price: String(product.price),
      originalPrice: product.originalPrice == null ? '' : String(product.originalPrice),
      weight: product.unit ?? '150g',
      protein: product.protein ?? '',
      stock: String(product.stock),
      imageUrl: product.image,
      description: product.description,
      badge: product.badge ?? '',
      nutritionFacts: product.nutritionFacts ?? defaultNutritionFacts(product.category !== 'Gia vị Tây Bắc', product.protein ?? ''),
    });
    setFormError('');
    setNotice('');
    setShowImageUrl(false);
    setOnlineImageUrl('');
    setOpen(true);
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      const response = await fetch('/api/products', {
        method: editingProduct ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(editingProduct ? { id: editingProduct.id } : {}),
          name: String(draft.name).trim(),
          category: draft.category,
          price: Number(draft.price),
          originalPrice: draft.originalPrice ? Number(draft.originalPrice) : null,
          stock: Number(draft.stock) || 0,
          weight: String(draft.weight || '150g').trim(),
          protein: String(draft.protein).trim(),
          description: String(draft.description).trim(),
          badge: draft.badge.trim() || null,
          nutritionFacts: draft.nutritionFacts,
          imageUrl: draft.imageUrl || undefined,
        }),
      });
      const result = await response.json() as { product?: AdminProduct; error?: unknown };
      if (!response.ok || !result.product) {
        setFormError(getErrorMessage(result?.error ?? result, 'Không thể lưu sản phẩm.'));
        return;
      }

      if (editingProduct) {
        setProducts((current) => current.map((product) => product.id === result.product!.id ? result.product! : product));
        setNotice(`Đã cập nhật sản phẩm “${result.product.name}”.`);
      } else {
        setProducts((current) => [result.product!, ...current.filter((product) => !product.id.startsWith('fallback-'))]);
        setNotice(`Đã thêm sản phẩm “${result.product.name}”.`);
      }
      setDraft(emptyDraft);
      setEditingProduct(null);
      setOnlineImageUrl('');
      setShowImageUrl(false);
      setOpen(false);
    } catch {
      setFormError('Không thể kết nối để lưu sản phẩm.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(productId: string, productName: string) {
    if (deletingProductId || !window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn sản phẩm ${productName} không?`)) return;

    const previousProducts = products;
    setProducts((current) => current.filter((product) => product.id !== productId));
    setDeletingProductId(productId);
    setNotice('');

    try {
      const response = await fetch(`/api/products?id=${encodeURIComponent(productId)}`, { method: 'DELETE' });
      const result = await response.json() as { success?: boolean; message?: string; error?: string | { message?: string } };
      if (!response.ok || result.success !== true) {
        const errorMessage = typeof result.error === 'string' ? result.error : result.error?.message;
        throw new Error(result.message ?? errorMessage ?? 'Không thể xóa sản phẩm.');
      }
      setNotice(result.message ?? 'Đã xóa sản phẩm thành công.');
    } catch (error) {
      setProducts(previousProducts);
      setNotice(error instanceof Error ? error.message : 'Không thể kết nối để xóa sản phẩm.');
    } finally {
      setDeletingProductId(null);
    }
  }

  return (
    <>
      <div className="admin-product-actions">
        {notice && <p className="admin-return-notice" role="status">{notice}</p>}
        <span className="admin-count-badge">{products.length} sản phẩm</span>
        <button className="admin-product-add-button" type="button" onClick={() => { setEditingProduct(null); setDraft(emptyDraft); setFormError(''); setOpen(true); }}>
          <PackagePlus size={17} /> Thêm sản phẩm mới
        </button>
      </div>

      <div className="table-card admin-products-table">
        <table>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Danh mục</th>
              <th>GIÁ (VNĐ)</th>
              <th>GIÁ TRỊ KHO</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const isFallback = product.id.startsWith('fallback-');
              return (
                <tr key={product.id}>
                  <td><div className="admin-product-name"><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{product.unit}</small></span></div></td>
                  <td>{product.category}</td>
                  {isFallback ? (
                    <td className="admin-product-fallback-note" colSpan={3}>Mẫu hiển thị · chưa được lưu trong cơ sở dữ liệu</td>
                  ) : (
                    <StockControl key={`${product.id}:${product.price}:${product.stock}:${product.active}`} productId={product.id} currentPrice={product.price} currentStock={product.stock} active={product.active ?? true} />
                  )}
                  <td>{!isFallback && <div className="admin-product-row-actions">
                    <button className="admin-return-icon-button" type="button" title="Chỉnh sửa sản phẩm" aria-label={`Chỉnh sửa ${product.name}`} onClick={() => startEditingProduct(product)}><Pencil size={16} /></button>
                    <button className="admin-product-delete-button" type="button" title="Xóa sản phẩm" aria-label={`Xóa sản phẩm ${product.name}`} onClick={() => void handleDeleteProduct(product.id, product.name)} disabled={deletingProductId !== null}>
                      {deletingProductId === product.id ? <span className="admin-delete-spinner" aria-hidden="true" /> : <Trash2 size={16} />}
                    </button>
                  </div>}</td>
                </tr>
              );
            })}
            {!products.length && <tr><td colSpan={5}>Chưa có sản phẩm trong danh mục.</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="admin-product-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setOpen(false); }}>
          <section className="admin-product-modal" role="dialog" aria-modal="true" aria-labelledby="admin-product-modal-title">
            <header className="admin-product-modal-header">
              <div><p className="eyebrow">Danh mục sản phẩm</p><h2 id="admin-product-modal-title">{editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2></div>
              <button type="button" className="admin-return-icon-button" aria-label="Đóng form" onClick={() => setOpen(false)} disabled={saving}><X size={18} /></button>
            </header>

            <form className="admin-new-product-form" onSubmit={saveProduct}>
              <label className="field admin-product-full-width">Tên sản phẩm<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={160} required /></label>
              <label className="field">Danh mục<select value={draft.category} onChange={(event) => {
                const category = event.target.value as ProductDraft['category'];
                setDraft((current) => ({ ...current, category, nutritionFacts: { ...current.nutritionFacts, enabled: category !== 'Gia vị' } }));
              }}><option value="Khô bò thực vật">Khô bò thực vật</option><option value="Gia vị">Gia vị</option></select></label>
              <label className="field">Giá niêm yết (VNĐ)<input type="number" min={0} step="any" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} required /></label>
              <label className="field">Giá gốc (không bắt buộc)<input type="number" min={0} step="any" value={draft.originalPrice} onChange={(event) => setDraft({ ...draft, originalPrice: event.target.value })} /></label>
              <label className="field">Trọng lượng<input placeholder="150g" value={draft.weight} onChange={(event) => setDraft({ ...draft, weight: event.target.value })} required /></label>
              <label className="field">Hàm lượng Protein<input placeholder="22g/100g" value={draft.protein} onChange={(event) => setDraft({ ...draft, protein: event.target.value })} maxLength={80} required={draft.category !== 'Gia vị'} /></label>
              <label className="field">Tồn kho ban đầu<input type="number" min={0} max={1000000} value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} required /></label>
              <div
                className={`field admin-product-full-width admin-image-upload${draggingImage ? ' is-dragging' : ''}`}
                onDragOver={(event) => { event.preventDefault(); setDraggingImage(true); }}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDraggingImage(false); }}
                onDrop={(event) => { event.preventDefault(); setDraggingImage(false); readImageFile(event.dataTransfer.files[0]); }}
              >
                <span>Ảnh sản phẩm</span>
                <input
                  ref={imageInputRef}
                  className="admin-image-file-input"
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  aria-label="Chọn ảnh sản phẩm"
                  onChange={(event) => { readImageFile(event.target.files?.[0]); event.target.value = ''; }}
                />
                {draft.imageUrl ? (
                  <div className="admin-image-preview-row">
                    <img className="admin-image-preview" src={draft.imageUrl} alt="Ảnh xem trước sản phẩm" />
                    <button className="admin-image-remove" type="button" aria-label="Xóa ảnh đã chọn" onClick={clearImage}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <button className="admin-image-dropzone" type="button" onClick={() => imageInputRef.current?.click()}>
                    <span className="admin-image-upload-icon"><ImagePlus size={22} /><Upload size={15} /></span>
                    <strong>Bấm để chọn ảnh từ máy tính hoặc kéo thả ảnh vào đây</strong>
                    <small>Định dạng JPG, PNG, WEBP · Tối đa 5 MB</small>
                  </button>
                )}
                <button className="admin-image-url-toggle" type="button" onClick={() => setShowImageUrl((visible) => !visible)}>
                  <Link2 size={14} /> {showImageUrl ? 'Ẩn liên kết ảnh online' : 'Hoặc nhập liên kết ảnh online'}
                </button>
                {showImageUrl && (
                  <input
                    className="admin-image-url-input"
                    type="url"
                    placeholder="https://..."
                    aria-label="Liên kết ảnh online"
                    value={onlineImageUrl}
                    onChange={(event) => {
                      setOnlineImageUrl(event.target.value);
                      setDraft((current) => ({ ...current, imageUrl: event.target.value }));
                    }}
                  />
                )}
              </div>
              <label className="field admin-product-full-width">Nhãn nổi bật (Badge tag) - Tùy chọn<input value={draft.badge} onChange={(event) => setDraft({ ...draft, badge: event.target.value })} maxLength={60} placeholder="Ví dụ: Sản phẩm mới, Bán chạy, Giảm 15%..." /><small>Để trống nếu không muốn hiển thị nhãn đỏ trên ảnh sản phẩm.</small></label>
              <fieldset className="admin-nutrition-fields admin-product-full-width">
                <legend>Bảng giá trị dinh dưỡng (Nutrition Facts)</legend>
                <label className="admin-nutrition-toggle"><input type="checkbox" checked={draft.nutritionFacts.enabled} onChange={(event) => setDraft((current) => ({ ...current, nutritionFacts: { ...current.nutritionFacts, enabled: event.target.checked } }))} /> Hiển thị bảng dinh dưỡng cho sản phẩm này</label>
                <div className="admin-nutrition-grid">
                  <label className="field">Khẩu phần<input disabled={!draft.nutritionFacts.enabled} value={draft.nutritionFacts.servingSize} onChange={(event) => setDraft((current) => ({ ...current, nutritionFacts: { ...current.nutritionFacts, servingSize: event.target.value } }))} maxLength={80} /></label>
                  <label className="field">Năng lượng<input disabled={!draft.nutritionFacts.enabled} value={draft.nutritionFacts.calories} onChange={(event) => setDraft((current) => ({ ...current, nutritionFacts: { ...current.nutritionFacts, calories: event.target.value } }))} maxLength={80} /></label>
                  <label className="field">Đạm thực vật<input disabled={!draft.nutritionFacts.enabled} value={draft.nutritionFacts.protein} onChange={(event) => setDraft((current) => ({ ...current, nutritionFacts: { ...current.nutritionFacts, protein: event.target.value } }))} maxLength={80} /></label>
                  <label className="field">Chất béo (Lipid)<input disabled={!draft.nutritionFacts.enabled} value={draft.nutritionFacts.fat} onChange={(event) => setDraft((current) => ({ ...current, nutritionFacts: { ...current.nutritionFacts, fat: event.target.value } }))} maxLength={80} /></label>
                  <label className="field">Cholesterol<input disabled={!draft.nutritionFacts.enabled} value={draft.nutritionFacts.cholesterol} onChange={(event) => setDraft((current) => ({ ...current, nutritionFacts: { ...current.nutritionFacts, cholesterol: event.target.value } }))} maxLength={80} /></label>
                  <label className="field">Chất xơ (Fiber)<input disabled={!draft.nutritionFacts.enabled} value={draft.nutritionFacts.fiber} onChange={(event) => setDraft((current) => ({ ...current, nutritionFacts: { ...current.nutritionFacts, fiber: event.target.value } }))} maxLength={80} /></label>
                  <label className="field">Carbohydrate<input disabled={!draft.nutritionFacts.enabled} value={draft.nutritionFacts.carbohydrates} onChange={(event) => setDraft((current) => ({ ...current, nutritionFacts: { ...current.nutritionFacts, carbohydrates: event.target.value } }))} maxLength={80} /></label>
                  <label className="field">Natri (Sodium)<input disabled={!draft.nutritionFacts.enabled} value={draft.nutritionFacts.sodium} onChange={(event) => setDraft((current) => ({ ...current, nutritionFacts: { ...current.nutritionFacts, sodium: event.target.value } }))} maxLength={80} /></label>
                </div>
              </fieldset>
              <label className="field admin-product-full-width">Mô tả ngắn<textarea rows={3} maxLength={2000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
              {formError && <p className="admin-return-alert admin-product-full-width" role="alert">{formError}</p>}
              <footer className="admin-product-modal-actions admin-product-full-width">
                <button className="secondary-action" type="button" onClick={() => setOpen(false)} disabled={saving}>Hủy</button>
                <button className="primary-action" type="submit" disabled={saving}>{saving ? 'Đang lưu...' : editingProduct ? 'Lưu thay đổi' : 'Lưu sản phẩm'}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}