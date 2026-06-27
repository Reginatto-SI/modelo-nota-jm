import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Layout } from "@/components/Layout";
import { AtivoBadge } from "@/components/cadastro/CrudPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useModelos, useSaveModelo, useDeleteModelo, useCooperativas } from "@/lib/db";
import { TIPO_FRETE_DEFAULT, TIPO_FRETE_OPTIONS } from "@/lib/tipoFrete";
import { TEMPLATE_VARIABLE_GROUPS } from "@/lib/nota";
import type { ModeloNota } from "@/lib/types";
import { formatCurrencyBR, formatUnitValueBR, parseCurrencyBR, parseDecimalBR } from "@/lib/numberFormat";

const TEMPLATE_EXEMPLO =
  "Contrato: {{contrato}} / Vinculado: {{contrato_vinculado}} / Cliente: {{contrato_cliente}}\nProdutor: {{produtor_nome}} - CPF/CNPJ: {{produtor_cpf_cnpj}}\nProduto: {{produto}} - NCM: {{ncm}}\nQtd: {{quantidade}} KG x R$ {{valor_unitario}} = R$ {{valor_total}}\nPLACA CAVALO: {{placa_cavalo}}\nCND PRODUTOR NUM: {{cnd_produtor_numero}} COD.AUT: {{cnd_produtor_codigo_autenticacao}} VENC: {{cnd_produtor_vencimento}}";

// Variáveis disponíveis para o template de Dados Adicionais.
// Fonte única com o motor de renderização para evitar variável suportada mas escondida na tela.
const VARIAVEIS_DISPONIVEIS = TEMPLATE_VARIABLE_GROUPS;

type ModeloForm = Partial<ModeloNota> & { cooperativa_ids?: string[] };

const nullableDecimal = (value: string, parser = parseDecimalBR) => {
  const parsed = parser(value);
  return parsed != null && parsed > 0 ? parsed : null;
};

const EMPTY: ModeloForm = {
  ativo: true,
  tipo_destinatario: "cooperativa",
  cfop: "5118",
  tipo_frete_padrao: TIPO_FRETE_DEFAULT,
  cst_icms_padrao: "",
  quantidade_padrao: null,
  valor_unitario_padrao: null,
  valor_total_padrao: null,
  dados_adicionais_template: TEMPLATE_EXEMPLO,
  cooperativa_ids: [],
};

