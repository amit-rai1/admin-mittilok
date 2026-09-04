import { useEffect, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "../../components/Layout";
import { api, type HomepageSection } from "../../lib/api";

const blank: HomepageSection = {
  id: 0,
  key: "",
  title: "",
  sectionType: "custom",
  configJson: "{}",
  displayOrder: 0,
  isEnabled: true,
};

export function HomepagePage() {
  const [items, setItems] = useState<HomepageSection[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<HomepageSection>(blank);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await api<HomepageSection[]>("/content/homepage"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load homepage sections");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setForm(blank);
    setFormOpen(true);
  }

  function openEdit(item: HomepageSection) {
    setForm(item);
    setFormOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/admin/content/sections", { method: "POST", body: form });
      setFormOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save section");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Homepage"
        subtitle="Configurable homepage sections for the storefront."
        actions={
          <button type="button" className="primary-button" onClick={openCreate}>
            + Add section
          </button>
        }
      />
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-5">
            <span>Key</span>
            <span>Title</span>
            <span>Type</span>
            <span>Order</span>
            <span>Status</span>
          </div>
          {items.map((item) => (
            <button type="button" className="table-row cols-5 link-row" key={item.id || item.key} onClick={() => openEdit(item)}>
              <strong>{item.key}</strong>
              <span>{item.title}</span>
              <span>{item.sectionType}</span>
              <span>{item.displayOrder}</span>
              <span className={item.isEnabled ? "badge badge-success" : "badge"}>{item.isEnabled ? "Enabled" : "Disabled"}</span>
            </button>
          ))}
          {items.length === 0 && <EmptyState message="No homepage sections yet." />}
        </section>
      )}

      {formOpen && (
        <div className="modal-backdrop">
          <form className="modal panel" onSubmit={(e) => void onSubmit(e)}>
            <div className="panel-heading">
              <div>
                <p className="kicker">Section</p>
                <h3>{form.id ? "Update section" : "New section"}</h3>
              </div>
              <button type="button" className="icon-only" onClick={() => setFormOpen(false)}>
                ×
              </button>
            </div>
            <label>
              Key
              <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} required />
            </label>
            <label>
              Title
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </label>
            <label>
              Section type
              <input value={form.sectionType} onChange={(e) => setForm({ ...form, sectionType: e.target.value })} required />
            </label>
            <label>
              Display order
              <input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
              />
            </label>
            <label>
              Config JSON
              <textarea value={form.configJson ?? ""} onChange={(e) => setForm({ ...form, configJson: e.target.value })} rows={5} />
            </label>
            <label className="check-row">
              <input type="checkbox" checked={form.isEnabled} onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })} />
              Enabled
            </label>
            <button className="primary-button" disabled={saving}>
              {saving ? "Saving…" : "Save section"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
