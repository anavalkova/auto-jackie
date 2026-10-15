import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { catalog, hsnTsn, isSwedishPlate, plateServiceKm, type Vehicle } from "@/lib/vehicles";

export function GarageDialog({ open, onOpenChange, vehicle, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; vehicle: Vehicle | null; onSave: (v: Vehicle) => void;
}) {
  const [mileage, setMileage] = useState(vehicle?.mileageKm?.toString() ?? "");
  const [plate, setPlate] = useState("");
  const [plateDone, setPlateDone] = useState(false);
  const [hsn, setHsn] = useState("");
  const [tsn, setTsn] = useState("");
  const [error, setError] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [engine, setEngine] = useState("");

  const km = mileage.trim() ? Math.max(0, Number(mileage.replace(/\s/g, "")) || 0) : undefined;
  const finish = (v: Vehicle) => { onSave({ ...v, mileageKm: km }); setError(""); setPlateDone(false); onOpenChange(false); };

  const savePlate = () => {
    const p = plate.trim().toUpperCase();
    if (!isSwedishPlate(p)) return setError("That doesn't look like a Swedish plate. Try something like ABC 123 or ABC 12A.");
    setPlateDone(true);
    setTimeout(() => finish({ source: "plate", confidential: true, label: p.replace(/^([A-Z]{3})\s?/, "$1 "), serviceKm: plateServiceKm(p) }), 900);
  };
  const saveHsn = () => {
    const hit = hsnTsn[`${hsn.trim()}/${tsn.trim().toUpperCase()}`];
    if (!hit) return setError("I don't have that code yet. Try 0603 / BKG, or pick your car manually.");
    const eng = catalog[hit.make]?.[hit.model]?.engines.find(e => e.name === hit.engine);
    const d = `${hit.year} ${hit.make} ${hit.model} ${hit.engine}`;
    finish({ source: "hsn", confidential: false, label: `${hit.make} ${hit.model}`, description: d, serviceKm: eng?.serviceKm ?? 30000 });
  };
  const saveManual = () => {
    const eng = catalog[make]?.[model]?.engines.find(e => e.name === engine);
    if (!eng || !year) return setError("Pick make, model, year and engine.");
    finish({ source: "manual", confidential: false, label: `${make} ${model}`, description: `${year} ${make} ${model} ${engine}`, serviceKm: eng.serviceKm });
  };

  const models = make ? Object.keys(catalog[make]) : [];
  const entry = make && model ? catalog[make][model] : undefined;

  return <Dialog open={open} onOpenChange={o => { onOpenChange(o); setError(""); setPlateDone(false); }}>
    <DialogContent className="garage-dialog">
      <DialogHeader><DialogTitle>{vehicle ? "Change your car" : "Add your car"}</DialogTitle><DialogDescription>Jackie gives better answers when she knows roughly what you drive.</DialogDescription></DialogHeader>
      <div className="garage-field"><Label htmlFor="mileage">Odometer (km), optional</Label><Input id="mileage" inputMode="numeric" placeholder="e.g. 84 000" value={mileage} onChange={e => setMileage(e.target.value)}/></div>
      <Tabs defaultValue="plate" onValueChange={() => setError("")}>
        <TabsList className="garage-tabs"><TabsTrigger value="plate">Swedish plate</TabsTrigger><TabsTrigger value="hsn">German HSN/TSN</TabsTrigger><TabsTrigger value="manual">Pick manually</TabsTrigger></TabsList>
        <TabsContent value="plate" className="garage-pane">
          {plateDone ? <p className="plate-confirm" role="status">I got the information.</p> : <>
            <div className="garage-field"><Label htmlFor="plate">Registration number</Label><Input id="plate" placeholder="ABC 123" value={plate} onChange={e => setPlate(e.target.value)} className="plate-input"/></div>
            <p className="garage-note">Registry details stay private — they're used for service timing, not shown here.</p>
            <Button onClick={savePlate} disabled={!plate.trim()}>Use this plate</Button>
          </>}
        </TabsContent>
        <TabsContent value="hsn" className="garage-pane">
          <div className="garage-row"><div className="garage-field"><Label htmlFor="hsn">HSN (2.1)</Label><Input id="hsn" placeholder="0603" maxLength={4} value={hsn} onChange={e => setHsn(e.target.value)}/></div><div className="garage-field"><Label htmlFor="tsn">TSN (2.2)</Label><Input id="tsn" placeholder="BKG" maxLength={3} value={tsn} onChange={e => setTsn(e.target.value)}/></div></div>
          <p className="garage-note">Both codes are on the German registration certificate (Zulassungsbescheinigung Teil I).</p>
          <Button onClick={saveHsn} disabled={!hsn.trim() || !tsn.trim()}>Find my car</Button>
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
