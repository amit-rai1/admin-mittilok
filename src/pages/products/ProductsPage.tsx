import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import {
  api,
  formatMoney,
  mediaUrl,
  PRODUCT_STATUS,
  statusClass,
  type Category,
  type PagedResult,
  type ProductDetail,
  type ProductListItem,
} from "../../lib/api";

export function ProductsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [subCategoryId, setSubCategoryId] = useState<number | "">("");
  const [status, setStatus] = useState("");
  const [stock, setStock] = useState("");
  const [page, setPage] = useState(1);
  const [roots, setRoots] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Category[]>([]);
  const [data, setData] = useState<PagedResult<ProductListItem> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    void api<Category[]>("/categories?rootsOnly=true&type=0")
      .then(setRoots)
      .catch(() => setRoots([]));
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setSubs([]);
      setSubCategoryId("");
      return;
    }
    void api<Category[]>(`/categories?parentId=${categoryId}`)
      .then(setSubs)
      .catch(() => setSubs([]));
    setSubCategoryId("");
  }, [categoryId]);

  async function load(nextPage = page) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "20",
        includeDrafts: "true",
      });
      if (query.trim()) params.set("query", query.trim());
      if (categoryId) params.set("categoryId", String(categoryId));
      if (subCategoryId) params.set("subCategoryId", String(subCategoryId));
      if (status) params.set("status", status);
      if (stock) params.set("stock", stock);
      setData(await api<PagedResult<ProductListItem>>(`/products?${params}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(page);
  }, [page]);

  function applyFilters() {
    setPage(1);
    void load(1);
  }

  async function duplicate(id: number) {
    setBusyId(id);
    setError("");
    try {
      const copy = await api<ProductDetail>(`/admin/products/${id}/duplicate`, { method: "POST" });
      navigate(`/products/${copy.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to duplicate product");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(item: ProductListItem) {
    setBusyId(item.id);
    setError("");
    try {
      const detail = await api<ProductDetail>(`/products/${item.id}`);
      const nextStatus =
        item.status === "Active" || item.status === "OutOfStock"
          ? PRODUCT_STATUS.Inactive
          : PRODUCT_STATUS.Active;
      await api(`/admin/products/${item.id}`, {
        method: "PUT",
        body: {
          sku: detail.sku,
          name: detail.name,
          slug: detail.slug,
          categoryId: detail.categoryId,
          subCategoryId: detail.subCategoryId ?? null,
          brand: detail.brand ?? "",
          shortDescription: detail.shortDescription ?? "",
          fullDescription: detail.fullDescription ?? "",
          thumbnail: detail.thumbnail ?? "",
          price: detail.price,
          mrp: detail.mrp,
          discountPercent: detail.discountPercent,
          sellingPrice: detail.sellingPrice,
          taxPercent: detail.taxPercent,
          stockQuantity: detail.stockQuantity,
          lowStockThreshold: detail.lowStockThreshold ?? 5,
          unit: detail.unit ?? "pcs",
          isFeatured: detail.isFeatured,
          isBestSeller: detail.isBestSeller,
          isNewArrival: detail.isNewArrival,
          isOrganic: detail.isOrganic,
          careInstructions: detail.careInstructions ?? "",
          plantHeight: detail.plantHeight ?? "",
          potSize: detail.potSize ?? "",
          sunlightRequirement: detail.sunlightRequirement ?? "",
          waterRequirement: detail.waterRequirement ?? "",
          soilType: detail.soilType ?? "",
          deliveryInfo: detail.deliveryInfo ?? "",
          isReturnEligible: detail.isReturnEligible,
          metaTitle: detail.metaTitle ?? "",
          metaDescription: detail.metaDescription ?? "",
          status: nextStatus,
          images: detail.images ?? [],
          variants: detail.variants ?? [],
          highlights: detail.highlights ?? [],
        },
      });
      await load(page);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update product status");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this product?")) return;
    setBusyId(id);
    try {
      await api(`/admin/products/${id}`, { method: "DELETE" });
      await load(page);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete product");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Catalog items including drafts."
        actions={
          <Link className="primary-button" to="/products/new">
            + New product
          </Link>
        }
      />
      <div className="toolbar-row filters-wrap">
        <input
          className="search-input"
          placeholder="Search products…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters();
          }}
        />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">All categories</option>
          {roots.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={subCategoryId}
          onChange={(e) => setSubCategoryId(e.target.value ? Number(e.target.value) : "")}
          disabled={!categoryId}
        >
          <option value="">All subcategories</option>
          {subs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="OutOfStock">Out of stock</option>
        </select>
        <select value={stock} onChange={(e) => setStock(e.target.value)}>
          <option value="">All stock</option>
          <option value="instock">In stock</option>
          <option value="lowstock">Low stock</option>
          <option value="outofstock">Out of stock</option>
        </select>
        <button type="button" className="outline-button" onClick={applyFilters}>
          Apply
        </button>
      </div>
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-7">
            <span>Image</span>
            <span>Name</span>
            <span>Category</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {(data?.items ?? []).map((item) => (
            <div className="table-row cols-7" key={item.id}>
              <div className="thumb-cell">
                {item.thumbnail ? (
                  <img src={mediaUrl(item.thumbnail)} alt="" />
                ) : (
                  <span className="thumb-placeholder">—</span>
                )}
              </div>
              <div>
                <strong>{item.name}</strong>
                <small>{item.sku}</small>
              </div>
              <span>
                {item.categoryName ?? "—"}
                {item.subCategoryName ? ` / ${item.subCategoryName}` : ""}
              </span>
              <span>{formatMoney(item.sellingPrice || item.price)}</span>
              <div>
                <span className={item.stockQuantity < 12 ? "critical" : ""}>{item.stockQuantity}</span>
                <small>{item.stockStatus ?? "—"}</small>
              </div>
              <span className={statusClass(item.status)}>{item.status}</span>
              <div className="row-actions">
                <Link className="ghost-btn" to={`/products/${item.id}`}>
                  Edit
                </Link>
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={busyId === item.id}
                  onClick={() => void duplicate(item.id)}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={busyId === item.id}
                  onClick={() => void toggleStatus(item)}
                >
                  {item.status === "Active" || item.status === "OutOfStock" ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  className="row-action"
                  disabled={busyId === item.id}
                  onClick={() => void remove(item.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {(data?.items.length ?? 0) === 0 && <EmptyState message="No products found." />}
        </section>
      )}
      {data && (
        <Pagination page={data.page} pageSize={data.pageSize} totalCount={data.totalCount} onChange={setPage} />
      )}
    </>
  );
}
