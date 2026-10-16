import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_visit_requests",
  title: "List my workshop visit requests",
  description: "List workshop visits the signed-in driver has requested, with status, price estimate and booked time.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_a, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not signed in.");
    const uid = ctx.getUserId();
    if (!uid) throw new ToolError("Not signed in.");
    const { data, error } = await supabaseForUser(ctx).from("inquiries")
      .select("id,issue,status,price_low_sek,price_high_sek,quote_low_sek,quote_high_sek,booked_at,created_at,workshops(name)")
      .eq("driver_id", uid).order("created_at", { ascending: false }).limit(50);
    if (error) throw new ToolError("Couldn't load requests.");
    const requests = (data ?? []).map(r => ({
      id: r.id, issue: r.issue, status: r.status, workshop: (r.workshops as { name: string } | null)?.name ?? "",
      estimateSek: r.price_low_sek != null && r.price_high_sek != null ? `${r.price_low_sek}-${r.price_high_sek}` : null,
      workshopPriceSek: r.quote_low_sek != null && r.quote_high_sek != null ? `${r.quote_low_sek}-${r.quote_high_sek}` : null,
      bookedAt: r.booked_at, createdAt: r.created_at,
    }));
    return { content: [{ type: "text", text: requests.length ? requests.map(r => `${r.issue} at ${r.workshop}: ${r.status}${r.bookedAt ? `, booked ${r.bookedAt}` : ""}`).join("\n") : "No visit requests." }], structuredContent: { requests } };
  },
});
