import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, ListToolbar, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import { resultRange, DEFAULT_PAGE_SIZE } from "../../lib/listPaging";
import { api, formatDate, type Notification, type NotificationList } from "../../lib/api";

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<NotificationList | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) {
      setLoading(true);
      setError("");
    }
    try {
      setData(await api<NotificationList>(`/admin/notifications?page=${page}&pageSize=${pageSize}`));
    } catch (caught) {
      if (!quiet) setError(caught instanceof Error ? caught.message : "Unable to load notifications");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => void load(true), 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    const q = appliedQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.title} ${item.message}`.toLowerCase().includes(q));
  }, [data, appliedQuery]);

  async function markAll() {
    if (!data) return;
    const prev = data;
    setData({
      ...data,
      unreadCount: 0,
      items: data.items.map((n) => ({ ...n, isRead: true })),
    });
    try {
      await api("/notifications/read-all", { method: "PATCH" });
    } catch (caught) {
      setData(prev);
      setError(caught instanceof Error ? caught.message : "Unable to mark all read");
    }
  }

  async function markRead(item: Notification) {
    if (item.isRead || !data) return;
    const prev = data;
    setData({
      ...data,
      unreadCount: Math.max(0, data.unreadCount - 1),
      items: data.items.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
    });
    try {
      await api(`/notifications/${item.id}/read`, { method: "PATCH" });
    } catch (caught) {
      setData(prev);
      setError(caught instanceof Error ? caught.message : "Unable to mark read");
    }
  }

  async function broadcast(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/admin/notifications/broadcast", {
        method: "POST",
        body: { title, message, type: 11, entityType: 6 },
      });
      setTitle("");
      setMessage("");
      setFormOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to broadcast");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Inbox and system broadcasts."
        actions={
          <div className="header-actions">
            <button type="button" className="outline-button" onClick={() => void markAll()}>
              Mark all read
            </button>
            <button type="button" className="primary-button" onClick={() => setFormOpen(true)}>
              + Broadcast
            </button>
          </div>
        }
      />
      <ErrorBanner message={error} />

      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Filter by title or message…"
        onApply={() => setAppliedQuery(query)}
        onClear={() => {
          setQuery("");
          setAppliedQuery("");
        }}
        resultLabel={
          data
            ? appliedQuery
              ? `${filteredItems.length} matched on this page · ${resultRange(data.page, data.pageSize, data.totalCount)}`
              : resultRange(data.page, data.pageSize, data.totalCount)
            : undefined
        }
      />

      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-3">
            <span>Notification</span>
            <span>Status</span>
            <span>When</span>
          </div>
          {filteredItems.map((item) => (
            <button
              type="button"
              className={`table-row cols-3 link-row ${item.isRead ? "" : "unread"}`}
              key={item.id}
              onClick={() => void markRead(item)}
            >
              <div>
                <strong>{item.title}</strong>
                <small>{item.message}</small>
              </div>
              <span>{item.isRead ? "Read" : "Unread"}</span>
              <span>{formatDate(item.createdAt)}</span>
            </button>
          ))}
          {filteredItems.length === 0 && <EmptyState message="No notifications." />}
        </section>
      )}
      {data && (
        <Pagination
          page={data.page}
          pageSize={pageSize}
          totalCount={data.totalCount}
          onChange={setPage}
          onPageSizeChange={(size) => {
            setPage(1);
            setPageSize(size);
          }}
        />
      )}
      {formOpen && (
        <div className="modal-backdrop" onClick={() => setFormOpen(false)}>
          <form className="modal panel" onClick={(e) => e.stopPropagation()} onSubmit={(e) => void broadcast(e)}>
            <div className="panel-heading">
              <div>
                <p className="kicker">Create</p>
                <h3>Broadcast notification</h3>
              </div>
              <button type="button" className="icon-only" onClick={() => setFormOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <ErrorBanner message={error} />
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label>
              Message
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} />
            </label>
            <div className="form-actions">
              <button type="button" className="outline-button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" disabled={saving}>
                {saving ? "Sending…" : "Send broadcast"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
