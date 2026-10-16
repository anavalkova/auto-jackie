import { useEffect, useRef, useState } from "react";
import { ChevronDown, Lightbulb, X } from "lucide-react";

export type WhyStat = { value: string; text: string; source?: { label: string; url: string } };

type Props = { id: string; title: string; stats: WhyStat[]; footer?: string; summary?: string; pitch?: string; points?: string[]; overlay?: boolean };

/** "Why this exists" card with sourced numbers. Inline (collapsible) or as a corner overlay. */
export function WhyNote(props: Props) {
  return props.overlay ? <WhyOverlay {...props}/> : <WhyInline {...props}/>;
}

function WhyBody({ stats, footer, pitch, points }: Props) {
  return <>
    {pitch && <p className="why-pitch">{pitch}</p>}
    {points && points.length > 0 && <ul className="why-points">{points.map(p => <li key={p}>{p}</li>)}</ul>}
    {stats.length > 0 && <ul className="why-stats">
      {stats.map(s => (
        <li key={s.value + s.text}>
          <span className="why-value">{s.value}</span>
          <span className="why-text">
            {s.text}
            {s.source && <> <a href={s.source.url} target="_blank" rel="noreferrer">({s.source.label})</a></>}
          </span>
        </li>
      ))}
    </ul>}
    {footer && <p className="why-footer">{footer}</p>}
  </>;
}

function WhyOverlay(props: Props) {
  const key = `autojackie.whyo.${props.id}`;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Open on first visit of each tab, then remember
  useEffect(() => { try { if (localStorage.getItem(key) !== "seen") { setOpen(true); localStorage.setItem(key, "seen"); } } catch { /* ignore */ } }, [key]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return <div className="why-overlay" ref={ref}>
    <button type="button" className="why-chip" aria-expanded={open} onClick={() => setOpen(o => !o)}><Lightbulb aria-hidden/> Why this exists</button>
    {open && <aside className="why-note why-pop" aria-label="Why this exists">
      <div className="why-pop-head"><strong className="why-title">{props.title}</strong><button type="button" className="why-close" aria-label="Close" onClick={() => setOpen(false)}><X/></button></div>
      <WhyBody {...props}/>
    </aside>}
  </div>;
}

function WhyInline(props: Props) {
  const { id, title, stats, summary } = props;
  const key = `autojackie.why.${id}`;
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(key) === "0"; } catch { return false; } });
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(key, next ? "0" : "1"); } catch { /* ignore */ }
  };
  const first = stats[0];
  const collapsedLine = summary ?? (first ? `${first.value} ${(first.text.split(".")[0] ?? "").toLowerCase()}` : title);
  return (
    <aside className="why-note" aria-label="Why this exists">
      <button type="button" className="why-toggle" aria-expanded={!collapsed} onClick={toggle}>
        <span className="why-toggle-label">
          <span className="eyebrow">WHY THIS EXISTS</span>
          <strong className="why-title">{collapsed ? collapsedLine : title}</strong>
        </span>
        <ChevronDown className={"why-chevron" + (collapsed ? " is-collapsed" : "")} aria-hidden />
      </button>
      {!collapsed && <WhyBody {...props}/>}
    </aside>
  );
}
