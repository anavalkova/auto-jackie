// Swedish plate lookup via RegCheck (regcheck.org.uk /CheckSweden). Server-only.
export type SwedishHit = { make: string; model: string; year: string; engine: string; fuel: string; transmission: string };

const FUEL: Record<string, string> = { bensin: "petrol", diesel: "diesel", el: "electric", elhybrid: "hybrid", laddhybrid: "plug-in hybrid", etanol: "ethanol", gas: "gas" };

export async function lookupSwedishPlate(plate: string, username: string): Promise<SwedishHit | null> {
  const url = `https://www.regcheck.org.uk/api/reg.asmx/CheckSweden?RegistrationNumber=${encodeURIComponent(plate)}&username=${encodeURIComponent(username)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) return null;
  const xml = await res.text();
  const m = xml.match(/<vehicleJson>([\s\S]*?)<\/vehicleJson>/);
  if (!m?.[1]) return null;
  const raw = m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  let j: Record<string, unknown>;
  try { j = JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
  const t = (k: string) => { const v = j[k]; return typeof v === "string" ? v : ((v as { CurrentTextValue?: string } | undefined)?.CurrentTextValue ?? ""); };
  const make = t("CarMake");
  if (!make) return null;
  const fuelSv = t("FuelType").toLowerCase();
  return { make, model: t("CarModel"), year: t("RegistrationYear"), engine: t("EngineSize").replace(/cm$/, "cm³"), fuel: FUEL[fuelSv] ?? fuelSv, transmission: t("Transmission").toLowerCase() === "manuell" ? "manual" : t("Transmission").toLowerCase() === "automat" ? "automatic" : t("Transmission") };
}
