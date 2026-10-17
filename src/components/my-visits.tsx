import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, CalendarClock, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/request-visit-dialog";
import { supabase } from "@/integrations/supabase/client";
import { slotLabel } from "@/lib/booking";
import { useT } from "@/lib/i18n";
import { tr } from "@/lib/tr";
import { VISITS_PAGE_SIZE, splitVisits, toVisit, type InquiryRow, type VisitRow } from "@/lib/visits";

function VisitLine({ v, when, status }: { v: VisitRow; when: string; status: string }) {
  return <li className="visit-item"><CalendarClock/><span className="visit-copy"><strong>{v.workshopName}</strong><span>{v.service || v.issue}</span><time dateTime={v.bookedAt ?? v.createdAt}>{when}</time></span><span className="visit-status">{status}</span></li>;
}

/** The driver's own visits: confirmed drop-off times ahead, finished ones underneath. Signed-in only — guests keep nothing. */
export function MyVisits({ userId, refreshKey }: { userId: string | null; refreshKey: number }) {
  const { t, lang } = useT();
  const locale = lang === "en" ? "en-GB" : lang;
  const [rows, setRows] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setFailed(false);
    const { data, error } = await supabase.from("inquiries")
      .select("id,issue,service,status,booked_at,created_at,workshops(name)")
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
          {next.length > 0 && <><p className="visits-group">{t.visitsUpcoming}</p><ul className="visit-list">{next.map(v => <VisitLine key={v.id} v={v} when={`${t.visitDropoff} · ${slotLabel(v.bookedAt!, locale)}`} status={tr("Booked")}/>)}</ul></>}
          {earlier.length > 0 && <><p className="visits-group">{t.visitsPast}</p><ul className="visit-list">{earlier.map(v => <VisitLine key={v.id} v={v} when={slotLabel(v.bookedAt ?? v.createdAt, locale)} status={v.status === "closed" ? tr("Closed") : tr("Booked")}/>)}</ul></>}
          {waiting > 0 && <p className="history-note">{t.visitsWaiting.replace("%n", String(waiting))}</p>}
          {pages > 1 && <div className="history-pager"><Button variant="ghost" size="icon" aria-label={tr("Previous page")} disabled={cur === 0} onClick={() => setPage(cur - 1)}><ChevronLeft/></Button><span>{cur + 1} / {pages}</span><Button variant="ghost" size="icon" aria-label={tr("Next page")} disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}><ChevronRight/></Button></div>}
        </>}
    </div>
  </section>;
}
