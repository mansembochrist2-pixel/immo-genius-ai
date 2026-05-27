import { ExternalLink, ShieldCheck } from "lucide-react";

const SOURCES = [
  { label: "DVF — Demandes de valeurs foncières", org: "DGFiP / Etalab", url: "https://app.dvf.etalab.gouv.fr/" },
  { label: "DPE — Diagnostic de performance énergétique", org: "ADEME", url: "https://data.ademe.fr/datasets/dpe-v2-logements-existants" },
  { label: "Encadrement des loyers", org: "Ministère du Logement", url: "https://www.data.gouv.fr/fr/datasets/?q=encadrement+des+loyers" },
  { label: "Indices Notaires-INSEE des prix immobiliers", org: "INSEE", url: "https://www.insee.fr/fr/statistiques/serie/010567019" },
  { label: "Cadastre", org: "IGN / Géoplateforme", url: "https://apicarto.ign.fr/api/doc/cadastre" },
  { label: "Base Adresse Nationale (BAN)", org: "data.gouv.fr", url: "https://adresse.data.gouv.fr/" },
];

export const SourcesFooter = ({ compact = false }: { compact?: boolean }) => (
  <div className={`rounded-lg border border-border/40 bg-surface-1/40 ${compact ? "p-3" : "p-4"} mt-4`}>
    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
      Sources publiques utilisées
    </div>
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {SOURCES.map((s) => (
        <li key={s.url} className="text-[11px] text-muted-foreground">
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-primary transition-colors"
          >
            <span className="font-medium text-foreground/80">{s.label}</span>
            <span>· {s.org}</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
          </a>
        </li>
      ))}
    </ul>
    <p className="text-[10px] text-muted-foreground/70 mt-2 italic">
      Toutes les données sont issues d'API publiques officielles. Aucune donnée privée n'est utilisée.
    </p>
  </div>
);