export default function ModelosNota() {
  const { data: coops = [] } = useCooperativas();
  const { data = [], isLoading } = useModelos();
  const save = useSaveModelo();
  const del = useDeleteModelo();

  const coopsAtivas = useMemo(() => coops.filter((c) => c.ativo), [coops]);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("dados");
  const [form, setForm] = useState<ModeloForm>(EMPTY);
  const [financeDraft, setFinanceDraft] = useState({ quantidade: "", valorUnitario: "", valorTotal: "" });
  const [q, setQ] = useState("");
  const [delId, setDelId] = useState<string | null>(null);

  const set = (name: keyof ModeloForm, value: unknown) => setForm((f) => ({ ...f, [name]: value }));

  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const t = q.toLowerCase();
    return data.filter(
      (r) =>
        r.cfop.toLowerCase().includes(t) || (r.nome_modelo ?? "").toLowerCase().includes(t),
    );
  }, [data, q]);

  const openNew = () => {
    setForm({ ...EMPTY });
    setFinanceDraft({ quantidade: "", valorUnitario: "", valorTotal: "" });
    setTab("dados");
    setOpen(true);
  };
  const openEdit = (row: ModeloNota) => {
    setForm({ ...row, cooperativa_ids: row.cooperativa_ids ?? [] });
    setFinanceDraft({
      quantidade: row.quantidade_padrao == null ? "" : String(row.quantidade_padrao),
      valorUnitario: row.valor_unitario_padrao == null ? "" : formatUnitValueBR(row.valor_unitario_padrao),
      valorTotal: row.valor_total_padrao == null ? "" : formatCurrencyBR(row.valor_total_padrao),
    });
    setTab("dados");
    setOpen(true);
  };

  const coopName = (id: string) => coops.find((c) => c.id === id)?.razao_social ?? "-";

  // Resumo das cooperativas liberadas para a grid.
  const resumoCoops = (ids: string[] = []) => {
    const validos = ids.filter((id) => coops.some((c) => c.id === id));
    if (validos.length === 0) return "—";
    if (coopsAtivas.length > 0 && coopsAtivas.every((c) => validos.includes(c.id))) return "Todas";
    if (validos.length <= 2) return validos.map(coopName).join(", ");
    return `${validos.length} cooperativas`;
  };

  const selecionadas = form.cooperativa_ids ?? [];
  const todasSelecionadas = coopsAtivas.length > 0 && coopsAtivas.every((c) => selecionadas.includes(c.id));

  const toggleCoop = (id: string, checked: boolean) =>
    set(
      "cooperativa_ids",
      checked ? [...selecionadas, id] : selecionadas.filter((x) => x !== id),
    );

  const toggleTodas = (checked: boolean) =>
    set("cooperativa_ids", checked ? coopsAtivas.map((c) => c.id) : []);

  const submit = async () => {
    // Validações: CFOP, nome e ao menos uma cooperativa liberada.
    if (!form.cfop?.trim()) {
      toast.error("Informe o CFOP do modelo.");
      setTab("dados");
      return;
    }
    if (!form.nome_modelo?.trim()) {
      toast.error("Informe o nome do modelo.");
      setTab("dados");
      return;
    }
    if (selecionadas.length === 0) {
      toast.error("Selecione ao menos uma cooperativa liberada.");
      setTab("cooperativas");
      return;
    }
    await save.mutateAsync(form);
    setOpen(false);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Modelos de Nota</h1>
            <p className="text-sm text-muted-foreground">
              Modelos CFOP 5118, 5923, 5132 e 5133 liberados para uma ou mais cooperativas.
            </p>
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
                <TableHead>CFOP</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Cooperativas liberadas</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Frete padrão</TableHead>
                <TableHead>CST ICMS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nenhum registro.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.cfop}</TableCell>
                    <TableCell>{row.nome_modelo}</TableCell>
                    <TableCell>{resumoCoops(row.cooperativa_ids)}</TableCell>
                    <TableCell>{row.tipo_destinatario}</TableCell>
                    <TableCell>{row.tipo_frete_padrao?.trim() || TIPO_FRETE_DEFAULT}</TableCell>
                    <TableCell>{row.cst_icms_padrao?.trim() || "-"}</TableCell>
                    <TableCell>
                      <AtivoBadge ativo={row.ativo} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDelId(row.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Modal modernizado em abas: Dados, Cooperativas liberadas e Dados adicionais. */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar" : "Novo"} — Modelo de Nota</DialogTitle>
            </DialogHeader>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dados">Dados do Modelo</TabsTrigger>
                <TabsTrigger value="financeiros">Dados financeiros</TabsTrigger>
                <TabsTrigger value="cooperativas">
                  Cooperativas{selecionadas.length > 0 ? ` (${selecionadas.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="adicionais">Dados adicionais</TabsTrigger>
              </TabsList>

              {/* Aba 1 — Dados do Modelo */}
              <TabsContent value="dados" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>CFOP</Label>
                  <Select value={String(form.cfop ?? "")} onValueChange={(v) => set("cfop", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {["5118", "5923", "5132", "5133"].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Tipo de Destinatário</Label>
                  <Select
                    value={String(form.tipo_destinatario ?? "")}
                    onValueChange={(v) => set("tipo_destinatario", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cooperativa">Cooperativa</SelectItem>
                      <SelectItem value="armazem_destinatario">Armazém / Destinatário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nome do Modelo</Label>
                  <Input
                    value={String(form.nome_modelo ?? "")}
                    onChange={(e) => set("nome_modelo", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Natureza da Operação</Label>
                  <Input
                    value={String(form.natureza_operacao ?? "")}
                    onChange={(e) => set("natureza_operacao", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Tipo de frete padrão</Label>
                  <Select
                    value={String(form.tipo_frete_padrao ?? "")}
                    onValueChange={(v) => set("tipo_frete_padrao", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPO_FRETE_OPTIONS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Valor inicial da prévia; o usuário ainda pode ajustar antes de gerar o PDF.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>CST ICMS padrão</Label>
                  <Input
                    value={String(form.cst_icms_padrao ?? "")}
                    onChange={(e) => set("cst_icms_padrao", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se vazio, o sistema usa a CST do produto.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label>Ativo</Label>
                  <Switch checked={Boolean(form.ativo)} onCheckedChange={(c) => set("ativo", c)} />
                </div>
              </TabsContent>


              {/* Aba 2 — Dados financeiros */}
              <TabsContent value="financeiros" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground sm:col-span-2">
                  <p className="font-medium text-foreground">Prioridade dos valores iniciais da prévia</p>
                  <p>Se o Valor total padrão for preenchido, ele tem prioridade e o sistema recalcula o valor unitário pela quantidade.</p>
                  <p>Se o Valor total padrão estiver vazio, mas o Valor unitário padrão estiver preenchido, o sistema calcula o total.</p>
                  <p>Se ambos estiverem vazios, o sistema usa o preço da saca do GRL019 dividido por 60.</p>
                </div>

                <div className="space-y-1.5">
                  <Label>Quantidade padrão (KG)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="Ex.: 30000"
                    value={financeDraft.quantidade}
                    onChange={(e) => {
                      setFinanceDraft((draft) => ({ ...draft, quantidade: e.target.value }));
                      set("quantidade_padrao", nullableDecimal(e.target.value));
                    }}
                    onBlur={() => setFinanceDraft((draft) => ({
                      ...draft,
                      quantidade: form.quantidade_padrao == null ? "" : String(form.quantidade_padrao),
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor inicial da prévia; se vazio, usa 30.000 KG.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Valor unitário padrão (R$/KG)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="Ex.: 0,70"
                    value={financeDraft.valorUnitario}
                    onChange={(e) => {
                      setFinanceDraft((draft) => ({ ...draft, valorUnitario: e.target.value }));
                      set("valor_unitario_padrao", nullableDecimal(e.target.value));
                    }}
                    onBlur={() => setFinanceDraft((draft) => ({
                      ...draft,
                      valorUnitario: form.valor_unitario_padrao == null ? "" : formatUnitValueBR(form.valor_unitario_padrao),
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Sugestão inicial; usada somente quando o valor total padrão estiver vazio.
                  </p>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Valor total padrão (R$)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="Ex.: 22500,00"
                    value={financeDraft.valorTotal}
                    onChange={(e) => {
                      setFinanceDraft((draft) => ({ ...draft, valorTotal: e.target.value }));
                      set("valor_total_padrao", nullableDecimal(e.target.value, parseCurrencyBR));
                    }}
                    onBlur={() => setFinanceDraft((draft) => ({
                      ...draft,
                      valorTotal: form.valor_total_padrao == null ? "" : formatCurrencyBR(form.valor_total_padrao),
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Sugestão inicial da prévia; quando preenchido, este valor tem prioridade sobre o valor unitário padrão.
                  </p>
                </div>
              </TabsContent>

              {/* Aba 3 — Cooperativas liberadas */}
              <TabsContent value="cooperativas" className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Selecione as cooperativas que podem usar este modelo.
                  </p>
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <Checkbox checked={todasSelecionadas} onCheckedChange={(c) => toggleTodas(Boolean(c))} />
                    Selecionar todas
                  </label>
                </div>
                <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
                  {coopsAtivas.length === 0 ? (
                    <p className="p-2 text-sm text-muted-foreground">Nenhuma cooperativa ativa cadastrada.</p>
                  ) : (
                    coopsAtivas.map((c) => (
                      <label
                        key={c.id}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
                      >
                        <Checkbox
                          checked={selecionadas.includes(c.id)}
                          onCheckedChange={(checked) => toggleCoop(c.id, Boolean(checked))}
                        />
                        <span className="text-sm">{c.razao_social}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selecionadas.length} cooperativa(s) selecionada(s). Obrigatório ao menos uma.
                </p>
              </TabsContent>

              {/* Aba 4 — Dados adicionais */}
              <TabsContent value="adicionais" className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Template de Dados Adicionais</Label>
                  <Textarea
                    rows={8}
                    value={String(form.dados_adicionais_template ?? "")}
                    onChange={(e) => set("dados_adicionais_template", e.target.value)}
                  />
                </div>
                <div className="rounded-md border p-3">
                  <p className="mb-2 text-xs font-medium text-foreground">Variáveis disponíveis</p>
                  <div className="space-y-2">
                    {VARIAVEIS_DISPONIVEIS.map((g) => (
                      <div key={g.grupo}>
                        <p className="text-xs text-muted-foreground">{g.grupo}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {g.itens.map((v) => (
                            <Badge key={v} variant="secondary" className="font-mono text-[11px]">
                              {v}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

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
                  if (delId) await del.mutateAsync(delId);
                  setDelId(null);
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
