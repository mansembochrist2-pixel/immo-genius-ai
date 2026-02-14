import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, Check, AlertTriangle, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

const TARGET_FIELDS = [
  { key: "ignore", label: "— Ignorer —" },
  { key: "nom", label: "Nom" },
  { key: "email", label: "Email" },
  { key: "telephone", label: "Téléphone" },
  { key: "statut", label: "Statut" },
  { key: "source", label: "Source" },
  { key: "provenance", label: "Provenance" },
  { key: "notes", label: "Notes" },
];

const AUTO_MAP: Record<string, string> = {
  nom: "nom", name: "nom", "full name": "nom", "nom complet": "nom", client: "nom", prospect: "nom",
  email: "email", "e-mail": "email", courriel: "email", mail: "email",
  telephone: "telephone", tel: "telephone", phone: "telephone", "téléphone": "telephone", mobile: "telephone", portable: "telephone",
  statut: "statut", status: "statut", état: "statut",
  source: "source", origine: "source",
  provenance: "provenance",
  notes: "notes", commentaire: "notes", remarque: "notes", note: "notes",
};

function autoDetectMapping(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  const used = new Set<string>();
  headers.forEach((h, i) => {
    const key = AUTO_MAP[h.trim().toLowerCase()];
    if (key && !used.has(key)) {
      mapping[i] = key;
      used.add(key);
    }
  });
  return mapping;
}

