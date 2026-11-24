import { useEffect, useState, type ReactNode } from "react";

type ToastKind = "success" | "error";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

let nextId = 1;
let items: ToastItem[] = [];
const listeners = new Set<(next: ToastItem[]) => void>();

function emit() {
  const snapshot = [...items];
  listeners.forEach((listener) => listener(snapshot));
}

function push(kind: ToastKind, message: string) {
  const text = message.trim();
  if (!text) return;
  const item: ToastItem = { id: nextId++, kind, message: text };
  items = [...items, item];
  emit();
  window.setTimeout(() => dismiss(item.id), 4500);
}

function dismiss(id: number) {
  const before = items.length;
  items = items.filter((t) => t.id !== id);
  if (items.length !== before) emit();
}

export const toast = {
  success(message: string) {
    push("success", message);
  },
  error(message: string) {
    push("error", message);
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>(items);

  useEffect(() => {
    listeners.add(setToasts);
    setToasts([...items]);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  return (
    <>
      {children}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions">
        {toasts.map((item) => (
          <div key={item.id} className={`toast toast-${item.kind}`} role="status">
            <span>{item.message}</span>
            <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(item.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
