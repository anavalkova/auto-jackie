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
- Vehicle lookups use the local catalog in src/lib/vehicles.ts until a real registry API is chosen; plate-sourced vehicles stay confidential end to end (never sent to the model or shown).
- The driver's car is stored only in browser localStorage and chats are not persisted, because drivers have no accounts.
- Define AutoJackie visual styling in src/styles.css and use shared design-system controls so future screens inherit the same brand.
