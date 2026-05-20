/**
 * Export PDF (figé) + Word (éditable) du Dossier d'Expertise.
 */
import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
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
  const margin = 48;
  let y = margin;

  const ensure = (need: number) => {
    if (y + need > H - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const h1 = (txt: string) => {
    ensure(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(txt, margin, y);
    y += 22;
    doc.setDrawColor(200, 168, 76);
    doc.setLineWidth(1.2);
    doc.line(margin, y, margin + 60, y);
    y += 14;
  };

  const h2 = (txt: string) => {
    ensure(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(37, 99, 235);
    doc.text(txt, margin, y);
    y += 16;
  };

  const para = (txt?: string) => {
    if (!txt) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(txt, W - margin * 2);
    lines.forEach((ln: string) => {
      ensure(14);
      doc.text(ln, margin, y);
      y += 13;
    });
    y += 6;
  };

  const kv = (label: string, value: string) => {
    ensure(14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text(label, margin, y);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.text(value, W - margin, y, { align: "right" });
    y += 14;
  };

  // Couverture
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 120, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Dossier d'Expertise Immobilière", margin, 60);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("& Stratégie de Valorisation", margin, 82);
  doc.setFontSize(10);
  doc.setTextColor(200, 168, 76);
  doc.text(inputs.adresse || "—", margin, 104);
  y = 150;

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(10);
  doc.text(
    `Présenté par ${agent.nom || "votre conseiller"}${agent.agence ? " — " + agent.agence : ""}`,
    margin,
    y
  );
  y += 14;
  doc.text(`Date : ${new Date().toLocaleDateString("fr-FR")}`, margin, y);
  y += 24;

  // Synthèse
  h1("Synthèse exécutive");
  para(narrative.synthese_executive);

  // KPIs encadré
  ensure(140);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, W - margin * 2, 130, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, W - margin * 2, 130, "S");
  const colW = (W - margin * 2) / 3;
  const drawKpi = (col: number, label: string, value: string, sub?: string) => {
    const x = margin + col * colW + 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(label.toUpperCase(), x, y + 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(37, 99, 235);
    doc.text(value, x, y + 50);
    if (sub) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(sub, x, y + 68);
    }
  };
  drawKpi(0, "Rentabilité nette-nette", fmtPct(results.rentabilite_nette_nette), "Après fiscalité");
  drawKpi(1, "Cash-flow mensuel", fmtEur(results.cash_flow_mensuel), "Après crédit & impôts");
  drawKpi(2, "Prix recommandé", fmtEur(inputs.prix_acquisition), "Base de l'analyse");
  y += 140;

  // Analyse actuelle
  h1("Analyse du bien & marché local");
  para(narrative.analyse_actuelle);

  h2("Rentabilité actuelle");
  kv("Loyers annuels bruts", fmtEur(results.loyers_annuels_bruts));
  kv("Charges annuelles totales", fmtEur(results.charges_annuelles_totales));
  kv("Rentabilité brute", fmtPct(results.rentabilite_brute));
  kv("Rentabilité nette", fmtPct(results.rentabilite_nette));
  kv("Rentabilité nette-nette", fmtPct(results.rentabilite_nette_nette));
  kv("Impôt annuel estimé", fmtEur(results.impot_annuel_estime));
  y += 8;

  // Valorisation
  h1("Stratégie de valorisation (rénovation DPE)");
  para(narrative.analyse_valorisation);

  h2(`Simulation avant / après (DPE ${inputs.dpe} → ${inputs.dpe_cible})`);
  const compareRows: [string, string, string][] = [
    ["Prix d'acquisition total", fmtEur(results.prix_acquisition_total), fmtEur(results.post_travaux.prix_acquisition_total)],
    ["Loyers annuels bruts", fmtEur(results.loyers_annuels_bruts), fmtEur(results.post_travaux.loyers_annuels_bruts)],
    ["Charges annuelles", fmtEur(results.charges_annuelles_totales), fmtEur(results.post_travaux.charges_annuelles_totales)],
    ["Rentabilité brute", fmtPct(results.rentabilite_brute), fmtPct(results.post_travaux.rentabilite_brute)],
    ["Rentabilité nette", fmtPct(results.rentabilite_nette), fmtPct(results.post_travaux.rentabilite_nette)],
    ["Rentabilité nette-nette", fmtPct(results.rentabilite_nette_nette), fmtPct(results.post_travaux.rentabilite_nette_nette)],
    ["Cash-flow mensuel", fmtEur(results.cash_flow_mensuel), fmtEur(results.post_travaux.cash_flow_mensuel)],
  ];
  ensure(20 + compareRows.length * 16);
  const colA = margin, colB = margin + 220, colC = margin + 380;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text("Indicateur", colA, y);
  doc.text("Actuel", colB, y);
  doc.text("Optimisé", colC, y);
  y += 12;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, W - margin, y);
  y += 6;
  compareRows.forEach(([k, a, b]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(k, colA, y);
    doc.text(a, colB, y);
    doc.setTextColor(34, 139, 34);
    doc.setFont("helvetica", "bold");
    doc.text(b, colC, y);
    y += 14;
  });
  y += 8;

  // Financier
  h1("Analyse financière");
  para(narrative.analyse_financiere);
  kv("Apport", fmtEur(inputs.apport));
  kv("Capital emprunté", fmtEur(results.capital_emprunte));
  kv("Mensualité de crédit", fmtEur(results.mensualite_credit));
  kv("Coût total du crédit", fmtEur(results.cout_total_credit));

  // Plus-value
  h1("Projection à la revente");
  para(narrative.plus_value_revente);
  kv(`Prix de revente estimé à ${inputs.duree_detention_annees} ans`, fmtEur(results.prix_revente_estime));
  kv("Plus-value brute estimée", fmtEur(results.plus_value_estimee_apres_n_ans));
  kv("TRI simplifié", fmtPct(results.tri_simplifie));

  // Reco
  h1("Recommandation stratégique");
  para(narrative.recommandation_strategique);

  h1("Conclusion");
  para(narrative.conclusion);

  // Disclaimer légal (figé, non éditable)
  ensure(80);
  y += 6;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, W - margin, y);
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Mentions légales", margin, y);
  y += 12;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  const disclaimerLines = doc.splitTextToSize(
    "Les chiffres présentés constituent une simulation à titre indicatif, basée sur les données fournies et des sources publiques (DVF, INSEE, ADEME, observatoires des loyers, BOFIP). Ils ne valent ni conseil financier, ni conseil juridique, ni conseil fiscal certifié. Toute décision d'investissement doit être validée par un professionnel agréé (notaire, expert-comptable, conseiller en gestion de patrimoine).",
    W - margin * 2
  );
  disclaimerLines.forEach((ln: string) => {
    ensure(11);
    doc.text(ln, margin, y);
    y += 10;
  });


  // Footer
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Valorisation IA — Dossier confidentiel — ${new Date().toLocaleDateString("fr-FR")}`,
      margin,
      H - 20
    );
    doc.text(`${p}/${pages}`, W - margin, H - 20, { align: "right" });
  }

  const filename = `Expertise_${(inputs.adresse || "bien").replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.pdf`;
  doc.save(filename);
}

/* ============================ DOCX ============================ */

const docPara = (text: string, opts: Partial<{ bold: boolean; size: number; color: string; align: (typeof AlignmentType)[keyof typeof AlignmentType]; spaceAfter: number }> = {}) =>
  new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.spaceAfter ?? 120 },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        size: opts.size ?? 22,
        color: opts.color,
      }),
    ],
  });

const docH = (text: string, level: typeof HeadingLevel.HEADING_1 | typeof HeadingLevel.HEADING_2) =>
  new Paragraph({
    heading: level,
    spacing: { before: 280, after: 140 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: level === HeadingLevel.HEADING_1 ? 30 : 24,
        color: "2563EB",
      }),
    ],
  });

const cell = (text: string, opts: { bold?: boolean; bg?: string; widthPct?: number } = {}) =>
  new TableCell({
    width: { size: opts.widthPct ?? 33, type: WidthType.PERCENTAGE },
    shading: opts.bg
      ? { fill: opts.bg, type: ShadingType.CLEAR, color: "auto" }
      : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: opts.bold, size: 20 })],
      }),
    ],
  });

export async function exportExpertiseDocx(
  inputs: ExpertiseInputs,
  results: ExpertiseResults,
  narrative: NarrativeReport,
  agent: { nom?: string; agence?: string } = {}
) {
  const compareRows: [string, string, string][] = [
    ["Prix d'acquisition total", fmtEur(results.prix_acquisition_total), fmtEur(results.post_travaux.prix_acquisition_total)],
    ["Loyers annuels bruts", fmtEur(results.loyers_annuels_bruts), fmtEur(results.post_travaux.loyers_annuels_bruts)],
    ["Charges annuelles", fmtEur(results.charges_annuelles_totales), fmtEur(results.post_travaux.charges_annuelles_totales)],
    ["Rentabilité brute", fmtPct(results.rentabilite_brute), fmtPct(results.post_travaux.rentabilite_brute)],
    ["Rentabilité nette", fmtPct(results.rentabilite_nette), fmtPct(results.post_travaux.rentabilite_nette)],
    ["Rentabilité nette-nette", fmtPct(results.rentabilite_nette_nette), fmtPct(results.post_travaux.rentabilite_nette_nette)],
    ["Cash-flow mensuel", fmtEur(results.cash_flow_mensuel), fmtEur(results.post_travaux.cash_flow_mensuel)],
  ];

  const children: (Paragraph | Table)[] = [];

  // Couverture
  children.push(
    docPara("DOSSIER D'EXPERTISE IMMOBILIÈRE", { bold: true, size: 36, align: AlignmentType.CENTER, color: "0F172A", spaceAfter: 80 }),
    docPara("& Stratégie de Valorisation", { size: 26, align: AlignmentType.CENTER, color: "475569", spaceAfter: 200 }),
    docPara(inputs.adresse || "—", { bold: true, size: 24, align: AlignmentType.CENTER, color: "C8A96A", spaceAfter: 80 }),
    docPara(
      `Présenté par ${agent.nom || "votre conseiller"}${agent.agence ? " — " + agent.agence : ""}`,
      { size: 20, align: AlignmentType.CENTER, color: "666666" }
    ),
    docPara(`Date : ${new Date().toLocaleDateString("fr-FR")}`, { size: 18, align: AlignmentType.CENTER, color: "999999", spaceAfter: 400 })
  );

  children.push(docH("Synthèse exécutive", HeadingLevel.HEADING_1), docPara(narrative.synthese_executive || ""));

  children.push(docH("Analyse du bien & marché local", HeadingLevel.HEADING_1), docPara(narrative.analyse_actuelle || ""));

  children.push(
    docH(`Simulation avant / après (DPE ${inputs.dpe} → ${inputs.dpe_cible})`, HeadingLevel.HEADING_2)
  );

  // Tableau comparatif
  const headerRow = new TableRow({
    children: [
      cell("Indicateur", { bold: true, bg: "F1F5F9" }),
      cell("Scénario actuel", { bold: true, bg: "F1F5F9" }),
      cell("Scénario optimisé", { bold: true, bg: "F1F5F9" }),
    ],
  });
  const dataRows = compareRows.map(
    ([k, a, b]) =>
      new TableRow({
        children: [cell(k), cell(a), cell(b, { bold: true })],
      })
  );
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    })
  );

  children.push(
    docH("Stratégie de valorisation", HeadingLevel.HEADING_1),
    docPara(narrative.analyse_valorisation || ""),
    docH("Analyse financière", HeadingLevel.HEADING_1),
    docPara(narrative.analyse_financiere || ""),
    docPara(`Apport : ${fmtEur(inputs.apport)} — Capital emprunté : ${fmtEur(results.capital_emprunte)}`),
    docPara(
      `Mensualité de crédit : ${fmtEur(results.mensualite_credit)} sur ${inputs.duree_credit_annees} ans à ${fmtPct(inputs.taux_credit)} — Coût total : ${fmtEur(results.cout_total_credit)}`
    ),
    docH("Projection à la revente", HeadingLevel.HEADING_1),
    docPara(narrative.plus_value_revente || ""),
    docPara(
      `Prix de revente estimé à ${inputs.duree_detention_annees} ans : ${fmtEur(results.prix_revente_estime)} — Plus-value brute : ${fmtEur(results.plus_value_estimee_apres_n_ans)} — TRI simplifié : ${fmtPct(results.tri_simplifie)}`
    ),
    docH("Recommandation stratégique", HeadingLevel.HEADING_1),
    docPara(narrative.recommandation_strategique || ""),
    docH("Conclusion", HeadingLevel.HEADING_1),
    docPara(narrative.conclusion || ""),
    new Paragraph({
      spacing: { before: 360, after: 80 },
      border: { top: { color: "CCCCCC", space: 4, style: BorderStyle.SINGLE, size: 6 } },
      children: [new TextRun({ text: "Mentions légales", bold: true, size: 18, color: "555555" })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Les chiffres présentés constituent une simulation à titre indicatif, basée sur les données fournies et des sources publiques (DVF, INSEE, ADEME, observatoires des loyers, BOFIP). Ils ne valent ni conseil financier, ni conseil juridique, ni conseil fiscal certifié. Toute décision d'investissement doit être validée par un professionnel agréé (notaire, expert-comptable, conseiller en gestion de patrimoine).",
          italics: true,
          size: 16,
          color: "888888",
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 200 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Document généré par Valorisation — ${new Date().toLocaleDateString("fr-FR")}`,
          italics: true,
          size: 18,
          color: "999999",
        }),
      ],
    })

  );

  const doc = new Document({
    creator: "Valorisation IA",
    title: `Expertise — ${inputs.adresse}`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 } } },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Expertise_${(inputs.adresse || "bien").replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
