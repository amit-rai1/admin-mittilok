import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, ListToolbar, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import { NumberField } from "../../components/NumberField";
import { DEFAULT_PAGE_SIZE, paginateLocal, resultRange } from "../../lib/listPaging";
import { api, mediaUrl, uploadImage, type Banner } from "../../lib/api";

const blank: Omit<Banner, "id"> = {
  title: "",
  subtitle: "",
  image: "",
  mobileImage: "",
  buttonText: "",
  buttonLink: "",
  displayOrder: 0,
  isActive: true,
};

export function BannersPage() {
  const [items, setItems] = useState<Banner[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Banner>({ id: 0, ...blank });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await api<Banner[]>("/admin/content/banners"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load banners");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setForm({ id: 0, ...blank });
    setFormOpen(true);
  }

  function openEdit(item: Banner) {
    setForm(item);
    setFormOpen(true);
  }

  async function onUpload(file: File | null, field: "image" | "mobileImage") {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadImage(file, "banners");
      const path = uploaded.path || uploaded.url;
      setForm((prev) => ({ ...prev, [field]: path }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload image");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/admin/content/banners", { method: "POST", body: form });
      setFormOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save banner");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this banner?")) return;
    try {
      await api(`/admin/content/banners/${id}`, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete banner");
    }
  }

  const paged = useMemo(
    () =>
      paginateLocal(items, page, pageSize, appliedQuery, (item, q) =>
        `${item.title} ${item.subtitle ?? ""} ${item.buttonLink ?? ""}`.toLowerCase().includes(q),
      ),
    [items, page, pageSize, appliedQuery],
  );

  return (
    <>
      <PageHeader
        title="Banners"
        subtitle="Homepage and campaign banners."
        actions={
          <button type="button" className="primary-button" onClick={openCreate}>
            + Add banner
          </button>
        }
      />
      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search banners…"
        onApply={() => {
          setPage(1);
          setAppliedQuery(query);
        }}
        onClear={() => {
          setQuery("");
          setAppliedQuery("");
          setPage(1);
        }}
        resultLabel={resultRange(paged.page, paged.pageSize, paged.totalCount)}
      />
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-5">
            <span>Banner</span>
            <span>Link</span>
            <span>Order</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {paged.items.map((item) => (
            <div className="table-row cols-5" key={item.id}>
              <div className="thumb-cell">
                {item.image ? <img src={mediaUrl(item.image)} alt="" /> : <span className="thumb-placeholder">—</span>}
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle || "—"}</small>
                </div>
              </div>
              <span>{item.buttonLink || "—"}</span>
              <span>{item.displayOrder}</span>
              <span className={item.isActive ? "badge badge-success" : "badge"}>{item.isActive ? "Active" : "Off"}</span>
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
          {paged.items.length === 0 && <EmptyState message="No banners yet." />}
        </section>
      )}
      <Pagination
        page={paged.page}
        pageSize={paged.pageSize}
        totalCount={paged.totalCount}
        onChange={setPage}
        onPageSizeChange={(size) => {
          setPage(1);
          setPageSize(size);
        }}
      />

      {formOpen && (
        <div className="modal-backdrop">
          <form className="modal panel" onSubmit={(e) => void onSubmit(e)}>
            <div className="panel-heading">
              <div>
                <p className="kicker">{form.id ? "Edit" : "Create"}</p>
                <h3>Banner</h3>
              </div>
              <button type="button" className="icon-only" onClick={() => setFormOpen(false)}>
                ×
              </button>
            </div>
            <ErrorBanner message={error} />
            <label>
              Title
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </label>
            <label>
              Subtitle
              <input value={form.subtitle ?? ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </label>
            <label>
              Image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void onUpload(e.target.files?.[0] ?? null, "image")}
                disabled={uploading}
              />
            </label>
            {form.image && (
              <div className="thumb-cell large">
                <img src={mediaUrl(form.image)} alt="" />
              </div>
            )}
            <label>
              Mobile image (optional)
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void onUpload(e.target.files?.[0] ?? null, "mobileImage")}
                disabled={uploading}
              />
            </label>
            {form.mobileImage && (
              <div className="thumb-cell large">
                <img src={mediaUrl(form.mobileImage)} alt="" />
              </div>
            )}
            <label>
              Button text
              <input value={form.buttonText ?? ""} onChange={(e) => setForm({ ...form, buttonText: e.target.value })} />
            </label>
            <label>
              Button link
              <input value={form.buttonLink ?? ""} onChange={(e) => setForm({ ...form, buttonLink: e.target.value })} />
            </label>
            <label>
              Display order
              <NumberField
                value={form.displayOrder}
                onChange={(n) => setForm({ ...form, displayOrder: n ?? 0 })}
                allowDecimal={false}
              />
            </label>
            <label className="check-row">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>
            <button className="primary-button" disabled={saving || uploading}>
              {saving ? "Saving…" : uploading ? "Uploading…" : "Save banner"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
