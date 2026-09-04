import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "../../components/Layout";
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

export function SubcategoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parentIdParam = searchParams.get("parentId");
  const [parents, setParents] = useState<Category[]>([]);
  const [items, setItems] = useState<Category[]>([]);
  const [parentId, setParentId] = useState<number | "">(
    parentIdParam ? Number(parentIdParam) : "",
  );
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const selectedParent = useMemo(
    () => parents.find((p) => p.id === parentId) ?? null,
    [parents, parentId],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadParents() {
      setLoading(true);
      setError("");
      try {
        const roots = await api<Category[]>("/categories?rootsOnly=true");
        if (cancelled) return;
        setParents(roots);
        if (!parentId && roots[0]) {
          const nextId = parentIdParam ? Number(parentIdParam) : roots[0].id;
          setParentId(nextId);
          if (!parentIdParam) setSearchParams({ parentId: String(nextId) }, { replace: true });
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load categories");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadParents();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (parentIdParam) {
      const next = Number(parentIdParam);
      if (!Number.isNaN(next) && next !== parentId) setParentId(next);
    }
  }, [parentIdParam]);

  async function loadChildren(id: number | "") {
    if (!id) {
      setItems([]);
      return;
    }
    setListLoading(true);
    setError("");
    try {
      setItems(await api<Category[]>(`/categories?parentId=${id}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load subcategories");
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    void loadChildren(parentId);
  }, [parentId]);

  function onParentChange(value: number | "") {
    setParentId(value);
    if (value) setSearchParams({ parentId: String(value) });
    else setSearchParams({});
  }

  function openCreate() {
    if (!parentId || !selectedParent) {
      setError("Select a parent category first.");
      return;
    }
    setEditing(null);
    setForm({
      ...emptyForm,
      parentCategoryId: Number(parentId),
      type: selectedParent.type,
    });
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description ?? "",
      image: category.image ?? "",
      parentCategoryId: category.parentCategoryId ?? (parentId || null),
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
    if (!form.parentCategoryId) {
      setError("Parent category is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const parent = parents.find((p) => p.id === form.parentCategoryId);
      const payload: CategoryForm = {
        ...form,
        type: parent?.type ?? form.type,
        slug: undefined,
      };
      if (editing) {
        await api(`/admin/categories/${editing.id}`, { method: "PUT", body: payload });
      } else {
        await api("/admin/categories", { method: "POST", body: payload });
      }
      setFormOpen(false);
      await loadChildren(parentId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save subcategory");
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
          parentCategoryId: category.parentCategoryId,
          type: category.type,
          displayOrder: category.displayOrder,
          isActive: !category.isActive,
          metaTitle: category.metaTitle ?? "",
          metaDescription: category.metaDescription ?? "",
        } satisfies CategoryForm,
      });
      await loadChildren(parentId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update status");
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this subcategory?")) return;
    try {
      await api(`/admin/categories/${id}`, { method: "DELETE" });
      await loadChildren(parentId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete subcategory");
    }
  }

  if (loading) return <LoadingState label="Loading subcategories…" />;

  return (
    <>
      <PageHeader
        title="Subcategories"
        subtitle="Children under a root category."
        actions={
          <button type="button" className="primary-button" onClick={openCreate} disabled={!parentId}>
            + Add subcategory
          </button>
        }
      />
      <div className="toolbar-row">
        <label className="inline-filter">
          Parent category
          <select
            value={parentId}
            onChange={(e) => onParentChange(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Select category</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({CATEGORY_TYPE[p.type] ?? "—"})
              </option>
            ))}
          </select>
        </label>
      </div>
      <ErrorBanner message={error} />
      {listLoading ? (
        <LoadingState />
      ) : (
        <section className="panel data-table">
          <div className="table-head cols-6">
            <span>Image</span>
            <span>Name</span>
            <span>Products</span>
            <span>Order</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {items.map((item) => (
            <div className="table-row cols-6" key={item.id}>
              <div className="thumb-cell">
                {item.image ? <img src={mediaUrl(item.image)} alt="" /> : <span className="thumb-placeholder">—</span>}
              </div>
              <div>
                <strong>{item.name}</strong>
                <small>/{item.slug}</small>
              </div>
              <span>{item.productCount ?? 0}</span>
              <span>{item.displayOrder}</span>
              <span className={statusClass(item.isActive ? "Active" : "Inactive")}>
                {item.isActive ? "Active" : "Inactive"}
              </span>
              <div className="row-actions">
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
          {items.length === 0 && <EmptyState message="No subcategories for this category." />}
        </section>
      )}

      {formOpen && (
        <div className="modal-backdrop">
          <form className="modal panel" onSubmit={(e) => void onSubmit(e)}>
            <div className="panel-heading">
              <div>
                <p className="kicker">{editing ? "Edit" : "Create"}</p>
                <h3>{editing ? "Update subcategory" : "New subcategory"}</h3>
              </div>
              <button type="button" className="icon-only" onClick={() => setFormOpen(false)}>
                ×
              </button>
            </div>
            <label>
              Category *
              <select
                value={form.parentCategoryId ?? ""}
                onChange={(e) => {
                  const nextParent = Number(e.target.value);
                  const parent = parents.find((p) => p.id === nextParent);
                  setForm({
                    ...form,
                    parentCategoryId: nextParent,
                    type: parent?.type ?? form.type,
                  });
                }}
                required
              >
                <option value="" disabled>
                  Select category
                </option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
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
                Display order
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                />
              </label>
              <label className="check-row" style={{ alignSelf: "end", marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Active
              </label>
            </div>
            <button className="primary-button" disabled={saving || uploading}>
              {saving ? "Saving…" : uploading ? "Uploading…" : "Save subcategory"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
