/**
 * Export PDF (figé) + Word (éditable) du Dossier d'Expertise.
 */
import jsPDF from "jspdf";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { ExpertiseInputs, ExpertiseResults } from "./expertise-calc";

export interface NarrativeReport {
  synthese_executive?: string;
  analyse_actuelle?: string;
  analyse_valorisation?: string;
  analyse_financiere?: string;
  plus_value_revente?: string;
  recommandation_strategique?: string;
  conclusion?: string;
}

const fmtEur = (n?: number) =>
  n == null || isNaN(n) ? "—" : `${Math.round(n).toLocaleString("fr-FR")} €`;
const fmtPct = (n?: number) =>
  n == null || isNaN(n) ? "—" : `${n.toFixed(2).replace(".", ",")} %`;
const cleanFilename = (value: string, ext: "pdf" | "docx") =>
  `Expertise_${(value || "bien").replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.${ext}`;

const LEGAL_DISCLAIMER =
  "Les chiffres présentés constituent une simulation à titre indicatif, basée sur les données fournies et des sources publiques (DVF, INSEE, ADEME, observatoires des loyers, BOFIP). Ils ne valent ni conseil financier, ni conseil juridique, ni conseil fiscal certifié. Toute décision d'investissement doit être validée par un professionnel agréé (notaire, expert-comptable, conseiller en gestion de patrimoine).";

const compareRows = (inputs: ExpertiseInputs, results: ExpertiseResults): [string, string, string][] => [
  ["Prix d'acquisition total", fmtEur(results.prix_acquisition_total), fmtEur(results.post_travaux.prix_acquisition_total)],
  ["Loyers annuels bruts", fmtEur(results.loyers_annuels_bruts), fmtEur(results.post_travaux.loyers_annuels_bruts)],
  ["Charges annuelles", fmtEur(results.charges_annuelles_totales), fmtEur(results.post_travaux.charges_annuelles_totales)],
  ["Rentabilité brute", fmtPct(results.rentabilite_brute), fmtPct(results.post_travaux.rentabilite_brute)],
  ["Rentabilité nette", fmtPct(results.rentabilite_nette), fmtPct(results.post_travaux.rentabilite_nette)],
  ["Rentabilité nette-nette", fmtPct(results.rentabilite_nette_nette), fmtPct(results.post_travaux.rentabilite_nette_nette)],
  ["Cash-flow mensuel", fmtEur(results.cash_flow_mensuel), fmtEur(results.post_travaux.cash_flow_mensuel)],
  [`Plus-value estimée à ${inputs.duree_detention_annees} ans`, fmtEur(results.plus_value_estimee_apres_n_ans), fmtEur(results.post_travaux.plus_value_estimee_apres_n_ans)],
];

/* ============================ PDF ============================ */

