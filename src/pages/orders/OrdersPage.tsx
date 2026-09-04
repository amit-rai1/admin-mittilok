import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import {
  api,
  formatDate,
  formatMoney,
  ORDER_STATUS,
  PAYMENT_STATUS,
  statusClass,
  type Order,
  type PagedResult,
} from "../../lib/api";

export function OrdersPage() {
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResult<Order> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: "20" });
        if (status !== "") params.set("status", status);
        const result = await api<PagedResult<Order>>(`/admin/orders?${params}`);
        if (!cancelled) setData(result);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, status]);

  return (
    <>
      <PageHeader title="Orders" subtitle="Filter by fulfillment status and open any order for details." />
      <div className="toolbar-row">
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS).map(([value, label]) => (
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
            <span>Order</span>
            <span>Date</span>
            <span>Items</span>
            <span>Total</span>
            <span>Payment</span>
            <span>Status</span>
          </div>
          {(data?.items ?? []).map((order) => (
            <Link className="table-row cols-6 link-row" key={order.id} to={`/orders/${order.id}`}>
              <strong>{order.orderNumber}</strong>
              <span>{formatDate(order.createdAt)}</span>
              <span>{order.itemCount}</span>
              <span>{formatMoney(order.grandTotal)}</span>
              <span className={statusClass(PAYMENT_STATUS[order.paymentStatus] ?? "")}>
                {PAYMENT_STATUS[order.paymentStatus] ?? order.paymentStatus}
              </span>
              <span className={statusClass(ORDER_STATUS[order.orderStatus] ?? "")}>
                {ORDER_STATUS[order.orderStatus] ?? order.orderStatus}
              </span>
            </Link>
          ))}
          {(data?.items.length ?? 0) === 0 && <EmptyState message="No orders found." />}
        </section>
      )}
      {data && (
        <Pagination page={data.page} pageSize={data.pageSize} totalCount={data.totalCount} onChange={setPage} />
      )}
    </>
  );
}
