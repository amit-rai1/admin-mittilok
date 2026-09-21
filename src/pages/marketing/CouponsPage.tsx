import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, ListToolbar, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import { NumberField } from "../../components/NumberField";
import { DEFAULT_PAGE_SIZE, paginateLocal, resultRange } from "../../lib/listPaging";
import { api, DISCOUNT_TYPE, formatDate, formatMoney, type Coupon } from "../../lib/api";

const blank: Omit<Coupon, "id"> = {
  code: "",
  name: "",
  discountType: 0,
  percentage: 10,
  fixedAmount: null,
  minimumOrder: null,
  maximumDiscount: null,
  startDate: new Date().toISOString().slice(0, 16),
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
  isActive: true,
};

export function CouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await api<Coupon[]>("/admin/coupons"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load coupons");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(blank);
    setFormOpen(true);
  }

  function openEdit(item: Coupon) {
    setEditing(item);
    setForm({
      ...item,
      startDate: item.startDate.slice(0, 16),
      endDate: item.endDate.slice(0, 16),
    });
    setFormOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setError("Code and name are required.");
      return;
    }
    if (form.discountType === 0 && (form.percentage == null || form.percentage <= 0)) {
      setError("Enter a percentage greater than 0.");
      return;
    }
    if (form.discountType === 1 && (form.fixedAmount == null || form.fixedAmount <= 0)) {
      setError("Enter a fixed amount greater than 0.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        percentage: form.discountType === 0 ? form.percentage : null,
        fixedAmount: form.discountType === 1 ? form.fixedAmount : null,
        minimumOrder: form.minimumOrder && form.minimumOrder > 0 ? form.minimumOrder : null,
      };
      if (editing) {
        await api(`/admin/coupons/${editing.id}`, { method: "PUT", body: { ...payload, id: editing.id } });
      } else {
        await api("/admin/coupons", { method: "POST", body: payload });
      }
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save coupon");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this coupon?")) return;
    try {
      await api(`/admin/coupons/${id}`, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete coupon");
    }
  }

  const paged = useMemo(
    () =>
      paginateLocal(items, page, pageSize, appliedQuery, (item, q) =>
        `${item.code} ${item.name}`.toLowerCase().includes(q),
      ),
    [items, page, pageSize, appliedQuery],
  );

  return (
    <>
      <PageHeader
        title="Coupons"
        subtitle="Discount codes for checkout."
        actions={
          <button type="button" className="primary-button" onClick={openCreate}>
            + Add coupon
          </button>
        }
      />
      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search code or name…"
        onApply={() => {
          setPage(1);
          setAppliedQuery(query);
        }}
        onClear={() => {
          setQuery("");
          setAppliedQuery("");
          setPage(1);
        }}
        resultLabel={resultRange(paged.page, paged.pageSize, paged.totalCount)}
      />
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-6">
            <span>Code</span>
            <span>Name</span>
            <span>Discount</span>
            <span>Window</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {paged.items.map((item) => (
            <div className="table-row cols-6" key={item.id}>
              <strong>{item.code}</strong>
              <span>{item.name}</span>
              <span>
                {item.discountType === 0
                  ? `${item.percentage ?? 0}%`
                  : formatMoney(item.fixedAmount ?? 0)}
              </span>
              <span>
                {formatDate(item.startDate)} → {formatDate(item.endDate)}
              </span>
              <span className={item.isActive ? "badge badge-success" : "badge"}>{item.isActive ? "Active" : "Off"}</span>
              <div className="row-actions">
                <button type="button" className="ghost-btn" onClick={() => openEdit(item)}>
                  Edit
                </button>
                <button type="button" className="row-action" onClick={() => void remove(item.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {paged.items.length === 0 && <EmptyState message="No coupons yet." />}
        </section>
      )}
      <Pagination
        page={paged.page}
        pageSize={paged.pageSize}
        totalCount={paged.totalCount}
        onChange={setPage}
        onPageSizeChange={(size) => {
          setPage(1);
          setPageSize(size);
        }}
      />

      {formOpen && (
        <div className="modal-backdrop">
          <form className="modal panel" onSubmit={(e) => void onSubmit(e)}>
            <div className="panel-heading">
              <div>
                <p className="kicker">{editing ? "Edit" : "Create"}</p>
                <h3>{editing ? "Update coupon" : "New coupon"}</h3>
              </div>
              <button type="button" className="icon-only" onClick={() => setFormOpen(false)}>
                ×
              </button>
            </div>
            <ErrorBanner message={error} />
            <label>
              Code
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required />
            </label>
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              Discount type
              <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: Number(e.target.value) })}>
                {Object.entries(DISCOUNT_TYPE).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {form.discountType === 0 ? (
              <label>
                Percentage
                <NumberField
                  nullable
                  value={form.percentage}
                  onChange={(n) => setForm({ ...form, percentage: n })}
                />
              </label>
            ) : (
              <label>
                Fixed amount
                <NumberField
                  nullable
                  value={form.fixedAmount}
                  onChange={(n) => setForm({ ...form, fixedAmount: n })}
                />
              </label>
            )}
            <label>
              Minimum order
              <NumberField
                nullable
                value={form.minimumOrder}
                onChange={(n) => setForm({ ...form, minimumOrder: n })}
              />
            </label>
            <div className="form-two">
              <label>
                Starts
                <input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </label>
              <label>
                Ends
                <input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </label>
            </div>
            <label className="check-row">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>
            <button className="primary-button" disabled={saving}>
              {saving ? "Saving…" : "Save coupon"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