export function exportExpertisePDF(
  inputs: ExpertiseInputs,
  results: ExpertiseResults,
  narrative: NarrativeReport,
  agent: { nom?: string; agence?: string } = {}
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 46;
  const contentW = W - margin * 2;
  let y = margin;

  const ink = [15, 23, 42] as const;
  const muted = [100, 116, 139] as const;
  const border = [226, 232, 240] as const;
  const paper = [248, 250, 252] as const;
  const primary = [37, 99, 235] as const;
  const gold = [200, 169, 106] as const;
  const green = [22, 163, 74] as const;

  const setText = (rgb: readonly number[]) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setFill = (rgb: readonly number[]) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  const setStroke = (rgb: readonly number[]) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);

  const ensure = (need: number) => {
    if (y + need > H - 58) {
      doc.addPage();
      y = margin;
    }
  };

  const drawSectionTitle = (title: string, eyebrow?: string) => {
    ensure(58);
    if (eyebrow) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      setText(gold);
      doc.text(eyebrow.toUpperCase(), margin, y);
      y += 13;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    setText(ink);
    doc.text(title, margin, y);
    y += 10;
    setStroke(gold);
    doc.setLineWidth(1.4);
    doc.line(margin, y, margin + 74, y);
    y += 20;
  };

  const drawParagraph = (text?: string) => {
    if (!text?.trim()) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.2);
    doc.setLineHeightFactor(1.25);
    setText([51, 65, 85]);
    const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    paragraphs.forEach((paragraph) => {
      const lines = doc.splitTextToSize(paragraph, contentW);
      lines.forEach((line: string) => {
        ensure(15);
        doc.text(line, margin, y);
        y += 13.2;
      });
      y += 8;
    });
  };

  const drawKpiCard = (x: number, w: number, label: string, value: string, sub: string, accent: readonly number[] = primary) => {
    setFill([255, 255, 255]);
    doc.roundedRect(x, y, w, 86, 8, 8, "F");
    setStroke(border);
    doc.roundedRect(x, y, w, 86, 8, 8, "S");
    setFill(accent);
    doc.roundedRect(x + 12, y + 14, 4, 34, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.3);
    setText(muted);
    doc.text(label.toUpperCase(), x + 24, y + 24);
    doc.setFontSize(17);
    setText(accent);
    doc.text(value, x + 24, y + 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setText(muted);
    doc.text(doc.splitTextToSize(sub, w - 34), x + 24, y + 66);
  };

  const drawMetricRow = (label: string, value: string, highlight = false) => {
    ensure(24);
    setFill(highlight ? [239, 246, 255] : [255, 255, 255]);
    doc.rect(margin, y - 3, contentW, 22, "F");
    setStroke(border);
    doc.line(margin, y + 19, margin + contentW, y + 19);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    setText(muted);
    doc.text(label, margin + 10, y + 11);
    doc.setFont("helvetica", highlight ? "bold" : "normal");
    setText(highlight ? primary : ink);
    doc.text(value, margin + contentW - 10, y + 11, { align: "right" });
    y += 22;
  };

  const drawComparisonTable = () => {
    const rows = compareRows(inputs, results);
    const colW = [contentW * 0.46, contentW * 0.24, contentW * 0.3];
    ensure(38 + rows.length * 30);
    setFill(ink);
    doc.roundedRect(margin, y, contentW, 28, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.8);
    setText([255, 255, 255]);
    doc.text("Indicateur", margin + 12, y + 18);
    doc.text("Actuel", margin + colW[0] + 12, y + 18);
    doc.text("Optimisé", margin + colW[0] + colW[1] + 12, y + 18);
    y += 28;

    rows.forEach(([label, current, optimized], index) => {
      const rowH = 31;
      ensure(rowH + 4);
      setFill(index % 2 === 0 ? [255, 255, 255] : paper);
      doc.rect(margin, y, contentW, rowH, "F");
      setStroke(border);
      doc.line(margin, y + rowH, margin + contentW, y + rowH);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.2);
      setText([51, 65, 85]);
      doc.text(doc.splitTextToSize(label, colW[0] - 24), margin + 12, y + 19);
      setText(ink);
      doc.text(current, margin + colW[0] + colW[1] - 12, y + 19, { align: "right" });
      doc.setFont("helvetica", "bold");
      setText(green);
      doc.text(optimized, margin + contentW - 12, y + 19, { align: "right" });
      y += rowH;
    });
    y += 18;
  };

  const drawBar = (label: string, value: number, max: number, color: readonly number[]) => {
    const barW = contentW - 180;
    ensure(28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(muted);
    doc.text(label, margin, y + 10);
    setFill([226, 232, 240]);
    doc.roundedRect(margin + 130, y, barW, 10, 5, 5, "F");
    setFill(color);
    doc.roundedRect(margin + 130, y, Math.max(8, barW * Math.min(1, Math.max(0, value / max))), 10, 5, 5, "F");
    doc.setFont("helvetica", "bold");
    setText(ink);
    doc.text(fmtPct(value), margin + contentW, y + 10, { align: "right" });
    y += 24;
  };

  // Couverture
  setFill(ink);
  doc.rect(0, 0, W, 168, "F");
  setFill(gold);
  doc.rect(0, 0, 8, 168, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  setText([255, 255, 255]);
  doc.text("Dossier d'Expertise Immobilière", margin, 62);
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text("Stratégie de valorisation & rendement locatif", margin, 88);
  doc.setFontSize(10);
  setText([226, 232, 240]);
  doc.text(inputs.adresse || "Adresse non renseignée", margin, 116);
  setText(gold);
  doc.text(`Présenté par ${agent.nom || "votre conseiller"}${agent.agence ? " — " + agent.agence : ""}`, margin, 140);
  y = 198;

  drawSectionTitle("Synthèse exécutive", "rapport client");
  drawParagraph(narrative.synthese_executive);

  ensure(102);
  const gap = 12;
  const kpiW = (contentW - gap * 2) / 3;
  drawKpiCard(margin, kpiW, "Rentabilité nette-nette", fmtPct(results.rentabilite_nette_nette), "Après charges, crédit et fiscalité", primary);
  drawKpiCard(margin + kpiW + gap, kpiW, "Cash-flow mensuel", fmtEur(results.cash_flow_mensuel), "Flux net estimé chaque mois", results.cash_flow_mensuel >= 0 ? green : [220, 38, 38]);
  drawKpiCard(margin + (kpiW + gap) * 2, kpiW, "TRI simplifié", fmtPct(results.tri_simplifie), `Projection à ${inputs.duree_detention_annees} ans`, gold);
  y += 108;

  drawSectionTitle("Analyse du bien & marché local");
  drawParagraph(narrative.analyse_actuelle);
  drawMetricRow("Loyers annuels bruts", fmtEur(results.loyers_annuels_bruts));
  drawMetricRow("Charges annuelles totales", fmtEur(results.charges_annuelles_totales));
  drawMetricRow("Rentabilité brute", fmtPct(results.rentabilite_brute));
  drawMetricRow("Rentabilité nette", fmtPct(results.rentabilite_nette));
  drawMetricRow("Rentabilité nette-nette", fmtPct(results.rentabilite_nette_nette), true);
  y += 16;

  drawSectionTitle(`Simulation avant / après — DPE ${inputs.dpe} → ${inputs.dpe_cible}`);
  drawParagraph(narrative.analyse_valorisation);
  drawComparisonTable();

  drawSectionTitle("Lecture visuelle des rendements");
  const maxYield = Math.max(results.rentabilite_brute, results.rentabilite_nette, results.rentabilite_nette_nette, results.post_travaux.rentabilite_nette_nette, 1) * 1.25;
  drawBar("Brut actuel", results.rentabilite_brute, maxYield, primary);
  drawBar("Net actuel", results.rentabilite_nette, maxYield, gold);
  drawBar("Net-net actuel", results.rentabilite_nette_nette, maxYield, green);
  drawBar("Net-net optimisé", results.post_travaux.rentabilite_nette_nette, maxYield, [14, 165, 233]);
  y += 8;

  drawSectionTitle("Analyse financière");
  drawParagraph(narrative.analyse_financiere);
  drawMetricRow("Apport", fmtEur(inputs.apport));
  drawMetricRow("Capital emprunté", fmtEur(results.capital_emprunte));
  drawMetricRow("Mensualité de crédit", fmtEur(results.mensualite_credit));
  drawMetricRow("Coût total du crédit", fmtEur(results.cout_total_credit));
  drawMetricRow("Impôt annuel estimé", fmtEur(results.impot_annuel_estime), true);
  y += 16;

  drawSectionTitle("Projection à la revente");
  drawParagraph(narrative.plus_value_revente);
  drawMetricRow(`Prix de revente estimé à ${inputs.duree_detention_annees} ans`, fmtEur(results.prix_revente_estime));
  drawMetricRow("Capital restant dû", fmtEur(results.capital_restant_du_n));
  drawMetricRow("Impôt sur plus-value estimé", fmtEur(results.impot_plus_value_n));
  drawMetricRow("Plus-value brute estimée", fmtEur(results.plus_value_estimee_apres_n_ans), true);
  y += 16;

  drawSectionTitle("Recommandation stratégique");
  drawParagraph(narrative.recommandation_strategique);
  drawSectionTitle("Conclusion");
  drawParagraph(narrative.conclusion);

  ensure(92);
  setFill(paper);
  doc.roundedRect(margin, y, contentW, 82, 8, 8, "F");
  setStroke(border);
  doc.roundedRect(margin, y, contentW, 82, 8, 8, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText(ink);
  doc.text("Mentions légales", margin + 14, y + 18);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  setText(muted);
  doc.text(doc.splitTextToSize(LEGAL_DISCLAIMER, contentW - 28), margin + 14, y + 34);

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    setStroke(border);
    doc.line(margin, H - 38, W - margin, H - 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.6);
    setText(muted);
    doc.text(`Valorisation IA — Dossier confidentiel — ${new Date().toLocaleDateString("fr-FR")}`, margin, H - 22);
    doc.text(`${p}/${pages}`, W - margin, H - 22, { align: "right" });
  }

  doc.save(cleanFilename(inputs.adresse, "pdf"));
}

/* ============================ DOCX ============================ */

const TABLE_WIDTH = 10100;
const borders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
};

