import { useEffect, useState } from "react";
import { EmptyState, ErrorBanner, ListToolbar, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import { resultRange, DEFAULT_PAGE_SIZE } from "../../lib/listPaging";
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
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<PagedResult<ServiceBooking> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (appliedQuery.trim()) params.set("query", appliedQuery.trim());
        const result = await api<PagedResult<ServiceBooking>>(`/admin/service-bookings?${params}`);
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
  }, [page, pageSize, appliedQuery]);

  return (
    <>
      <PageHeader title="Service bookings" subtitle="Search by booking #, service, or customer." />
      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search booking, service, customer…"
        onApply={() => {
          setPage(1);
          setAppliedQuery(query);
        }}
        onClear={() => {
          setQuery("");
          setAppliedQuery("");
          setPage(1);
        }}
        resultLabel={data ? resultRange(data.page, data.pageSize, data.totalCount) : undefined}
      />
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
    </>
  );
}
