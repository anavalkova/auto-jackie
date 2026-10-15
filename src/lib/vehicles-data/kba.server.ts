// Official KBA SV 4.2 register (passenger cars, class M), status 15 Aug 2026.
// Parsed from https://www.kba.de/SharedDocs/Downloads/DE/SV/sv42_pdf.pdf
import data from "./kba-sv42.json";

type Row = [model: string, year: number, fuel: string, kw: number, ccm: number];
const db = data as unknown as { m: Record<string, [string, string]>; t: Record<string, Row> };

const FUEL: Record<string, string> = {
  "0001": "petrol", "0002": "diesel", "0004": "electric", "0005": "LPG", "0006": "LPG/petrol",
  "0008": "petrol hybrid", "0009": "CNG/petrol", "0010": "diesel hybrid", "0023": "hydrogen",
  "0025": "plug-in hybrid",
};

const title = (s: string) => s.split(" ").map(w => /\d/.test(w) || w.length <= 3 ? w.toUpperCase() : w[0] + w.slice(1).toLowerCase()).join(" ");

export function lookupKba(hsnRaw: string, tsnRaw: string) {
  const hsn = hsnRaw.trim().padStart(4, "0");
  const tsn = tsnRaw.trim().toUpperCase();
  const row = db.t[hsn + tsn];
  const maker = db.m[hsn];
  if (!row || !maker) return null;
  const [model, year, fuel, kw, ccm] = row;
  const make = title(maker[1] || (maker[0].replace(/\s*\(.*\)$/, "").split("-")[0] ?? maker[0]));
  const fuelName = FUEL[fuel] ?? "other fuel";
  const engine = [ccm ? `${(ccm / 1000).toFixed(1)} L` : "", fuelName, `${kw} kW (${Math.round(kw * 1.36)} hp)`].filter(Boolean).join(" ");
  return { make, model: model ? title(model) : "", typeApprovedYear: year, fuel: fuelName, kw, ccm, engine };
}
