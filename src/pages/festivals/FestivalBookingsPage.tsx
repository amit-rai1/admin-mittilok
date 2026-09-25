import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState, ErrorBanner, ListToolbar, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import { resultRange, DEFAULT_PAGE_SIZE } from "../../lib/listPaging";
import { api, formatDate, formatMoney, mediaUrl, statusClass, type PagedResult } from "../../lib/api";

type AddonImage = { name: string; image?: string | null };

type FestivalBookingItem = {
  productId: number;
  productName?: string;
  productImage?: string | null;
  variantName?: string | null;
  potName?: string | null;
  potImage?: string | null;
  addonNames?: string | null;
  addonImages?: AddonImage[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type FestivalBooking = {
  id: number;
  bookingNumber: string;
  festivalCampaignId: number;
  festivalName?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  preferredDeliverySlot?: string | null;
  notes?: string | null;
  subtotal: number;
  grandTotal: number;
  advanceRequired: number;
  advancePaid: number;
  balanceDue: number;
  advancePercent: number;
  status: string | number;
  paymentStatus: string | number;
  adminNotes?: string | null;
  createdAt: string;
  items: FestivalBookingItem[];
};

const BOOKING_STATUS_OPTIONS = [
  { value: "PendingAdvance", label: "Pending advance" },
  { value: "Confirmed", label: "Confirmed" },
  { value: "Processing", label: "Processing" },
  { value: "Ready", label: "Ready" },
  { value: "Delivered", label: "Delivered" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "Refunded", label: "Refunded" },
] as const;

const BOOKING_STATUS_BY_NUM: Record<number, string> = {
  0: "PendingAdvance",
  1: "Confirmed",
  2: "Processing",
  3: "Ready",
  4: "Delivered",
  5: "Cancelled",
  6: "Refunded",
};

const PAYMENT_STATUS_BY_NUM: Record<number, string> = {
  0: "Pending",
  1: "Processing",
  2: "Paid",
  3: "Failed",
  4: "Refunded",
  5: "PartiallyRefunded",
};

function bookingStatusKey(status: string | number): string {
  if (typeof status === "number") return BOOKING_STATUS_BY_NUM[status] ?? "PendingAdvance";
  return status;
}

function bookingStatusLabel(status: string | number): string {
  const key = bookingStatusKey(status);
  return BOOKING_STATUS_OPTIONS.find((o) => o.value === key)?.label ?? key;
}

function paymentStatusLabel(status: string | number): string {
  if (typeof status === "number") return PAYMENT_STATUS_BY_NUM[status] ?? String(status);
  if (status === "PartiallyRefunded") return "Partially refunded";
  return status;
}

function Thumb({ src, alt, size = 48 }: { src?: string | null; alt: string; size?: number }) {
  if (src) {
    return (
      <img
        src={mediaUrl(src)}
        alt={alt}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "#e8ebe8" }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, borderRadius: 8, background: "#e8ebe8", flexShrink: 0, display: "inline-block" }}
    />
  );
}

