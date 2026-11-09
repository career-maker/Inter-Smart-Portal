"use client";

import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { Portal } from "@/components/ui/portal";
import { RoyalAvatar } from "@/components/ui/RoyalAvatar";
import { Search, X, Check, UserPlus, LogOut, ShieldCheck, Users } from "lucide-react";

export interface GroupMember {
  id: number;
  name: string;
  designation?: string;
  profile_photo_path?: string | null;
  group_role?: string;
  is_online?: boolean;
}

/** Searchable list of colleagues with checkboxes. */
function MemberPicker({
  selected,
  onToggle,
  excludeIds = [],
}: {
  selected: Set<number>;
  onToggle: (u: GroupMember) => void;
  excludeIds?: number[];
}) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/direct-chat/users/search?q=${encodeURIComponent(q.trim())}`);
        if (!cancelled) setUsers(res.data?.data || []);
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const visible = useMemo(() => users.filter((u) => !excludeIds.includes(u.id)), [users, excludeIds]);

  return (
    <div>
      <div className="relative mb-2">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search colleagues..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-[#56348f] text-slate-800 dark:text-slate-100"
        />
      </div>
      <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        {loading && visible.length === 0 ? (
          <p className="p-4 text-center text-xs text-slate-400">Loading...</p>
        ) : visible.length === 0 ? (
          <p className="p-4 text-center text-xs text-slate-400">No colleagues found</p>
        ) : (
          visible.map((u) => {
            const on = selected.has(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => onToggle(u)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                aria-pressed={on}
              >
                <RoyalAvatar src={u.profile_photo_path} name={u.name} userId={u.id} className="w-9 h-9 rounded-full text-xs shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{u.name}</span>
                  <span className="block text-[11px] text-slate-500 truncate">{u.designation}</span>
                </span>
                <span
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                    on ? "bg-[#56348f] border-[#56348f] text-white" : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {on && <Check className="w-3.5 h-3.5" />}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function ModalShell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Portal>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 bg-black/50" data-side-popup="true" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="w-full max-w-md max-h-[90dvh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden" role="dialog" aria-label={title}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
            <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto custom-scrollbar space-y-3">{children}</div>
          {footer && <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

export function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (conversationId: number) => void }) {
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<Map<number, GroupMember>>(new Map());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (u: GroupMember) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(u.id)) next.delete(u.id);
      else next.set(u.id, u);
      return next;
    });

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post("/direct-chat/conversations/group", { title: title.trim(), member_ids: [...picked.keys()] });
      onCreated(res.data?.data?.id);
    } catch (e: any) {
      const errs = e.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(" ") : e.response?.data?.message || "Could not create the group.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="New group"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={create}
            disabled={busy || !title.trim() || picked.size === 0}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#56348f] text-white disabled:opacity-40 cursor-pointer"
          >
            {busy ? "Creating..." : `Create group (${picked.size})`}
          </button>
        </>
      }
    >
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Group name</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="e.g. QA team"
          className="w-full px-3 py-2 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-[#56348f] text-slate-800 dark:text-slate-100"
        />
      </div>
      {picked.size > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[...picked.values()].map((u) => (
            <span key={u.id} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-[#56348f] dark:text-purple-300 text-[11px] font-semibold">
              {u.name}
              <button type="button" onClick={() => toggle(u)} className="p-0.5 rounded-full hover:bg-purple-200 cursor-pointer" aria-label={`Remove ${u.name}`}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Add members</label>
        <MemberPicker selected={new Set(picked.keys())} onToggle={toggle} />
      </div>
      <p className="text-[11px] text-slate-500">You will be the group admin. Admins can add or remove members and make others admin.</p>
      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
    </ModalShell>
  );
}

export function GroupInfoPanel({
  conversation,
  currentUserId,
  onClose,
  onChanged,
  onLeft,
}: {
  conversation: { id: number; title: string; participants: GroupMember[]; my_role?: string };
  currentUserId: number;
  onClose: () => void;
  onChanged: () => void;
  onLeft: () => void;
}) {
  const isAdmin = (conversation.my_role || conversation.participants.find((p) => p.id === currentUserId)?.group_role) === "admin";
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Map<number, GroupMember>>(new Map());
  const [title, setTitle] = useState(conversation.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<any>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
      after?.();
    } catch (e: any) {
      setError(e.response?.data?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (u: GroupMember) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(u.id)) next.delete(u.id);
      else next.set(u.id, u);
      return next;
    });

  const base = `/direct-chat/conversations/${conversation.id}`;
  const members = [...conversation.participants].sort((a, b) => (a.group_role === "admin" ? -1 : 1) - (b.group_role === "admin" ? -1 : 1) || a.name.localeCompare(b.name));

  return (
    <Portal>
      <div className="fixed inset-0 z-[99999] bg-black/40 flex justify-end" data-side-popup="true" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <aside className="w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col" role="dialog" aria-label="Group info">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Group info</h3>
            <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#56348f] to-indigo-500 text-white flex items-center justify-center">
                <Users className="w-9 h-9" />
              </div>
              {isAdmin ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={80}
                    className="flex-1 px-3 py-1.5 text-sm font-semibold text-center rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-[#56348f] text-slate-800 dark:text-slate-100"
                    aria-label="Group name"
                  />
                  {title.trim() && title.trim() !== conversation.title && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => api.put(base, { title: title.trim() }))}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#56348f] text-white cursor-pointer"
                    >
                      Save
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">{conversation.title}</p>
              )}
              <p className="text-xs text-slate-500">{members.length} members</p>
            </div>

            {isAdmin && (
              <div>
                {!adding ? (
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl border border-[#56348f] text-[#56348f] dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" /> Add members
                  </button>
                ) : (
                  <div className="space-y-2">
                    <MemberPicker selected={new Set(picked.keys())} onToggle={toggle} excludeIds={members.map((m) => m.id)} />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setAdding(false); setPicked(new Map()); }} className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer">
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={busy || picked.size === 0}
                        onClick={() => run(() => api.post(`${base}/members`, { user_ids: [...picked.keys()] }), () => { setAdding(false); setPicked(new Map()); })}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#56348f] text-white disabled:opacity-40 cursor-pointer"
                      >
                        Add ({picked.size})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <RoyalAvatar src={m.profile_photo_path} name={m.name} userId={m.id} className="w-9 h-9 rounded-full text-xs shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {m.name}
                      {m.id === currentUserId && <span className="text-slate-400 font-normal"> (You)</span>}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{m.designation}</p>
                  </div>
                  {m.group_role === "admin" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </span>
                  )}
                  {isAdmin && m.id !== currentUserId && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => api.put(`${base}/members/${m.id}/role`, { role: m.group_role === "admin" ? "member" : "admin" }))}
                        className="px-2 py-1 text-[10.5px] font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        {m.group_role === "admin" ? "Remove admin" : "Make admin"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => window.confirm(`Remove ${m.name} from this group?`) && run(() => api.delete(`${base}/members/${m.id}`))}
                        className="px-2 py-1 text-[10.5px] font-semibold rounded-lg text-rose-600 border border-rose-200 hover:bg-rose-50 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              disabled={busy}
              onClick={() => window.confirm("Leave this group?") && run(() => api.delete(`${base}/members/${currentUserId}`), onLeft)}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl text-rose-600 border border-rose-200 hover:bg-rose-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Leave group
            </button>
          </div>
        </aside>
      </div>
    </Portal>
  );
}
