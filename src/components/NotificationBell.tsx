import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { api, type NotificationList } from "../lib/api";

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationList["items"]>([]);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        if (openRef.current) {
          const data = await api<NotificationList>("/notifications?page=1&pageSize=8");
          if (cancelled) return;
          setItems(data.items);
          setCount(data.unreadCount);
        } else {
          const data = await api<{ count: number }>("/notifications/unread-count");
          if (!cancelled) setCount(data.count);
        }
      } catch {
        if (!openRef.current && !cancelled) setCount(0);
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
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
    const target = items.find((n) => n.id === id);
    if (!target || target.isRead) return;
    const prevItems = items;
    const prevCount = count;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setCount((c) => Math.max(0, c - 1));
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      setItems(prevItems);
      setCount(prevCount);
    }
  }

  async function markAll() {
    if (count === 0 && items.every((n) => n.isRead)) return;
    const prevItems = items;
    const prevCount = count;
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setCount(0);
    try {
      await api("/notifications/read-all", { method: "PATCH" });
    } catch {
      setItems(prevItems);
      setCount(prevCount);
    }
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
            <span className="notif-head-actions">
              {count > 0 && (
                <button type="button" onClick={() => void markAll()}>
                  Mark all read
                </button>
              )}
              <Link to="/notifications" onClick={() => setOpen(false)}>
                View all
              </Link>
            </span>
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
