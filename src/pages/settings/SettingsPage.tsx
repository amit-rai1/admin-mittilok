import { useEffect, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "../../components/Layout";
import { api, type Setting } from "../../lib/api";

export function SettingsPage() {
  const [items, setItems] = useState<Setting[]>([]);
  const [group, setGroup] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [keyName, setKeyName] = useState("");
  const [value, setValue] = useState("");
  const [groupName, setGroupName] = useState("general");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
      <PageHeader title="Settings" subtitle="Key/value configuration for the platform." />
      <div className="toolbar-row">
        <input
          className="search-input"
          placeholder="Filter by group…"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        />
        <button type="button" className="outline-button" onClick={() => void load(group)}>
          Apply
        </button>
      </div>
      <ErrorBanner message={error} />
      {message && <div className="success">{message}</div>}
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-4">
            <span>Key</span>
            <span>Group</span>
            <span>Value</span>
            <span>Actions</span>
          </div>
          {items.map((item) => (
            <div className="table-row cols-4" key={item.id || item.key}>
              <strong>{item.key}</strong>
              <span>{item.group || "—"}</span>
              <input
                value={item.value}
                onChange={(e) =>
                  setItems((prev) => prev.map((row) => (row.key === item.key ? { ...row, value: e.target.value } : row)))
                }
              />
              <button type="button" className="ghost-btn" disabled={saving} onClick={() => void saveRow(item)}>
                Save
              </button>
            </div>
          ))}
          {items.length === 0 && <EmptyState message="No settings found." />}
        </section>
      )}

      <form className="panel form-grid" onSubmit={(e) => void createSetting(e)}>
        <h3 className="span-2">Add setting</h3>
        <label>
          Key
          <input value={keyName} onChange={(e) => setKeyName(e.target.value)} required />
        </label>
        <label>
          Group
          <input value={groupName} onChange={(e) => setGroupName(e.target.value)} />
        </label>
        <label className="span-2">
          Value
          <input value={value} onChange={(e) => setValue(e.target.value)} required />
        </label>
        <div className="form-actions span-2">
          <button className="primary-button" disabled={saving}>
            {saving ? "Saving…" : "Create setting"}
          </button>
        </div>
      </form>
    </>
  );
}
