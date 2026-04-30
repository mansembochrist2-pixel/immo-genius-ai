import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";

/**
 * Convertit un texte brut (mandat / annonce généré par l'IA) en .docx structuré.
 * Détecte les titres en MAJUSCULES, les puces (- / •) et les paragraphes vides.
 */
export async function exportTextToDocx(
  text: string,
  filename: string,
  meta?: { title?: string; subtitle?: string }
) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const children: Paragraph[] = [];

  if (meta?.title) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: meta.title, bold: true, size: 36 })],
      })
    );
  }
  if (meta?.subtitle) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        border: {
          bottom: { color: "CCCCCC", space: 1, style: BorderStyle.SINGLE, size: 6 },
        },
        children: [new TextRun({ text: meta.subtitle, italics: true, size: 22, color: "666666" })],
      })
    );
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      children.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun("")] }));
      continue;
    }

    // Heading: ALL CAPS line (>= 4 chars, no lowercase)
    if (line.length >= 4 && line === line.toUpperCase() && /[A-ZÀ-Ý]/.test(line) && !/^[-•●*]/.test(line)) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
          children: [new TextRun({ text: line, bold: true, size: 26 })],
        })
      );
      continue;
    }

    // Bullet
    if (/^[-•●*]\s+/.test(line)) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: line.replace(/^[-•●*]\s+/, ""), size: 22 })],
        })
      );
      continue;
    }

    // Numeric "1." prefix
    if (/^\d+[\.\)]\s+/.test(line)) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: line, size: 22 })],
        })
      );
      continue;
    }

    // Bold inline **text**
    const segments = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: segments.map(seg => {
          if (seg.startsWith("**") && seg.endsWith("**")) {
            return new TextRun({ text: seg.slice(2, -2), bold: true, size: 22 });
          }
          return new TextRun({ text: seg, size: 22 });
        }),
      })
    );
  }

  // Footer
  children.push(
    new Paragraph({
      spacing: { before: 600 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Document généré par Estate AI — ${new Date().toLocaleDateString("fr-FR")}`,
          italics: true,
          size: 18,
          color: "999999",
        }),
      ],
    })
  );

  const doc = new Document({
    creator: "Estate AI",
    title: meta?.title || filename,
    styles: {
      default: { document: { run: { font: "Calibri", size: 22 } } },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