export function FestivalBookingsPage() {
  const [params] = useSearchParams();
  const campaignId = params.get("campaignId");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<PagedResult<FestivalBooking> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<FestivalBooking | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (campaignId) qs.set("campaignId", campaignId);
      if (appliedQuery.trim()) qs.set("query", appliedQuery.trim());
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
  }, [page, pageSize, campaignId, appliedQuery]);

  async function openDetail(id: number) {
    setDetailLoading(true);
    setError("");
    try {
      setDetail(await api<FestivalBooking>(`/admin/festivals/bookings/${id}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load booking");
    } finally {
      setDetailLoading(false);
    }
  }

  async function setStatus(id: number, status: string) {
    setSavingStatus(true);
    try {
      const updated = await api<FestivalBooking>(`/admin/festivals/bookings/${id}/status`, {
        method: "POST",
        body: { status },
      });
      setDetail((prev) => (prev?.id === id ? updated : prev));
      await load();
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update status");
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <>
      <PageHeader title="Festival bookings" subtitle="Search by booking #, customer, or festival." />
      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search booking #, customer, phone…"
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
            <span>Customer</span>
            <span>Items</span>
            <span>Totals</span>
            <span>Payment</span>
            <span>Status</span>
          </div>
          {(data?.items ?? []).map((item) => (
            <div className="table-row cols-6" key={item.id} style={{ alignItems: "start" }}>
              <div>
                <strong>{item.bookingNumber}</strong>
                <small>{item.festivalName}</small>
                <small>{formatDate(item.createdAt)}</small>
                <button type="button" className="secondary-button" style={{ marginTop: 6 }} onClick={() => void openDetail(item.id)}>
                  View
                </button>
              </div>
              <div>
                <strong>{item.customerName}</strong>
                <small>{item.customerPhone}</small>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {item.items.map((line, idx) => (
                  <div key={`${item.id}-${idx}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Thumb src={line.productImage} alt={line.productName ?? "Plant"} size={36} />
                    <small>
                      {line.productName ?? "Plant"}
                      {line.variantName ? ` (${line.variantName})` : ""}
                      {line.potName ? ` + ${line.potName}` : ""} ×{line.quantity}
                    </small>
                  </div>
                ))}
              </div>
              <div>
                <strong>{formatMoney(item.grandTotal)}</strong>
                <small>
                  Adv {formatMoney(item.advancePaid)} / due {formatMoney(item.balanceDue)}
                </small>
              </div>
              <span className={statusClass(paymentStatusLabel(item.paymentStatus))}>
                {paymentStatusLabel(item.paymentStatus)}
              </span>
              <div>
                <span className={statusClass(bookingStatusLabel(item.status))}>
                  {bookingStatusLabel(item.status)}
                </span>
                <select
                  value={bookingStatusKey(item.status)}
                  disabled={savingStatus}
                  onChange={(e) => void setStatus(item.id, e.target.value)}
                  style={{ display: "block", marginTop: 6, maxWidth: "100%" }}
                >
                  {BOOKING_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          {(data?.items.length ?? 0) === 0 && <EmptyState message="No festival bookings yet." />}
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

      {(detail || detailLoading) && (
        <div className="modal-backdrop" onClick={() => !detailLoading && setDetail(null)}>
          <div className="modal panel wide" onClick={(e) => e.stopPropagation()}>
            {detailLoading || !detail ? (
              <LoadingState />
            ) : (
              <>
                <div className="panel-heading">
                  <div>
                    <p className="kicker">{detail.festivalName}</p>
                    <h3>{detail.bookingNumber}</h3>
                  </div>
                  <button type="button" className="icon-only" onClick={() => setDetail(null)} aria-label="Close">
                    ×
                  </button>
                </div>

                <section style={{ marginTop: 16, display: "grid", gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>Customer</h3>
                  <strong>{detail.customerName}</strong>
                  <small>{detail.customerPhone}</small>
                  {detail.customerEmail ? <small>{detail.customerEmail}</small> : null}
                  <small>
                    {[detail.addressLine1, detail.addressLine2, detail.city, detail.state, detail.pincode].filter(Boolean).join(", ") ||
                      "No address"}
                  </small>
                  {detail.preferredDeliverySlot ? <small>Slot: {detail.preferredDeliverySlot}</small> : null}
                  {detail.notes ? <small>Notes: {detail.notes}</small> : null}
                </section>

                <section style={{ marginTop: 16, display: "grid", gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>What they ordered</h3>
                  {detail.items.map((line, idx) => (
                    <div
                      key={`${detail.id}-d-${idx}`}
                      style={{ border: "1px solid #d7ddd7", borderRadius: 10, padding: 10, display: "grid", gap: 10 }}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <Thumb src={line.productImage} alt={line.productName ?? "Plant"} size={56} />
                        <div style={{ flex: 1 }}>
                          <strong>{line.productName ?? "Plant"}</strong>
                          {line.variantName ? <small style={{ display: "block" }}>Size: {line.variantName}</small> : null}
                          <small>
                            Qty {line.quantity} · {formatMoney(line.unitPrice)} each · {formatMoney(line.lineTotal)}
                          </small>
                        </div>
                      </div>
                      {line.potName ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <Thumb src={line.potImage} alt={line.potName} size={40} />
                          <small>Pot: {line.potName}</small>
                        </div>
                      ) : null}
                      {(line.addonImages?.length ?? 0) > 0 ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          <small>Add-ons</small>
                          {line.addonImages!.map((addon) => (
                            <div key={`${addon.name}-${addon.image}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <Thumb src={addon.image} alt={addon.name} size={36} />
                              <small>{addon.name}</small>
                            </div>
                          ))}
                        </div>
                      ) : line.addonNames ? (
                        <small>Add-ons: {line.addonNames}</small>
                      ) : null}
                    </div>
                  ))}
                </section>

                <section style={{ marginTop: 16, display: "grid", gap: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>Payment</h3>
                  <small>Subtotal {formatMoney(detail.subtotal)}</small>
                  <strong>Grand total {formatMoney(detail.grandTotal)}</strong>
                  <small>
                    Advance ({detail.advancePercent}%) {formatMoney(detail.advancePaid)} paid · Balance {formatMoney(detail.balanceDue)}
                  </small>
                  <span className={statusClass(paymentStatusLabel(detail.paymentStatus))}>
                    {paymentStatusLabel(detail.paymentStatus)}
                  </span>
                </section>

                <section style={{ marginTop: 16, display: "grid", gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>Status</h3>
                  <select
                    value={bookingStatusKey(detail.status)}
                    disabled={savingStatus}
                    onChange={(e) => void setStatus(detail.id, e.target.value)}
                  >
                    {BOOKING_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <small>Created {formatDate(detail.createdAt)}</small>
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
