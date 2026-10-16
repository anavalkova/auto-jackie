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
- Workshops are tenants onboarded only by admins (user_roles + has_role; admin_emails promote on sign-in via claim_my_access RPC). admin_onboard_workshop creates workshop + workshop_settings (template defaults) + workshop_invites(email); claim_my_access links the invited email as owner. All access via security-definer workshop_role_of()/has_role() in RLS so tenant data never crosses workshops. /admin = operations, /workshop = dashboard. Demo login is created by the admin-only setUpDemoWorkshop server fn.
- Each workshop has a driver page at /w/$slug (workshop_public_profile RPC for branding); /api/chat takes workshopId and loads workshop_jackie_profile server-side, so workshop context, prices and AI tier can't be spoofed by the browser.
- Workshops pick AI tiers (economy/balanced/premium), never model names; src/lib/ai-tiers.ts is the only tier-to-model map, so models can change centrally without touching settings.
- Agent integrations: MCP at /mcp (OAuth, read-only driver + workshop tools), consent page, WebMCP on workshop requests.
