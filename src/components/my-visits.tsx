import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, CalendarClock, ChevronDown } from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);

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
  const cap = expanded ? Number.MAX_SAFE_INTEGER : VISITS_PAGE_SIZE;
  const next = upcoming.slice(0, cap);
  const earlier = past.slice(0, cap);
  const hidden = upcoming.length + past.length - next.length - earlier.length;

  return <section className={`visits-card${expanded ? " is-expanded" : ""}`} aria-label={t.myVisits}>
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
          {expanded || hidden > 0 ? <Button variant="ghost" size="sm" className="visits-more" onClick={() => setExpanded(e => !e)}>{expanded ? t.visitsLess : t.visitsMore}</Button> : null}
        </>}
    </div>
  </section>;
}
