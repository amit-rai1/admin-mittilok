import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import { api, formatDate, formatMoney, PAYMENT_STATUS, statusClass, type PagedResult } from "../../lib/api";

type FestivalBooking = {
  id: number;
  bookingNumber: string;
  festivalCampaignId: number;
  festivalName?: string;
  customerName: string;
  customerPhone: string;
  grandTotal: number;
  advanceRequired: number;
  advancePaid: number;
  balanceDue: number;
  status: number;
  paymentStatus: number;
  createdAt: string;
  items: { productName?: string; potName?: string; variantName?: string; quantity: number }[];
};

const BOOKING_STATUS: Record<number, string> = {
  0: "Pending advance",
  1: "Confirmed",
  2: "Processing",
  3: "Ready",
  4: "Delivered",
  5: "Cancelled",
  6: "Refunded",
};

export function FestivalBookingsPage() {
  const [params] = useSearchParams();
  const campaignId = params.get("campaignId");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResult<FestivalBooking> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (campaignId) qs.set("campaignId", campaignId);
      setData(await api<PagedResult<FestivalBooking>>(`/admin/festivals/bookings?${qs}`));
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page, campaignId]);

  async function setStatus(id: number, status: number) {
    try {
      await api(`/admin/festivals/bookings/${id}/status`, { method: "POST", body: { status } });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update status");
    }
  }

  return (
    <>
      <PageHeader title="Festival bookings" subtitle="Pre-bookings, advance paid, and balance due." />
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-6">
            <span>Booking</span>
            <span>Customer</span>
            <span>Items</span>
            <span>Totals</span>
            <span>Payment</span>
            <span>Status</span>
          </div>
          {(data?.items ?? []).map((item) => (
            <div className="table-row cols-6" key={item.id}>
              <div>
                <strong>{item.bookingNumber}</strong>
                <small>{item.festivalName}</small>
                <small>{formatDate(item.createdAt)}</small>
              </div>
              <div>
                <strong>{item.customerName}</strong>
                <small>{item.customerPhone}</small>
              </div>
              <span>
                {item.items
                  .map(
                    (i) =>
                      `${i.productName ?? "Plant"}${i.variantName ? ` (${i.variantName})` : ""}${i.potName ? ` + ${i.potName}` : ""} ×${i.quantity}`,
                  )
                  .join("; ")}
              </span>
              <div>
                <strong>{formatMoney(item.grandTotal)}</strong>
                <small>
                  Adv {formatMoney(item.advancePaid)} / due {formatMoney(item.balanceDue)}
                </small>
              </div>
              <span className={statusClass(PAYMENT_STATUS[item.paymentStatus] ?? "")}>
                {PAYMENT_STATUS[item.paymentStatus]}
              </span>
              <div>
                <span className={statusClass(BOOKING_STATUS[item.status] ?? "")}>{BOOKING_STATUS[item.status]}</span>
                <select value={item.status} onChange={(e) => void setStatus(item.id, Number(e.target.value))} style={{ display: "block", marginTop: 6 }}>
                  {Object.entries(BOOKING_STATUS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          {(data?.items.length ?? 0) === 0 && <EmptyState message="No festival bookings yet." />}
        </section>
      )}
      {data && <Pagination page={data.page} pageSize={data.pageSize} totalCount={data.totalCount} onChange={setPage} />}
    </>
  );
}
