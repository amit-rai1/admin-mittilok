import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Pagination } from "../components/Layout";
import { resultRange, DEFAULT_PAGE_SIZE } from "../lib/listPaging";
import { api, type CartVerticalUser, type PagedResult } from "../lib/api";

const VERTICAL_META: Record<string, { title: string; subtitle: string }> = {
  nursery: {
    title: "Nursery in cart",
    subtitle: "Users with Nursery products in their cart, newest activity first.",
  },
  organics: {
    title: "Organics in cart",
    subtitle: "Users with Organics products in their cart, newest activity first.",
  },
};

export function CartInterestPage() {
  const { vertical } = useParams<{ vertical: string }>();
  const key = (vertical ?? "").toLowerCase();
  const meta = VERTICAL_META[key];

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<PagedResult<CartVerticalUser> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [key]);

  useEffect(() => {
    if (!meta) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        const result = await api<PagedResult<CartVerticalUser>>(
          `/admin/dashboard/carts-by-vertical/${key}?${params}`,
        );
        if (!cancelled) setData(result);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load cart users");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [key, meta, page, pageSize]);

  if (!meta) return <Navigate to="/" replace />;

  return (
    <>
      <PageHeader
        title={meta.title}
        subtitle={meta.subtitle}
        actions={
          <Link className="btn secondary" to="/">
            Back to dashboard
          </Link>
        }
      />
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="panel-heading">
            <div>
              <p className="kicker">Cart interest</p>
              <h3>
                {data ? resultRange(data.page, data.pageSize, data.totalCount) : "Users"}
              </h3>
            </div>
          </div>
          {!data?.items.length ? (
            <EmptyState message={`No users with ${meta.title.replace(" in cart", "")} items in cart.`} />
          ) : (
            <div className="stack-list">
              {data.items.map((user) => (
                <div className="stack-row" key={user.userId}>
                  <div>
                    <strong>{user.fullName || user.email || `User #${user.userId}`}</strong>
                    <small>
                      {[user.phone, user.email].filter(Boolean).join(" · ") || "No contact"}
                      {user.sampleProducts?.length ? ` · ${user.sampleProducts.join(", ")}` : ""}
                    </small>
                    {user.lastCartUpdate ? (
                      <small>Updated {new Date(user.lastCartUpdate).toLocaleString("en-IN")}</small>
                    ) : null}
                  </div>
                  <span>{user.itemCount} items</span>
                </div>
              ))}
            </div>
          )}
          {data && (
            <Pagination
              page={data.page}
              pageSize={pageSize}
              totalCount={data.totalCount}
              onChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </section>
      )}
    </>
  );
}
