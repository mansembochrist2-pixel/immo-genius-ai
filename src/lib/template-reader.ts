/**
 * Lit le contenu texte d'un fichier template uploadé (PDF, DOCX, DOC, TXT).
 * Retourne le texte brut, prêt à être envoyé à l'IA pour servir de modèle.
 */
import mammoth from "mammoth";

export async function readTemplateFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt") {
    return await file.text();
  }

  if (ext === "docx" || ext === "doc") {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value || "";
    } catch (e) {
      console.error("DOCX parse error:", e);
      return "";
    }
  }

  if (ext === "pdf") {
    try {
      // Dynamic import: pdfjs is heavy, only load when needed
      const pdfjs = await import("pdfjs-dist");
      // Use the bundled worker (Vite handles this via ?url)
      // @ts-ignore - vite worker import
      const workerSrc = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ");
        fullText += text + "\n\n";
      }
      return fullText.trim();
    } catch (e) {
      console.error("PDF parse error:", e);
      return "";
    }
  }

  return "";
}
