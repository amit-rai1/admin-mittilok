import { useEffect, useState } from "react";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import {
  api,
  BOOKING_STATUS,
  formatDate,
  formatMoney,
  PAYMENT_STATUS,
  statusClass,
  type PagedResult,
  type ServiceBooking,
} from "../../lib/api";

export function BookingsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResult<ServiceBooking> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await api<PagedResult<ServiceBooking>>(`/admin/service-bookings?page=${page}&pageSize=20`);
        if (!cancelled) setData(result);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load bookings");
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
      <PageHeader title="Service bookings" subtitle="Customer booking requests for paid and quote services." />
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-6">
            <span>Booking</span>
            <span>Service</span>
            <span>Date</span>
            <span>Amount</span>
            <span>Payment</span>
            <span>Status</span>
          </div>
          {(data?.items ?? []).map((item) => (
            <div className="table-row cols-6" key={item.id}>
              <strong>{item.bookingNumber}</strong>
              <span>{item.serviceName ?? item.serviceId}</span>
              <span>{formatDate(item.bookingDate)}</span>
              <span>{formatMoney(item.finalPrice ?? item.estimatedPrice)}</span>
              <span className={statusClass(PAYMENT_STATUS[item.paymentStatus] ?? "")}>
                {PAYMENT_STATUS[item.paymentStatus]}
              </span>
              <span className={statusClass(BOOKING_STATUS[item.status] ?? "")}>{BOOKING_STATUS[item.status]}</span>
            </div>
          ))}
          {(data?.items.length ?? 0) === 0 && <EmptyState message="No service bookings yet." />}
        </section>
      )}
      {data && <Pagination page={data.page} pageSize={data.pageSize} totalCount={data.totalCount} onChange={setPage} />}
    </>
  );
}
