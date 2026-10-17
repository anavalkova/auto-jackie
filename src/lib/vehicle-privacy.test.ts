import { describe, expect, it } from "vitest";
import { isPrivateVehicle, vehicleForJackie, type Vehicle } from "./vehicles";

const vehicle: Vehicle = { source: "hsn", confidential: false, label: "Volkswagen Golf", description: "2020 Volkswagen Golf 1.5 TSI", serviceKm: 30000 };
describe("registry context privacy", () => {
  it("keeps legacy HSN records private", () => {
    expect(isPrivateVehicle(vehicle)).toBe(true);
  });
  it("keeps plate records private", () => {
    expect(isPrivateVehicle({ ...vehicle, source: "plate" })).toBe(true);
  });
  it("passes registry details to Jackie as confidential context", () => {
    expect(vehicleForJackie(vehicle)).toEqual({ confidential: true, description: "2020 Volkswagen Golf 1.5 TSI", mileageKm: undefined });
  });
  it("does not hide manually supplied vehicle information", () => {
    expect(isPrivateVehicle({ ...vehicle, source: "manual" })).toBe(false);
  });
});