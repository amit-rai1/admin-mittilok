import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import { api, formatDate, statusClass, type PagedResult } from "../../lib/api";

const RETURN_STATUS: Record<string, string> = {
  "0": "Requested",
  "1": "Approved",
  "2": "Rejected",
  "3": "Pickup scheduled",
  "4": "Received",
  "5": "Refund processing",
  "6": "Completed",
  Requested: "Requested",
  Approved: "Approved",
  Rejected: "Rejected",
  PickupScheduled: "Pickup scheduled",
  Received: "Received",
  RefundProcessing: "Refund processing",
  Completed: "Completed",
};

type ReturnRow = {
  id: number;
  orderId: number;
  orderNumber: string;
  customerName?: string | null;
  reason: string;
  status: string | number;
  createdAt: string;
  items: { productName: string; quantity: number }[];
};

export function ReturnsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResult<ReturnRow> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: "20" });
        if (status !== "") params.set("status", status);
        const result = await api<PagedResult<ReturnRow>>(`/admin/returns?${params}`);
        if (!cancelled) setData(result);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load returns");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, status]);

  async function updateStatus(id: number, next: string) {
    setBusyId(id);
    setError("");
    try {
      await api(`/admin/returns/${id}/status`, {
        method: "PATCH",
        body: { status: Number(next) },
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((row) => (row.id === id ? { ...row, status: Number(next) } : row)),
            }
          : prev,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update return");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader title="Returns" subtitle="Review customer return requests and update status." />
      <div className="toolbar-row">
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {Object.entries(RETURN_STATUS)
            .filter(([k]) => /^\d+$/.test(k))
            .map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
        </select>
      </div>
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-6">
            <span>Return</span>
            <span>Order</span>
            <span>Customer</span>
            <span>Items</span>
            <span>Requested</span>
            <span>Status</span>
          </div>
          {(data?.items ?? []).map((row) => (
            <div className="table-row cols-6" key={row.id}>
              <div>
                <strong>#{row.id}</strong>
                <div className="muted">{row.reason}</div>
              </div>
              <Link to={`/orders/${row.orderId}`}>{row.orderNumber}</Link>
              <span>{row.customerName || "—"}</span>
              <span>{row.items?.map((i) => `${i.productName}×${i.quantity}`).join(", ") || "—"}</span>
              <span>{formatDate(row.createdAt)}</span>
              <select
                className={statusClass(String(row.status))}
                value={String(typeof row.status === "number" ? row.status : row.status)}
                disabled={busyId === row.id}
                onChange={(e) => void updateStatus(row.id, e.target.value)}
              >
                {Object.entries(RETURN_STATUS)
                  .filter(([k]) => /^\d+$/.test(k))
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
          ))}
          {(data?.items?.length ?? 0) === 0 && <EmptyState message="No return requests yet." />}
        </section>
      )}
      {data && (
        <Pagination page={data.page} pageSize={data.pageSize} totalCount={data.totalCount} onChange={setPage} />
      )}
    </>
  );
}
