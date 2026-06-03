import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, PageNumber,
  Header, Footer, Tab,
} from "docx";

const NAVY = "0A2540";
const GOLD = "B8915A";
const GREY = "5A6472";
const LIGHT_BG = "F4F6F9";

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "D6DCE4" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

const fmt = (n?: number) =>
  n == null || isNaN(Number(n)) ? "N/C" : Number(n).toLocaleString("fr-FR");

function h1(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 480, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 6 } },
    children: [new TextRun({ text, bold: true, size: 32, color: NAVY, font: "Garamond" })],
  });
}

function p(text: string, opts: { size?: number; color?: string; italics?: boolean; bold?: boolean; align?: any } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    alignment: opts.align,
    children: [new TextRun({ text, size: opts.size ?? 22, color: opts.color, italics: opts.italics, bold: opts.bold, font: "Calibri" })],
  });
}

function kpiRow(label: string, value: string, highlight = false): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        borders: cellBorders,
        width: { size: 5400, type: WidthType.DXA },
        shading: { fill: LIGHT_BG, type: ShadingType.CLEAR, color: "auto" },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        children: [new Paragraph({ children: [new TextRun({ text: label, size: 22, color: GREY, font: "Calibri" })] })],
      }),
      new TableCell({
        borders: cellBorders,
        width: { size: 3960, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: value, bold: true, size: highlight ? 26 : 22, color: highlight ? NAVY : "1a1a1a", font: "Calibri" })],
        })],
      }),
    ],
  });
}

function comparableTable(ventes: any[]): Table {
  const headerCell = (txt: string, width: number) => new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: NAVY, type: ShadingType.CLEAR, color: "auto" },
    margins: { top: 120, bottom: 120, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text: txt, bold: true, size: 20, color: "FFFFFF", font: "Calibri" })] })],
  });
  const dataCell = (txt: string, width: number, alt: boolean, align: any = AlignmentType.LEFT) => new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: alt ? { fill: LIGHT_BG, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text: txt, size: 20, font: "Calibri" })] })],
  });

  const widths = [3000, 1400, 1100, 1900, 1960];
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          headerCell("Adresse / Bien", widths[0]),
          headerCell("Surface", widths[1]),
          headerCell("Pièces", widths[2]),
          headerCell("Prix vente", widths[3]),
          headerCell("Prix €/m²", widths[4]),
        ],
      }),
      ...ventes.slice(0, 10).map((v: any, i: number) => {
        const alt = i % 2 === 1;
        const addr = [v.adresse_numero, v.adresse_nom_voie].filter(Boolean).join(" ") || v.type_local || "—";
        const date = v.date_mutation ? new Date(v.date_mutation).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "";
        return new TableRow({
          children: [
            dataCell(`${addr}${date ? ` · ${date}` : ""}`, widths[0], alt),
            dataCell(`${v.surface_relle_bati ?? "—"} m²`, widths[1], alt, AlignmentType.RIGHT),
            dataCell(String(v.nombre_pieces_principales ?? "—"), widths[2], alt, AlignmentType.CENTER),
            dataCell(`${fmt(v.valeur_fonciere)} €`, widths[3], alt, AlignmentType.RIGHT),
            dataCell(`${fmt(v.prix_m2)} €`, widths[4], alt, AlignmentType.RIGHT),
          ],
        });
      }),
    ],
  });
}

export interface EstimationDocxData {
  form: any;
  result: any;
  dvf?: any;
  insee?: any;
  agent?: { nom?: string; agence?: string };
}

