import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, AreaChart, Area, Legend,
} from "recharts";
import type { ExpertiseInputs, ExpertiseResults } from "@/lib/expertise-calc";

const fmt = (n: number) => `${Math.round(n / 100) / 10}k €`;

interface Props {
  inputs: ExpertiseInputs;
  results: ExpertiseResults;
}

/**
 * Visuels "Effet Wow" du rapport d'expertise :
 *  - Waterfall du cash-flow annuel (loyers → charges → impôts → crédit → cash-flow)
 *  - Évolution du patrimoine net sur la durée de détention
 */
export const ExpertiseCharts = ({ inputs, results }: Props) => {
  // ============ Waterfall cash-flow annuel ============
  const loyers = Math.round(results.loyers_annuels_nets_vacance);
  const charges = -Math.round(results.charges_annuelles_totales);
  const impots = -Math.round(results.impot_annuel_estime);
  const credit = -Math.round(results.mensualite_credit * 12);
  const cashflow = Math.round(results.cash_flow_annuel);

  // Préparation waterfall (base + delta) — base invisible, delta visible
  let running = 0;
  const waterfallData = [
    { name: "Loyers nets", base: 0, value: loyers, color: "hsl(142 71% 45%)", display: loyers },
    ...[
      { name: "Charges", value: charges, color: "hsl(0 72% 51%)" },
      { name: "Impôts", value: impots, color: "hsl(0 72% 51%)" },
      { name: "Crédit", value: credit, color: "hsl(0 72% 51%)" },
    ].map((step) => {
      const start = running === 0 ? loyers + (running) : loyers + running;
      const entry = {
        name: step.name,
        base: step.value < 0 ? start + step.value : start,
        value: Math.abs(step.value),
        color: step.color,
        display: step.value,
      };
      running += step.value;
      return entry;
    }),
    {
      name: "Cash-flow",
      base: 0,
      value: cashflow,
      color: cashflow >= 0 ? "hsl(217 91% 60%)" : "hsl(0 72% 51%)",
      display: cashflow,
    },
  ];

  // ============ Évolution patrimoine ============
  const n = Math.max(1, inputs.duree_detention_annees);
  const rev = inputs.revalorisation_annuelle_pct / 100;
  const taux = inputs.taux_credit / 100 / 12;
  const mensualites = inputs.duree_credit_annees * 12;
  const capital = results.capital_emprunte;

  // Capital restant dû (mois) → amortissement standard
  const capitalRestant = (m: number) => {
    if (capital <= 0 || taux === 0) return Math.max(0, capital - (capital / mensualites) * m);
    if (m >= mensualites) return 0;
    const num = Math.pow(1 + taux, mensualites) - Math.pow(1 + taux, m);
    const den = Math.pow(1 + taux, mensualites) - 1;
    return capital * (num / den);
  };

  const patrimoineData = Array.from({ length: n + 1 }, (_, year) => {
    const valeurBien = inputs.prix_acquisition * Math.pow(1 + rev, year);
    const dette = capitalRestant(year * 12);
    return {
      year: `An ${year}`,
      valeur: Math.round(valeurBien),
      dette: Math.round(dette),
      patrimoine: Math.round(valeurBien - dette),
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="bg-card/60 border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Composition du cash-flow annuel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={waterfallData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} width={55} />
              <Tooltip
                formatter={(_v: any, _n: any, p: any) =>
                  `${p.payload.display.toLocaleString("fr-FR")} €`
                }
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="base" stackId="a" fill="transparent" />
              <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]}>
                {waterfallData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Loyers nets — Charges — Impôts — Crédit = Cash-flow annuel
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card/60 border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Évolution du patrimoine net sur {n} ans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={patrimoineData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="g-pat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="g-val" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(40 60% 55%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(40 60% 55%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} width={55} />
              <Tooltip
                formatter={(v: number) => `${v.toLocaleString("fr-FR")} €`}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                  borderRadius: 8,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="valeur"
                name="Valeur du bien"
                stroke="hsl(40 60% 55%)"
                fill="url(#g-val)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="patrimoine"
                name="Patrimoine net"
                stroke="hsl(217 91% 60%)"
                fill="url(#g-pat)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Patrimoine net = Valeur du bien − Capital restant dû
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
