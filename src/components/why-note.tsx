import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type WhyStat = { value: string; text: string; source?: { label: string; url: string } };

/** Collapsible "why this exists" card with sourced numbers. Expanded by default. */
export function WhyNote({ id, title, stats, footer, summary }: { id: string; title: string; stats: WhyStat[]; footer?: string; summary?: string }) {
  const key = `autojackie.why.${id}`;
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(key) === "0"; } catch { return false; } });
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(key, next ? "0" : "1"); } catch { /* ignore */ }
  };
  // Collapsed summary: use explicit prop or derive from first stat
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
