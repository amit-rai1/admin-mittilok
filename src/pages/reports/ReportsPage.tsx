import { useState } from "react";
import { ErrorBanner, PageHeader } from "../../components/Layout";
import { downloadFile } from "../../lib/api";

export function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function download(kind: "orders" | "products") {
    setError("");
    setBusy(kind);
    try {
      if (kind === "orders") {
        const params = new URLSearchParams();
        if (from) params.set("from", new Date(from).toISOString());
        if (to) params.set("to", new Date(to).toISOString());
        const qs = params.toString();
        await downloadFile(`/admin/reports/orders.csv${qs ? `?${qs}` : ""}`, "orders.csv");
      } else {
        await downloadFile("/admin/reports/products.csv", "products.csv");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Download failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <PageHeader title="Reports" subtitle="Export operational CSV reports." />
      <ErrorBanner message={error} />
      <div className="report-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">Orders</p>
              <h3>Orders CSV</h3>
            </div>
          </div>
          <div className="form-two">
            <label>
              From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          <button type="button" className="primary-button" disabled={busy === "orders"} onClick={() => void download("orders")}>
            {busy === "orders" ? "Downloading…" : "Download orders.csv"}
          </button>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">Catalog</p>
              <h3>Products CSV</h3>
            </div>
          </div>
          <p className="muted">Full product export for inventory and merchandising reviews.</p>
          <button type="button" className="primary-button" disabled={busy === "products"} onClick={() => void download("products")}>
            {busy === "products" ? "Downloading…" : "Download products.csv"}
          </button>
        </section>
      </div>
    </>
  );
}
