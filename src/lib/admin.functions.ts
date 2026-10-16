import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DEMO_EMAIL = "demo.workshop@autojackie.app";

function newPassword() {
  const abc = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return "Jackie-" + Array.from(bytes, b => abc[b % abc.length]).join("");
}

/** Admin-only: (re)creates the Demo Verkstad workshop and its login. Returns a fresh password each time. */
export const setUpDemoWorkshop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only AutoJackie admins can do this");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = newPassword();

    // find or create the demo login
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    let demo = list?.users.find(u => u.email?.toLowerCase() === DEMO_EMAIL);
    if (demo) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(demo.id, { password, email_confirm: true });
      if (error) throw new Error("Couldn't reset the demo password");
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({ email: DEMO_EMAIL, password, email_confirm: true });
      if (error || !data.user) throw new Error("Couldn't create the demo login");
      demo = data.user;
    }

    // find or create the demo workshop
    const { data: invite } = await supabaseAdmin.from("workshop_invites").select("workshop_id").eq("email", DEMO_EMAIL).maybeSingle();
    let workshopId = invite?.workshop_id;
    if (!workshopId) {
      const { data: w, error } = await supabaseAdmin.from("workshops").insert({ name: "Demo Verkstad", city: "Stockholm", created_by: context.userId }).select("id").single();
      if (error || !w) throw new Error("Couldn't create the demo workshop");
      workshopId = w.id;
      await supabaseAdmin.from("workshop_settings").insert({ workshop_id: workshopId, phone: "08-123 456 78", address: "Ringvägen 1, Stockholm" });
      await supabaseAdmin.from("workshop_invites").insert({ workshop_id: workshopId, email: DEMO_EMAIL, claimed_at: new Date().toISOString() });
      await supabaseAdmin.from("workshop_members").insert({ workshop_id: workshopId, user_id: demo.id, role: "owner" });
      const day = 86_400_000, now = Date.now();
      await supabaseAdmin.from("inquiries").insert([
        { issue: "Squealing front brakes", urgency: "this week", price_low_sek: 1500, price_high_sek: 3500, note: "Likely worn pads, maybe discs", vehicle_label: "Volvo V60 2019", contact_name: "Erik Lindqvist", contact_phone: "070 111 22 33", status: "new" as const, created_at: new Date(now - 2 * 3600_000).toISOString() },
        { issue: "Engine light on, code P0301", urgency: "today", price_low_sek: 800, price_high_sek: 2500, note: "Misfire cylinder 1 — coil or spark plug", vehicle_label: "VW Golf 2016", contact_name: "Sara Nilsson", contact_phone: "073 444 55 66", message: "It shakes at red lights. Can I still drive to you?", status: "new" as const, created_at: new Date(now - 5 * 3600_000).toISOString() },
        { issue: "Timing belt due at 150,000 km", urgency: "next service", price_low_sek: 6000, price_high_sek: 9000, note: "Belt, tensioner and water pump together", vehicle_label: "Skoda Octavia 2014", contact_name: "Johan Berg", contact_phone: "076 777 88 99", status: "contacted" as const, created_at: new Date(now - day).toISOString() },
        { issue: "Winter tyre change", urgency: "soon", price_low_sek: 500, price_high_sek: 900, note: "Swap and balance, storage optional", vehicle_label: "Toyota RAV4 2021", contact_name: "Lina Ek", contact_phone: "072 123 98 76", status: "booked" as const, created_at: new Date(now - 3 * day).toISOString() },
      ].map(i => ({ ...i, workshop_id: workshopId!, driver_id: demo!.id })));
    }
    return { email: DEMO_EMAIL, password };
  });
