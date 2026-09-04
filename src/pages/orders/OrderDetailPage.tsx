import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorBanner, LoadingState, PageHeader } from "../../components/Layout";
import {
  api,
  formatDate,
  formatMoney,
  ORDER_STATUS,
  PAYMENT_STATUS,
  statusClass,
  type OrderDetail,
} from "../../lib/api";

export function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [status, setStatus] = useState(0);
  const [note, setNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [deliveryPartner, setDeliveryPartner] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await api<OrderDetail>(`/admin/orders/${id}`);
      setOrder(data);
      setStatus(data.orderStatus);
      setTrackingNumber(data.trackingNumber ?? "");
      setDeliveryPartner(data.deliveryPartner ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load order");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function onUpdate(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      const updated = await api<OrderDetail>(`/admin/orders/${id}/status`, {
        method: "PUT",
        body: { status, note, trackingNumber, deliveryPartner },
      });
      setOrder(updated);
      setNote("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update status");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading order…" />;
  if (!order) return <ErrorBanner message={error || "Order not found"} />;

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        subtitle={`Placed ${formatDate(order.createdAt)}`}
        actions={
          <Link className="outline-button" to="/orders">
            Back to orders
          </Link>
        }
      />
      <ErrorBanner message={error} />
      <div className="detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">Customer</p>
              <h3>{order.fullName}</h3>
            </div>
            <span className={statusClass(ORDER_STATUS[order.orderStatus] ?? "")}>
              {ORDER_STATUS[order.orderStatus]}
            </span>
          </div>
          <p className="muted">{order.mobile}</p>
          <p>
            {order.houseFlat}
            {order.street ? `, ${order.street}` : ""}
            {order.area ? `, ${order.area}` : ""}
            <br />
            {order.city}, {order.state} {order.pincode}
          </p>
          <div className="meta-row">
            <span>Payment: {PAYMENT_STATUS[order.paymentStatus]}</span>
            <span>Total: {formatMoney(order.grandTotal)}</span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">Fulfillment</p>
              <h3>Update status</h3>
            </div>
          </div>
          <form className="stack-form" onSubmit={(e) => void onUpdate(e)}>
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(Number(e.target.value))}>
                {Object.entries(ORDER_STATUS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tracking number
              <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
            </label>
            <label>
              Delivery partner
              <input value={deliveryPartner} onChange={(e) => setDeliveryPartner(e.target.value)} />
            </label>
            <label>
              Note
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </label>
            <button className="primary-button" disabled={saving}>
              {saving ? "Updating…" : "Save status"}
            </button>
          </form>
        </section>
      </div>

      <section className="panel data-table">
        <div className="table-head cols-5">
          <span>Item</span>
          <span>SKU</span>
          <span>Qty</span>
          <span>Unit</span>
          <span>Line total</span>
        </div>
        {order.items.map((item) => (
          <div className="table-row cols-5" key={item.id}>
            <strong>{item.productName}</strong>
            <span>{item.sku}</span>
            <span>{item.quantity}</span>
            <span>{formatMoney(item.unitPrice)}</span>
            <span>{formatMoney(item.lineTotal)}</span>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="kicker">History</p>
            <h3>Status timeline</h3>
          </div>
        </div>
        <div className="stack-list">
          {order.statusHistory.map((entry, index) => (
            <div className="stack-row" key={`${entry.createdAt}-${index}`}>
              <div>
                <strong>{ORDER_STATUS[entry.status] ?? entry.status}</strong>
                <small>{entry.note || "No note"}</small>
              </div>
              <span>{formatDate(entry.createdAt)}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
