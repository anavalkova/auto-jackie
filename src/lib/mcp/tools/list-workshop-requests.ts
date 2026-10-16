import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const STATUSES = ["new", "contacted", "quoted", "booked", "closed"] as const;

export default defineTool({
  name: "list_workshop_requests",
  title: "List my workshop's requests",
  description: "For workshop staff: list incoming driver requests for the workshop you belong to, optionally filtered by status.",
  inputSchema: { status: z.enum(STATUSES).optional().describe("Only requests with this status.") },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ status }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not signed in.");
    const uid = ctx.getUserId();
    if (!uid) throw new ToolError("Not signed in.");
    const sb = supabaseForUser(ctx);
    const { data: m } = await sb.from("workshop_members").select("workshop_id").eq("user_id", uid).limit(1).maybeSingle();
    if (!m) throw new ToolError("You're not a member of a workshop.");
    let q = sb.from("inquiries").select("id,issue,service,status,urgency,contact_name,price_low_sek,price_high_sek,quote_low_sek,quote_high_sek,booked_at,created_at").eq("workshop_id", m.workshop_id).order("created_at", { ascending: false }).limit(50);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw new ToolError("Couldn't load requests.");
    const requests = (data ?? []).map(r => ({ id: r.id, issue: r.issue, service: r.service, status: r.status, urgency: r.urgency, customer: r.contact_name,
      estimateSek: r.price_low_sek != null && r.price_high_sek != null ? `${r.price_low_sek}-${r.price_high_sek}` : null,
      yourPriceSek: r.quote_low_sek != null && r.quote_high_sek != null ? `${r.quote_low_sek}-${r.quote_high_sek}` : null,
      bookedAt: r.booked_at, createdAt: r.created_at }));
    return { content: [{ type: "text", text: requests.length ? requests.map(r => `${r.id}: ${r.issue} · ${r.customer} · ${r.status}`).join("\n") : "No requests." }], structuredContent: { requests } };
  },
});
