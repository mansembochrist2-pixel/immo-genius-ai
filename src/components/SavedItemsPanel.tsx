import { useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Play, Search, FolderOpen, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Row {
  id: string;
  titre?: string | null;
  created_at: string;
  [k: string]: any;
}

interface Props<T extends Row> {
  title: string;
  /** Table name */
  table: string;
  /** React-query key */
  queryKey: string;
  /** Auth user id (required for the query to fire) */
  userId?: string;
  /** Build a display title fallback when row.titre is null */
  defaultTitle: (row: T) => string;
  /** Build a small subtitle line under the title */
  subtitle?: (row: T) => string;
  /** Build an optional right-side metric (e.g. "850 000 €") */
  rightMeta?: (row: T) => ReactNode;
  /** Called when the user clicks the "load" / play button */
  onLoad: (row: T) => void;
  /** Trigger button label */
  triggerLabel?: string;
  /** Trigger button variant */
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  /** Optional accent icon */
  triggerIcon?: ReactNode;
}

export function SavedItemsPanel<T extends Row>({
  title, table, queryKey, userId, defaultTitle, subtitle, rightMeta,
  onLoad, triggerLabel = "Mes sauvegardes", triggerVariant = "outline", triggerIcon,
}: Props<T>) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: [queryKey, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as T[];
    },
    enabled: !!userId && open,
  });

  const rename = useMutation({
    mutationFn: async ({ id, titre }: { id: string; titre: string }) => {
      const { error } = await supabase.from(table as any).update({ titre }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey, userId] });
      toast.success("Titre mis à jour");
      setEditingId(null);
    },
    onError: (e: any) => toast.error(e?.message || "Erreur"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey, userId] });
      toast.success("Supprimé");
    },
    onError: (e: any) => toast.error(e?.message || "Erreur"),
  });

  const filtered = items.filter((r) => {
    if (!search.trim()) return true;
    const t = (r.titre || defaultTitle(r) || "").toLowerCase();
    const s = subtitle ? subtitle(r).toLowerCase() : "";
    return t.includes(search.toLowerCase()) || s.includes(search.toLowerCase());
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={triggerVariant} size="sm" className="gap-2">
          {triggerIcon ?? <FolderOpen className="h-4 w-4" />}
          {triggerLabel}
          {items.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{items.length}</Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border/30">
          <SheetTitle className="text-base">{title}</SheetTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre, adresse…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {search ? "Aucun résultat" : "Aucune sauvegarde — créez votre première !"}
            </div>
          ) : (
            <TooltipProvider delayDuration={200}>
              {filtered.map((row) => {
                const displayTitle = row.titre || defaultTitle(row);
                const sub = subtitle ? subtitle(row) : new Date(row.created_at).toLocaleDateString("fr-FR");
                return (
                  <div
                    key={row.id}
                    className="group rounded-lg border border-border/40 bg-card/40 p-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {editingId === row.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="h-7 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") rename.mutate({ id: row.id, titre: editingValue.trim() });
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => rename.mutate({ id: row.id, titre: editingValue.trim() })}>
                              <Check className="h-3.5 w-3.5 text-success" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => setEditingId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm font-medium truncate">{displayTitle}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{sub}</p>
                      </div>
                      {rightMeta && <div className="shrink-0">{rightMeta(row)}</div>}
                    </div>

                    {editingId !== row.id && (
                      <div className="flex items-center gap-1 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="default" className="h-7 text-xs gap-1 flex-1"
                              onClick={() => { onLoad(row); setOpen(false); }}>
                              <Play className="h-3 w-3" /> Ouvrir
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Recharger sans rappel IA</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => { setEditingId(row.id); setEditingValue(row.titre || displayTitle); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Renommer</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive"
                              onClick={() => {
                                if (confirm("Supprimer cette sauvegarde ?")) remove.mutate(row.id);
                              }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Supprimer</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                );
              })}
            </TooltipProvider>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