const docPara = (
  text: string,
  opts: Partial<{ bold: boolean; italics: boolean; size: number; color: string; align: (typeof AlignmentType)[keyof typeof AlignmentType]; after: number; before: number }> = {}
) =>
  new Paragraph({
    alignment: opts.align,
    spacing: { before: opts.before ?? 0, after: opts.after ?? 140, line: 300 },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italics,
        size: opts.size ?? 21,
        color: opts.color ?? "334155",
        font: "Arial",
      }),
    ],
  });

const docTextBlocks = (text?: string) =>
  (text || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => docPara(p));

const docH = (text: string, level: typeof HeadingLevel.HEADING_1 | typeof HeadingLevel.HEADING_2) =>
  new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 320 : 220, after: 140 },
    border: level === HeadingLevel.HEADING_1 ? { bottom: { color: "C8A96A", space: 6, style: BorderStyle.SINGLE, size: 8 } } : undefined,
    children: [
      new TextRun({
        text,
        bold: true,
        size: level === HeadingLevel.HEADING_1 ? 29 : 23,
        color: level === HeadingLevel.HEADING_1 ? "0F172A" : "2563EB",
        font: "Arial",
      }),
    ],
  });

const cell = (text: string, width: number, opts: { bold?: boolean; bg?: string; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) =>
  new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.bg ? { fill: opts.bg, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 110, bottom: 110, left: 140, right: 140 },
    children: [
      new Paragraph({
        alignment: opts.align,
        spacing: { after: 0, line: 260 },
        children: [new TextRun({ text, bold: opts.bold, color: opts.color ?? "334155", size: 19, font: "Arial" })],
      }),
    ],
  });

