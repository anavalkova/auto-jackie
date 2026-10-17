// Local reference catalog for phase 1. Not a live registry.
export type Engine = { name: string; serviceKm: number };
export type Catalog = Record<string, Record<string, { years: number[]; engines: Engine[] }>>;

const yrs = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => b - i);

export const catalog: Catalog = {
  Volvo: {
    XC60: { years: yrs(2017, 2025), engines: [{ name: "B4 2.0 mild hybrid", serviceKm: 30000 }, { name: "T6 Recharge plug-in hybrid", serviceKm: 30000 }] },
    V60: { years: yrs(2018, 2025), engines: [{ name: "B3 2.0 mild hybrid", serviceKm: 30000 }, { name: "D4 2.0 diesel", serviceKm: 30000 }] },
    XC40: { years: yrs(2018, 2025), engines: [{ name: "B3 2.0 mild hybrid", serviceKm: 30000 }, { name: "Recharge electric", serviceKm: 30000 }] },
  },
  Volkswagen: {
    Golf: { years: yrs(2013, 2025), engines: [{ name: "1.0 TSI", serviceKm: 30000 }, { name: "1.5 TSI", serviceKm: 30000 }, { name: "2.0 TDI", serviceKm: 30000 }] },
    Passat: { years: yrs(2015, 2024), engines: [{ name: "2.0 TDI", serviceKm: 30000 }, { name: "1.4 TSI GTE", serviceKm: 30000 }] },
  },
  Toyota: {
    Corolla: { years: yrs(2019, 2025), engines: [{ name: "1.8 Hybrid", serviceKm: 15000 }, { name: "2.0 Hybrid", serviceKm: 15000 }] },
    RAV4: { years: yrs(2019, 2025), engines: [{ name: "2.5 Hybrid", serviceKm: 15000 }] },
  },
  Kia: { Niro: { years: yrs(2017, 2025), engines: [{ name: "1.6 GDi Hybrid", serviceKm: 15000 }, { name: "e-Niro electric", serviceKm: 30000 }] } },
  Tesla: { "Model 3": { years: yrs(2019, 2025), engines: [{ name: "Long Range electric", serviceKm: 40000 }] } },
};

export type Vehicle = {
  source: "plate" | "hsn" | "manual";
  confidential: boolean; // plate-sourced registry data is never shown to the driver
  label: string; // what the driver sees
  description?: string | undefined; // only for non-confidential vehicles
  serviceKm: number;
  mileageKm?: number | undefined;
};

// German KBA codes (sample set for the demo catalog).
export const hsnTsn: Record<string, { make: string; model: string; engine: string; year: number }> = {
  "0603/BKG": { make: "Volkswagen", model: "Golf", engine: "1.5 TSI", year: 2020 },
  "0603/CBN": { make: "Volkswagen", model: "Golf", engine: "2.0 TDI", year: 2019 },
  "5013/AFZ": { make: "Toyota", model: "Corolla", engine: "1.8 Hybrid", year: 2021 },
  "9101/AJX": { make: "Volvo", model: "XC60", engine: "B4 2.0 mild hybrid", year: 2022 },
};

// Swedish plates resolve to a confidential record; only the service interval is used.
export const isSwedishPlate = (p: string) => /^[A-Z]{3}\s?\d{2}[A-Z0-9]$/i.test(p.trim());
export const plateServiceKm = (p: string): number => [15000, 30000, 20000][p.charCodeAt(0) % 3] ?? 30000;

export function nextService(v: Vehicle) {
  if (v.mileageKm == null) return null;
  const done = Math.floor(v.mileageKm / v.serviceKm);
  const dueAt = (done + 1) * v.serviceKm;
  return { dueAt, remaining: dueAt - v.mileageKm, progress: (v.mileageKm % v.serviceKm) / v.serviceKm };
}

/** Sweden measures driving distance in mil (1 mil = 10 km); Germany uses km. */
export type OdoUnit = "mil" | "km";
export const odoInputToKm = (value: number, unit: OdoUnit) => (unit === "mil" ? value * 10 : value);
export const kmToOdoUnit = (km: number, unit: OdoUnit) => (unit === "mil" ? Math.round(km / 10) : km);

export const symptomChips = [
  "Squealing when I brake",
  "Engine light is on",
  "Car pulls to one side",
  "Hard to start in the cold",
  "When should the timing belt be changed?",
  "What do spark plugs do?",
];