export async function exportEstimationDocx(data: EstimationDocxData, filename: string) {
  const { form, result, dvf, insee, agent } = data;
  const children: (Paragraph | Table)[] = [];

  // Cover
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 120 },
      children: [new TextRun({ text: "RAPPORT D'ESTIMATION IMMOBILIÈRE", bold: true, size: 40, color: NAVY, font: "Garamond" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 8 } },
      children: [new TextRun({ text: form.adresse || "—", italics: true, size: 26, color: GREY, font: "Garamond" })],
    }),
    p(`${form.type_bien || "—"} · ${form.surface || "—"} m² · ${form.pieces || "—"} pièces${form.dpe ? " · DPE " + form.dpe : ""}`, { align: AlignmentType.CENTER, color: GREY, size: 22 }),
    p(`Édité le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}${agent?.nom ? " — par " + agent.nom : ""}${agent?.agence ? " (" + agent.agence + ")" : ""}`, { align: AlignmentType.CENTER, color: GREY, italics: true, size: 20 }),
  );

  // 1. Synthèse exécutive
  children.push(h1("1. Synthèse exécutive"));
  children.push(p(`Sur la base des transactions officielles DVF et des indicateurs locaux, ce bien est valorisé entre ${fmt(result.prix_min)} € et ${fmt(result.prix_max)} €. Le prix de mise en marché recommandé est de ${fmt(result.recommandation_prix)} €, soit ${fmt(result.prix_m2_secteur)} €/m².`));

  const kpis = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [5400, 3960],
    rows: [
      kpiRow("Fourchette basse", `${fmt(result.prix_min)} €`),
      kpiRow("Estimation centrale", `${fmt(result.prix_moyen)} €`),
      kpiRow("Fourchette haute", `${fmt(result.prix_max)} €`),
      kpiRow("Prix au m² secteur", `${fmt(result.prix_m2_secteur)} €/m²`),
      kpiRow("Prix recommandé", `${fmt(result.recommandation_prix)} €`, true),
    ],
  });
  children.push(kpis);

  // 2. Caractéristiques du bien
  children.push(h1("2. Caractéristiques du bien"));
  const features = [
    ["Adresse", form.adresse || "—"],
    ["Type de bien", form.type_bien || "—"],
    ["Surface", form.surface ? `${form.surface} m²` : "—"],
    ["Nombre de pièces", form.pieces || "—"],
    ["Étage", form.etage || "—"],
    ["État général", form.etat || "—"],
    ["DPE", form.dpe || "—"],
    ["Année de construction", form.annee_construction || "—"],
    ["Équipements", [form.parking && "Parking", form.cave && "Cave", form.balcon && "Balcon/Terrasse", form.ascenseur && "Ascenseur", form.gardien && "Gardien"].filter(Boolean).join(", ") || "—"],
  ];
  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3200, 6160],
    rows: features.map(([k, v]) => kpiRow(String(k), String(v))),
  }));

  // 3. Analyse du marché local
  children.push(h1("3. Analyse du marché local"));
  if (result.analyse_marche) children.push(p(result.analyse_marche));
  if (result.comparaison_quartier) {
    children.push(p("Comparaison de quartier", { bold: true, size: 24, color: NAVY }));
    children.push(p(result.comparaison_quartier));
  }

  // 4. Tendances INSEE
  if (insee?.evolution_3_ans?.length) {
    children.push(h1("4. Tendances du marché (Notaires-INSEE)"));
    children.push(p(`Évolution de l'indice des prix sur ${insee.evolution_3_ans.length} années — variation cumulée ${insee.variation_3_ans_pct >= 0 ? "+" : ""}${insee.variation_3_ans_pct} %.`));
    const headerCell = (txt: string, w: number) => new TableCell({
      borders: cellBorders, width: { size: w, type: WidthType.DXA },
      shading: { fill: NAVY, type: ShadingType.CLEAR, color: "auto" },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: txt, bold: true, size: 20, color: "FFFFFF", font: "Calibri" })] })],
    });
    const dataCell = (txt: string, w: number, alt: boolean, align: any = AlignmentType.RIGHT) => new TableCell({
      borders: cellBorders, width: { size: w, type: WidthType.DXA },
      shading: alt ? { fill: LIGHT_BG, type: ShadingType.CLEAR, color: "auto" } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ alignment: align, children: [new TextRun({ text: txt, size: 20, font: "Calibri" })] })],
    });
    const ws = [3120, 3120, 3120];
    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: ws,
      rows: [
        new TableRow({ tableHeader: true, children: [headerCell("Année", ws[0]), headerCell("Indice", ws[1]), headerCell("Variation", ws[2])] }),
        ...insee.evolution_3_ans.map((e: any, i: number) => new TableRow({
          children: [
            dataCell(String(e.annee), ws[0], i % 2 === 1, AlignmentType.CENTER),
            dataCell(String(e.indice), ws[1], i % 2 === 1),
            dataCell(`${e.variation_pct >= 0 ? "+" : ""}${e.variation_pct} %`, ws[2], i % 2 === 1),
          ],
        })),
      ],
    }));
    children.push(p(insee.source, { italics: true, color: GREY, size: 18 }));
  }

  // 5. Transactions comparables (DVF)
  if (dvf?.ventes?.length) {
    children.push(h1(`${insee?.evolution_3_ans?.length ? "5" : "4"}. Transactions comparables (DVF officiel)`));
    children.push(p(`Secteur ${dvf.ville || ""} — prix médian ${fmt(dvf.prix_m2_median)} €/m², ${dvf.volume_12_mois || 0} ventes au cours des 12 derniers mois, tension du marché : ${dvf.tension_marche || "n/c"}.`));
    children.push(comparableTable(dvf.ventes));
    children.push(p(`Source : DGFiP via Etalab — extraction du ${dvf.date_extraction ? new Date(dvf.date_extraction).toLocaleDateString("fr-FR") : "—"}`, { italics: true, color: GREY, size: 18 }));
  }

  // 6. Historique & tendance
  if (result.historique_ventes || result.tendance_12_mois) {
    children.push(h1("Historique et tendance sur 12 mois"));
    if (result.historique_ventes) children.push(p(result.historique_ventes));
    if (result.tendance_12_mois) children.push(p(result.tendance_12_mois));
  }

  // 7. Méthodologie
  children.push(h1("Méthodologie d'estimation"));
  children.push(p(result.methode_estimation || "Croisement des transactions DVF (DGFiP/Etalab) avec les indicateurs Notaires-INSEE et pondération des critères propres au bien (état, DPE, étage, équipements, exposition)."));

  // 8. Argumentaire & conclusion
  children.push(h1("Argumentaire prix"));
  children.push(p(result.argumentaire_prix || ""));

  children.push(h1("Conclusion"));
  children.push(p(result.conclusion || ""));

  // Disclaimer
  children.push(p(" "));
  children.push(p("Estimation indicative basée sur les données publiques disponibles à la date d'édition. Ne se substitue pas à une expertise notariée.", { italics: true, color: GREY, size: 18, align: AlignmentType.CENTER }));

  const doc = new Document({
    creator: "ImmoGenius AI",
    title: `Estimation ${form.adresse}`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 4 } },
            children: [new TextRun({ text: "ImmoGenius AI — Rapport d'estimation", size: 18, color: NAVY, font: "Garamond", italics: true })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", size: 16, color: GREY }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GREY }),
              new TextRun({ text: " / ", size: 16, color: GREY }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GREY }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
