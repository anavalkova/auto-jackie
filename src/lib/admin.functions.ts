import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DEMO_EMAIL = "demo.workshop@autojackie.app";

function newPassword() {
  const abc = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return "Jackie-" + Array.from(bytes, b => abc[b % abc.length]).join("");
}

/** Creates a missing visitor login; never resets passwords or grants workshop membership. */
export const setUpDemoWorkshop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only AutoJackie admins can do this");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw new Error("Couldn't check the demo login");
    const demo = list?.users.find(u => u.email?.toLowerCase() === DEMO_EMAIL);
    if (demo) return { email: DEMO_EMAIL, password: null };
    const { data: workshopId } = await context.supabase.rpc("demo_workshop_id");
    if (!workshopId) throw new Error("Demo workshop must be onboarded first");
    const password = newPassword();
    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email: DEMO_EMAIL, password, email_confirm: true });
    if (error || !data.user) throw new Error("Couldn't create the demo login");
    return { email: DEMO_EMAIL, password };
  });
