import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({ hsn: z.string().regex(/^\d{1,4}$/), tsn: z.string().regex(/^[0-9A-Za-z]{3}$/) });

export const Route = createFileRoute("/api/vehicles/lookup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
        const { lookupKba } = await import("@/lib/vehicles-data/kba.server");
        const hit = lookupKba(parsed.data.hsn, parsed.data.tsn);
        if (!hit) return Response.json({ error: "not_found" }, { status: 404 });
        return Response.json(hit);
      },
    },
  },
});
