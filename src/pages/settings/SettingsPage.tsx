import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, ListToolbar, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import { DEFAULT_PAGE_SIZE, paginateLocal, resultRange } from "../../lib/listPaging";
import { api, type Setting } from "../../lib/api";

export function SettingsPage() {
  const [items, setItems] = useState<Setting[]>([]);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [group, setGroup] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [keyName, setKeyName] = useState("");
  const [value, setValue] = useState("");
  const [groupName, setGroupName] = useState("general");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  async function load(nextGroup = group) {
    setLoading(true);
    setError("");
    try {
      const qs = nextGroup ? `?group=${encodeURIComponent(nextGroup)}` : "";
      setItems(await api<Setting[]>(`/admin/settings${qs}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const paged = useMemo(
    () =>
      paginateLocal(items, page, pageSize, appliedQuery, (item, q) =>
        `${item.key} ${item.value ?? ""} ${item.group ?? ""}`.toLowerCase().includes(q),
      ),
    [items, page, pageSize, appliedQuery],
  );

  async function saveRow(setting: Setting) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api("/admin/settings", { method: "PUT", body: setting });
      setMessage("Setting saved.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save setting");
    } finally {
      setSaving(false);
    }
  }

  async function createSetting(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api("/admin/settings", {
        method: "PUT",
        body: { id: 0, key: keyName, value, group: groupName },
      });
      setKeyName("");
      setValue("");
      setGroupName("general");
      setFormOpen(false);
      setMessage("Setting created.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create setting");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Key/value configuration for the platform."
        actions={
          <button type="button" className="primary-button" onClick={() => setFormOpen(true)}>
            + Add setting
          </button>
        }
      />
      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search key, value…"
        filters={
          <input
            className="search-input"
            placeholder="Filter by group…"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            style={{ maxWidth: 160 }}
          />
        }
        onApply={() => {
          setPage(1);
          setAppliedQuery(query);
          void load(group);
        }}
        onClear={() => {
          setQuery("");
          setAppliedQuery("");
          setGroup("");
          setPage(1);
          void load("");
        }}
        resultLabel={resultRange(paged.page, paged.pageSize, paged.totalCount)}
      />
      <ErrorBanner message={error} />
      {message && <div className="success">{message}</div>}
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-4">
            <span>Key</span>
            <span>Value</span>
            <span>Group</span>
            <span>Actions</span>
          </div>
          {paged.items.map((item) => (
            <div className="table-row cols-4" key={item.id}>
              <strong>{item.key}</strong>
              <input
                value={item.value ?? ""}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((row) => (row.id === item.id ? { ...row, value: e.target.value } : row)),
                  )
                }
              />
              <span>{item.group || "—"}</span>
              <button type="button" className="primary-button" disabled={saving} onClick={() => void saveRow(item)}>
                Save
              </button>
            </div>
          ))}
          {paged.items.length === 0 && <EmptyState message="No settings found." />}
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
        <div className="modal-backdrop" onClick={() => setFormOpen(false)}>
          <form className="modal panel" onClick={(e) => e.stopPropagation()} onSubmit={(e) => void createSetting(e)}>
            <div className="panel-heading">
              <div>
                <p className="kicker">Create</p>
                <h3>New setting</h3>
              </div>
              <button type="button" className="icon-only" onClick={() => setFormOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <ErrorBanner message={error} />
            <label>
              Key
              <input value={keyName} onChange={(e) => setKeyName(e.target.value)} required />
            </label>
            <label>
              Group
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </label>
            <label>
              Value
              <input value={value} onChange={(e) => setValue(e.target.value)} required />
            </label>
            <div className="form-actions">
              <button type="button" className="outline-button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" disabled={saving}>
                {saving ? "Saving…" : "Create setting"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