const kpiTable = (results: ExpertiseResults, inputs: ExpertiseInputs) =>
  new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [3366, 3367, 3367],
    rows: [
      new TableRow({
        children: [
          cell("Rentabilité nette-nette\n" + fmtPct(results.rentabilite_nette_nette), 3366, { bold: true, bg: "EFF6FF", color: "2563EB", align: AlignmentType.CENTER }),
          cell("Cash-flow mensuel\n" + fmtEur(results.cash_flow_mensuel), 3367, { bold: true, bg: results.cash_flow_mensuel >= 0 ? "F0FDF4" : "FEF2F2", color: results.cash_flow_mensuel >= 0 ? "16A34A" : "DC2626", align: AlignmentType.CENTER }),
          cell(`TRI à ${inputs.duree_detention_annees} ans\n` + fmtPct(results.tri_simplifie), 3367, { bold: true, bg: "FFFBEB", color: "B45309", align: AlignmentType.CENTER }),
        ],
      }),
    ],
  });

const comparisonTable = (inputs: ExpertiseInputs, results: ExpertiseResults) => {
  const widths = [4600, 2500, 3000];
  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        children: [
          cell("Indicateur", widths[0], { bold: true, bg: "0F172A", color: "FFFFFF" }),
          cell("Scénario actuel", widths[1], { bold: true, bg: "0F172A", color: "FFFFFF", align: AlignmentType.RIGHT }),
          cell("Scénario optimisé", widths[2], { bold: true, bg: "0F172A", color: "FFFFFF", align: AlignmentType.RIGHT }),
        ],
      }),
      ...compareRows(inputs, results).map(([label, current, optimized], index) =>
        new TableRow({
          children: [
            cell(label, widths[0], { bg: index % 2 === 0 ? "FFFFFF" : "F8FAFC" }),
            cell(current, widths[1], { bg: index % 2 === 0 ? "FFFFFF" : "F8FAFC", align: AlignmentType.RIGHT }),
            cell(optimized, widths[2], { bold: true, color: "16A34A", bg: index % 2 === 0 ? "FFFFFF" : "F8FAFC", align: AlignmentType.RIGHT }),
          ],
        })
      ),
    ],
  });
};

const metricTable = (rows: [string, string][]) => {
  const widths = [6200, 3900];
  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map(([label, value], index) =>
      new TableRow({
        children: [
          cell(label, widths[0], { bg: index % 2 === 0 ? "FFFFFF" : "F8FAFC" }),
          cell(value, widths[1], { bold: true, bg: index % 2 === 0 ? "FFFFFF" : "F8FAFC", align: AlignmentType.RIGHT }),
        ],
      })
    ),
  });
};

