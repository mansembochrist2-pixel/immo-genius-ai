import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crosshair, Radar as RadarIcon, Phone } from "lucide-react";
import { RadarContent } from "@/components/chasseur/RadarContent";
import { PigeIA } from "@/components/chasseur/PigeIA";
import { useSearchParams } from "react-router-dom";

const Chasseur = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "radar";

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <Crosshair className="h-7 w-7 text-primary" />
          Chasseur de <span className="gradient-text">Mandats IA</span>
        </h1>
        <p className="page-subtitle">Radar stratégique + Pige IA · votre arme de conquête de mandats</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
          <TabsTrigger value="radar" className="gap-2"><RadarIcon className="h-4 w-4" /> Radar Prospection</TabsTrigger>
          <TabsTrigger value="pige" className="gap-2"><Phone className="h-4 w-4" /> Pige IA</TabsTrigger>
        </TabsList>
        <TabsContent value="radar"><RadarContent /></TabsContent>
        <TabsContent value="pige"><PigeIA /></TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Chasseur;
