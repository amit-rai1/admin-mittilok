import { useEffect, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import { api, type InventoryItem, type PagedResult } from "../../lib/api";

export function InventoryPage() {
  const [lowOnly, setLowOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResult<InventoryItem> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "50" });
      if (lowOnly) params.set("lowStockOnly", "true");
      setData(await api<PagedResult<InventoryItem>>(`/admin/inventory?${params}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load inventory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page, lowOnly]);

  async function onAdjust(event: FormEvent) {
    event.preventDefault();
    if (!adjusting) return;
    setSaving(true);
    try {
      await api("/admin/inventory/adjust", {
        method: "POST",
        body: {
          productId: adjusting.productId,
          variantId: adjusting.variantId,
          quantity: Number(qty),
          notes,
        },
      });
      setAdjusting(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to adjust inventory");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Inventory" subtitle="Stock levels and low-stock alerts." />
      <div className="toolbar-row">
        <label className="check-row">
          <input
            type="checkbox"
            checked={lowOnly}
            onChange={(e) => {
              setPage(1);
              setLowOnly(e.target.checked);
            }}
          />
          Low stock only
        </label>
      </div>
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-6">
            <span>Product</span>
            <span>SKU</span>
            <span>Available</span>
            <span>Reserved</span>
            <span>Threshold</span>
            <span>Actions</span>
          </div>
          {(data?.items ?? []).map((item) => (
            <div className="table-row cols-6" key={item.id}>
              <strong>{item.productName ?? `Product #${item.productId}`}</strong>
              <span>{item.sku}</span>
              <span className={item.isLowStock ? "critical" : ""}>{item.availableQuantity}</span>
              <span>{item.reservedQuantity}</span>
              <span>{item.lowStockThreshold}</span>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setAdjusting(item);
                  setQty("0");
                  setNotes("");
                }}
              >
                Adjust
              </button>
            </div>
          ))}
          {(data?.items.length ?? 0) === 0 && <EmptyState message="No inventory rows found." />}
        </section>
      )}
      {data && <Pagination page={data.page} pageSize={data.pageSize} totalCount={data.totalCount} onChange={setPage} />}

      {adjusting && (
        <div className="modal-backdrop">
          <form className="modal panel" onSubmit={(e) => void onAdjust(e)}>
            <div className="panel-heading">
              <div>
                <p className="kicker">Adjust stock</p>
                <h3>{adjusting.productName ?? adjusting.sku}</h3>
              </div>
              <button type="button" className="icon-only" onClick={() => setAdjusting(null)}>
                ×
              </button>
            </div>
            <p className="muted">Use positive numbers to add stock, negative to reduce.</p>
            <label>
              Quantity delta
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} required />
            </label>
            <label>
              Notes
              <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <button className="primary-button" disabled={saving}>
              {saving ? "Saving…" : "Apply adjustment"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
