import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ErrorBanner, LoadingState, PageHeader } from "../../components/Layout";
import { api, formatMoney } from "../../lib/api";

type Demand = {
  campaignId: number;
  campaignName: string;
  totalBookings: number;
  totalUnits: number;
  advanceCollected: number;
  balanceDue: number;
  byPlant: { name: string; units: number }[];
  byPot: { name: string; units: number }[];
  bySize: { name: string; units: number }[];
};

export function FestivalDemandPage() {
  const { campaignId } = useParams();
  const [data, setData] = useState<Demand | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) return;
    void api<Demand>(`/admin/festivals/${campaignId}/demand`)
      .then(setData)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load demand"))
      .finally(() => setLoading(false));
  }, [campaignId]);

  return (
    <>
      <PageHeader title="Festival demand" subtitle={data?.campaignName ?? "Plant / pot / size demand planning."} />
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : data ? (
        <>
          <section className="panel" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            <div>
              <small>Bookings</small>
              <strong style={{ display: "block", fontSize: 22 }}>{data.totalBookings}</strong>
            </div>
            <div>
              <small>Units</small>
              <strong style={{ display: "block", fontSize: 22 }}>{data.totalUnits}</strong>
            </div>
            <div>
              <small>Advance collected</small>
              <strong style={{ display: "block", fontSize: 22 }}>{formatMoney(data.advanceCollected)}</strong>
            </div>
            <div>
              <small>Balance due</small>
              <strong style={{ display: "block", fontSize: 22 }}>{formatMoney(data.balanceDue)}</strong>
            </div>
          </section>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {[
              ["By plant", data.byPlant],
              ["By pot", data.byPot],
              ["By size", data.bySize],
            ].map(([title, rows]) => (
              <section className="panel" key={title as string}>
                <h2>{title as string}</h2>
                {(rows as { name: string; units: number }[]).length === 0 && <p>No data yet.</p>}
                {(rows as { name: string; units: number }[]).map((row) => (
                  <div key={row.name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                    <span>{row.name}</span>
                    <strong>{row.units}</strong>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
