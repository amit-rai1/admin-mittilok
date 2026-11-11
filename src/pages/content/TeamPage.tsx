import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "../../components/Layout";
import { NumberField } from "../../components/NumberField";
import {
  api,
  getErrorMessage,
  mediaUrl,
  statusClass,
  uploadImage,
  type TeamGroup,
  type TeamMember,
} from "../../lib/api";
import { toast } from "../../lib/toast";

const blankGroup = {
  id: 0,
  name: "",
  displayOrder: 0,
  isActive: true,
};

const blankMember = {
  id: 0,
  teamGroupId: 0,
  name: "",
  role: "",
  photoUrl: "",
  bio: "",
  displayOrder: 0,
  isActive: true,
};

export function TeamPage() {
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [groupForm, setGroupForm] = useState(blankGroup);
  const [memberForm, setMemberForm] = useState(blankMember);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const selected = useMemo(
    () => groups.find((g) => g.id === selectedId) ?? null,
    [groups, selectedId],
  );

  async function load(preferId?: number) {
    setError("");
    try {
      const list = await api<TeamGroup[]>("/admin/content/team-groups");
      setGroups(list);
      const keep = preferId ?? (typeof selectedId === "number" ? selectedId : list[0]?.id);
      const next = list.some((g) => g.id === keep) ? keep : list[0]?.id ?? "";
      setSelectedId(next);
    } catch (caught) {
      const message = getErrorMessage(caught, "Unable to load teams");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreateGroup() {
    setGroupForm({ ...blankGroup, displayOrder: groups.length });
    setGroupFormOpen(true);
  }

  function openEditGroup(group: TeamGroup) {
    setGroupForm({
      id: group.id,
      name: group.name,
      displayOrder: group.displayOrder,
      isActive: group.isActive,
    });
    setGroupFormOpen(true);
  }

  function openCreateMember() {
    if (!selected) return;
    setMemberForm({
      ...blankMember,
      teamGroupId: selected.id,
      displayOrder: selected.members.length,
    });
    setMemberFormOpen(true);
  }

  function openEditMember(member: TeamMember) {
    setMemberForm({
      id: member.id,
      teamGroupId: member.teamGroupId,
      name: member.name,
      role: member.role ?? "",
      photoUrl: member.photoUrl ?? "",
      bio: member.bio ?? "",
      displayOrder: member.displayOrder,
      isActive: member.isActive,
    });
    setMemberFormOpen(true);
  }

  async function saveGroup(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const saved = await api<TeamGroup>("/admin/content/team-groups", { method: "POST", body: groupForm });
      toast.success(groupForm.id ? "Team saved." : "Team created.");
      setGroupFormOpen(false);
      await load(saved.id);
    } catch (caught) {
      const message = getErrorMessage(caught, "Unable to save team");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleGroup(group: TeamGroup) {
    try {
      await api("/admin/content/team-groups", {
        method: "POST",
        body: { ...group, isActive: !group.isActive, members: undefined },
      });
      toast.success(group.isActive ? "Team disabled." : "Team enabled.");
      await load(group.id);
    } catch (caught) {
      const message = getErrorMessage(caught, "Unable to update team");
      setError(message);
      toast.error(message);
    }
  }

  async function removeGroup(id: number) {
    if (!window.confirm("Delete this team and its members?")) return;
    try {
      await api(`/admin/content/team-groups/${id}`, { method: "DELETE" });
      toast.success("Team deleted.");
      await load();
    } catch (caught) {
      const message = getErrorMessage(caught, "Unable to delete team");
      setError(message);
      toast.error(message);
    }
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadImage(file, "team");
      const path = uploaded.path || uploaded.url;
      setMemberForm((prev) => ({ ...prev, photoUrl: path }));
    } catch (caught) {
      const message = getErrorMessage(caught, "Unable to upload photo");
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  async function saveMember(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await api("/admin/content/team-members", {
        method: "POST",
        body: { ...memberForm, teamGroupId: selected.id },
      });
      toast.success(memberForm.id ? "Member saved." : "Member added.");
      setMemberFormOpen(false);
      await load(selected.id);
    } catch (caught) {
      const message = getErrorMessage(caught, "Unable to save member");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleMember(member: TeamMember) {
    try {
      await api("/admin/content/team-members", {
        method: "POST",
        body: { ...member, isActive: !member.isActive },
      });
      toast.success(member.isActive ? "Member disabled." : "Member enabled.");
      await load(member.teamGroupId);
    } catch (caught) {
      const message = getErrorMessage(caught, "Unable to update member");
      setError(message);
      toast.error(message);
    }
  }

  async function removeMember(id: number) {
    if (!window.confirm("Delete this team member?")) return;
    try {
      await api(`/admin/content/team-members/${id}`, { method: "DELETE" });
      toast.success("Member deleted.");
      await load(typeof selectedId === "number" ? selectedId : undefined);
    } catch (caught) {
      const message = getErrorMessage(caught, "Unable to delete member");
      setError(message);
      toast.error(message);
    }
  }

  if (loading) return <LoadingState label="Loading teams…" />;

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Groups and people shown on the homepage and About page."
        actions={
          <button type="button" className="primary-button" onClick={openCreateGroup}>
            + Add team
          </button>
        }
      />
      <ErrorBanner message={error} />
      <div className="split-panels">
        <section className="panel data-table">
          <div className="table-head team-cols">
            <span>Team</span>
            <span>Order</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {groups.map((group) => (
            <button
              type="button"
              className={`table-row team-cols ${group.id === selectedId ? "is-selected" : ""}`}
              key={group.id}
              onClick={() => setSelectedId(group.id)}
            >
              <div>
                <strong>{group.name}</strong>
                <small>{group.members.length} member{group.members.length === 1 ? "" : "s"}</small>
              </div>
              <span>{group.displayOrder}</span>
              <span className={statusClass(group.isActive ? "Active" : "Inactive")}>
                {group.isActive ? "Active" : "Inactive"}
              </span>
              <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="ghost-btn" onClick={() => openEditGroup(group)}>
                  Edit
                </button>
                <button type="button" className="ghost-btn" onClick={() => void toggleGroup(group)}>
                  {group.isActive ? "Disable" : "Enable"}
                </button>
                <button type="button" className="row-action" onClick={() => void removeGroup(group.id)}>
                  Delete
                </button>
              </div>
            </button>
          ))}
          {groups.length === 0 && <EmptyState message="No teams yet." />}
        </section>

        <section className="panel data-table">
          <div className="panel-heading" style={{ padding: "12px 16px 0" }}>
            <div>
              <p className="kicker">Members</p>
              <h3>{selected?.name ?? "Select a team"}</h3>
            </div>
            <button type="button" className="primary-button" onClick={openCreateMember} disabled={!selected}>
              + Add member
            </button>
          </div>
          {selected ? (
            <>
              <div className="table-head cols-5">
                <span>Photo</span>
                <span>Name</span>
                <span>Order</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {selected.members.map((member) => (
                <div className="table-row cols-5" key={member.id}>
                  <div className="thumb-cell">
                    {member.photoUrl ? (
                      <img className="team-admin-photo" src={mediaUrl(member.photoUrl)} alt="" />
                    ) : (
                      <span className="thumb-placeholder">—</span>
                    )}
                  </div>
                  <div>
                    <strong>{member.name}</strong>
                    <small>{member.role || "—"}</small>
                  </div>
                  <span>{member.displayOrder}</span>
                  <span className={statusClass(member.isActive ? "Active" : "Inactive")}>
                    {member.isActive ? "Active" : "Inactive"}
                  </span>
                  <div className="row-actions">
                    <button type="button" className="ghost-btn" onClick={() => openEditMember(member)}>
                      Edit
                    </button>
                    <button type="button" className="ghost-btn" onClick={() => void toggleMember(member)}>
                      {member.isActive ? "Disable" : "Enable"}
                    </button>
                    <button type="button" className="row-action" onClick={() => void removeMember(member.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {selected.members.length === 0 && <EmptyState message="No members in this team." />}
            </>
          ) : (
            <EmptyState message="Create a team to add members." />
          )}
        </section>
      </div>

      {groupFormOpen && (
        <div className="modal-backdrop">
          <form className="modal panel" onSubmit={(e) => void saveGroup(e)}>
            <div className="panel-heading">
              <div>
                <p className="kicker">{groupForm.id ? "Edit" : "Create"}</p>
                <h3>Team</h3>
              </div>
              <button type="button" className="icon-only" onClick={() => setGroupFormOpen(false)}>
                ×
              </button>
            </div>
            <ErrorBanner message={error} />
            <label>
              Name
              <input
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                required
              />
            </label>
            <label>
              Display order
              <NumberField
                value={groupForm.displayOrder}
                onChange={(n) => setGroupForm({ ...groupForm, displayOrder: n ?? 0 })}
                allowDecimal={false}
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={groupForm.isActive}
                onChange={(e) => setGroupForm({ ...groupForm, isActive: e.target.checked })}
              />
              Active
            </label>
            <button className="primary-button" disabled={saving}>
              {saving ? "Saving…" : "Save team"}
            </button>
          </form>
        </div>
      )}

      {memberFormOpen && (
        <div className="modal-backdrop">
          <form className="modal panel" onSubmit={(e) => void saveMember(e)}>
            <div className="panel-heading">
              <div>
                <p className="kicker">{memberForm.id ? "Edit" : "Create"}</p>
                <h3>Team member</h3>
              </div>
              <button type="button" className="icon-only" onClick={() => setMemberFormOpen(false)}>
                ×
              </button>
            </div>
            <ErrorBanner message={error} />
            <label>
              Photo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
                disabled={uploading}
              />
            </label>
            {memberForm.photoUrl && (
              <div className="thumb-cell large">
                <img className="team-admin-photo" src={mediaUrl(memberForm.photoUrl)} alt="" />
              </div>
            )}
            <label>
              Name
              <input
                value={memberForm.name}
                onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                required
              />
            </label>
            <label>
              Role
              <input
                value={memberForm.role}
                onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
              />
            </label>
            <label>
              Short bio
              <textarea
                rows={3}
                value={memberForm.bio}
                onChange={(e) => setMemberForm({ ...memberForm, bio: e.target.value })}
              />
            </label>
            <label>
              Display order
              <NumberField
                value={memberForm.displayOrder}
                onChange={(n) => setMemberForm({ ...memberForm, displayOrder: n ?? 0 })}
                allowDecimal={false}
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={memberForm.isActive}
                onChange={(e) => setMemberForm({ ...memberForm, isActive: e.target.checked })}
              />
              Active
            </label>
            <button className="primary-button" disabled={saving || uploading}>
              {saving ? "Saving…" : uploading ? "Uploading…" : "Save member"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
