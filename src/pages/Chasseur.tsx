import { AppLayout } from "@/components/AppLayout";
import { Radar as RadarIcon } from "lucide-react";
import { RadarContent } from "@/components/chasseur/RadarContent";

const Chasseur = () => {
  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <RadarIcon className="h-7 w-7 text-primary" />
          Radar de <span className="gradient-text">Prospection</span>
        </h1>
        <p className="page-subtitle">Analyse stratégique de votre secteur · DVF, DPE, INSEE, cadastre</p>
      </div>
      <RadarContent />
    </AppLayout>
  );
};

export default Chasseur;
