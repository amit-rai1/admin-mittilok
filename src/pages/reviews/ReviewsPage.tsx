import { useState } from "react";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import {
  api,
  formatDate,
  REVIEW_STATUS,
  statusClass,
  type PagedResult,
  type Review,
} from "../../lib/api";

export function ReviewsPage() {
  const [productId, setProductId] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResult<Review> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  async function load(nextPage = page) {
    if (!productId.trim()) {
      setError("Enter a product ID to load reviews.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await api<PagedResult<Review>>(
        `/reviews/product/${productId.trim()}?page=${nextPage}&pageSize=20`,
      );
      setData(result);
      setLoadedOnce(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load reviews");
    } finally {
      setLoading(false);
    }
  }

  async function moderate(id: number, action: "approve" | "hide") {
    try {
      await api(`/reviews/${id}/${action}`, { method: "POST" });
      await load(page);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Unable to ${action} review`);
    }
  }

  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle="There is no global reviews list endpoint — load reviews by product ID, then approve or hide."
      />
      <div className="toolbar-row">
        <input
          className="search-input"
          placeholder="Product ID"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        />
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setPage(1);
            void load(1);
          }}
        >
          Load reviews
        </button>
      </div>
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-5">
            <span>Reviewer</span>
            <span>Rating</span>
            <span>Comment</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {(data?.items ?? []).map((item) => (
            <div className="table-row cols-5" key={item.id}>
              <div>
                <strong>{item.userName ?? `User #${item.userId}`}</strong>
                <small>{formatDate(item.createdAt)}</small>
              </div>
              <span>{item.rating}/5</span>
              <span>{item.comment || item.title || "—"}</span>
              <span className={statusClass(REVIEW_STATUS[item.status] ?? "")}>{REVIEW_STATUS[item.status]}</span>
              <div className="row-actions">
                <button type="button" className="ghost-btn" onClick={() => void moderate(item.id, "approve")}>
                  Approve
                </button>
                <button type="button" className="row-action" onClick={() => void moderate(item.id, "hide")}>
                  Hide
                </button>
              </div>
            </div>
          ))}
          {!loadedOnce && <EmptyState message="Enter a product ID to begin moderation." />}
          {loadedOnce && (data?.items.length ?? 0) === 0 && <EmptyState message="No reviews for this product." />}
        </section>
      )}
      {data && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          totalCount={data.totalCount}
          onChange={(next) => {
            setPage(next);
            void load(next);
          }}
        />
      )}
    </>
  );
}
