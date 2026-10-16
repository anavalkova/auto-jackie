import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_chats",
  title: "List my chats with Jackie",
  description: "List the signed-in driver's saved conversations with Jackie, newest first.",
  inputSchema: { limit: z.number().int().min(1).max(50).optional().describe("How many chats to return (default 20).") },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not signed in.");
    const { data, error } = await supabaseForUser(ctx).from("chats").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(limit ?? 20);
    if (error) throw new ToolError("Couldn't load chats.");
    const chats = (data ?? []).map(c => ({ id: c.id, title: c.title, updatedAt: c.updated_at }));
    return { content: [{ type: "text", text: chats.length ? chats.map(c => `${c.id}: ${c.title} (${c.updatedAt})`).join("\n") : "No saved chats." }], structuredContent: { chats } };
  },
});
