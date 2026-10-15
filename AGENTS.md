<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- AI chat streams from the /api/chat server route with Wikidata tools in src/lib/ai; keep model calls and keys server-side so grounding rules can't be bypassed.
- German HSN/TSN lookups use the bundled official KBA SV 4.2 register (src/lib/vehicles-data, server-only via /api/vehicles/lookup); Swedish plates resolve live via RegCheck /CheckSweden (REGCHECK_USERNAME secret, server-only); details go to the model only, never shown to the driver.
- Accounts are optional (Google / Lovable sign-in). Guests: car and chat live only in React state, nothing persisted. Signed-in: car in saved_vehicles, chats in chats (UIMessage[] jsonb) via the browser client under owner-only RLS; saved chats open at /c/$chatId.
- Define AutoJackie visual styling in src/styles.css and use shared design-system controls so future screens inherit the same brand.
- The shared chat screen loads saved conversations into an always-visible sidebar and refreshes it after completed turns; keep history navigation in sync with saved chats.
- Jackie tools live in src/lib/ai/*.server.ts and are registered in /api/chat; large reference indexes (OBD codes, Tesla manual contents) are bundled JSON in src/lib/vehicles-data, page bodies fetched live — keeps the worker small and data current.
