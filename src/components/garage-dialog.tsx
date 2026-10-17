import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { catalog, isSwedishPlate, odoInputToKm, kmToOdoUnit, type Vehicle } from "@/lib/vehicles";
import { useLang, odoUnitFor } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export function GarageDialog({ open, onOpenChange, vehicle, onSave, signedIn }: {
  open: boolean; onOpenChange: (o: boolean) => void; vehicle: Vehicle | null; onSave: (v: Vehicle) => void; signedIn: boolean;
}) {
  const lang = useLang();
  const unit = odoUnitFor(lang);
  const [mileage, setMileage] = useState(vehicle?.mileageKm != null ? String(kmToOdoUnit(vehicle.mileageKm, unit)) : "");
  const [plate, setPlate] = useState("");
  const [plateDone, setPlateDone] = useState(false);
  const [hsn, setHsn] = useState("");
  const [tsn, setTsn] = useState("");
  const [error, setError] = useState("");
  const [looking, setLooking] = useState(false);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [engine, setEngine] = useState("");

  const raw = mileage.trim() ? Math.max(0, Number(mileage.replace(/\s/g, "")) || 0) : undefined;
  const km = raw == null ? undefined : odoInputToKm(raw, unit);
  const finish = (v: Vehicle) => { onSave({ ...v, mileageKm: km }); setError(""); setPlateDone(false); onOpenChange(false); };

  const savePlate = async () => {
    const p = plate.trim().toUpperCase();
    if (!isSwedishPlate(p)) return setError("That doesn't look like a Swedish plate. Try something like ABC 123 or ABC 12A.");
    setError(""); setLooking(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) return setError("Sign in to look up a Swedish plate. You can still pick your car manually or use HSN/TSN.");
      const res = await fetch("/api/vehicles/lookup", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ plate: p }) });
      if (res.status === 401) return setError("Sign in to look up a Swedish plate. You can still pick your car manually or use HSN/TSN.");
      if (res.status === 404) return setError("The Swedish register didn't find that plate. Check it, or pick your car manually.");
      if (!res.ok) return setError("Couldn't reach the Swedish register just now. Try again, or pick your car manually.");
      const hit = await res.json() as { make: string; model: string; year: string; engine: string; fuel: string; transmission: string };
      const fromCatalog = Object.entries(catalog[hit.make] ?? {}).find(([m]) => hit.model.toLowerCase().includes(m.toLowerCase()))?.[1].engines[0]?.serviceKm;
      const serviceKm = fromCatalog ?? (hit.make === "Toyota" ? 15000 : 30000);
      const description = [hit.year, hit.make, hit.model, hit.engine, hit.fuel, hit.transmission].filter(Boolean).join(", ");
      setPlateDone(true);
      setTimeout(() => finish({ source: "plate", confidential: true, label: p.replace(/^([A-Z]{3})\s?/, "$1 "), description, serviceKm }), 900);
    } catch { setError("Couldn't reach the Swedish register just now. Try again in a moment."); }
    finally { setLooking(false); }
  };
  const saveHsn = async () => {
    setError(""); setLooking(true);
    try {
      const res = await fetch("/api/vehicles/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hsn: hsn.trim(), tsn: tsn.trim() }) });
      if (res.status === 400) return setError("HSN is 4 digits and TSN is 3 letters or digits.");
      if (!res.ok) return setError("The German register has no car with that code pair. Check fields 2.1 and 2.2, or pick your car manually.");
      const hit = await res.json() as { make: string; model: string; typeApprovedYear: number; engine: string; fuel: string };
      const fromCatalog = Object.entries(catalog[hit.make] ?? {}).find(([m]) => hit.model.toLowerCase().includes(m.toLowerCase()))?.[1].engines[0]?.serviceKm;
      const serviceKm = fromCatalog ?? (hit.make === "Toyota" ? 15000 : hit.fuel === "electric" ? 30000 : 30000);
      const label = `${hit.make} ${hit.model}`.trim();
      finish({ source: "hsn", confidential: false, label, description: `${label}, ${hit.engine}, type approved ${hit.typeApprovedYear} (KBA HSN ${hsn.trim()} / TSN ${tsn.trim().toUpperCase()})`, serviceKm });
    } catch { setError("Couldn't reach the lookup just now. Try again in a moment."); }
    finally { setLooking(false); }
  };
  const saveManual = () => {
    const eng = catalog[make]?.[model]?.engines.find(e => e.name === engine);
    if (!eng || !year) return setError("Pick make, model, year and engine.");
    finish({ source: "manual", confidential: false, label: `${make} ${model}`, description: `${year} ${make} ${model} ${engine}`, serviceKm: eng.serviceKm });
  };

  const models = make ? Object.keys(catalog[make] ?? {}) : [];
  const entry = make && model ? catalog[make]?.[model] : undefined;

  return <Dialog open={open} onOpenChange={o => { onOpenChange(o); setError(""); setPlateDone(false); }}>
    <DialogContent className="garage-dialog">
      <DialogHeader><DialogTitle>{vehicle ? "Change your car" : "Tell Jackie about your car"}</DialogTitle><DialogDescription>{signedIn ? "Saved to your account so Jackie remembers it next time. Remove it any time." : "Used for this chat only. Nothing is saved. Start a new chat or close the tab and it's gone."}</DialogDescription></DialogHeader>
      <div className="garage-field"><Label htmlFor="mileage">{unit === "mil" ? "Odometer (mil), optional" : "Odometer (km), optional"}</Label><Input id="mileage" inputMode="numeric" placeholder={unit === "mil" ? "e.g. 8 400" : "e.g. 84 000"} value={mileage} onChange={e => setMileage(e.target.value)}/></div>
      <Tabs defaultValue="plate" onValueChange={() => setError("")}>
        <TabsList className="garage-tabs"><TabsTrigger value="plate">Swedish plate</TabsTrigger><TabsTrigger value="hsn">German HSN/TSN</TabsTrigger><TabsTrigger value="manual">Pick manually</TabsTrigger></TabsList>
        <TabsContent value="plate" className="garage-pane">
          {plateDone ? <p className="plate-confirm" role="status">I got the information.</p> : <>
            <div className="garage-field"><Label htmlFor="plate">Registration number</Label><Input id="plate" placeholder="ABC 123" value={plate} onChange={e => setPlate(e.target.value)} className="plate-input"/></div>
            <p className="garage-note">Registry details stay private. They're used for service timing, not shown here.</p>
            <Button onClick={savePlate} disabled={looking || !plate.trim()}>{looking ? "Checking the register…" : "Use this plate"}</Button>
          </>}
        </TabsContent>
        <TabsContent value="hsn" className="garage-pane">
          <div className="garage-row"><div className="garage-field"><Label htmlFor="hsn">HSN (2.1)</Label><Input id="hsn" placeholder="0603" maxLength={4} value={hsn} onChange={e => setHsn(e.target.value)}/></div><div className="garage-field"><Label htmlFor="tsn">TSN (2.2)</Label><Input id="tsn" placeholder="BKG" maxLength={3} value={tsn} onChange={e => setTsn(e.target.value)}/></div></div>
          <p className="garage-note">Both codes are on the German registration certificate (Zulassungsbescheinigung Teil I). Checked against the official KBA register.</p>
          <Button onClick={saveHsn} disabled={looking || !hsn.trim() || !tsn.trim()}>{looking ? "Checking the register…" : "Find my car"}</Button>
        </TabsContent>
        <TabsContent value="manual" className="garage-pane">
          <div className="garage-row">
            <Select value={make} onValueChange={v => { setMake(v); setModel(""); setYear(""); setEngine(""); }}><SelectTrigger aria-label="Make"><SelectValue placeholder="Make"/></SelectTrigger><SelectContent>{Object.keys(catalog).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
            <Select value={model} onValueChange={v => { setModel(v); setYear(""); setEngine(""); }} disabled={!make}><SelectTrigger aria-label="Model"><SelectValue placeholder="Model"/></SelectTrigger><SelectContent>{models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="garage-row">
            <Select value={year} onValueChange={setYear} disabled={!entry}><SelectTrigger aria-label="Year"><SelectValue placeholder="Year"/></SelectTrigger><SelectContent>{entry?.years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
            <Select value={engine} onValueChange={setEngine} disabled={!year}><SelectTrigger aria-label="Engine"><SelectValue placeholder="Engine"/></SelectTrigger><SelectContent>{entry?.engines.map(e => <SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <Button onClick={saveManual} disabled={!engine}>Save car</Button>
        </TabsContent>
      </Tabs>
      {error && <p className="garage-error" role="alert">{error}</p>}
    </DialogContent>
  </Dialog>;
}
