"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Server } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const errMsg = (e: any) => (e?.response?.data?.errors ? Object.values(e.response.data.errors as Record<string, string[]>)[0]?.[0] : e?.response?.data?.message) || "Something went wrong. Please try again.";

/** System admin team: allocate a server for each requested project, then mark it live with its address. */
export default function GoLivePage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const load = useCallback(() => { api.get("/work/go-live").then((r) => setRows(r.data.data)).catch((e) => { if ([403, 404].includes(e?.response?.status)) setUnavailable(true); }); }, []);
  useEffect(() => { load(); }, [load]);

  if (unavailable) return <p className="text-slate-600 dark:text-slate-300">Go-live requests are for people with the System Administrator designation.</p>;
  if (!rows) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><Server className="h-7 w-7 text-amber-500" /> Go-live requests</h1>
        <p className="text-slate-600 dark:text-slate-300">Allocate a server, then mark the project live. Do not write passwords here.</p>
      </div>
      {rows.length === 0 && <p className="text-sm text-slate-500">No project is waiting for a server.</p>}
      {rows.map((r) => <Row key={r.id} r={r} onDone={load} />)}
    </div>
  );
}

function Row({ r, onDone }: { r: any; onDone: () => void }) {
  const [server, setServer] = useState("");
  const [url, setUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const go = async (body: any) => { setErr(null); try { await api.post(`/pmo/projects/${r.project_id}/go-live/handle`, body); onDone(); } catch (e: any) { setErr(errMsg(e)); } };

  return (
    <Card><CardContent className="p-3 space-y-2 text-sm [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500">
      <div className="flex items-center gap-2"><span className="font-semibold text-slate-900 dark:text-white">{r.project_name}</span><Badge variant="outline" className="ml-auto">{r.status}</Badge></div>
      {r.request_note && <p className="text-slate-600 dark:text-slate-300">{r.request_note}</p>}
      {err && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-3 py-2">{err}</div>}
      {r.status === "Requested" && (
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div><Label>Server allocated (host, plan, domain notes)</Label><Input value={server} onChange={(e) => setServer(e.target.value)} /></div>
          <Button disabled={!server} onClick={() => go({ step: "allocate", server_details: server })}>Allocate</Button>
        </div>
      )}
      {r.status === "Allocated" && (
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div><Label>Live address (https://...)</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} /></div>
          <Button disabled={!url} onClick={() => go({ step: "live", live_url: url })}>Mark live</Button>
        </div>
      )}
      {r.server_details && <p className="text-xs text-slate-500">Server: {r.server_details}</p>}
    </CardContent></Card>
  );
}
