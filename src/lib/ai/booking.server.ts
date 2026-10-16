import { tool } from "ai";
import { z } from "zod";
import { MAX_PICKS, rulesFromRpc, upcomingDays } from "@/lib/booking";
import { matchService, OTHER, type ServiceItem } from "@/lib/services";

type Shop = { id: string; name: string; city: string };

async function rpc<T>(name: string, body: object): Promise<T | null> {
  const url = process.env["SUPABASE_URL"], key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  return res?.ok ? ((await res.json().catch(() => null)) as T) : null;
}

const fmt = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Europe/Stockholm", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

async function resolveShop(fixedId: string | undefined, name: string | undefined) {
  const shops = (await rpc<Shop[]>("list_partner_workshops", {})) ?? [];
  if (fixedId) return { shop: shops.find(s => s.id === fixedId) ?? null, shops };
  const q = (name ?? "").toLowerCase().trim();
  const shop = shops.length === 1 ? shops[0]! : q ? shops.find(s => s.name.toLowerCase().includes(q) || q.includes(s.name.toLowerCase())) ?? null : null;
  return { shop, shops };
}

async function freeSlots(shopId: string, days = 10) {
  return upcomingDays(new Date(), days, rulesFromRpc(await rpc("workshop_booking_rules", { _workshop: shopId })));
}

/** Booking via chat: Jackie lists real free drop-off times and files the same request the booking form does, as the signed-in driver (RLS applies). */
export function createBookingTools(opts: { workshopId?: string | undefined; userId: string | null; token: string; vehicleLabel: string }) {
  const getAvailableTimes = tool({
    description: "List the workshop's free drop-off times (Stockholm time) for the next bookable days. Use when the driver asks when they can come in or wants to book. If no workshop is fixed and several exist, it returns the workshop list so you can ask which one.",
    inputSchema: z.object({
      workshopName: z.string().max(80).optional().describe("Workshop the driver named, if any"),
      fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Only show days on or after this date (YYYY-MM-DD) if the driver asked for a specific period"),
    }),
    execute: async ({ workshopName, fromDate }) => {
      const { shop, shops } = await resolveShop(opts.workshopId, workshopName);
      if (!shop) return { needWorkshop: true, workshops: shops.map(s => ({ name: s.name, city: s.city })) };
      const days = (await freeSlots(shop.id, 30)).filter(d => !fromDate || d.key >= fromDate).slice(0, 8);
      const profile = await rpc<{ price_list?: ServiceItem[] }>("workshop_jackie_profile", { _workshop: shop.id });
      return {
        workshop: { id: shop.id, name: shop.name, city: shop.city },
        services: (profile?.price_list ?? []).map(p => p.task),
        days: days.map(d => ({ date: d.key, times: d.slots.map(s => ({ iso: s.toISOString(), label: fmt(s) })) })),
        signedIn: !!opts.userId,
        maxPicks: MAX_PICKS,
      };
    },
  });

  const bookVisit = tool({
    description: `Send a booking request to the workshop. Only call after the driver explicitly confirmed a summary of: workshop, job, 1 to ${MAX_PICKS} drop-off times taken from getAvailableTimes, their name, phone and how to confirm (sms, whatsapp or email).`,
    inputSchema: z.object({
      workshopId: z.string().uuid(),
      slots: z.array(z.string()).min(1).max(MAX_PICKS).describe("ISO times exactly as returned by getAvailableTimes"),
      issue: z.string().min(3).max(200),
      urgency: z.enum(["today", "this week", "soon", "next service"]).optional(),
      priceLowSek: z.number().int().min(0).max(200000).optional(),
      priceHighSek: z.number().int().min(0).max(200000).optional(),
      name: z.string().min(1).max(80),
      phone: z.string().min(5).max(30),
      channel: z.enum(["sms", "whatsapp", "email"]),
      email: z.string().email().max(120).optional(),
      message: z.string().max(1000).optional(),
    }),
    execute: async (i) => {
      if (!opts.userId) return { ok: false, reason: "not_signed_in", tell: "The driver must sign in (button at the top) before Jackie can send a booking. Their chat stays." };
      if (opts.workshopId && i.workshopId !== opts.workshopId) return { ok: false, reason: "wrong_workshop" };
      if (i.channel === "email" && !i.email) return { ok: false, reason: "email_missing" };
      const free = new Set((await freeSlots(i.workshopId, 60)).flatMap(d => d.slots.map(s => s.toISOString())));
      const slots = i.slots.map(s => { const d = new Date(s); return isNaN(+d) ? "" : d.toISOString(); });
      if (slots.some(s => !free.has(s))) return { ok: false, reason: "time_not_available", tell: "Call getAvailableTimes again and offer free times." };
      const profile = await rpc<{ name?: string; price_list?: ServiceItem[] }>("workshop_jackie_profile", { _workshop: i.workshopId });
      const list = profile?.price_list ?? [];
      const url = process.env["SUPABASE_URL"], key = process.env["SUPABASE_PUBLISHABLE_KEY"];
      if (!url || !key) return { ok: false, reason: "unavailable" };
      const res = await fetch(`${url}/rest/v1/inquiries`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${opts.token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          workshop_id: i.workshopId, driver_id: opts.userId, issue: i.issue, urgency: i.urgency ?? "soon",
          price_low_sek: i.priceLowSek ?? null, price_high_sek: i.priceHighSek ?? null, note: "Booked in chat with Jackie",
          vehicle_label: opts.vehicleLabel.slice(0, 120), message: (i.message ?? "").trim(), contact_name: i.name.trim(), contact_phone: i.phone.trim(),
          preferred_slots: [...slots].sort(), service: list.length ? matchService(i.issue, list) : OTHER, contact_channel: i.channel, contact_email: (i.email ?? "").trim(),
        }),
      }).catch(() => null);
      if (!res?.ok) return { ok: false, reason: "save_failed" };
      return { ok: true, workshop: profile?.name ?? "", times: slots.map(s => fmt(new Date(s))), channel: i.channel };
    },
  });

  return { getAvailableTimes, bookVisit };
}
