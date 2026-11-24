import { useEffect, useState, type FormEvent } from "react";
import { ErrorBanner, LoadingState, PageHeader } from "../../components/Layout";
import { api, type PartnerNursery } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

type FormState = {
  businessName: string;
  ownerName: string;
  description: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
};

const empty: FormState = {
  businessName: "",
  ownerName: "",
  description: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  gstin: "",
};

export function PartnerNurseryPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(empty);
  const [profile, setProfile] = useState<PartnerNursery | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const nursery = await api<PartnerNursery>("/partner/nursery");
        if (cancelled) return;
        setProfile(nursery);
        setForm({
          businessName: nursery.businessName,
          ownerName: nursery.ownerName,
          description: nursery.description ?? "",
          phone: nursery.phone,
          address: nursery.address,
          city: nursery.city,
          state: nursery.state,
          pincode: nursery.pincode,
          gstin: nursery.gstin ?? "",
        });
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load nursery");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const nursery = await api<PartnerNursery>("/partner/nursery", {
        method: "PUT",
        body: {
          ...form,
          gstin: form.gstin.trim() || null,
          description: form.description.trim() || null,
        },
      });
      setProfile(nursery);
      setMessage("Nursery profile saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save nursery");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={profile?.businessName || user?.partnerName || "My nursery"}
        subtitle="This is your partner workspace on the same Admin login. Listings and fulfilment will appear here in later phases."
      />
      <ErrorBanner message={error} />
      {message && <div className="success">{message}</div>}
      {loading ? (
        <LoadingState />
      ) : (
        <form className="panel" style={{ display: "grid", gap: 12, padding: 16, maxWidth: 720 }} onSubmit={(e) => void onSubmit(e)}>
          {profile && (
            <p className="muted" style={{ margin: 0 }}>
              Status: {profile.statusName} · {profile.email}
            </p>
          )}
          <label>
            Nursery / business name
            <input required value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
          </label>
          <label>
            Owner name
            <input required value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          </label>
          <label>
            Phone
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            Address
            <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px", gap: 10 }}>
            <label>
              City
              <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </label>
            <label>
              State
              <input required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </label>
            <label>
              Pincode
              <input required value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            </label>
          </div>
          <label>
            GSTIN (optional)
            <input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
          </label>
          <label>
            About the nursery
            <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      )}
    </>
  );
}
