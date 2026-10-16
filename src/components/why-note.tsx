import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type WhyStat = { value: string; text: string; source?: { label: string; url: string } };

/** Small "why this exists" card that ties a screen to the problem it solves, with sourced numbers. Collapsible; expanded by default. */
export function WhyNote({ id, title, stats, footer }: { id: string; title: string; stats: WhyStat[]; footer?: string }) {
  const key = `autojackie.why.${id}`;
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(key) === "0"; } catch { return false; } });
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(key, next ? "0" : "1"); } catch { /* ignore */ }
  };
  return (
    <aside className="why-note" aria-label="Why this exists">
      <button type="button" className="why-toggle" aria-expanded={!collapsed} onClick={toggle}>
        <span className="eyebrow">WHY THIS EXISTS</span>
        <strong className="why-title">{title}</strong>
        <ChevronDown className={"why-chevron" + (collapsed ? " is-collapsed" : "")} aria-hidden />
      </button>
      {!collapsed && (
        <>
          <ul className="why-stats">
            {stats.map(s => (
              <li key={s.value + s.text}>
                <span className="why-value">{s.value}</span>
                <span className="why-text">
                  {s.text}
                  {s.source && <> <a href={s.source.url} target="_blank" rel="noreferrer">({s.source.label})</a></>}
                </span>
              </li>
            ))}
          </ul>
          {footer && <p className="why-footer">{footer}</p>}
        </>
      )}
    </aside>
  );
}
