import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

type SavedCar = { label?: string; description?: string; confidential?: boolean; mileageKm?: number };

export default defineTool({
  name: "get_my_car",
  title: "Get my saved car",
  description: "Show the signed-in driver's saved car. Cars added by licence plate only show the plate; registry details stay private.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_a, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not signed in.");
    const { data, error } = await supabaseForUser(ctx).from("saved_vehicles").select("vehicle").maybeSingle();
    if (error) throw new ToolError("Couldn't load the car.");
    if (!data) return { content: [{ type: "text", text: "No car saved." }] };
    const v = data.vehicle as SavedCar;
    // Plate-derived registry details are never shown to the driver, so never to their assistant either.
    const car = { label: v.label ?? "", description: v.confidential ? "" : (v.description ?? ""), addedByPlate: !!v.confidential, mileageKm: v.mileageKm ?? null };
    return { content: [{ type: "text", text: `${car.label}${car.description ? ` · ${car.description}` : ""}${car.mileageKm != null ? ` · ${car.mileageKm} km` : ""}` }], structuredContent: { car } };
  },
});
