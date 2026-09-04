import { useEffect, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "../../components/Layout";
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
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Banner>({ id: 0, ...blank });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await api<Banner[]>("/content/banners"));
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
          {items.map((item) => (
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
          {items.length === 0 && <EmptyState message="No banners yet." />}
        </section>
      )}

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
              <input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
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
