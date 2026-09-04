import { useEffect, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import {
  api,
  formatMoney,
  PRICING_TYPE,
  type Category,
  type PagedResult,
  type ServiceItem,
} from "../../lib/api";

const blank: Omit<ServiceItem, "id" | "categoryName"> = {
  name: "",
  slug: "",
  categoryId: 0,
  subCategoryId: null,
  description: "",
  basePrice: 0,
  pricingType: 0,
  duration: "",
  serviceArea: "",
  isActive: true,
};

export function ServicesPage() {
  const [data, setData] = useState<PagedResult<ServiceItem> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  async function load(nextPage = page, nextQuery = query) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(nextPage), pageSize: "20" });
      if (nextQuery.trim()) params.set("query", nextQuery.trim());
      const [services, cats] = await Promise.all([
        api<PagedResult<ServiceItem>>(`/services?${params}`),
        api<Category[]>("/categories"),
      ]);
      setData(services);
      setCategories(cats);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load services");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page]);

  function openCreate() {
    setEditing(null);
    setForm({ ...blank, categoryId: categories[0]?.id ?? 0 });
    setFormOpen(true);
  }

  function openEdit(item: ServiceItem) {
    setEditing(item);
    setForm({
      name: item.name,
      slug: item.slug,
      categoryId: item.categoryId,
      subCategoryId: item.subCategoryId,
      description: item.description ?? "",
      basePrice: item.basePrice,
      pricingType: item.pricingType,
      duration: item.duration ?? "",
      serviceArea: item.serviceArea ?? "",
      isActive: item.isActive,
    });
    setFormOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api(`/admin/services/${editing.id}`, { method: "PUT", body: { ...editing, ...form } });
      } else {
        await api("/admin/services", { method: "POST", body: form });
      }
      setFormOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save service");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this service?")) return;
    try {
      await api(`/admin/services/${id}`, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete service");
    }
  }

  return (
    <>
      <PageHeader
        title="Services"
        subtitle="Service catalog for bookings and enquiries."
        actions={
          <button type="button" className="primary-button" onClick={openCreate}>
            + Add service
          </button>
        }
      />
      <div className="toolbar-row">
        <input
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              void load(1, query);
            }
          }}
        />
        <button
          type="button"
          className="outline-button"
          onClick={() => {
            setPage(1);
            void load(1, query);
          }}
        >
          Search
        </button>
      </div>
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-5">
            <span>Service</span>
            <span>Price</span>
            <span>Pricing</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {(data?.items ?? []).map((item) => (
            <div className="table-row cols-5" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <small>{item.categoryName ?? "—"}</small>
              </div>
              <span>{formatMoney(item.basePrice)}</span>
              <span>{PRICING_TYPE[item.pricingType] ?? item.pricingType}</span>
              <span className={item.isActive ? "badge badge-success" : "badge"}>{item.isActive ? "Active" : "Inactive"}</span>
              <div className="row-actions">
                <button type="button" className="ghost-btn" onClick={() => openEdit(item)}>
                  Edit
                </button>
                <button type="button" className="row-action" onClick={() => void remove(item.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {(data?.items.length ?? 0) === 0 && <EmptyState message="No services found." />}
        </section>
      )}
      {data && <Pagination page={data.page} pageSize={data.pageSize} totalCount={data.totalCount} onChange={setPage} />}

      {formOpen && (
        <div className="modal-backdrop">
          <form className="modal panel" onSubmit={(e) => void onSubmit(e)}>
            <div className="panel-heading">
              <div>
                <p className="kicker">{editing ? "Edit" : "Create"}</p>
                <h3>{editing ? "Update service" : "New service"}</h3>
              </div>
              <button type="button" className="icon-only" onClick={() => setFormOpen(false)}>
                ×
              </button>
            </div>
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              Slug
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
            </label>
            <label>
              Category
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })} required>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-two">
              <label>
                Base price
                <input type="number" min={0} value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })} />
              </label>
              <label>
                Pricing type
                <select value={form.pricingType} onChange={(e) => setForm({ ...form, pricingType: Number(e.target.value) })}>
                  {Object.entries(PRICING_TYPE).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Description
              <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </label>
            <label className="check-row">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>
            <button className="primary-button" disabled={saving}>
              {saving ? "Saving…" : "Save service"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
