import { useEffect, useState } from "react";
import { EmptyState, ErrorBanner, ListToolbar, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import { resultRange, DEFAULT_PAGE_SIZE } from "../../lib/listPaging";
import { api, formatDate, formatMoney, type PagedResult } from "../../lib/api";

type Customer = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
};

export function CustomersPage() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<PagedResult<Customer> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (search.trim()) params.set("search", search.trim());
        const result = await api<PagedResult<Customer>>(`/admin/customers?${params}`);
        if (!cancelled) setData(result);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load customers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search]);

  async function toggleActive(customer: Customer) {
    setBusyId(customer.id);
    setError("");
    try {
      await api(`/admin/customers/${customer.id}/active`, {
        method: "PATCH",
        body: { isActive: !customer.isActive },
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((row) =>
                row.id === customer.id ? { ...row, isActive: !customer.isActive } : row,
              ),
            }
          : prev,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update customer");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader title="Customers" subtitle="Registered storefront customers and spend summary." />
      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search by name, email or phone…"
        onApply={() => {
          setPage(1);
          setSearch(query);
        }}
        onClear={() => {
          setQuery("");
          setSearch("");
          setPage(1);
        }}
        resultLabel={data ? resultRange(data.page, data.pageSize, data.totalCount) : undefined}
      />
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-6">
            <span>Customer</span>
            <span>Contact</span>
            <span>Orders</span>
            <span>Spent</span>
            <span>Joined</span>
            <span>Status</span>
          </div>
          {(data?.items ?? []).map((row) => (
            <div className="table-row cols-6" key={row.id}>
              <div>
                <strong>{row.name}</strong>
                <div className="muted">{row.email}</div>
              </div>
              <span>{row.phone || "—"}</span>
              <span>{row.orderCount}</span>
              <span>{formatMoney(row.totalSpent)}</span>
              <span>{formatDate(row.createdAt)}</span>
              <button
                type="button"
                className="btn secondary"
                disabled={busyId === row.id}
                onClick={() => void toggleActive(row)}
              >
                {row.isActive ? "Active" : "Inactive"}
              </button>
            </div>
          ))}
          {(data?.items?.length ?? 0) === 0 && <EmptyState message="No customers found." />}
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
    </>
  );
}
