import { useEffect, useState } from "react";
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "../../components/Layout";
import { api, formatDate, type PartnerNursery } from "../../lib/api";

const REVIEW_ACTIONS = [
  { status: "UnderReview", label: "Under review" },
  { status: "Approved", label: "Approve" },
  { status: "Rejected", label: "Reject" },
  { status: "Suspended", label: "Suspend" },
] as const;

export function PartnersPage() {
  const [items, setItems] = useState<PartnerNursery[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await api<PartnerNursery[]>("/admin/partners"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load partners");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function review(id: number, status: string) {
    setBusyId(id);
    setError("");
    try {
      await api(`/admin/partners/${id}/review`, {
        method: "POST",
        body: { status, notes: notes[id]?.trim() || null },
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update application");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Partner nurseries"
        subtitle="Review applications. Approved partners sign in here with the PARTNER role — they never receive SUPER_ADMIN."
      />
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-6">
            <span>Nursery</span>
            <span>Contact</span>
            <span>Location</span>
            <span>Status</span>
            <span>Applied</span>
            <span>Review</span>
          </div>
          {items.map((row) => (
            <div className="table-row cols-6" key={row.id}>
              <div>
                <strong>{row.businessName}</strong>
                <div className="muted">{row.ownerName}{row.isPlatformOwned ? " · Platform" : ""}</div>
              </div>
              <span>
                {row.email}
                <div className="muted">{row.phone}</div>
              </span>
              <span>
                {row.city}, {row.state}
                <div className="muted">{row.pincode}</div>
              </span>
              <span>{row.statusName || String(row.status)}</span>
              <span>{formatDate(row.createdAt)}</span>
              <div style={{ display: "grid", gap: 8 }}>
                <input
                  placeholder="Notes"
                  value={notes[row.id] ?? ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {REVIEW_ACTIONS.map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      className="outline-button"
                      disabled={busyId === row.id}
                      onClick={() => void review(row.id, action.status)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <EmptyState message="No partner applications yet." />}
        </section>
      )}
    </>
  );
}
