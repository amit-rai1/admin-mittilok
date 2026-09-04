import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorBanner, LoadingState, PageHeader } from "../../components/Layout";
import {
  api,
  mediaUrl,
  PRODUCT_STATUS,
  resolveStockStatus,
  slugify,
  uploadImage,
  type Category,
  type ProductDetail,
  type ProductForm,
  type ProductHighlight,
  type ProductImage,
} from "../../lib/api";

const blank: ProductForm = {
  sku: "",
  name: "",
  slug: "",
  categoryId: 0,
  subCategoryId: null,
  brand: "",
  shortDescription: "",
  fullDescription: "",
  thumbnail: "",
  price: 0,
  mrp: 0,
  discountPercent: 0,
  sellingPrice: 0,
  taxPercent: 0,
  stockQuantity: 0,
  lowStockThreshold: 5,
  unit: "pcs",
  isFeatured: false,
  isBestSeller: false,
  isNewArrival: false,
  isOrganic: false,
  careInstructions: "",
  isReturnEligible: true,
  status: PRODUCT_STATUS.Draft,
  images: [],
  variants: [],
  highlights: [],
};

function mapDetailToForm(product: ProductDetail): ProductForm {
  return {
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    subCategoryId: product.subCategoryId ?? null,
    brand: product.brand ?? "",
    shortDescription: product.shortDescription ?? "",
    fullDescription: product.fullDescription ?? "",
    thumbnail: product.thumbnail ?? "",
    price: product.price,
    mrp: product.mrp,
    discountPercent: product.discountPercent,
    sellingPrice: product.sellingPrice,
    taxPercent: product.taxPercent,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold ?? 5,
    unit: product.unit ?? "pcs",
    isFeatured: product.isFeatured,
    isBestSeller: product.isBestSeller,
    isNewArrival: product.isNewArrival,
    isOrganic: product.isOrganic,
    careInstructions: product.careInstructions ?? "",
    plantHeight: product.plantHeight ?? "",
    potSize: product.potSize ?? "",
    sunlightRequirement: product.sunlightRequirement ?? "",
    waterRequirement: product.waterRequirement ?? "",
    soilType: product.soilType ?? "",
    deliveryInfo: product.deliveryInfo ?? "",
    isReturnEligible: product.isReturnEligible,
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
    status:
      product.status === "Active"
        ? PRODUCT_STATUS.Active
        : product.status === "OutOfStock"
          ? PRODUCT_STATUS.OutOfStock
          : product.status === "Inactive"
            ? PRODUCT_STATUS.Inactive
            : PRODUCT_STATUS.Draft,
    images: (product.images ?? []).map((img, index) => ({
      id: img.id,
      url: img.url,
      alt: img.alt ?? "",
      displayOrder: img.displayOrder ?? index,
      isPrimary: img.isPrimary,
    })),
    variants: (product.variants ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      mrp: v.mrp || v.price,
      stock: v.stock,
      image: v.image ?? "",
    })),
    highlights: (product.highlights ?? []).map((h, index) => ({
      id: h.id,
      text: h.text,
      sortOrder: h.sortOrder ?? index,
    })),
  };
}

