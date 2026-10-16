import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Hsn = z.object({ hsn: z.string().regex(/^\d{1,4}$/), tsn: z.string().regex(/^[0-9A-Za-z]{3}$/) });
const Plate = z.object({ plate: z.string().regex(/^[A-Za-z]{3}\s?\d{2}[0-9A-Za-z]$/) });

export const Route = createFileRoute("/api/vehicles/lookup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body: unknown = await request.json().catch(() => null);
        const plate = Plate.safeParse(body);
        if (plate.success) {
          // Plate lookups use a paid third-party account: signed-in drivers only.
          const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
          const sbUrl = process.env["SUPABASE_URL"], sbKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
          if (!token || token.split(".").length !== 3 || !sbUrl || !sbKey) return Response.json({ error: "sign_in_required" }, { status: 401 });
          const who = await fetch(`${sbUrl}/auth/v1/user`, { headers: { apikey: sbKey, Authorization: `Bearer ${token}` } }).catch(() => null);
          if (!who?.ok) return Response.json({ error: "sign_in_required" }, { status: 401 });
          const username = process.env["REGCHECK_USERNAME"];
          if (!username) return Response.json({ error: "unavailable" }, { status: 503 });
          const { lookupSwedishPlate } = await import("@/lib/vehicles-data/regcheck.server");
          try {
            const hit = await lookupSwedishPlate(plate.data.plate.replace(/\s/g, "").toUpperCase(), username);
            if (!hit) return Response.json({ error: "not_found" }, { status: 404 });
            return Response.json(hit);
          } catch { return Response.json({ error: "unavailable" }, { status: 503 }); }
        }
        const parsed = Hsn.safeParse(body);
        if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
        const { lookupKba } = await import("@/lib/vehicles-data/kba.server");
        const hit = lookupKba(parsed.data.hsn, parsed.data.tsn);
        if (!hit) return Response.json({ error: "not_found" }, { status: 404 });
        return Response.json(hit);
      },
    },
  },
});
