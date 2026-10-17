import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, CalendarClock, CalendarSync, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tip } from "@/components/request-visit-dialog";
import { supabase } from "@/integrations/supabase/client";
import { slotLabel } from "@/lib/booking";
import { useT } from "@/lib/i18n";
import { tr } from "@/lib/tr";
import { VISITS_PAGE_SIZE, splitVisits, toVisit, type InquiryRow, type VisitRow } from "@/lib/visits";

function VisitLine({ v, when, status, onOpen }: { v: VisitRow; when: string; status: string; onOpen: () => void }) {
  return <li><button type="button" className="visit-item" onClick={onOpen}><CalendarClock/><span className="visit-copy"><strong>{v.workshopName}</strong><span>{v.service || v.issue}</span><time dateTime={v.bookedAt ?? v.createdAt}>{when}</time></span><span className={`visit-status${v.status === "closed" ? "" : " is-booked"}`}>{status}</span></button></li>;
}

export type RescheduleTarget = { id: string; workshopId: string; job: string };

/** The driver's own visits: confirmed drop-off times ahead, finished ones underneath. Signed-in only — guests keep nothing. */
export function MyVisits({ userId, refreshKey, onReschedule }: { userId: string | null; refreshKey: number; onReschedule?: (v: RescheduleTarget) => void }) {
  const { t, lang } = useT();
  const locale = lang === "en" ? "en-GB" : lang;
  const [rows, setRows] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<{ v: VisitRow; up: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setFailed(false);
    const { data, error } = await supabase.from("inquiries")
      .select("id,issue,service,status,booked_at,created_at,workshop_id,workshops(name)")
      .eq("driver_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) setFailed(true);
    else setRows((data ?? []) as unknown as InquiryRow[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) { setRows([]); setLoading(false); return; }
    void load();
  }, [userId, refreshKey, load]);

  if (!userId) return null;
  const { upcoming, past, waiting } = splitVisits(rows.map(toVisit), new Date());
  const all = [...upcoming.map(v => ({ v, up: true })), ...past.map(v => ({ v, up: false }))];
  const pages = Math.max(1, Math.ceil(all.length / VISITS_PAGE_SIZE));
  const cur = Math.min(page, pages - 1);
  const shown = all.slice(cur * VISITS_PAGE_SIZE, (cur + 1) * VISITS_PAGE_SIZE);
  const next = shown.filter(x => x.up).map(x => x.v);
  const earlier = shown.filter(x => !x.up).map(x => x.v);

  return <section className="visits-card" aria-label={t.myVisits}>
    <div className="history-heading">
      <h2 className="history-desktop-title">{t.myVisits}</h2>
      <Button variant="ghost" className="history-mobile-toggle" aria-expanded={open} aria-controls="driver-visits" onClick={() => setOpen(o => !o)}><CalendarCheck/>{t.myVisits}<ChevronDown className={open ? "history-chevron-open" : undefined}/></Button>
      <Tip text={t.hVisits}/>
    </div>
    <div id="driver-visits" className={`history-content${open ? " is-open" : ""}`}>
      {loading ? <p className="history-note" role="status">{t.visitsLoading}</p>
        : failed ? <div><p className="history-note" role="alert">{t.visitsError}</p><Button variant="ghost" size="sm" onClick={() => void load()}>{t.tryAgain}</Button></div>
        : next.length === 0 && earlier.length === 0 ? <>
          <p className="history-note">{t.noVisits}</p>
          {waiting > 0 && <p className="history-note">{t.visitsWaiting.replace("%n", String(waiting))}</p>}
        </>
        : <>
          {next.length > 0 && <><p className="visits-group">{t.visitsUpcoming}</p><ul className="visit-list">{next.map(v => <VisitLine key={v.id} v={v} when={`${t.visitDropoff} · ${slotLabel(v.bookedAt!, locale)}`} status={tr("Booked")} onOpen={() => setDetail({ v, up: true })}/>)}</ul></>}
          {earlier.length > 0 && <><p className="visits-group">{t.visitsPast}</p><ul className="visit-list">{earlier.map(v => <VisitLine key={v.id} v={v} when={slotLabel(v.bookedAt ?? v.createdAt, locale)} status={v.status === "closed" ? tr("Closed") : tr("Booked")} onOpen={() => setDetail({ v, up: false })}/>)}</ul></>}
          {waiting > 0 && <p className="history-note">{t.visitsWaiting.replace("%n", String(waiting))}</p>}
          {all.length > 0 && <div className="history-pager"><Button variant="ghost" size="icon" aria-label={tr("Previous page")} disabled={cur === 0} onClick={() => setPage(cur - 1)}><ChevronLeft/></Button><span>{cur + 1} / {pages}</span><Button variant="ghost" size="icon" aria-label={tr("Next page")} disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}><ChevronRight/></Button></div>}
        </>}
    </div>
    <Dialog open={!!detail} onOpenChange={o => { if (!o) setDetail(null); }}>
      <DialogContent className="garage-dialog visit-dialog">
        {detail && <>
          <DialogHeader><DialogTitle>{t.visitDetails}</DialogTitle><DialogDescription>{detail.v.workshopName}</DialogDescription></DialogHeader>
          <dl className="visit-dl">
            <dt>{t.visitJob}</dt><dd>{detail.v.service || detail.v.issue}</dd>
            {detail.v.service && detail.v.issue && detail.v.issue !== detail.v.service && <><dt></dt><dd className="history-note">{detail.v.issue}</dd></>}
            <dt>{t.visitTime}</dt><dd>{detail.v.bookedAt ? slotLabel(detail.v.bookedAt, locale) : "–"}</dd>
            <dt>{t.visitStatus}</dt><dd><span className={`visit-status${detail.v.status === "closed" ? "" : " is-booked"}`}>{detail.v.status === "closed" ? tr("Closed") : tr("Booked")}</span></dd>
          </dl>
          {detail.up && onReschedule && <div className="visit-dialog-actions">
            <p className="garage-note">{t.rescheduleNote}</p>
            <Button onClick={() => { const v = detail.v; setDetail(null); onReschedule({ id: v.id, workshopId: v.workshopId, job: v.service || v.issue }); }}><CalendarSync/>{t.reschedule}</Button>
          </div>}
        </>}
      </DialogContent>
    </Dialog>
  </section>;
}
