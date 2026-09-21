import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, ListToolbar, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import { NumberField } from "../../components/NumberField";
import { DEFAULT_PAGE_SIZE, paginateLocal, resultRange } from "../../lib/listPaging";
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
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<HomepageSection>(blank);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await api<HomepageSection[]>("/admin/content/sections"));
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

  const paged = useMemo(
    () =>
      paginateLocal(items, page, pageSize, appliedQuery, (item, q) =>
        `${item.key} ${item.title} ${item.sectionType}`.toLowerCase().includes(q),
      ),
    [items, page, pageSize, appliedQuery],
  );

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
      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search sections…"
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
            <span>Key</span>
            <span>Title</span>
            <span>Type</span>
            <span>Order</span>
            <span>Status</span>
          </div>
          {paged.items.map((item) => (
            <button type="button" className="table-row cols-5 link-row" key={item.id || item.key} onClick={() => openEdit(item)}>
              <strong>{item.key}</strong>
              <span>{item.title}</span>
              <span>{item.sectionType}</span>
              <span>{item.displayOrder}</span>
              <span className={item.isEnabled ? "badge badge-success" : "badge"}>{item.isEnabled ? "Enabled" : "Disabled"}</span>
            </button>
          ))}
          {paged.items.length === 0 && <EmptyState message="No homepage sections yet." />}
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
              <NumberField
                value={form.displayOrder}
                onChange={(n) => setForm({ ...form, displayOrder: n ?? 0 })}
                allowDecimal={false}
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
