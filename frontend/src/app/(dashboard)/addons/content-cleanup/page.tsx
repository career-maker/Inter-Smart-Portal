"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { Page, Panel, Row, Primary, Quiet, Alert, Spinner, field, Label, errMsg } from "@/components/clean";

type Item = { id: number; title: string; created_at: string; owner: string; team: string };

export default function ContentCleanupPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = (user?.role || "").toLowerCase() === "super admin";
  const [meta, setMeta] = useState<any>(null);
  const [type, setType] = useState("");
  const [userId, setUserId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [confirmAll, setConfirmAll] = useState(false);
  const [word, setWord] = useState("");

  const loadMeta = useCallback(async () => {
    try { setMeta((await api.get("/admin/content-cleanup/types")).data); } catch (e) { setErr(errMsg(e)); }
  }, []);
  useEffect(() => { if (isSuperAdmin) loadMeta(); }, [isSuperAdmin, loadMeta]);

  const params = { type, user_id: userId || undefined, team_id: teamId || undefined, q: q || undefined };
  const load = useCallback(async () => {
    if (!type) { setItems([]); setTotal(0); return; }
    try {
      const r = await api.get("/admin/content-cleanup", { params: { ...params, page } });
      setItems(r.data.items); setTotal(r.data.total); setPicked([]);
    } catch (e) { setErr(errMsg(e)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, userId, teamId, q, page]);
  useEffect(() => { load(); }, [load]);

  const remove = async (body: any) => {
    setBusy(true); setErr(""); setMsg("");
    try {
      const r = await api.post("/admin/content-cleanup/delete", { type, ...body }, { params: body.all_matching ? params : undefined });
      setMsg(r.data.message); setConfirmAll(false); setWord("");
      await Promise.all([load(), loadMeta()]);
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };

  if (!isSuperAdmin) return <Page title="Content cleanup"><Alert>Only the Super Admin can use this page.</Alert></Page>;
  if (!meta) return <Spinner />;

  const users = (meta.users as any[]).filter((u) => !teamId || String(u.team_id) === teamId);
  const hasFilter = !!(userId || teamId || q);
  const allPicked = items.length > 0 && picked.length === items.length;

  return (
    <Page title="Content cleanup" hint="Find anything users created and delete it, one by one, in bulk, or everything from one user or department. Records with a deleted-at marker (leave, WFH, TA, projects, tasks, corrections) are hidden, the rest are removed for good. Every delete is written to the audit log.">
      <Link href="/addons" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:underline"><ArrowLeft className="h-4 w-4" />Add-ons</Link>
      {msg && <Panel>{msg}</Panel>}
      {err && <Alert>{err}</Alert>}
      <Panel className="grid gap-4 md:grid-cols-4">
        <div><Label>Content type</Label>
          <select className={field} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">Choose…</option>
            {meta.types.map((t: any) => <option key={t.key} value={t.key}>{t.label} ({t.count})</option>)}
          </select></div>
        <div><Label>Department</Label>
          <select className={field} value={teamId} onChange={(e) => { setTeamId(e.target.value); setUserId(""); setPage(1); }}>
            <option value="">All departments</option>
            {meta.teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></div>
        <div><Label>User</Label>
          <select className={field} value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }}>
            <option value="">All users</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select></div>
        <div><Label>Search text</Label><input className={field} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Word in the title or text" /></div>
      </Panel>

      {type && (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-slate-600 dark:text-slate-300">{total} found</span>
            <Primary disabled={busy || !picked.length} onClick={() => remove({ ids: picked })}><Trash2 className="inline h-4 w-4 mr-2" />Delete selected ({picked.length})</Primary>
            <Quiet disabled={busy || !hasFilter || !total} onClick={() => setConfirmAll(true)}>Delete all {total} that match the filters</Quiet>
            {!hasFilter && <span className="text-xs text-slate-500">Pick a user, department or search word to delete everything matching.</span>}
          </div>
          {confirmAll && (
            <Panel className="space-y-2">
              <p className="text-sm">This deletes {total} item(s). Type DELETE to confirm.</p>
              <div className="flex gap-2"><input className={field} value={word} onChange={(e) => setWord(e.target.value)} />
                <Primary disabled={busy || word !== "DELETE"} onClick={() => remove({ all_matching: true, confirm: word })}>Confirm</Primary>
                <Quiet onClick={() => { setConfirmAll(false); setWord(""); }}>Cancel</Quiet></div>
            </Panel>
          )}
          <Panel className="p-0">
            <Row className="font-medium">
              <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? [] : items.map((i) => i.id))} aria-label="Select all on this page" />
              <span className="flex-1">Content</span><span className="w-40">Created by</span><span className="w-36">Department</span><span className="w-24" />
            </Row>
            {items.length === 0 && <Row>Nothing found.</Row>}
            {items.map((i) => (
              <Row key={i.id}>
                <input type="checkbox" checked={picked.includes(i.id)} onChange={() => setPicked((p) => p.includes(i.id) ? p.filter((x) => x !== i.id) : [...p, i.id])} aria-label={`Select ${i.id}`} />
                <span className="flex-1 min-w-0 truncate" title={i.title}>{i.title}</span>
                <span className="w-40 truncate">{i.owner}</span><span className="w-36 truncate">{i.team}</span>
                <Quiet className="w-24" disabled={busy} onClick={() => remove({ ids: [i.id] })}>Delete</Quiet>
              </Row>
            ))}
          </Panel>
          <div className="flex items-center gap-4 text-sm">
            <Quiet disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Quiet>
            <span>Page {page} of {Math.max(1, Math.ceil(total / 25))}</span>
            <Quiet disabled={page * 25 >= total} onClick={() => setPage(page + 1)}>Next</Quiet>
          </div>
        </>
      )}
    </Page>
  );
}
