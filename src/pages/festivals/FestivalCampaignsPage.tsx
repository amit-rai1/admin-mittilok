import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "../../components/Layout";
import { api, formatDate, formatMoney, mediaUrl, uploadImage } from "../../lib/api";

type FestivalProduct = {
  id: number;
  productId: number;
  productName: string;
  productSlug: string;
  thumbnail?: string | null;
  basePrice: number;
  festivalPrice?: number | null;
  stockCap?: number | null;
  displayOrder: number;
  isActive: boolean;
};

type FestivalCampaign = {
  id: number;
  name: string;
  slug: string;
  banner?: string | null;
  description?: string | null;
  offerStrip?: string | null;
  bookingStart: string;
  bookingEnd: string;
  deliveryStart?: string | null;
  deliveryEnd?: string | null;
  advancePercent: number;
  status: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  displayOrder: number;
  isBookingOpen: boolean;
  products: FestivalProduct[];
};

type ProductListItem = { id: number; name: string; slug: string; sellingPrice: number; thumbnail?: string | null };

const STATUS = ["Draft", "Scheduled", "Live", "Closed"];

const blank: FestivalCampaign = {
  id: 0,
  name: "",
  slug: "",
  banner: "",
  description: "",
  offerStrip: "",
  bookingStart: new Date().toISOString().slice(0, 16),
  bookingEnd: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 16),
  deliveryStart: "",
  deliveryEnd: "",
  advancePercent: 10,
  status: 0,
  metaTitle: "",
  metaDescription: "",
  displayOrder: 0,
  isBookingOpen: false,
  products: [],
};

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function FestivalCampaignsPage() {
  const [items, setItems] = useState<FestivalCampaign[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FestivalCampaign>(blank);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachId, setAttachId] = useState<number | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [productHits, setProductHits] = useState<ProductListItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(null);
  const [festivalPrice, setFestivalPrice] = useState("");
  const [stockCap, setStockCap] = useState("");
  const [attaching, setAttaching] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await api<FestivalCampaign[]>("/admin/festivals"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load festivals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openAttach(campaignId: number) {
    setAttachId(campaignId);
    setProductQuery("");
    setProductHits([]);
    setSelectedProduct(null);
    setFestivalPrice("");
    setStockCap("");
  }

  function closeAttach() {
    setAttachId(null);
    setProductQuery("");
    setProductHits([]);
    setSelectedProduct(null);
    setFestivalPrice("");
    setStockCap("");
  }

  async function searchProducts(q: string, campaign: FestivalCampaign) {
    setProductQuery(q);
    setSelectedProduct(null);
    if (q.trim().length < 2) {
      setProductHits([]);
      return;
    }
    try {
      const res = await api<{ items: ProductListItem[] }>(`/products?query=${encodeURIComponent(q)}&pageSize=8`);
      const attachedIds = new Set((campaign.products ?? []).map((p) => p.productId));
      setProductHits((res.items ?? []).filter((hit) => !attachedIds.has(hit.id)));
    } catch {
      setProductHits([]);
    }
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadImage(file, "festivals");
      setForm((prev) => ({ ...prev, banner: uploaded.path || uploaded.url }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/admin/festivals", {
        method: "POST",
        body: {
          ...form,
          bookingStart: new Date(form.bookingStart).toISOString(),
          bookingEnd: new Date(form.bookingEnd).toISOString(),
          deliveryStart: form.deliveryStart ? new Date(form.deliveryStart).toISOString() : null,
          deliveryEnd: form.deliveryEnd ? new Date(form.deliveryEnd).toISOString() : null,
        },
      });
      setFormOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save campaign");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this festival campaign?")) return;
    try {
      await api(`/admin/festivals/${id}`, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete");
    }
  }

  async function attachProduct(campaignId: number) {
    if (!selectedProduct) return;
    setAttaching(true);
    try {
      await api(`/admin/festivals/${campaignId}/products`, {
        method: "POST",
        body: {
          id: 0,
          productId: selectedProduct.id,
          festivalPrice: festivalPrice ? Number(festivalPrice) : null,
          stockCap: stockCap ? Number(stockCap) : null,
          displayOrder: 0,
          isActive: true,
        },
      });
      closeAttach();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to attach product");
    } finally {
      setAttaching(false);
    }
  }

  async function detach(campaignProductId: number) {
    if (!window.confirm("Remove this product from the festival?")) return;
    try {
      await api(`/admin/festivals/products/${campaignProductId}`, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to detach");
    }
  }

  return (
    <>
      <PageHeader
        title="Festival campaigns"
        subtitle="Open/close pre-booking windows, banners, and attached plants."
        actions={
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setForm(blank);
              setFormOpen(true);
            }}
          >
            + Add festival
          </button>
        }
      />
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-5">
            <span>Festival</span>
            <span>Booking window</span>
            <span>Advance</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {items.map((item) => (
            <div key={item.id} className="table-row cols-5" style={{ alignItems: "start" }}>
              <div>
                <strong>{item.name}</strong>
                <small>/{item.slug}</small>
                {item.banner ? <img src={mediaUrl(item.banner)} alt="" style={{ width: 72, height: 40, objectFit: "cover", borderRadius: 6, marginTop: 6 }} /> : null}
                <div style={{ marginTop: 8 }}>
                  <small>{item.products?.length ?? 0} products</small>
                  <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                    {(item.products ?? []).map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          padding: "6px 8px",
                          background: "#f4f6f4",
                          borderRadius: 8,
                        }}
                      >
                        {p.thumbnail ? (
                          <img
                            src={mediaUrl(p.thumbnail)}
                            alt=""
                            width={36}
                            height={36}
                            style={{ borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                          />
                        ) : (
                          <span
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 6,
                              background: "#e0e5e0",
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ display: "block", fontSize: 13 }}>{p.productName}</strong>
                          <small>{formatMoney(p.festivalPrice ?? p.basePrice)}</small>
                        </div>
                        <button type="button" className="linkish" onClick={() => void detach(p.id)}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  {attachId === item.id ? (
                    <div
                      style={{
                        marginTop: 10,
                        display: "grid",
                        gap: 8,
                        padding: 10,
                        border: "1px solid #d7ddd7",
                        borderRadius: 10,
                        background: "#fff",
                      }}
                    >
                      <small style={{ color: "#5a6b5e" }}>Search → select one product → optional price/stock → Attach</small>
                      <input
                        placeholder="Search products…"
                        value={productQuery}
                        onChange={(e) => void searchProducts(e.target.value, item)}
                        autoFocus
                      />
                      {productHits.length > 0 && (
                        <div style={{ display: "grid", gap: 4, maxHeight: 220, overflow: "auto" }}>
                          {productHits.map((hit) => {
                            const selected = selectedProduct?.id === hit.id;
                            return (
                              <button
                                key={hit.id}
                                type="button"
                                onClick={() => {
                                  setSelectedProduct(hit);
                                  setFestivalPrice(String(hit.sellingPrice));
                                }}
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  alignItems: "center",
                                  textAlign: "left",
                                  padding: "6px 8px",
                                  borderRadius: 8,
                                  border: selected ? "2px solid #1b5e20" : "1px solid #e0e5e0",
                                  background: selected ? "#eef6ee" : "#fff",
                                  cursor: "pointer",
                                }}
                              >
                                {hit.thumbnail ? (
                                  <img
                                    src={mediaUrl(hit.thumbnail)}
                                    alt=""
                                    width={36}
                                    height={36}
                                    style={{ borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                                  />
                                ) : (
                                  <span
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: 6,
                                      background: "#e8ebe8",
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                                <span style={{ flex: 1, minWidth: 0 }}>
                                  <strong style={{ display: "block", fontSize: 13 }}>{hit.name}</strong>
                                  <small>{formatMoney(hit.sellingPrice)}</small>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {productQuery.trim().length >= 2 && productHits.length === 0 && (
                        <small style={{ color: "#5a6b5e" }}>No matching products (or already attached).</small>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        <input
                          placeholder="Festival price (optional)"
                          value={festivalPrice}
                          onChange={(e) => setFestivalPrice(e.target.value)}
                          type="number"
                        />
                        <input
                          placeholder="Stock cap (optional)"
                          value={stockCap}
                          onChange={(e) => setStockCap(e.target.value)}
                          type="number"
                        />
                      </div>
                      {selectedProduct && (
                        <small>
                          Selected: <strong>{selectedProduct.name}</strong>
                        </small>
                      )}
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button type="button" onClick={closeAttach}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="primary-button"
                          disabled={!selectedProduct || attaching}
                          onClick={() => void attachProduct(item.id)}
                        >
                          {attaching ? "Attaching…" : "Attach"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="secondary-button" style={{ marginTop: 8 }} onClick={() => openAttach(item.id)}>
                      + Attach product
                    </button>
                  )}
                </div>
              </div>
              <div>
                <small>{formatDate(item.bookingStart)}</small>
                <small> → {formatDate(item.bookingEnd)}</small>
                {item.isBookingOpen ? <strong style={{ display: "block", color: "#1b5e20" }}>Open now</strong> : null}
              </div>
              <span>{item.advancePercent}%</span>
              <span>{STATUS[item.status] ?? item.status}</span>
              <div className="row-actions">
                <Link to={`/festivals/bookings?campaignId=${item.id}`}>Bookings</Link>
                <Link to={`/festivals/demand/${item.id}`}>Demand</Link>
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      ...item,
                      bookingStart: toLocalInput(item.bookingStart),
                      bookingEnd: toLocalInput(item.bookingEnd),
                      deliveryStart: toLocalInput(item.deliveryStart),
                      deliveryEnd: toLocalInput(item.deliveryEnd),
                    });
                    setFormOpen(true);
                  }}
                >
                  Edit
                </button>
                <button type="button" onClick={() => void remove(item.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && <EmptyState message="No festival campaigns yet." />}
        </section>
      )}

      {formOpen && (
        <div className="drawer-backdrop" onClick={() => setFormOpen(false)}>
          <form className="side-drawer" onClick={(e) => e.stopPropagation()} onSubmit={(e) => void onSubmit(e)}>
            <h2>{form.id ? "Edit festival" : "New festival"}</h2>
            <label>
              Name
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Slug
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto from name" />
            </label>
            <label>
              Offer strip
              <input value={form.offerStrip ?? ""} onChange={(e) => setForm({ ...form, offerStrip: e.target.value })} />
            </label>
            <label>
              Description
              <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </label>
            <label>
              Banner
              <input type="file" accept="image/*" onChange={(e) => void onUpload(e.target.files?.[0] ?? null)} />
            </label>
            {form.banner ? <img src={mediaUrl(form.banner)} alt="" style={{ maxWidth: "100%", borderRadius: 8 }} /> : null}
            <label>
              Booking start
              <input type="datetime-local" required value={form.bookingStart} onChange={(e) => setForm({ ...form, bookingStart: e.target.value })} />
            </label>
            <label>
              Booking end
              <input type="datetime-local" required value={form.bookingEnd} onChange={(e) => setForm({ ...form, bookingEnd: e.target.value })} />
            </label>
            <label>
              Delivery start
              <input type="datetime-local" value={form.deliveryStart ?? ""} onChange={(e) => setForm({ ...form, deliveryStart: e.target.value })} />
            </label>
            <label>
              Delivery end
              <input type="datetime-local" value={form.deliveryEnd ?? ""} onChange={(e) => setForm({ ...form, deliveryEnd: e.target.value })} />
            </label>
            <label>
              Advance %
              <input type="number" min={1} max={100} value={form.advancePercent} onChange={(e) => setForm({ ...form, advancePercent: Number(e.target.value) })} />
            </label>
            <label>
              Status
              <select value={form.status} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}>
                {STATUS.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Display order
              <input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} />
            </label>
            <div className="sheet-actions">
              <button type="button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={saving || uploading}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
