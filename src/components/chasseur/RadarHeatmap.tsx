import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface Point {
  lon: number;
  lat: number;
  prix_m2?: number;
  label?: string;
}

interface Props {
  center?: { lon: number; lat: number } | null;
  points?: Point[];
  prixMedian?: number | null;
}

// Color by quantile of prix/m² (green→orange→red)
const colorFor = (prix: number | undefined, median: number) => {
  if (!prix || !median) return "#64748b";
  const ratio = prix / median;
  if (ratio < 0.85) return "#22c55e"; // good deal
  if (ratio < 1.0) return "#84cc16";
  if (ratio < 1.15) return "#eab308";
  if (ratio < 1.3) return "#f97316";
  return "#ef4444";
};

export const RadarHeatmap = ({ center, points = [], prixMedian }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

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

    // central marker (the queried address)
    new maplibregl.Marker({ color: "#3b82f6" })
      .setLngLat([center.lon, center.lat])
      .setPopup(new maplibregl.Popup().setHTML("<strong>Zone analysée</strong>"))
      .addTo(map);

    // DVF transaction points
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
        new maplibregl.Marker({ element: el })
          .setLngLat([p.lon, p.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 12 }).setHTML(
              `<div style="font-size:12px"><strong>${p.label || "Vente DVF"}</strong><br/>${p.prix_m2 ? p.prix_m2.toLocaleString("fr-FR") + " €/m²" : ""}</div>`,
            ),
          )
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
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="w-full h-[360px] rounded-lg overflow-hidden border border-border/30" />
        <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-muted-foreground">
          <Legend color="#22c55e" label="< 0.85× médian (bonne affaire)" />
          <Legend color="#eab308" label="≈ médian" />
          <Legend color="#ef4444" label="> 1.3× médian (cher)" />
          <span className="ml-auto italic">Tuiles © OpenStreetMap · Données DVF (Etalab)</span>
        </div>
      </CardContent>
    </Card>
  );
};

const Legend = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1">
    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
    {label}
  </span>
);
