import { tool } from "ai";
import { z } from "zod";
import codes from "@/lib/vehicles-data/obd-codes.json";

const table = codes as Record<string, string>;
const SYSTEMS: Record<string, string> = { P: "engine and transmission (powertrain)", B: "body (airbags, seats, lights)", C: "chassis (brakes, steering, suspension)", U: "communication between the car's computers" };

export const lookupFaultCode = tool({
  description: "Look up the standard (SAE J2012 generic) meaning of an OBD-II fault code such as P0301 that a driver read from their car or a code reader.",
  inputSchema: z.object({ code: z.string().min(5).max(6).describe("Fault code, e.g. P0301 (call this tool for ANY code the driver mentions)") }),
  execute: async ({ code }) => {
    const c = code.trim().toUpperCase();
    const meaning = table[c];
    const system = SYSTEMS[c[0] ?? ""] ?? "unknown system";
    const generic = c[1] === "0" || c[1] === "2";
    return meaning
      ? { code: c, found: true, meaning, system, generic, source: "Generic OBD-II code list (SAE J2012)" }
      : { code: c, found: false, system, generic, note: generic ? "Not in the generic list." : "Manufacturer-specific code — meaning depends on the brand; a workshop scan tool is needed." };
  },
});
