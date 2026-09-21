import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, ListToolbar, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import { NumberField } from "../../components/NumberField";
import { DEFAULT_PAGE_SIZE, paginateLocal, resultRange } from "../../lib/listPaging";
import { api, formatMoney, mediaUrl, uploadImage } from "../../lib/api";

type Pot = {
  id: number;
  name: string;
  material?: string | null;
  colour?: string | null;
  image?: string | null;
  priceDelta: number;
  stock: number;
  isActive: boolean;
  displayOrder: number;
};

type Addon = {
  id: number;
  name: string;
  description?: string | null;
  image?: string | null;
  price: number;
  isActive: boolean;
  displayOrder: number;
};

type Tab = "pots" | "addons";

const blankPot: Pot = {
  id: 0,
  name: "",
  material: "",
  colour: "",
  image: "",
  priceDelta: 0,
  stock: 100,
  isActive: true,
  displayOrder: 0,
};
const blankAddon: Addon = {
  id: 0,
  name: "",
  description: "",
  image: "",
  price: 0,
  isActive: true,
  displayOrder: 0,
};

function OptionThumb({ image, alt }: { image?: string | null; alt: string }) {
  if (image) return <img src={mediaUrl(image)} alt={alt} />;
  return <span className="thumb-placeholder" aria-hidden>
    —
  </span>;
}

