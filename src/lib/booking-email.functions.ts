import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Emails the signed-in driver a confirmation for one of their own bookings (RLS: owner only). */
export const sendBookingConfirmation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), lang: z.enum(["en", "sv", "de"]), rescheduled: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("inquiries")
      .select("contact_email, contact_name, issue, service, vehicle_label, booked_at, preferred_slots, driver_id, workshop_id, workshops(name)")
      .eq("id", data.id).maybeSingle();
    if (!row || row.driver_id !== context.userId) return { ok: false };
    const at = row.booked_at ?? row.preferred_slots?.[0];
    const to = row.contact_email || (context.claims as { email?: string }).email || "";
    if (!at || !to) return { ok: false };
    const { sendBookingEmail } = await import("./booking-email.server");
    const ok = await sendBookingEmail({
      workshopId: row.workshop_id, to, name: row.contact_name, workshop: (row.workshops as { name?: string } | null)?.name ?? "", job: row.service && row.service !== "Other" ? row.service : row.issue,
      vehicle: row.vehicle_label, at, lang: data.lang, rescheduled: data.rescheduled ?? false,
    });
    return { ok };
  });
