import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Hsn = z.object({ hsn: z.string().regex(/^\d{1,4}$/), tsn: z.string().regex(/^[0-9A-Za-z]{3}$/) });
const Plate = z.object({ plate: z.string().regex(/^[A-Za-z]{3}\s?\d{2}[0-9A-Za-z]$/) });

export async function handleVehicleLookup(request: Request): Promise<Response> {
        const body: unknown = await request.json().catch(() => null);
        const plate = Plate.safeParse(body);
        if (plate.success) {
          // Accounts are optional; registry credentials stay server-side.
          const username = process.env["REGCHECK_USERNAME"];
          if (!username) return Response.json({ error: "unavailable" }, { status: 503 });
          const { lookupSwedishPlate } = await import("@/lib/vehicles-data/regcheck.server");
          try {
            const hit = await lookupSwedishPlate(plate.data.plate.replace(/\s/g, "").toUpperCase(), username);
            if (!hit) return Response.json({ error: "not_found" }, { status: 404 });
            return Response.json(hit, { headers: { "Cache-Control": "no-store" } });
          } catch { return Response.json({ error: "unavailable" }, { status: 503 }); }
        }
        const parsed = Hsn.safeParse(body);
        if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
        const { lookupKba } = await import("@/lib/vehicles-data/kba.server");
        const hit = lookupKba(parsed.data.hsn, parsed.data.tsn);
        if (!hit) return Response.json({ error: "not_found" }, { status: 404 });
        return Response.json(hit);
}

export const Route = createFileRoute("/api/vehicles/lookup")({
  server: { handlers: { POST: ({ request }) => handleVehicleLookup(request) } },
});
