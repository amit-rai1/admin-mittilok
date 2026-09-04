import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { api, type NotificationList } from "../lib/api";

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationList["items"]>([]);

  async function load() {
    try {
      const data = await api<{ count: number }>("/notifications/unread-count");
      setCount(data.count);
    } catch {
      setCount(0);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(timer);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        const data = await api<NotificationList>("/notifications?page=1&pageSize=8");
        setItems(data.items);
        setCount(data.unreadCount);
      } catch {
        setItems([]);
      }
    }
  }

  async function markRead(id: number) {
    await api(`/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setCount((c) => Math.max(0, c - 1));
  }

  return (
    <div className="notif-wrap">
      <button type="button" className="icon-btn" onClick={() => void toggle()} aria-label="Notifications">
        <Bell size={18} />
        {count > 0 && <span className="notif-dot">{count > 99 ? "99+" : count}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <strong>Notifications</strong>
            <Link to="/notifications" onClick={() => setOpen(false)}>
              View all
            </Link>
          </div>
          {items.length === 0 ? (
            <p className="empty-inline">No notifications yet.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`notif-item ${item.isRead ? "" : "unread"}`}
                onClick={() => void markRead(item.id)}
              >
                <strong>{item.title}</strong>
                <span>{item.message}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
