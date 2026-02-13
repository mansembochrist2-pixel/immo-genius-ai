import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, Check, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
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
  { key: "notes", label: "Notes" },
];

const AUTO_MAP: Record<string, string> = {
  nom: "nom", name: "nom", "full name": "nom", "nom complet": "nom", client: "nom", prospect: "nom",
  email: "email", "e-mail": "email", courriel: "email", mail: "email",
  telephone: "telephone", tel: "telephone", phone: "telephone", "téléphone": "telephone", mobile: "telephone", portable: "telephone",
  statut: "statut", status: "statut", état: "statut",
  source: "source", origine: "source",
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

const ImportCSV = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (res) => {
        if (res.data.length < 2) {
          toast.error("Le fichier est vide ou ne contient qu'un en-tête");
          return;
        }
        const allRows = res.data as string[][];
        const h = allRows[0];
        const dataRows = allRows.slice(1);
        setHeaders(h);
        setRows(dataRows);
        setMapping(autoDetectMapping(h));
        toast.success(`${dataRows.length} lignes détectées`);
      },
      error: () => toast.error("Erreur de lecture du fichier"),
    });
  }, []);

  const updateMapping = (colIndex: number, field: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      // Remove previous column mapped to this field
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

    const prospects = rows.map((row) => {
      const p: Record<string, string> = {};
      Object.entries(mapping).forEach(([colIdx, field]) => {
        if (field !== "ignore") p[field] = row[Number(colIdx)]?.trim() || "";
      });
      return p;
    }).filter((p) => p.nom);

    // Batch insert in chunks of 50
    for (let i = 0; i < prospects.length; i += 50) {
      const chunk = prospects.slice(i, i + 50).map((p) => ({
        nom: p.nom,
        email: p.email || null,
        telephone: p.telephone || null,
        statut: (["nouveau", "contacte", "visite", "offre", "signe", "perdu"].includes(p.statut) ? p.statut : "nouveau") as any,
        source: p.source || "csv",
        notes: p.notes || null,
        user_id: user!.id,
      }));
      const { error } = await supabase.from("prospects").insert(chunk);
      if (error) errors += chunk.length;
      else success += chunk.length;
    }

    setResult({ success, errors });
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ["prospects"] });
    if (success > 0) toast.success(`${success} prospects importés !`);
    if (errors > 0) toast.error(`${errors} erreurs lors de l'import`);
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><FileSpreadsheet className="h-6 w-6 text-accent" /> Import CSV</h1>
        <p className="page-subtitle">Importez vos prospects depuis un fichier CSV ou Excel exporté</p>
      </div>

      <div className="space-y-6">
        {/* Upload zone */}
        <Card>
          <CardContent className="py-8">
            <label className="flex flex-col items-center gap-3 cursor-pointer border-2 border-dashed border-border rounded-xl p-8 hover:border-accent transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Glissez votre fichier CSV ici ou cliquez pour parcourir</span>
              <span className="text-xs text-muted-foreground/60">.csv uniquement</span>
              <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            </label>
          </CardContent>
        </Card>

        {/* Mapping */}
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

              {/* Preview */}
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

        {/* Result */}
        {result && (
          <Card>
            <CardContent className="py-6 text-center">
              <Check className="h-10 w-10 text-green-500 mx-auto mb-2" />
              <p className="font-semibold">{result.success} prospects importés avec succès</p>
              {result.errors > 0 && <p className="text-sm text-destructive mt-1">{result.errors} erreurs</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default ImportCSV;