function parseXlsx(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        resolve(rows.map(r => r.map(c => String(c))));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function downloadTemplate() {
  const csv = "Nom,Email,Téléphone,Statut,Source,Provenance,Notes\nJean Dupont,jean@example.com,+33 6 12 34 56 78,nouveau,site,Site web,Premier contact\nMarie Martin,marie@example.com,+33 7 98 76 54 32,contacte,recommandation,Recommandation,Intéressée T3";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template-prospects.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const ImportCSV = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: number; errors: number; duplicates: number } | null>(null);

  const processData = (allRows: string[][]) => {
    if (allRows.length < 2) {
      toast.error("Le fichier est vide ou ne contient qu'un en-tête");
      return;
    }
    const h = allRows[0];
    const dataRows = allRows.slice(1).filter(r => r.some(c => c.trim()));
    setHeaders(h);
    setRows(dataRows);
    setMapping(autoDetectMapping(h));
    toast.success(`${dataRows.length} lignes détectées`);
  };

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setFileName(file.name);

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      parseXlsx(file).then(processData).catch(() => toast.error("Erreur de lecture du fichier Excel"));
    } else {
      Papa.parse(file, {
        skipEmptyLines: true,
        complete: (res) => processData(res.data as string[][]),
        error: () => toast.error("Erreur de lecture du fichier CSV"),
      });
    }
  }, []);

  const updateMapping = (colIndex: number, field: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (field !== "ignore") {
        Object.entries(next).forEach(([k, v]) => { if (v === field) delete next[Number(k)]; });
      }
      if (field === "ignore") delete next[colIndex];
      else next[colIndex] = field;
      return next;
    });
  };

  const hasNom = Object.values(mapping).includes("nom");

  const importProspects = async () => {
    if (!hasNom) { toast.error("Vous devez mapper au moins la colonne 'Nom'"); return; }
    setImporting(true);
    let success = 0;
    let errors = 0;
    let duplicates = 0;

    const prospects = rows.map((row) => {
      const p: Record<string, string> = {};
      Object.entries(mapping).forEach(([colIdx, field]) => {
        if (field !== "ignore") p[field] = row[Number(colIdx)]?.trim() || "";
      });
      return p;
    }).filter((p) => p.nom);

    // Fetch existing emails/phones for dedup
    const { data: existing } = await supabase.from("prospects").select("email, telephone");
    const existingEmails = new Set((existing || []).map((e: any) => e.email?.toLowerCase()).filter(Boolean));
    const existingPhones = new Set((existing || []).map((e: any) => e.telephone?.replace(/\s/g, "")).filter(Boolean));

    const unique = prospects.filter((p) => {
      const emailLower = p.email?.toLowerCase();
      const phoneClean = p.telephone?.replace(/\s/g, "");
      if (emailLower && existingEmails.has(emailLower)) { duplicates++; return false; }
      if (phoneClean && existingPhones.has(phoneClean)) { duplicates++; return false; }
      // Also dedup within file
      if (emailLower) existingEmails.add(emailLower);
      if (phoneClean) existingPhones.add(phoneClean);
      return true;
    });

    for (let i = 0; i < unique.length; i += 50) {
      const chunk = unique.slice(i, i + 50).map((p) => ({
        nom: p.nom,
        email: p.email || null,
        telephone: p.telephone || null,
        statut: (["nouveau", "contacte", "visite", "offre", "signe", "perdu"].includes(p.statut) ? p.statut : "nouveau") as any,
        source: p.source || "import",
        provenance: p.provenance || null,
        notes: p.notes || null,
        user_id: user!.id,
      }));
      const { error } = await supabase.from("prospects").insert(chunk);
      if (error) errors += chunk.length;
      else success += chunk.length;
    }

    setResult({ success, errors, duplicates });
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ["prospects"] });
    queryClient.invalidateQueries({ queryKey: ["prospect-count"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-tasks"] });
    if (success > 0) toast.success(`${success} prospects importés !`);
    if (duplicates > 0) toast.info(`${duplicates} doublons ignorés`);
    if (errors > 0) toast.error(`${errors} erreurs lors de l'import`);
  };

  return (
    <AppLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><FileSpreadsheet className="h-6 w-6 text-accent" /> Import CSV / Excel</h1>
          <p className="page-subtitle">Importez vos prospects depuis un fichier CSV ou Excel</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" /> Télécharger le template
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="py-8">
            <label className="flex flex-col items-center gap-3 cursor-pointer border-2 border-dashed border-border rounded-xl p-8 hover:border-accent transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {fileName ? `📄 ${fileName}` : "Glissez votre fichier ici ou cliquez pour parcourir"}
              </span>
              <span className="text-xs text-muted-foreground/60">.csv, .xlsx, .xls</span>
              <input type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={handleFile} />
            </label>
          </CardContent>
        </Card>

        {headers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-sans font-semibold">Correspondance des colonnes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                {headers.map((h, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-xs font-medium truncate" title={h}>{h}</p>
                    <Select value={mapping[i] || "ignore"} onValueChange={(v) => updateMapping(i, v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TARGET_FIELDS.map((f) => (
                          <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {!hasNom && (
                <p className="text-sm text-destructive flex items-center gap-1 mb-4">
                  <AlertTriangle className="h-4 w-4" /> Veuillez mapper au moins une colonne sur "Nom"
                </p>
              )}

              <div className="rounded-lg border overflow-x-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h, i) => (
                        <TableHead key={i} className="text-xs whitespace-nowrap">
                          {mapping[i] ? <span className="text-accent">{TARGET_FIELDS.find((f) => f.key === mapping[i])?.label}</span> : <span className="text-muted-foreground line-through">{h}</span>}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className={`text-xs ${mapping[j] ? "" : "text-muted-foreground/50"}`}>{cell || "—"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 5 && <p className="text-xs text-muted-foreground mt-2">... et {rows.length - 5} autres lignes</p>}

              <Button className="w-full mt-4" onClick={importProspects} disabled={importing || !hasNom}>
                {importing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Import en cours...</> : <><Check className="h-4 w-4 mr-2" /> Importer {rows.length} prospects</>}
              </Button>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardContent className="py-6 text-center">
              <Check className="h-10 w-10 text-green-500 mx-auto mb-2" />
              <p className="font-semibold">{result.success} prospects importés avec succès</p>
              {result.duplicates > 0 && <p className="text-sm text-muted-foreground mt-1">{result.duplicates} doublons ignorés (email/téléphone déjà existant)</p>}
              {result.errors > 0 && <p className="text-sm text-destructive mt-1">{result.errors} erreurs</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default ImportCSV;
