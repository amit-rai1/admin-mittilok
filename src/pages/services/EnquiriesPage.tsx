import { useEffect, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import {
  api,
  ENQUIRY_STATUS,
  formatDate,
  formatMoney,
  statusClass,
  type Enquiry,
  type PagedResult,
} from "../../lib/api";

export function EnquiriesPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResult<Enquiry> | null>(null);
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [nextStatus, setNextStatus] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (status !== "") params.set("status", status);
      const result = await api<PagedResult<Enquiry>>(`/admin/enquiries?${params}`);
      setData(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load enquiries");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page, status]);

  async function openEnquiry(id: number) {
    try {
      const enquiry = await api<Enquiry>(`/admin/enquiries/${id}`);
      setSelected(enquiry);
      setNextStatus(enquiry.status);
      setAmount("");
      setDetails("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open enquiry");
    }
  }

  async function sendQuote(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await api(`/admin/enquiries/${selected.id}/quote`, {
        method: "POST",
        body: { amount: Number(amount), details, status: "Sent" },
      });
      await openEnquiry(selected.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send quote");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await api(`/admin/enquiries/${selected.id}/status`, {
        method: "PUT",
        body: { status: nextStatus },
      });
      await openEnquiry(selected.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Enquiries" subtitle="Lead requests with quoting workflow." />
      <div className="toolbar-row">
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {Object.entries(ENQUIRY_STATUS).map(([value, label]) => (
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
          <div className="table-head cols-5">
            <span>Customer</span>
            <span>Project</span>
            <span>Location</span>
            <span>Status</span>
            <span>Created</span>
          </div>
          {(data?.items ?? []).map((item) => (
            <button type="button" className="table-row cols-5 link-row" key={item.id} onClick={() => void openEnquiry(item.id)}>
              <div>
                <strong>{item.name}</strong>
                <small>{item.mobile}</small>
              </div>
              <span>{item.projectType ?? "—"}</span>
              <span>{item.location ?? "—"}</span>
              <span className={statusClass(ENQUIRY_STATUS[item.status] ?? "")}>{ENQUIRY_STATUS[item.status]}</span>
              <span>{formatDate(item.createdAt)}</span>
            </button>
          ))}
          {(data?.items.length ?? 0) === 0 && <EmptyState message="No enquiries found." />}
        </section>
      )}
      {data && <Pagination page={data.page} pageSize={data.pageSize} totalCount={data.totalCount} onChange={setPage} />}

      {selected && (
        <div className="modal-backdrop">
          <div className="modal panel wide">
            <div className="panel-heading">
              <div>
                <p className="kicker">Enquiry #{selected.id}</p>
                <h3>{selected.name}</h3>
              </div>
              <button type="button" className="icon-only" onClick={() => setSelected(null)}>
                ×
              </button>
            </div>
            <p className="muted">
              {selected.mobile}
              {selected.email ? ` · ${selected.email}` : ""}
            </p>
            <p>{selected.requirement || "No requirement text provided."}</p>
            <div className="meta-row">
              <span>{selected.propertyType ?? "Property n/a"}</span>
              <span>{selected.budgetRange ?? "Budget n/a"}</span>
              <span>{selected.areaSize ?? "Area n/a"}</span>
            </div>

            <form className="stack-form" onSubmit={(e) => void updateStatus(e)}>
              <label>
                Status
                <select value={nextStatus} onChange={(e) => setNextStatus(Number(e.target.value))}>
                  {Object.entries(ENQUIRY_STATUS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="outline-button" disabled={saving}>
                Update status
              </button>
            </form>

            <form className="stack-form" onSubmit={(e) => void sendQuote(e)}>
              <h4>Send quote</h4>
              <div className="form-two">
                <label>
                  Amount
                  <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </label>
                <label>
                  Details
                  <input value={details} onChange={(e) => setDetails(e.target.value)} />
                </label>
              </div>
              <button className="primary-button" disabled={saving}>
                {saving ? "Saving…" : "Add quote"}
              </button>
            </form>

            <div className="stack-list">
              {selected.quotes.map((quote) => (
                <div className="stack-row" key={quote.id}>
                  <div>
                    <strong>{formatMoney(quote.amount)}</strong>
                    <small>{quote.details || quote.status}</small>
                  </div>
                  <span>{formatDate(quote.createdAt)}</span>
                </div>
              ))}
              {selected.quotes.length === 0 && <EmptyState message="No quotes yet." />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