export function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<ProductForm>(blank);
  const [roots, setRoots] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [useVariants, setUseVariants] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const cats = await api<Category[]>("/categories?rootsOnly=true&type=0");
        if (cancelled) return;
        setRoots(cats);
        if (isEdit && id) {
          const product = await api<ProductDetail>(`/products/${id}`);
          if (cancelled) return;
          const mapped = mapDetailToForm(product);
          setForm(mapped);
          setUseVariants((mapped.variants?.length ?? 0) > 0);
          setSlugTouched(true);
        } else if (cats[0]) {
          setForm((prev) => ({ ...prev, categoryId: cats[0].id }));
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load product");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  useEffect(() => {
    if (!form.categoryId) {
      setSubs([]);
      return;
    }
    let cancelled = false;
    void api<Category[]>(`/categories?parentId=${form.categoryId}`)
      .then((list) => {
        if (!cancelled) setSubs(list);
      })
      .catch(() => {
        if (!cancelled) setSubs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [form.categoryId]);

  const stockStatus = useMemo(
    () => resolveStockStatus(form.stockQuantity, form.lowStockThreshold),
    [form.stockQuantity, form.lowStockThreshold],
  );

  function updatePricing(mrp: number, sellingPrice: number) {
    const discount =
      mrp > 0 && sellingPrice > 0 && sellingPrice < mrp
        ? Number((((mrp - sellingPrice) / mrp) * 100).toFixed(2))
        : 0;
    setForm((prev) => ({
      ...prev,
      mrp,
      sellingPrice,
      price: sellingPrice,
      discountPercent: discount,
    }));
  }

  function setImages(next: ProductImage[]) {
    const withOrder = next.map((img, index) => ({ ...img, displayOrder: index }));
    let foundPrimary = false;
    const clean = withOrder.map((img) => {
      const isPrimary = img.isPrimary && !foundPrimary;
      if (isPrimary) foundPrimary = true;
      return { ...img, isPrimary };
    });
    if (!foundPrimary && clean[0]) clean[0].isPrimary = true;
    setForm((prev) => ({
      ...prev,
      images: clean,
      thumbnail: clean.find((i) => i.isPrimary)?.url ?? clean[0]?.url ?? "",
    }));
  }

  async function onUploadImages(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: ProductImage[] = [];
      for (const file of Array.from(files)) {
        const result = await uploadImage(file, "products");
        uploaded.push({
          url: result.path || result.url,
          alt: form.name || file.name,
          displayOrder: (form.images?.length ?? 0) + uploaded.length,
          isPrimary: false,
        });
      }
      setImages([...(form.images ?? []), ...uploaded]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload images");
    } finally {
      setUploading(false);
    }
  }

  function validateForPublish(): string | null {
    if (!form.name.trim()) return "Name is required.";
    if (!form.categoryId) return "Category is required.";
    if (!form.subCategoryId) return "Subcategory is required to publish.";
    if ((form.sellingPrice || 0) <= 0 && (form.price || 0) <= 0) return "Selling price is required to publish.";
    const hasImage =
      Boolean(form.thumbnail?.trim()) || (form.images ?? []).some((img) => Boolean(img.url?.trim()));
    if (!hasImage) return "At least one product image is required to publish.";
    return null;
  }

  async function save(nextStatus: number) {
    if (!form.categoryId) {
      setError("Category is required.");
      return;
    }
    if (nextStatus === PRODUCT_STATUS.Active) {
      const issue = validateForPublish();
      if (issue) {
        setError(issue);
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      const images = form.images ?? [];
      const payload = {
        ...form,
        sku: form.sku.trim(),
        slug: form.slug || undefined,
        subCategoryId: form.subCategoryId || null,
        status: nextStatus,
        price: form.sellingPrice || form.price,
        thumbnail: form.thumbnail || images.find((i) => i.isPrimary)?.url || images[0]?.url || "",
        images,
        variants: useVariants ? form.variants ?? [] : [],
        highlights: (form.highlights ?? [])
          .filter((h) => h.text.trim())
          .map((h, index) => ({ text: h.text.trim(), sortOrder: h.sortOrder ?? index })),
      };
      if (isEdit && id) {
        await api(`/admin/products/${id}`, { method: "PUT", body: payload });
        navigate("/products");
      } else {
        const created = await api<ProductDetail>("/admin/products", { method: "POST", body: payload });
        navigate(`/products/${created.id}`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save product");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading product…" />;

  const images = form.images ?? [];
  const highlights = form.highlights ?? [];
  const variants = form.variants ?? [];

  return (
    <>
      <PageHeader
        title={isEdit ? "Edit product" : "New product"}
        subtitle="One scrollable form for catalog essentials."
        actions={
          <Link className="outline-button" to="/products">
            Back to list
          </Link>
        }
      />
      <ErrorBanner message={error} />

      <div className="product-form-page">
        <section className="panel form-section">
          <h3>1. Basic</h3>
          <div className="form-grid">
            <label>
              Name *
              <input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    name,
                    slug: slugTouched ? prev.slug : slugify(name),
                  }));
                }}
                required
              />
            </label>
            <label>
              Brand
              <input
                value={form.brand ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
              />
            </label>
            <label>
              SKU
              <input
                value={form.sku}
                onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                placeholder="Auto-generated if blank"
              />
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: Number(e.target.value) }))}
              >
                <option value={PRODUCT_STATUS.Draft}>Draft</option>
                <option value={PRODUCT_STATUS.Active}>Active</option>
                <option value={PRODUCT_STATUS.Inactive}>Inactive</option>
              </select>
            </label>
          </div>
        </section>

        <section className="panel form-section">
          <h3>2. Category</h3>
          <div className="form-grid">
            <label>
              Category *
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    categoryId: Number(e.target.value),
                    subCategoryId: null,
                  }))
                }
                required
              >
                <option value={0} disabled>
                  Select category
                </option>
                {roots.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Subcategory *
              <select
                value={form.subCategoryId ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    subCategoryId: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              >
                <option value="">Select subcategory</option>
                {subs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="panel form-section">
          <h3>3. Images</h3>
          <label>
            Upload images
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={(e) => void onUploadImages(e.target.files)}
            />
          </label>
          {uploading && <p className="muted">Uploading…</p>}
          <div className="image-gallery">
            {images.map((img, index) => (
              <div key={`${img.url}-${index}`} className={`gallery-item${img.isPrimary ? " primary" : ""}`}>
                <img src={mediaUrl(img.url)} alt={img.alt ?? ""} />
                <div className="gallery-actions">
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() =>
                      setImages(images.map((item, i) => ({ ...item, isPrimary: i === index })))
                    }
                  >
                    {img.isPrimary ? "Primary" : "Set primary"}
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={index === 0}
                    onClick={() => {
                      const next = [...images];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      setImages(next);
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={index === images.length - 1}
                    onClick={() => {
                      const next = [...images];
                      [next[index + 1], next[index]] = [next[index], next[index + 1]];
                      setImages(next);
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="row-action"
                    onClick={() => setImages(images.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel form-section">
          <h3>4. Pricing</h3>
          <div className="form-grid">
            <label>
              MRP
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.mrp}
                onChange={(e) => updatePricing(Number(e.target.value), form.sellingPrice)}
              />
            </label>
            <label>
              Selling price
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.sellingPrice}
                onChange={(e) => updatePricing(form.mrp, Number(e.target.value))}
              />
            </label>
            <label>
              Discount %
              <input type="number" value={form.discountPercent} readOnly />
            </label>
            <label>
              Tax %
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.taxPercent}
                onChange={(e) => setForm((prev) => ({ ...prev, taxPercent: Number(e.target.value) }))}
              />
            </label>
          </div>
        </section>

        <section className="panel form-section">
          <h3>5. Inventory</h3>
          <div className="form-grid">
            <label>
              Stock
              <input
                type="number"
                min={0}
                value={form.stockQuantity}
                onChange={(e) => setForm((prev) => ({ ...prev, stockQuantity: Number(e.target.value) }))}
              />
            </label>
            <label>
              Low stock alert
              <input
                type="number"
                min={0}
                value={form.lowStockThreshold}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lowStockThreshold: Number(e.target.value) }))
                }
              />
            </label>
            <div>
              <p className="kicker">Stock status</p>
              <span className={stockStatus.includes("Out") ? "badge badge-danger" : stockStatus.includes("Low") ? "badge badge-warn" : "badge badge-success"}>
                {stockStatus}
              </span>
            </div>
          </div>
        </section>

        <section className="panel form-section">
          <div className="section-head-row">
            <h3>6. Variants</h3>
            <label className="check-row">
              <input
                type="checkbox"
                checked={useVariants}
                onChange={(e) => {
                  setUseVariants(e.target.checked);
                  if (!e.target.checked) setForm((prev) => ({ ...prev, variants: [] }));
                }}
              />
              Enable variants
            </label>
          </div>
          {useVariants && (
            <div className="variant-list">
              {variants.map((variant, index) => (
                <div className="variant-row" key={index}>
                  <input
                    placeholder="Name"
                    value={variant.name}
                    onChange={(e) => {
                      const next = [...variants];
                      next[index] = { ...variant, name: e.target.value };
                      setForm((prev) => ({ ...prev, variants: next }));
                    }}
                  />
                  <input
                    placeholder="SKU"
                    value={variant.sku}
                    onChange={(e) => {
                      const next = [...variants];
                      next[index] = { ...variant, sku: e.target.value };
                      setForm((prev) => ({ ...prev, variants: next }));
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={variant.price}
                    onChange={(e) => {
                      const next = [...variants];
                      const price = Number(e.target.value);
                      next[index] = { ...variant, price, mrp: variant.mrp || price };
                      setForm((prev) => ({ ...prev, variants: next }));
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Stock"
                    value={variant.stock}
                    onChange={(e) => {
                      const next = [...variants];
                      next[index] = { ...variant, stock: Number(e.target.value) };
                      setForm((prev) => ({ ...prev, variants: next }));
                    }}
                  />
                  <input
                    placeholder="Image URL"
                    value={variant.image ?? ""}
                    onChange={(e) => {
                      const next = [...variants];
                      next[index] = { ...variant, image: e.target.value };
                      setForm((prev) => ({ ...prev, variants: next }));
                    }}
                  />
                  <button
                    type="button"
                    className="row-action"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        variants: variants.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="outline-button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    variants: [
                      ...(prev.variants ?? []),
                      { name: "", sku: "", price: form.sellingPrice || 0, mrp: form.mrp || 0, stock: 0, image: "" },
                    ],
                  }))
                }
              >
                + Add variant
              </button>
            </div>
          )}
        </section>

        <section className="panel form-section">
          <h3>7. Description & highlights</h3>
          <label>
            Description
            <textarea
              rows={5}
              value={form.fullDescription ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, fullDescription: e.target.value }))}
            />
          </label>
          <div className="highlight-list">
            <p className="kicker">Highlights</p>
            {highlights.map((item, index) => (
              <div className="highlight-row" key={index}>
                <input
                  value={item.text}
                  onChange={(e) => {
                    const next: ProductHighlight[] = [...highlights];
                    next[index] = { ...item, text: e.target.value, sortOrder: index };
                    setForm((prev) => ({ ...prev, highlights: next }));
                  }}
                  placeholder="Highlight line"
                />
                <button
                  type="button"
                  className="row-action"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      highlights: highlights.filter((_, i) => i !== index),
                    }))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="outline-button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  highlights: [...(prev.highlights ?? []), { text: "", sortOrder: highlights.length }],
                }))
              }
            >
              + Add highlight
            </button>
          </div>
        </section>

        <section className="panel form-section">
          <button type="button" className="section-toggle" onClick={() => setSeoOpen((v) => !v)}>
            8. SEO {seoOpen ? "▾" : "▸"}
          </button>
          {seoOpen && (
            <div className="form-grid" style={{ marginTop: 12 }}>
              <label>
                Slug
                <input
                  value={form.slug ?? ""}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm((prev) => ({ ...prev, slug: e.target.value }));
                  }}
                />
              </label>
              <label>
                Meta title
                <input
                  value={form.metaTitle ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, metaTitle: e.target.value }))}
                />
              </label>
              <label className="span-2">
                Meta description
                <textarea
                  rows={3}
                  value={form.metaDescription ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, metaDescription: e.target.value }))}
                />
              </label>
            </div>
          )}
        </section>

        <div className="form-actions sticky-actions">
          <button
            type="button"
            className="outline-button"
            disabled={saving || uploading}
            onClick={() => void save(PRODUCT_STATUS.Draft)}
          >
            {saving ? "Saving…" : "Save as Draft"}
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={saving || uploading}
            onClick={() => void save(PRODUCT_STATUS.Active)}
          >
            {saving ? "Saving…" : "Save & Publish"}
          </button>
        </div>
      </div>
    </>
  );
}
