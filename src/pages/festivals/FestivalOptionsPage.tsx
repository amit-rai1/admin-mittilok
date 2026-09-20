import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "../../components/Layout";
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

const blankPot: Pot = { id: 0, name: "", material: "", colour: "", image: "", priceDelta: 0, stock: 100, isActive: true, displayOrder: 0 };
const blankAddon: Addon = { id: 0, name: "", description: "", image: "", price: 0, isActive: true, displayOrder: 0 };

const thumbStyle: CSSProperties = { width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 };
const placeholderStyle: CSSProperties = {
  ...thumbStyle,
  background: "#e8ebe9",
  display: "inline-block",
};

function OptionThumb({ image, alt }: { image?: string | null; alt: string }) {
  if (image) return <img src={mediaUrl(image)} alt={alt} style={thumbStyle} />;
  return <span style={placeholderStyle} aria-hidden />;
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
    <div style={{ display: "grid", gap: 8 }}>
      <label>
        Image
        <input type="file" accept="image/*" disabled={uploading} onChange={(e) => onUpload(e.target.files?.[0] ?? null)} />
      </label>
      {uploading ? <small>Uploading…</small> : null}
      {image ? (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img src={mediaUrl(image)} alt="Current" style={{ width: 96, height: 96, borderRadius: 8, objectFit: "cover" }} />
          <div style={{ display: "grid", gap: 6 }}>
            <small>Current image</small>
            <button type="button" onClick={onClear}>
              Remove image
            </button>
          </div>
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

  function openPotForm(pot: Pot) {
    setAddonForm(null);
    setPotForm(pot);
  }

  function openAddonForm(addon: Addon) {
    setPotForm(null);
    setAddonForm(addon);
  }

  async function savePot(event: FormEvent) {
    event.preventDefault();
    if (!potForm) return;
    setSaving(true);
    try {
      await api("/admin/festivals/pots", { method: "POST", body: potForm });
      setPotForm(null);
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
    setSaving(true);
    try {
      await api("/admin/festivals/addons", { method: "POST", body: addonForm });
      setAddonForm(null);
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

  return (
    <>
      <PageHeader title="Pots & add-ons" subtitle="Shared options for all festival campaigns." />
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <div className="split-panels" style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
          <section className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>Pots</h2>
              <button type="button" className="primary-button" onClick={() => openPotForm({ ...blankPot })}>
                + Pot
              </button>
            </div>
            {pots.map((p) => (
              <div key={p.id} className="table-row" style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0" }}>
                <OptionThumb image={p.image} alt={p.name} />
                <div style={{ flex: 1 }}>
                  <strong>{p.name}</strong>
                  <small>
                    {formatMoney(p.priceDelta)} delta · stock {p.stock} · {p.isActive ? "Active" : "Off"}
                  </small>
                </div>
                <button type="button" onClick={() => openPotForm(p)}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Delete pot?")) void api(`/admin/festivals/pots/${p.id}`, { method: "DELETE" }).then(load);
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
            {pots.length === 0 && <EmptyState message="No pots yet." />}
          </section>

          <section className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>Add-ons</h2>
              <button type="button" className="primary-button" onClick={() => openAddonForm({ ...blankAddon })}>
                + Add-on
              </button>
            </div>
            {addons.map((a) => (
              <div key={a.id} className="table-row" style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0" }}>
                <OptionThumb image={a.image} alt={a.name} />
                <div style={{ flex: 1 }}>
                  <strong>{a.name}</strong>
                  <small>
                    {formatMoney(a.price)} · {a.isActive ? "Active" : "Off"}
                  </small>
                </div>
                <button type="button" onClick={() => openAddonForm(a)}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Delete add-on?")) void api(`/admin/festivals/addons/${a.id}`, { method: "DELETE" }).then(load);
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
            {addons.length === 0 && <EmptyState message="No add-ons yet." />}
          </section>
        </div>
      )}

      {potForm && (
        <div className="drawer-backdrop" onClick={() => setPotForm(null)}>
          <form className="side-drawer" onClick={(e) => e.stopPropagation()} onSubmit={(e) => void savePot(e)}>
            <h2>{potForm.id ? "Edit pot" : "New pot"}</h2>
            <label>
              Name
              <input required value={potForm.name} onChange={(e) => setPotForm({ ...potForm, name: e.target.value })} />
            </label>
            <label>
              Material
              <input value={potForm.material ?? ""} onChange={(e) => setPotForm({ ...potForm, material: e.target.value })} />
            </label>
            <label>
              Colour
              <input value={potForm.colour ?? ""} onChange={(e) => setPotForm({ ...potForm, colour: e.target.value })} />
            </label>
            <label>
              Price delta
              <input type="number" value={potForm.priceDelta} onChange={(e) => setPotForm({ ...potForm, priceDelta: Number(e.target.value) })} />
            </label>
            <label>
              Stock
              <input type="number" value={potForm.stock} onChange={(e) => setPotForm({ ...potForm, stock: Number(e.target.value) })} />
            </label>
            <ImageField
              image={potForm.image}
              uploading={uploading}
              onUpload={(file) => void upload(file, "pot")}
              onClear={() => setPotForm({ ...potForm, image: "" })}
            />
            <label>
              <input type="checkbox" checked={potForm.isActive} onChange={(e) => setPotForm({ ...potForm, isActive: e.target.checked })} /> Active
            </label>
            <div className="sheet-actions">
              <button type="button" onClick={() => setPotForm(null)}>
                Cancel
              </button>
              <button className="primary-button" disabled={saving || uploading}>
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {addonForm && (
        <div className="drawer-backdrop" onClick={() => setAddonForm(null)}>
          <form className="side-drawer" onClick={(e) => e.stopPropagation()} onSubmit={(e) => void saveAddon(e)}>
            <h2>{addonForm.id ? "Edit add-on" : "New add-on"}</h2>
            <label>
              Name
              <input required value={addonForm.name} onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })} />
            </label>
            <label>
              Description
              <textarea value={addonForm.description ?? ""} onChange={(e) => setAddonForm({ ...addonForm, description: e.target.value })} />
            </label>
            <label>
              Price
              <input type="number" value={addonForm.price} onChange={(e) => setAddonForm({ ...addonForm, price: Number(e.target.value) })} />
            </label>
            <ImageField
              image={addonForm.image}
              uploading={uploading}
              onUpload={(file) => void upload(file, "addon")}
              onClear={() => setAddonForm({ ...addonForm, image: "" })}
            />
            <label>
              <input type="checkbox" checked={addonForm.isActive} onChange={(e) => setAddonForm({ ...addonForm, isActive: e.target.checked })} /> Active
            </label>
            <div className="sheet-actions">
              <button type="button" onClick={() => setAddonForm(null)}>
                Cancel
              </button>
              <button className="primary-button" disabled={saving || uploading}>
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