function ImageField({
  image,
  uploading,
  onUpload,
  onClear,
}: {
  image?: string | null;
  uploading: boolean;
  onUpload: (file: File | null) => void;
  onClear: () => void;
}) {
  return (
    <div className="image-field">
      <label>
        Image
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
        />
      </label>
      {uploading ? <small className="muted">Uploading…</small> : null}
      {image ? (
        <div className="image-field-preview">
          <div className="thumb-cell large">
            <img src={mediaUrl(image)} alt="Current" />
          </div>
          <button type="button" className="outline-button" onClick={onClear}>
            Remove image
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function FestivalOptionsPage() {
  const [pots, setPots] = useState<Pot[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pots");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [potForm, setPotForm] = useState<Pot | null>(null);
  const [addonForm, setAddonForm] = useState<Addon | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [p, a] = await Promise.all([
        api<Pot[]>("/admin/festivals/pots"),
        api<Addon[]>("/admin/festivals/addons"),
      ]);
      setPots(p);
      setAddons(a);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load options");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function switchTab(next: Tab) {
    setTab(next);
    setPage(1);
  }

  function openPotForm(pot: Pot) {
    setAddonForm(null);
    setPotForm(pot);
  }

  function openAddonForm(addon: Addon) {
    setPotForm(null);
    setAddonForm(addon);
  }

  function closeForms() {
    setPotForm(null);
    setAddonForm(null);
  }

  async function savePot(event: FormEvent) {
    event.preventDefault();
    if (!potForm) return;
    if (!potForm.name.trim()) {
      setError("Pot name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api("/admin/festivals/pots", { method: "POST", body: potForm });
      closeForms();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save pot");
    } finally {
      setSaving(false);
    }
  }

  async function saveAddon(event: FormEvent) {
    event.preventDefault();
    if (!addonForm) return;
    if (!addonForm.name.trim()) {
      setError("Add-on name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api("/admin/festivals/addons", { method: "POST", body: addonForm });
      closeForms();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save add-on");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File | null, kind: "pot" | "addon") {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadImage(file, "festivals");
      const path = uploaded.path || uploaded.url;
      if (kind === "pot") setPotForm((prev) => (prev ? { ...prev, image: path } : prev));
      else setAddonForm((prev) => (prev ? { ...prev, image: path } : prev));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function deletePot(id: number) {
    if (!window.confirm("Delete this pot?")) return;
    setError("");
    try {
      await api(`/admin/festivals/pots/${id}`, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete pot");
    }
  }

  async function deleteAddon(id: number) {
    if (!window.confirm("Delete this add-on?")) return;
    setError("");
    try {
      await api(`/admin/festivals/addons/${id}`, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete add-on");
    }
  }

  const pagedPots = useMemo(
    () =>
      paginateLocal(pots, page, pageSize, appliedQuery, (item, q) =>
        `${item.name} ${item.material ?? ""} ${item.colour ?? ""}`.toLowerCase().includes(q),
      ),
    [pots, page, pageSize, appliedQuery],
  );

  const pagedAddons = useMemo(
    () =>
      paginateLocal(addons, page, pageSize, appliedQuery, (item, q) =>
        `${item.name} ${item.description ?? ""}`.toLowerCase().includes(q),
      ),
    [addons, page, pageSize, appliedQuery],
  );

  const activePaged = tab === "pots" ? pagedPots : pagedAddons;

  return (
    <>
      <PageHeader
        title="Pots & add-ons"
        subtitle="Shared options for all festival campaigns."
        actions={
          tab === "pots" ? (
            <button type="button" className="primary-button" onClick={() => openPotForm({ ...blankPot })}>
              + Pot
            </button>
          ) : (
            <button type="button" className="primary-button" onClick={() => openAddonForm({ ...blankAddon })}>
              + Add-on
            </button>
          )
        }
      />
      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder={tab === "pots" ? "Search pots…" : "Search add-ons…"}
        onApply={() => {
          setPage(1);
          setAppliedQuery(query);
        }}
        onClear={() => {
          setQuery("");
          setAppliedQuery("");
          setPage(1);
        }}
        resultLabel={resultRange(activePaged.page, activePaged.pageSize, activePaged.totalCount)}
      />

      <div className="list-tabs" role="tablist" aria-label="Option type">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pots"}
          className={`list-tab${tab === "pots" ? " active" : ""}`}
          onClick={() => switchTab("pots")}
        >
          Pots ({pagedPots.totalCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "addons"}
          className={`list-tab${tab === "addons" ? " active" : ""}`}
          onClick={() => switchTab("addons")}
        >
          Add-ons ({pagedAddons.totalCount})
        </button>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingState />
      ) : tab === "pots" ? (
        <section className="panel data-table">
          <div className="table-head cols-4">
            <span>Item</span>
            <span>Price / stock</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {pagedPots.items.map((p) => (
            <div key={p.id} className="table-row cols-4">
              <div className="thumb-cell with-label">
                <OptionThumb image={p.image} alt={p.name} />
                <div>
                  <strong>{p.name}</strong>
                  <small>{[p.material, p.colour].filter(Boolean).join(" · ") || "—"}</small>
                </div>
              </div>
              <span>
                {formatMoney(p.priceDelta)} · stock {p.stock}
              </span>
              <span>{p.isActive ? "Active" : "Off"}</span>
              <div className="row-actions">
                <button type="button" className="ghost-btn" onClick={() => openPotForm(p)}>
                  Edit
                </button>
                <button type="button" className="row-action" onClick={() => void deletePot(p.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {pagedPots.items.length === 0 && <EmptyState message="No pots yet." />}
        </section>
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-4">
            <span>Item</span>
            <span>Price</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {pagedAddons.items.map((a) => (
            <div key={a.id} className="table-row cols-4">
              <div className="thumb-cell with-label">
                <OptionThumb image={a.image} alt={a.name} />
                <div>
                  <strong>{a.name}</strong>
                  <small>{a.description || "—"}</small>
                </div>
              </div>
              <span>{formatMoney(a.price)}</span>
              <span>{a.isActive ? "Active" : "Off"}</span>
              <div className="row-actions">
                <button type="button" className="ghost-btn" onClick={() => openAddonForm(a)}>
                  Edit
                </button>
                <button type="button" className="row-action" onClick={() => void deleteAddon(a.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {pagedAddons.items.length === 0 && <EmptyState message="No add-ons yet." />}
        </section>
      )}

      <Pagination
        page={activePaged.page}
        pageSize={activePaged.pageSize}
        totalCount={activePaged.totalCount}
        onChange={setPage}
        onPageSizeChange={(size) => {
          setPage(1);
          setPageSize(size);
        }}
      />

      {potForm && (
        <div className="modal-backdrop" onClick={closeForms}>
          <form
            className="modal panel"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void savePot(e)}
          >
            <div className="panel-heading">
              <div>
                <p className="kicker">{potForm.id ? "Edit" : "Create"}</p>
                <h3>{potForm.id ? "Update pot" : "New pot"}</h3>
              </div>
              <button type="button" className="icon-only" onClick={closeForms}>
                ×
              </button>
            </div>
            <ErrorBanner message={error} />
            <label>
              Name *
              <input
                required
                value={potForm.name}
                onChange={(e) => setPotForm({ ...potForm, name: e.target.value })}
              />
            </label>
            <div className="form-two">
              <label>
                Material
                <input
                  value={potForm.material ?? ""}
                  onChange={(e) => setPotForm({ ...potForm, material: e.target.value })}
                />
              </label>
              <label>
                Colour
                <input
                  value={potForm.colour ?? ""}
                  onChange={(e) => setPotForm({ ...potForm, colour: e.target.value })}
                />
              </label>
            </div>
            <div className="form-two">
              <label>
                Price delta
                <NumberField
                  value={potForm.priceDelta}
                  onChange={(n) => setPotForm({ ...potForm, priceDelta: n ?? 0 })}
                  allowNegative
                />
              </label>
              <label>
                Stock
                <NumberField
                  value={potForm.stock}
                  onChange={(n) => setPotForm({ ...potForm, stock: n ?? 0 })}
                  allowDecimal={false}
                />
              </label>
            </div>
            <ImageField
              image={potForm.image}
              uploading={uploading}
              onUpload={(file) => void upload(file, "pot")}
              onClear={() => setPotForm({ ...potForm, image: "" })}
            />
            <label className="check-row">
              <input
                type="checkbox"
                checked={potForm.isActive}
                onChange={(e) => setPotForm({ ...potForm, isActive: e.target.checked })}
              />
              Active
            </label>
            <button className="primary-button" disabled={saving || uploading}>
              {saving ? "Saving…" : uploading ? "Uploading…" : "Save pot"}
            </button>
          </form>
        </div>
      )}

      {addonForm && (
        <div className="modal-backdrop" onClick={closeForms}>
          <form
            className="modal panel"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void saveAddon(e)}
          >
            <div className="panel-heading">
              <div>
                <p className="kicker">{addonForm.id ? "Edit" : "Create"}</p>
                <h3>{addonForm.id ? "Update add-on" : "New add-on"}</h3>
              </div>
              <button type="button" className="icon-only" onClick={closeForms}>
                ×
              </button>
            </div>
            <ErrorBanner message={error} />
            <label>
              Name *
              <input
                required
                value={addonForm.name}
                onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={addonForm.description ?? ""}
                onChange={(e) => setAddonForm({ ...addonForm, description: e.target.value })}
              />
            </label>
            <label>
              Price
              <NumberField
                value={addonForm.price}
                onChange={(n) => setAddonForm({ ...addonForm, price: n ?? 0 })}
              />
            </label>
            <ImageField
              image={addonForm.image}
              uploading={uploading}
              onUpload={(file) => void upload(file, "addon")}
              onClear={() => setAddonForm({ ...addonForm, image: "" })}
            />
            <label className="check-row">
              <input
                type="checkbox"
                checked={addonForm.isActive}
                onChange={(e) => setAddonForm({ ...addonForm, isActive: e.target.checked })}
              />
              Active
            </label>
            <button className="primary-button" disabled={saving || uploading}>
              {saving ? "Saving…" : uploading ? "Uploading…" : "Save add-on"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
