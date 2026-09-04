import { useEffect, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import { api, formatDate, type Notification, type NotificationList } from "../../lib/api";

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NotificationList | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await api<NotificationList>(`/admin/notifications?page=${page}&pageSize=20`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page]);

  async function markAll() {
    try {
      await api("/notifications/read-all", { method: "PATCH" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to mark all read");
    }
  }

  async function markRead(item: Notification) {
    if (item.isRead) return;
    try {
      await api(`/notifications/${item.id}/read`, { method: "PATCH" });
      await load();
    } catch (caught) {
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
          <button type="button" className="outline-button" onClick={() => void markAll()}>
            Mark all read
          </button>
        }
      />
      <ErrorBanner message={error} />
      <form className="panel form-grid" onSubmit={(e) => void broadcast(e)}>
        <h3 className="span-2">Broadcast notification</h3>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Message
          <input value={message} onChange={(e) => setMessage(e.target.value)} required />
        </label>
        <div className="form-actions span-2">
          <button className="primary-button" disabled={saving}>
            {saving ? "Sending…" : "Send broadcast"}
          </button>
        </div>
      </form>

      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel">
          <div className="stack-list">
            {(data?.items ?? []).map((item) => (
              <button
                type="button"
                className={`stack-row notif-row ${item.isRead ? "" : "unread"}`}
                key={item.id}
                onClick={() => void markRead(item)}
              >
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.message}</small>
                </div>
                <span>{formatDate(item.createdAt)}</span>
              </button>
            ))}
            {(data?.items.length ?? 0) === 0 && <EmptyState message="No notifications." />}
          </div>
        </section>
      )}
      {data && (
        <Pagination page={data.page} pageSize={data.pageSize} totalCount={data.totalCount} onChange={setPage} />
      )}
    </>
  );
}