export async function exportExpertiseDocx(
  inputs: ExpertiseInputs,
  results: ExpertiseResults,
  narrative: NarrativeReport,
  agent: { nom?: string; agence?: string } = {}
) {
  const children: (Paragraph | Table)[] = [
    docPara("DOSSIER D'EXPERTISE IMMOBILIÈRE", { bold: true, size: 36, align: AlignmentType.CENTER, color: "0F172A", after: 70, before: 180 }),
    docPara("Stratégie de valorisation & rendement locatif", { size: 25, align: AlignmentType.CENTER, color: "475569", after: 190 }),
    docPara(inputs.adresse || "Adresse non renseignée", { bold: true, size: 23, align: AlignmentType.CENTER, color: "C8A96A", after: 90 }),
    docPara(`Présenté par ${agent.nom || "votre conseiller"}${agent.agence ? " — " + agent.agence : ""}`, { size: 19, align: AlignmentType.CENTER, color: "64748B", after: 40 }),
    docPara(`Date : ${new Date().toLocaleDateString("fr-FR")}`, { size: 18, align: AlignmentType.CENTER, color: "64748B", after: 360 }),
    docH("Synthèse exécutive", HeadingLevel.HEADING_1),
    ...docTextBlocks(narrative.synthese_executive),
    kpiTable(results, inputs),
    docH("Analyse du bien & marché local", HeadingLevel.HEADING_1),
    ...docTextBlocks(narrative.analyse_actuelle),
    metricTable([
      ["Loyers annuels bruts", fmtEur(results.loyers_annuels_bruts)],
      ["Charges annuelles totales", fmtEur(results.charges_annuelles_totales)],
      ["Rentabilité brute", fmtPct(results.rentabilite_brute)],
      ["Rentabilité nette", fmtPct(results.rentabilite_nette)],
      ["Rentabilité nette-nette", fmtPct(results.rentabilite_nette_nette)],
    ]),
    docH(`Simulation avant / après — DPE ${inputs.dpe} → ${inputs.dpe_cible}`, HeadingLevel.HEADING_1),
    ...docTextBlocks(narrative.analyse_valorisation),
    comparisonTable(inputs, results),
    docH("Analyse financière", HeadingLevel.HEADING_1),
    ...docTextBlocks(narrative.analyse_financiere),
    metricTable([
      ["Apport", fmtEur(inputs.apport)],
      ["Capital emprunté", fmtEur(results.capital_emprunte)],
      ["Mensualité de crédit", fmtEur(results.mensualite_credit)],
      ["Coût total du crédit", fmtEur(results.cout_total_credit)],
      ["Impôt annuel estimé", fmtEur(results.impot_annuel_estime)],
    ]),
    docH("Projection à la revente", HeadingLevel.HEADING_1),
    ...docTextBlocks(narrative.plus_value_revente),
    metricTable([
      [`Prix de revente estimé à ${inputs.duree_detention_annees} ans`, fmtEur(results.prix_revente_estime)],
      ["Capital restant dû", fmtEur(results.capital_restant_du_n)],
      ["Impôt sur plus-value estimé", fmtEur(results.impot_plus_value_n)],
      ["Plus-value brute estimée", fmtEur(results.plus_value_estimee_apres_n_ans)],
      ["TRI simplifié", fmtPct(results.tri_simplifie)],
    ]),
    docH("Recommandation stratégique", HeadingLevel.HEADING_1),
    ...docTextBlocks(narrative.recommandation_strategique),
    docH("Conclusion", HeadingLevel.HEADING_1),
    ...docTextBlocks(narrative.conclusion),
    docPara("Mentions légales", { bold: true, size: 18, color: "0F172A", before: 320, after: 80 }),
    docPara(LEGAL_DISCLAIMER, { italics: true, size: 16, color: "64748B", after: 220 }),
  ];

  const doc = new Document({
    creator: "Valorisation IA",
    title: `Expertise — ${inputs.adresse}`,
    description: "Dossier client d'expertise immobilière et stratégie de valorisation",
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 21, color: "334155" },
          paragraph: { spacing: { line: 300 } },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 29, bold: true, font: "Arial", color: "0F172A" },
          paragraph: { spacing: { before: 320, after: 140 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 23, bold: true, font: "Arial", color: "2563EB" },
          paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 900, right: 900, bottom: 900, left: 900 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "Valorisation IA — Dossier confidentiel — Page ", size: 16, color: "94A3B8", font: "Arial" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "94A3B8", font: "Arial" }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = cleanFilename(inputs.adresse, "docx");
  a.click();
  URL.revokeObjectURL(url);
}
