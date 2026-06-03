import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface Point {
  lon: number;
  lat: number;
  prix_m2?: number;
  adresse?: string;
  surface?: number;
  prix_total?: number;
  date?: string;
  label?: string;
  jittered?: boolean;
}

interface Props {
  center?: { lon: number; lat: number } | null;
  points?: Point[];
  prixMedian?: number | null;
}

const colorFor = (prix: number | undefined, median: number) => {
  if (!prix || !median) return "#64748b";
  const ratio = prix / median;
  if (ratio < 0.85) return "#22c55e";
  if (ratio < 1.0) return "#84cc16";
  if (ratio < 1.15) return "#eab308";
  if (ratio < 1.3) return "#f97316";
  return "#ef4444";
};

const fmtEur = (n?: number) =>
  typeof n === "number" ? n.toLocaleString("fr-FR") + " €" : "—";
const fmtDate = (d?: string) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return d; }
};

export const RadarHeatmap = ({ center, points = [], prixMedian }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Compute price bands from real loaded data (fallback to median ratios)
  const bands = useMemo(() => {
    const prices = points.map(p => p.prix_m2).filter((x): x is number => typeof x === "number" && x > 0);
    if (prices.length < 3) {
      if (!prixMedian) return null;
      return {
        low: Math.round(prixMedian * 0.85),
        high: Math.round(prixMedian * 1.15),
        min: Math.round(prixMedian * 0.6),
        max: Math.round(prixMedian * 1.5),
      };
    }
    const sorted = [...prices].sort((a, b) => a - b);
    const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
    return { low: q(0.33), high: q(0.66), min: sorted[0], max: sorted[sorted.length - 1] };
  }, [points, prixMedian]);

  useEffect(() => {
    if (!containerRef.current || !center) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [center.lon, center.lat],
      zoom: 14,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    new maplibregl.Marker({ color: "#3b82f6" })
      .setLngLat([center.lon, center.lat])
      .setPopup(new maplibregl.Popup().setHTML("<strong>Zone analysée</strong>"))
      .addTo(map);

    const median = prixMedian ?? 0;
    points
      .filter((p) => typeof p.lat === "number" && typeof p.lon === "number")
      .forEach((p) => {
        const el = document.createElement("div");
        el.style.width = "14px";
        el.style.height = "14px";
        el.style.borderRadius = "50%";
        el.style.background = colorFor(p.prix_m2, median);
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 0 4px rgba(0,0,0,0.4)";
        el.style.cursor = "pointer";

        const html = `
          <div style="font-family:system-ui;font-size:12px;min-width:200px;line-height:1.45">
            <div style="font-weight:600;color:#0f172a;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">
              ${p.adresse || "Vente DVF"}
            </div>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 8px;color:#334155">
              <span style="color:#64748b">Surface</span><span style="font-weight:500">${p.surface ?? "—"} m²</span>
              <span style="color:#64748b">Prix total</span><span style="font-weight:500">${fmtEur(p.prix_total)}</span>
              <span style="color:#64748b">Prix / m²</span><span style="font-weight:600;color:${colorFor(p.prix_m2, median)}">${fmtEur(p.prix_m2)}/m²</span>
              <span style="color:#64748b">Vente</span><span style="font-weight:500">${fmtDate(p.date)}</span>
            </div>
            ${p.jittered ? '<div style="margin-top:6px;font-size:10px;color:#94a3b8;font-style:italic">Position approximée</div>' : ""}
          </div>
        `;

        new maplibregl.Marker({ element: el })
          .setLngLat([p.lon, p.lat])
          .setPopup(new maplibregl.Popup({ offset: 14, maxWidth: "260px" }).setHTML(html))
          .addTo(map);
      });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center?.lon, center?.lat, points, prixMedian]);

  if (!center) return null;

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" /> Carte des transactions DVF
          <span className="ml-auto text-[11px] font-normal text-muted-foreground">
            Cliquez un point pour voir le détail de la vente
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div ref={containerRef} className="w-full h-[360px] rounded-lg overflow-hidden border border-border/30" />

          {/* Légende fixe — bas gauche */}
          {bands && (
            <div className="absolute bottom-3 left-3 z-10 bg-background/95 backdrop-blur-sm border border-border/40 rounded-lg shadow-lg p-2.5 text-[11px] max-w-[210px]">
              <div className="font-semibold text-foreground mb-1.5">Prix au m² du secteur</div>
              <LegendRow color="#22c55e" label={`Bas — < ${bands.low.toLocaleString("fr-FR")} €/m²`} />
              <LegendRow color="#eab308" label={`Médian — ${bands.low.toLocaleString("fr-FR")}–${bands.high.toLocaleString("fr-FR")} €/m²`} />
              <LegendRow color="#ef4444" label={`Élevé — > ${bands.high.toLocaleString("fr-FR")} €/m²`} />
              {prixMedian && (
                <div className="mt-1.5 pt-1.5 border-t border-border/30 text-muted-foreground">
                  Médiane : <span className="font-medium text-foreground">{prixMedian.toLocaleString("fr-FR")} €/m²</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end mt-2 text-[10px] text-muted-foreground italic">
          Tuiles © OpenStreetMap · Données DVF (Etalab)
        </div>
      </CardContent>
    </Card>
  );
};

const LegendRow = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-1.5 py-0.5">
    <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
    <span className="text-foreground/80">{label}</span>
  </div>
);
