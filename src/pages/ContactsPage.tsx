import { useEffect, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, ListToolbar, LoadingState, PageHeader, Pagination } from "../components/Layout";
import { resultRange, DEFAULT_PAGE_SIZE } from "../lib/listPaging";
import {
  api,
  ENQUIRY_STATUS,
  formatDate,
  statusClass,
  type Enquiry,
  type PagedResult,
} from "../lib/api";

const CONTACT_PROJECT_TYPE = "General Contact";

export function ContactsPage() {
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<PagedResult<Enquiry> | null>(null);
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [nextStatus, setNextStatus] = useState(0);
  const [replySubject, setReplySubject] = useState("Re: your MittiLok message");
  const [replyBody, setReplyBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        projectType: CONTACT_PROJECT_TYPE,
      });
      if (status !== "") params.set("status", status);
      if (appliedQuery.trim()) params.set("query", appliedQuery.trim());
      const result = await api<PagedResult<Enquiry>>(`/admin/enquiries?${params}`);
      setData(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load contacts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page, pageSize, status, appliedQuery]);

  async function openContact(id: number) {
    try {
      const enquiry = await api<Enquiry>(`/admin/enquiries/${id}`);
      setSelected(enquiry);
      setNextStatus(enquiry.status);
      setReplySubject("Re: your MittiLok message");
      setReplyBody("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open contact");
    }
  }

  async function updateStatus(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await api(`/admin/enquiries/${selected.id}/status`, {
        method: "PUT",
        body: { status: nextStatus },
      });
      await openContact(selected.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update status");
    } finally {
      setSaving(false);
    }
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await api(`/admin/enquiries/${selected.id}/reply`, {
        method: "POST",
        body: { subject: replySubject, body: replyBody },
      });
      setReplyBody("");
      await openContact(selected.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send reply");
    } finally {
      setSaving(false);
    }
  }

  const hasEmail = Boolean(selected?.email?.trim());
  const replies = selected?.replies ?? [];

  return (
    <>
      <PageHeader title="Contacts" subtitle="Messages from the website contact form. Reply by email from here." />
      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search name, phone, email…"
        filters={
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All statuses</option>
            {Object.entries(ENQUIRY_STATUS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        }
        onApply={() => {
          setPage(1);
          setAppliedQuery(query);
        }}
        onClear={() => {
          setQuery("");
          setAppliedQuery("");
          setStatus("");
          setPage(1);
        }}
        resultLabel={data ? resultRange(data.page, data.pageSize, data.totalCount) : undefined}
      />
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-5">
            <span>Customer</span>
            <span>Email</span>
            <span>Message</span>
            <span>Status</span>
            <span>Created</span>
          </div>
          {(data?.items ?? []).map((item) => (
            <button type="button" className="table-row cols-5 link-row" key={item.id} onClick={() => void openContact(item.id)}>
              <div>
                <strong>{item.name}</strong>
                <small>{item.mobile}</small>
              </div>
              <span>{item.email ?? "—"}</span>
              <span>{item.requirement ? (item.requirement.length > 60 ? `${item.requirement.slice(0, 60)}…` : item.requirement) : "—"}</span>
              <span className={statusClass(ENQUIRY_STATUS[item.status] ?? "")}>{ENQUIRY_STATUS[item.status]}</span>
              <span>{formatDate(item.createdAt)}</span>
            </button>
          ))}
          {(data?.items.length ?? 0) === 0 && <EmptyState message="No contact messages yet." />}
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

      {selected && (
        <div className="modal-backdrop">
          <div className="modal panel wide">
            <div className="panel-heading">
              <div>
                <p className="kicker">Contact #{selected.id}</p>
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
            <p>{selected.requirement || "No message provided."}</p>

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

            <form className="stack-form" onSubmit={(e) => void sendReply(e)}>
              <h4>Email reply</h4>
              {!hasEmail && <p className="muted">Customer did not provide an email — reply is unavailable.</p>}
              <label>
                Subject
                <input
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  required
                  disabled={!hasEmail || saving}
                />
              </label>
              <label>
                Message
                <textarea
                  rows={5}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  required
                  disabled={!hasEmail || saving}
                  placeholder="Write your reply to the customer…"
                />
              </label>
              <button className="primary-button" disabled={!hasEmail || saving}>
                {saving ? "Sending…" : "Send email reply"}
              </button>
            </form>

            <div className="stack-list">
              <h4>Reply history</h4>
              {replies.map((reply) => (
                <div className="stack-row" key={reply.id}>
                  <div>
                    <strong>{reply.subject}</strong>
                    <small>
                      {reply.adminName ? `${reply.adminName} · ` : ""}
                      {formatDate(reply.sentAt)}
                    </small>
                    <p style={{ margin: "0.35rem 0 0", whiteSpace: "pre-wrap" }}>{reply.body}</p>
                  </div>
                </div>
              ))}
              {replies.length === 0 && <EmptyState message="No replies sent yet." />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
