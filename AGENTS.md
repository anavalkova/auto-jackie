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
- /api/chat enforces monthly question limits server-side (consume_chat_quota RPC via admin client; signed-in by verified user id, guests by hashed IP); limits live in src/lib/chat-quota.ts so the browser cannot bypass them.
- German HSN/TSN lookups use the bundled official KBA SV 4.2 register (src/lib/vehicles-data, server-only via /api/vehicles/lookup); Swedish plates resolve live via RegCheck /CheckSweden (REGCHECK_USERNAME secret, server-only); details go to the model only, never shown to the driver.
- Vehicle lookup accepts guests and signed-in drivers alike with input validation and server-only registry credentials; plate context responses are not cached, and lookup does not consume chat-question quota.
- Accounts are optional (Google / Lovable sign-in). Guests: car and chat live only in React state, nothing persisted. Signed-in: car in saved_vehicles, chats in chats (UIMessage[] jsonb) via the browser client under owner-only RLS; saved chats open at /c/$chatId.
- Define AutoJackie visual styling in src/styles.css and use shared design-system controls so future screens inherit the same brand.
- The shared chat screen loads saved conversations into an always-visible sidebar and refreshes it after completed turns; keep history navigation in sync with saved chats.
- On phones, driver chats use document scrolling and an inline expandable history row; avoid nested fixed-height transcript scrollers so older messages and history remain reachable.
- Driver history uses counted database pagination through chat-history helpers rather than a capped list or nested sidebar scroller; registry privacy is normalized by vehicles helpers for legacy records and model payloads.
- Jackie tools live in src/lib/ai/*.server.ts and are registered in /api/chat; large reference indexes (OBD codes, Tesla manual contents) are bundled JSON in src/lib/vehicles-data, page bodies fetched live — keeps the worker small and data current.
- Workshops are tenants onboarded only by admins (user_roles + has_role; admin_emails promote on sign-in via claim_my_access RPC). admin_onboard_workshop creates workshop + workshop_settings (template defaults) + workshop_invites(email); claim_my_access links the invited email as owner. All access via security-definer workshop_role_of()/has_role() in RLS so tenant data never crosses workshops. /admin = operations, /workshop = dashboard. Demo identity is independent of owner invitations; signed-in users without memberships enter read-only demo exploration. Demo login setup never resets existing passwords or grants memberships, preventing visitor privilege escalation.
- Each workshop has a driver page at /w/$slug (workshop_public_profile RPC for branding); /api/chat takes workshopId and loads workshop_jackie_profile server-side, so workshop context, prices and AI tier can't be spoofed by the browser.
- Workshop selection is a user-scoped browser navigation preference validated against current memberships; share workshop-selection helpers between dashboard and driver headers/sign-in redirects so the latest selection stays consistent. Uploaded workshop logos are retired in presentation and settings; keep legacy database fields for compatibility.
- Workshops pick AI tiers (economy/balanced/premium), never model names; src/lib/ai-tiers.ts is the only tier-to-model map, so models can change centrally without touching settings.
- Workshop context keeps a unified know-how step and a separate AI-tier step, saving only the active step; free-form service descriptions use the existing services array to preserve compatibility with server-side context.
- Workshop configuration separates local field interaction from persistence; shared configuration-save guards block demo and non-owner writes, while demo team experiments stay local, so trying controls cannot alter stored workshop data.
- Read-only workshop exploration uses localized fictional fixtures from workshop-demo, with relative visit dates and example.com contacts; never mix real inquiries or memberships into judging screens or persist/send fixture data.
- Agent integrations: MCP at /mcp (OAuth, read-only driver + workshop tools), consent page, WebMCP on workshop requests.
