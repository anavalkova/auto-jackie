import { useState } from "react";
import { X } from "lucide-react";

export type WhyStat = { value: string; text: string; source?: { label: string; url: string } };

/** Small "why this exists" card that ties a screen to the problem it solves, with sourced numbers. */
export function WhyNote({ id, title, stats, footer }: { id: string; title: string; stats: WhyStat[]; footer?: string }) {
  const key = `autojackie.why.${id}`;
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(key) === "1"; } catch { return false; } });
  if (hidden) return null;
  const dismiss = () => { setHidden(true); try { localStorage.setItem(key, "1"); } catch { /* ignore */ } };
  return (
    <aside className="why-note" aria-label="Why this exists">
      <button type="button" className="why-dismiss" aria-label="Hide this note" onClick={dismiss}><X /></button>
      <span className="eyebrow">WHY THIS EXISTS</span>
      <strong className="why-title">{title}</strong>
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
    </aside>
  );
}
