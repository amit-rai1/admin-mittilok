import { useEffect, useState } from "react";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import {
  api,
  formatDate,
  formatMoney,
  PAYMENT_STATUS,
  PODCAST_STATUS,
  statusClass,
  type PagedResult,
  type PodcastBooking,
} from "../../lib/api";

export function PodcastBookingsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResult<PodcastBooking> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await api<PagedResult<PodcastBooking>>(`/admin/podcast/bookings?page=${page}&pageSize=20`);
        if (!cancelled) setData(result);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load podcast bookings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <>
      <PageHeader title="Podcast bookings" subtitle="Studio and guest booking requests." />
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-6">
            <span>Booking</span>
            <span>Guest</span>
            <span>Topic</span>
            <span>Amount</span>
            <span>Payment</span>
            <span>Status</span>
          </div>
          {(data?.items ?? []).map((item) => (
            <div className="table-row cols-6" key={item.id}>
              <div>
                <strong>{item.bookingNumber}</strong>
                <small>{formatDate(item.bookingDate)}</small>
              </div>
              <div>
                <strong>{item.name}</strong>
                <small>{item.mobile}</small>
              </div>
              <span>{item.topic || item.packageName || "—"}</span>
              <span>{formatMoney(item.amount)}</span>
              <span className={statusClass(PAYMENT_STATUS[item.paymentStatus] ?? "")}>
                {PAYMENT_STATUS[item.paymentStatus]}
              </span>
              <span className={statusClass(PODCAST_STATUS[item.status] ?? "")}>{PODCAST_STATUS[item.status]}</span>
            </div>
          ))}
          {(data?.items.length ?? 0) === 0 && <EmptyState message="No podcast bookings yet." />}
        </section>
      )}
      {data && <Pagination page={data.page} pageSize={data.pageSize} totalCount={data.totalCount} onChange={setPage} />}
    </>
  );
}
