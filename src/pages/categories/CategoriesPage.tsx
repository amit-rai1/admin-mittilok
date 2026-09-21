import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, ErrorBanner, ListToolbar, LoadingState, PageHeader, Pagination } from "../../components/Layout";
import { NumberField } from "../../components/NumberField";
import { DEFAULT_PAGE_SIZE, paginateLocal, resultRange } from "../../lib/listPaging";
import {
  api,
  CATEGORY_TYPE,
  mediaUrl,
  statusClass,
  uploadImage,
  type Category,
  type CategoryForm,
} from "../../lib/api";

const emptyForm: CategoryForm = {
  name: "",
  description: "",
  image: "",
  parentCategoryId: null,
  type: 0,
  displayOrder: 0,
  isActive: true,
};

export function CategoriesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await api<Category[]>("/categories?rootsOnly=true"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description ?? "",
      image: category.image ?? "",
      parentCategoryId: null,
      type: category.type,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      metaTitle: category.metaTitle ?? "",
      metaDescription: category.metaDescription ?? "",
    });
    setFormOpen(true);
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadImage(file, "categories");
      setForm((prev) => ({ ...prev, image: uploaded.path || uploaded.url }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload image");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: CategoryForm = {
        ...form,
        parentCategoryId: null,
        slug: undefined,
      };
      if (editing) {
        await api(`/admin/categories/${editing.id}`, { method: "PUT", body: payload });
      } else {
        await api("/admin/categories", { method: "POST", body: payload });
      }
      setFormOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save category");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category: Category) {
    try {
      await api(`/admin/categories/${category.id}`, {
        method: "PUT",
        body: {
          name: category.name,
          description: category.description ?? "",
          image: category.image ?? "",
          icon: category.icon ?? "",
          parentCategoryId: null,
          type: category.type,
          displayOrder: category.displayOrder,
          isActive: !category.isActive,
          metaTitle: category.metaTitle ?? "",
          metaDescription: category.metaDescription ?? "",
        } satisfies CategoryForm,
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update status");
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this category?")) return;
    try {
      await api(`/admin/categories/${id}`, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete category");
    }
  }

  const paged = useMemo(
    () =>
      paginateLocal(items, page, pageSize, appliedQuery, (item, q) =>
        `${item.name} ${item.slug} ${CATEGORY_TYPE[item.type] ?? ""}`.toLowerCase().includes(q),
      ),
    [items, page, pageSize, appliedQuery],
  );

  if (loading) {
    return (
      <>
        <PageHeader title="Categories" subtitle="Root catalog lines only. Manage children on Subcategories." />
        <LoadingState label="Loading categories…" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Root catalog lines only. Manage children on Subcategories."
        actions={
          <button type="button" className="primary-button" onClick={openCreate}>
            + Add category
          </button>
        }
      />
      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search categories…"
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
      <section className="panel data-table">
        <div className="table-head cols-7">
          <span>Image</span>
          <span>Name</span>
          <span>Type</span>
          <span>Children</span>
          <span>Products</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {paged.items.map((item) => (
          <div className="table-row cols-7" key={item.id}>
            <div className="thumb-cell">
              {item.image ? <img src={mediaUrl(item.image)} alt="" /> : <span className="thumb-placeholder">—</span>}
            </div>
            <div>
              <strong>{item.name}</strong>
              <small>/{item.slug}</small>
            </div>
            <span>{CATEGORY_TYPE[item.type] ?? "—"}</span>
            <span>{item.childCount ?? 0}</span>
            <span>{item.productCount ?? 0}</span>
            <span className={statusClass(item.isActive ? "Active" : "Inactive")}>
              {item.isActive ? "Active" : "Inactive"}
            </span>
            <div className="row-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => navigate(`/subcategories?parentId=${item.id}`)}
              >
                View
              </button>
              <button type="button" className="ghost-btn" onClick={() => openEdit(item)}>
                Edit
              </button>
              <button type="button" className="ghost-btn" onClick={() => void toggleActive(item)}>
                {item.isActive ? "Disable" : "Enable"}
              </button>
              <button type="button" className="row-action" onClick={() => void remove(item.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {paged.items.length === 0 && <EmptyState message="No root categories yet." />}
      </section>
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
                <h3>{editing ? "Update category" : "New category"}</h3>
              </div>
              <button type="button" className="icon-only" onClick={() => setFormOpen(false)}>
                ×
              </button>
            </div>
            <ErrorBanner message={error} />
            <label>
              Name *
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              Image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
                disabled={uploading}
              />
            </label>
            {form.image && (
              <div className="thumb-cell large">
                <img src={mediaUrl(form.image)} alt="" />
              </div>
            )}
            <label>
              Description
              <textarea
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </label>
            <div className="form-two">
              <label>
                Type *
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: Number(e.target.value) })}
                  disabled={Boolean(editing)}
                >
                  <option value={0}>Product</option>
                  <option value={1}>Service</option>
                  <option value={2}>Podcast</option>
                </select>
              </label>
              <label>
                Display order
                <NumberField
                  value={form.displayOrder}
                  onChange={(n) => setForm({ ...form, displayOrder: n ?? 0 })}
                  allowDecimal={false}
                />
              </label>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Active
            </label>
            <button className="primary-button" disabled={saving || uploading}>
              {saving ? "Saving…" : uploading ? "Uploading…" : "Save category"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
