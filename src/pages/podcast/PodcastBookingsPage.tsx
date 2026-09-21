import { useEffect, useState } from "react";
import { EmptyState, ErrorBanner, ListToolbar, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import { resultRange, DEFAULT_PAGE_SIZE } from "../../lib/listPaging";
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
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<PagedResult<PodcastBooking> | null>(null);
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
        const result = await api<PagedResult<PodcastBooking>>(`/admin/podcast/bookings?${params}`);
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
  }, [page, pageSize, appliedQuery]);

  return (
    <>
      <PageHeader title="Podcast bookings" subtitle="Search by guest, mobile, topic, or booking #." />
      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search guest, mobile, topic…"
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
