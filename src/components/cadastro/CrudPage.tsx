import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "switch" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  full?: boolean;
  helper?: string;
}

export interface ColumnDef<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface CrudPageProps<T extends { id?: string }> {
  title: string;
  description: string;
  data: T[];
  loading?: boolean;
  fields: FieldDef[];
  columns: ColumnDef<T>[];
  empty: Partial<T>;
  searchKeys: (keyof T)[];
  onSave: (rec: Partial<T>) => Promise<unknown> | void;
  onDelete: (id: string) => Promise<unknown> | void;
}

export function CrudPage<T extends { id?: string; ativo?: boolean }>({
  title,
  description,
  data,
  loading,
  fields,
  columns,
  empty,
  searchKeys,
  onSave,
  onDelete,
}: CrudPageProps<T>) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<T>>(empty);
  const [q, setQ] = useState("");
  const [delId, setDelId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const t = q.toLowerCase();
    return data.filter((r) =>
      searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(t)),
    );
  }, [data, q, searchKeys]);

  const openNew = () => {
    setForm({ ...empty });
    setOpen(true);
  };
  const openEdit = (row: T) => {
    setForm({ ...row });
    setOpen(true);
  };

  const submit = async () => {
    await onSave(form);
    setOpen(false);
  };

  const set = (name: string, value: unknown) => setForm((f) => ({ ...f, [name]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> Novo
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="pl-9" />
      </div>

      <div className="rounded-lg border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key}>{c.label}</TableHead>
              ))}
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                  Nenhum registro.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((c) => (
                    <TableCell key={c.key}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "-")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDelId(row.id!)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar" : "Novo"} — {title}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const val = (form as Record<string, unknown>)[f.name];
              return (
                <div key={f.name} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
                  {f.type === "switch" ? (
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <Label>{f.label}</Label>
                      <Switch checked={Boolean(val)} onCheckedChange={(c) => set(f.name, c)} />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label>{f.label}</Label>
                      {f.type === "textarea" ? (
                        <Textarea
                          rows={4}
                          value={String(val ?? "")}
                          placeholder={f.placeholder}
                          onChange={(e) => set(f.name, e.target.value)}
                        />
                      ) : f.type === "select" ? (
                        <Select value={String(val ?? "")} onValueChange={(v) => set(f.name, v)}>
                          <SelectTrigger>
                            <SelectValue placeholder={f.placeholder ?? "Selecione"} />
                          </SelectTrigger>
                          <SelectContent>
                            {f.options?.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={f.type === "number" ? "number" : "text"}
                          value={String(val ?? "")}
                          placeholder={f.placeholder}
                          onChange={(e) =>
                            set(f.name, f.type === "number" ? Number(e.target.value) : e.target.value)
                          }
                        />
                      )}
                      {f.helper && <p className="text-xs text-muted-foreground">{f.helper}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (delId) await onDelete(delId);
                setDelId(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AtivoBadge({ ativo }: { ativo?: boolean }) {
  return ativo ? <Badge variant="default">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>;
}
