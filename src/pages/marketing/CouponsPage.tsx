import { useEffect, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "../../components/Layout";
import { api, DISCOUNT_TYPE, formatDate, formatMoney, type Coupon } from "../../lib/api";

const blank: Omit<Coupon, "id"> = {
  code: "",
  name: "",
  discountType: 0,
  percentage: 10,
  fixedAmount: null,
  minimumOrder: 0,
  maximumDiscount: null,
  startDate: new Date().toISOString().slice(0, 16),
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
  isActive: true,
};

export function CouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
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
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        percentage: form.discountType === 0 ? form.percentage : null,
        fixedAmount: form.discountType === 1 ? form.fixedAmount : null,
      };
      if (editing) {
        await api(`/admin/coupons/${editing.id}`, { method: "PUT", body: { ...payload, id: editing.id } });
      } else {
        await api("/admin/coupons", { method: "POST", body: payload });
      }
      setFormOpen(false);
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
          {items.map((item) => (
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
          {items.length === 0 && <EmptyState message="No coupons yet." />}
        </section>
      )}

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
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.percentage ?? 0}
                  onChange={(e) => setForm({ ...form, percentage: Number(e.target.value) })}
                />
              </label>
            ) : (
              <label>
                Fixed amount
                <input
                  type="number"
                  min={0}
                  value={form.fixedAmount ?? 0}
                  onChange={(e) => setForm({ ...form, fixedAmount: Number(e.target.value) })}
                />
              </label>
            )}
            <label>
              Minimum order
              <input
                type="number"
                min={0}
                value={form.minimumOrder}
                onChange={(e) => setForm({ ...form, minimumOrder: Number(e.target.value) })}
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
