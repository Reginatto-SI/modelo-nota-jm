import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Eye, FileSpreadsheet, HelpCircle, MoreHorizontal, Pencil, RefreshCw, Save, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clearRft006Report, loadRft006Report, saveRft006Report } from "@/lib/idb";
import { parseRft006, type Rft006ImportDiagnostics, type Rft006NotaGroup, type Rft006Report } from "@/lib/rft006";
import { EMPTY_RFT006_FILTERS, filterRft006Notas, getRft006NotaLiquidTotal, RFT006_SITUACOES, summarizeRft006, type Rft006Filters } from "@/lib/rft006View";
import { useArmazens, useRft006Config, useSaveRft006Config } from "@/lib/db";
import type { NotaParty } from "@/lib/nota";
import { buildRft006Nota, generateFixedRft006Pdf } from "@/lib/rft006Nota";
import { armazemToNotaParty, canSaveRft006Default, initializeRft006Config, isValidRft006Recipient, selectRegisteredRft006Recipient, startManualRft006Recipient } from "@/lib/rft006Config";
import { getRft006FixedGenerationConfig } from "@/lib/rft006FixedDefaults";
import { generatePdf } from "@/lib/pdf";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 });

export default function Rft006() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<Rft006Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Rft006Report | null>(null);
  const [diagnostics, setDiagnostics] = useState<Rft006ImportDiagnostics | null>(null);
  const [details, setDetails] = useState<Rft006NotaGroup | null>(null);
  const [generating, setGenerating] = useState<Rft006NotaGroup | null>(null);
  const [generatingPdfNota, setGeneratingPdfNota] = useState<string | null>(null);
  const generatingPdfRef = useRef<string | null>(null);
  const [destinatarioId, setDestinatarioId] = useState<string | null>(null);
  const [destinatario, setDestinatario] = useState<NotaParty | null>(null);
  const [destinatarioMode, setDestinatarioMode] = useState<"cadastro" | "manual">("cadastro");
  const [cfop, setCfop] = useState("");
  const [natureza, setNatureza] = useState("");
  const [cst, setCst] = useState("");
  const [dadosAdicionais, setDadosAdicionais] = useState("");
  const [destinatarioBusca, setDestinatarioBusca] = useState("");
  const [defaultLoaded, setDefaultLoaded] = useState(false);
  const [destinatarioNeedsReselection, setDestinatarioNeedsReselection] = useState(false);
  const [generationConfigReady, setGenerationConfigReady] = useState(false);
  const [filters, setFilters] = useState<Rft006Filters>({ ...EMPTY_RFT006_FILTERS });
  const configInitialized = useRef(false);
  const { data: armazens = [], isLoading: loadingArmazens } = useArmazens(!!generating);
  const { data: config, isFetched: configFetched, isError: configError } = useRft006Config();
  const saveConfig = useSaveRft006Config();

  useEffect(() => {
    // O RFT006 e carregado somente da store local propria; nenhum cadastro/backend participa deste fluxo.
    loadRft006Report().then((saved) => setReport(saved ?? null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!generating || configInitialized.current || (!configFetched && !configError) || loadingArmazens) return;
    configInitialized.current = true;

    // O ref impede reaplicação por refetch/cache depois que os controles forem liberados.
    const loadedConfig = configError ? null : config;
    const applied = initializeRft006Config(loadedConfig, armazens);
    setDestinatarioId(applied.destinatarioId);
    setDestinatario(applied.destinatario);
    setDestinatarioMode("cadastro");
    setCfop(applied.cfop);
    setNatureza(applied.naturezaOperacao);
    setCst(applied.cst);
    setDadosAdicionais(applied.dadosAdicionaisTemplate);
    setDefaultLoaded(Boolean(loadedConfig));
    setDestinatarioNeedsReselection(applied.destinatarioNeedsReselection);
    setGenerationConfigReady(true);
    if (configError) toast.warning("Não foi possível carregar a configuração padrão. Preencha os dados manualmente.");
  }, [armazens, config, configError, configFetched, generating, loadingArmazens]);

  const persist = async (next: Rft006Report) => {
    await saveRft006Report(next);
    setReport(next);
    setDiagnostics(null);
    toast.success(`RFT006 importado: ${next.rows.length} linhas em ${next.notas.length} Notas.`);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    const result = await parseRft006(file);
    setBusy(false);
    if (!result.report) {
      setDiagnostics(result.diagnostics);
      toast.error(result.error ?? "Não foi possível importar o RFT006.");
      return;
    }
    if (report) setPending(result.report);
    else await persist(result.report);
  };

  const summary = report ? summarizeRft006(report) : null;
  // O memo opera somente sobre as Notas já agrupadas, sem reler as linhas do Excel.
  const filteredNotas = useMemo(() => report ? filterRft006Notas(report.notas, filters) : [], [filters, report]);
  const hasFilters = Object.entries(filters).some(([key, value]) => value !== EMPTY_RFT006_FILTERS[key as keyof Rft006Filters]);
  const clearFilters = () => setFilters({ ...EMPTY_RFT006_FILTERS });
  const startGeneration = (nota: Rft006NotaGroup) => {
    // Padrão operacional temporário tem precedência sobre o padrão persistido, mas continua editável nesta geração.
    configInitialized.current = true;
    setGenerationConfigReady(true);
    setGenerating(nota);
    setDestinatarioId(null);
    const fixedConfig = getRft006FixedGenerationConfig();
    setDestinatario(fixedConfig.destinatario);
    setDestinatarioMode("manual");
    setDestinatarioBusca("");
    setCfop(fixedConfig.cfop);
    setNatureza(fixedConfig.naturezaOperacao);
    setCst(fixedConfig.cst);
    setDadosAdicionais(fixedConfig.dadosAdicionais);
    setDefaultLoaded(false);
    setDestinatarioNeedsReselection(false);
  };

  const generateDirectPdf = (group: Rft006NotaGroup) => {
    if (generatingPdfRef.current === group.nota) return;
    generatingPdfRef.current = group.nota;
    setGeneratingPdfNota(group.nota);

    // O helper mantém builder, validação, renderer e nome de arquivo idênticos aos usados pela prévia.
    const error = generateFixedRft006Pdf(group, generatePdf);
    if (error) toast.error(error);
    else toast.success(`PDF da Nota ${group.nota} gerado.`);

    // Mantém a trava até o próximo ciclo de eventos, cobrindo o segundo clique de um duplo clique.
    window.setTimeout(() => {
      generatingPdfRef.current = null;
      setGeneratingPdfNota(null);
    }, 0);
  };

  const validateGenerationFields = () => {
    if (!isValidRft006Recipient(destinatario) || !cfop.trim() || !natureza.trim() || !cst.trim()) {
      toast.error("Preencha nome e CPF/CNPJ do destinatário, CFOP, natureza da operação e CST.");
      return false;
    }
    return true;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          {/* Título visual acompanha o rótulo compacto do menu; o relatório continua tecnicamente RFT006. */}
          <h1 className="text-2xl font-bold">RFT 6 — Gerar modelo</h1>
          <p className="text-sm text-muted-foreground">Importe o relatório, confira as Notas agrupadas e seus diagnósticos. Os dados ficam somente neste navegador.</p>
        </div>

        <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); event.target.value = ""; }} />
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <FileSpreadsheet className="h-12 w-12 text-primary" />
            <div><p className="font-medium">Selecione o arquivo Excel do relatório RFT006</p><p className="text-sm text-muted-foreground">Formatos aceitos: .xlsx, .xls</p></div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => inputRef.current?.click()} disabled={busy || loading}>{report ? <RefreshCw className="mr-1 h-4 w-4" /> : <Upload className="mr-1 h-4 w-4" />}{busy ? "Lendo..." : report ? "Substituir relatório" : "Importar arquivo"}</Button>
              {report && <Button variant="outline" onClick={async () => { await clearRft006Report(); setReport(null); setDiagnostics(null); toast.success("RFT006 removido deste navegador."); }}><Trash2 className="mr-1 h-4 w-4" /> Limpar</Button>}
              {/* Tutorial contextual reutiliza o dialog padrão sem interferir no fluxo de importação. */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline"><HelpCircle className="mr-1 h-4 w-4" /> Tutorial</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-5xl">
                  <DialogHeader>
                    <DialogTitle>Tutorial do relatório RFT006</DialogTitle>
                    <DialogDescription>Confira os filtros que devem ser aplicados no sistema antes de exportar o relatório.</DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-center overflow-auto rounded-md border bg-muted/30 p-2">
                    <img src="/RFT006_Filtros_Tutorial.png" alt="Filtros para exportar o relatório RFT006" className="h-auto max-w-full rounded object-contain" />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button type="button">Fechar</Button></DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {diagnostics && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Estrutura do RFT006 inválida</AlertTitle><AlertDescription><p>{diagnostics.diagnostics.map((item) => item.message).join(" ")}</p><p className="mt-1 text-xs">Arquivo: {diagnostics.fileName} · Aba: {diagnostics.sheetName ?? "não identificada"} · Cabeçalho: {diagnostics.headerRow ?? "não identificado"}</p></AlertDescription></Alert>}

        {report && summary && <>
          <Card className="shadow-card"><CardHeader><CardTitle className="text-base">Resumo da importação</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Info label="Arquivo" value={report.fileName} /><Info label="Importado em" value={new Date(report.importedAt).toLocaleString("pt-BR")} /><Info label="Linhas" value={String(summary.linhas)} /><Info label="Notas" value={String(summary.notas)} /><Info label="Prontas" value={String(summary.prontas)} tone="success" /><Info label="Não elegíveis" value={String(summary.naoElegiveis)} tone="warning" /><Info label="Com inconsistência" value={String(summary.inconsistentes)} tone="error" /><Info label="Diagnósticos" value={String(summary.diagnosticos)} />
          </CardContent></Card>

          <Card className="shadow-card"><CardHeader className="space-y-4"><CardTitle className="text-base">Notas do relatório</CardTitle><div className="space-y-3"><div className="grid gap-3 md:grid-cols-[minmax(260px,1.5fr)_minmax(190px,0.8fr)_minmax(150px,0.6fr)] md:items-end"><div className="space-y-1.5"><Label htmlFor="rft006-search">Pesquisar</Label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="rft006-search" className="pl-9" placeholder="Pesquisar nota, emitente, CPF/CNPJ ou IE" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} /></div></div><div className="space-y-1.5"><Label>Situação</Label><Select value={filters.situacao} onValueChange={(value) => setFilters((current) => ({ ...current, situacao: value as Rft006Filters["situacao"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas</SelectItem>{Object.entries(RFT006_SITUACOES).map(([value, config]) => <SelectItem key={value} value={value}>{config.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Itens</Label><Select value={filters.items} onValueChange={(value) => setFilters((current) => ({ ...current, items: value as Rft006Filters["items"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="um">1 item</SelectItem><SelectItem value="mais_de_um">Mais de 1 item</SelectItem></SelectContent></Select></div></div><div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[minmax(180px,0.7fr)_minmax(180px,0.7fr)_auto_1fr] md:items-end"><FilterValueInput id="rft006-min" label="Valor líquido mínimo" value={filters.minValue} onChange={(minValue) => setFilters((current) => ({ ...current, minValue }))} /><FilterValueInput id="rft006-max" label="Valor líquido máximo" value={filters.maxValue} onChange={(maxValue) => setFilters((current) => ({ ...current, maxValue }))} /><Button variant="outline" onClick={clearFilters} disabled={!hasFilters}>Limpar filtros</Button><p className="pb-2 text-sm text-muted-foreground md:text-right">{hasFilters ? `${filteredNotas.length} de ${report.notas.length} Notas exibidas` : `${report.notas.length} Notas exibidas`}</p></div></div></CardHeader><CardContent className="p-0">{filteredNotas.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nota</TableHead><TableHead>Razão Social do emitente</TableHead><TableHead>CPF/CNPJ</TableHead><TableHead>IE</TableHead><TableHead className="text-right">Itens</TableHead><TableHead className="text-right">Valor líquido</TableHead><TableHead>Situação</TableHead><TableHead className="whitespace-nowrap text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
            {filteredNotas.map((nota) => <TableRow key={nota.nota}><TableCell className="font-semibold">{nota.nota}</TableCell><TableCell>{nota.emitente.razaoSocial || "—"}</TableCell><TableCell>{nota.emitente.cnpj || "—"}</TableCell><TableCell>{nota.emitente.ie || "—"}</TableCell><TableCell className="text-right">{nota.items.length}</TableCell><TableCell className="text-right">{currency.format(getRft006NotaLiquidTotal(nota))}</TableCell><TableCell><StatusBadge status={nota.situacao} /></TableCell><TableCell><div className="flex items-center justify-end gap-1 whitespace-nowrap">{nota.situacao === "pronto" && <Button size="sm" disabled={generatingPdfNota === nota.nota} onClick={() => generateDirectPdf(nota)}>{generatingPdfNota === nota.nota ? "Gerando..." : "Gerar PDF"}</Button>}<DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label={`Mais ações da Nota ${nota.nota}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{/* Ações secundárias preservam os mesmos handlers homologados da tabela. */}{nota.situacao === "pronto" && <DropdownMenuItem onSelect={() => startGeneration(nota)}><Pencil className="mr-2 h-4 w-4" />Revisar modelo</DropdownMenuItem>}<DropdownMenuItem onSelect={() => setDetails(nota)}><Eye className="mr-2 h-4 w-4" />Visualizar detalhes</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></TableCell></TableRow>)}
          </TableBody></Table></div> : <div className="flex flex-col items-center gap-3 px-4 py-10 text-center"><p className="text-sm text-muted-foreground">Nenhuma Nota encontrada com os filtros informados.</p><Button variant="outline" size="sm" onClick={clearFilters}>Limpar filtros</Button></div>}</CardContent></Card>
        </>}
      </div>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Substituir RFT006 importado?</AlertDialogTitle><AlertDialogDescription>Já existe um relatório RFT006 salvo neste navegador. A substituição removerá somente esse relatório e não altera o GRL019.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (pending) void persist(pending); setPending(null); }}>Substituir relatório</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <NotaDetails nota={details} onOpenChange={(open) => !open && setDetails(null)} />
      <GenerationDialog
        nota={generating} armazens={armazens} loading={loadingArmazens} configReady={generationConfigReady} busca={destinatarioBusca} onBusca={setDestinatarioBusca}
        destinatarioMode={destinatarioMode} onDestinatarioMode={(mode) => { setDestinatarioMode(mode); if (mode === "manual") { const selection = startManualRft006Recipient(); setDestinatarioId(selection.destinatarioId); setDestinatario(selection.destinatario); } else { setDestinatarioId(null); setDestinatario(null); } setDestinatarioNeedsReselection(false); }}
        destinatarioId={destinatarioId} destinatario={destinatario} onDestinatario={(id, party) => { const selection = selectRegisteredRft006Recipient(id, party); setDestinatarioId(selection.destinatarioId); setDestinatario(selection.destinatario); setDestinatarioNeedsReselection(false); }} onManualDestinatario={setDestinatario} cfop={cfop} onCfop={setCfop} natureza={natureza} onNatureza={setNatureza}
        cst={cst} onCst={setCst} dadosAdicionais={dadosAdicionais} onDadosAdicionais={setDadosAdicionais}
        defaultLoaded={defaultLoaded} destinatarioNeedsReselection={destinatarioNeedsReselection} savingDefault={saveConfig.isPending}
        onSaveDefault={() => {
          if (!canSaveRft006Default(destinatarioId)) return toast.error("Para salvar como padrão, selecione um destinatário cadastrado.");
          if (!validateGenerationFields()) return;
          saveConfig.mutate({ destinatarioId, cfop, naturezaOperacao: natureza, cst, dadosAdicionaisTemplate: dadosAdicionais });
        }}
        onClose={() => setGenerating(null)} onGenerate={() => {
          if (!generating || !validateGenerationFields()) return;
          const nota = buildRft006Nota(generating, { destinatario, cfop, naturezaOperacao: natureza, cst, dadosAdicionais });
          navigate("/preview", { state: { notas: [nota], warnings: [] } });
        }}
      />
    </Layout>
  );
}

function GenerationDialog(props: { nota: Rft006NotaGroup | null; armazens: import("@/lib/types").Armazem[]; loading: boolean; configReady: boolean; busca: string; onBusca: (v: string) => void; destinatarioMode: "cadastro" | "manual"; onDestinatarioMode: (mode: "cadastro" | "manual") => void; destinatarioId: string | null; destinatario: NotaParty | null; onDestinatario: (id: string, v: NotaParty) => void; onManualDestinatario: (v: NotaParty) => void; cfop: string; onCfop: (v: string) => void; natureza: string; onNatureza: (v: string) => void; cst: string; onCst: (v: string) => void; dadosAdicionais: string; onDadosAdicionais: (v: string) => void; defaultLoaded: boolean; destinatarioNeedsReselection: boolean; savingDefault: boolean; onSaveDefault: () => void; onClose: () => void; onGenerate: () => void }) {
  const filtered = useMemo(() => {
    const q = props.busca.toLocaleLowerCase("pt-BR").trim();
    return props.armazens.filter((item) => item.ativo !== false && (!q || [item.razao_social, item.cnpj_cpf, item.municipio].some((value) => value?.toLocaleLowerCase("pt-BR").includes(q))));
  }, [props.armazens, props.busca]);
  const manual = props.destinatario ?? startManualRft006Recipient().destinatario!;
  return <Dialog open={!!props.nota} onOpenChange={(open) => !open && props.onClose()}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Configurar modelo da Nota {props.nota?.nota}</DialogTitle><DialogDescription>Alterações feitas aqui valem somente para esta geração, salvo se você clicar em “Salvar como padrão”.</DialogDescription></DialogHeader><div className="space-y-4">{!props.configReady && <p className="text-sm text-muted-foreground">Carregando configuração padrão...</p>}{props.defaultLoaded && <p className="text-xs text-muted-foreground">Configuração padrão carregada</p>}<div className="space-y-2"><Label>Destinatário</Label><div className="flex gap-2"><Button type="button" size="sm" variant={props.destinatarioMode === "cadastro" ? "default" : "outline"} onClick={() => props.onDestinatarioMode("cadastro")}>Selecionar do cadastro</Button><Button type="button" size="sm" variant={props.destinatarioMode === "manual" ? "default" : "outline"} onClick={() => props.onDestinatarioMode("manual")}>Preencher manualmente</Button></div>{props.destinatarioMode === "cadastro" ? <><Input disabled={!props.configReady} placeholder="Pesquisar nome, CPF/CNPJ ou município" value={props.busca} onChange={(e) => props.onBusca(e.target.value)} /><div className="max-h-40 overflow-auto rounded-md border">{props.loading ? <p className="p-3 text-sm text-muted-foreground">Carregando...</p> : filtered.map((item) => <button type="button" disabled={!props.configReady} key={item.id} onClick={() => props.onDestinatario(item.id, armazemToNotaParty(item))} className={`block w-full border-b p-2 text-left text-sm last:border-0 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${props.destinatarioId === item.id ? "bg-muted" : ""}`}><span className="font-medium">{item.razao_social}</span><span className="ml-2 text-muted-foreground">{item.cnpj_cpf || "sem CPF/CNPJ"}</span></button>)}</div>{props.destinatario && <p className="text-sm text-primary">Selecionado: {props.destinatario.nome}</p>}{props.destinatarioNeedsReselection && <p className="text-sm text-warning">O destinatário padrão não está disponível ou está inativo. Selecione-o novamente.</p>}</> : <><div className="grid gap-3 sm:grid-cols-2"><Field disabled={!props.configReady} label="Nome / Razão Social" value={manual.nome} onChange={(nome) => props.onManualDestinatario({ ...manual, nome })} /><Field disabled={!props.configReady} label="CPF/CNPJ" value={manual.cpfCnpj} onChange={(cpfCnpj) => props.onManualDestinatario({ ...manual, cpfCnpj })} /><Field disabled={!props.configReady} label="Inscrição Estadual" value={manual.ie} onChange={(ie) => props.onManualDestinatario({ ...manual, ie })} /><Field disabled={!props.configReady} label="Endereço" value={manual.endereco} onChange={(endereco) => props.onManualDestinatario({ ...manual, endereco })} /><Field disabled={!props.configReady} label="Bairro" value={manual.bairro} onChange={(bairro) => props.onManualDestinatario({ ...manual, bairro })} /><Field disabled={!props.configReady} label="CEP" value={manual.cep} onChange={(cep) => props.onManualDestinatario({ ...manual, cep })} /><Field disabled={!props.configReady} label="Município" value={manual.municipio} onChange={(municipio) => props.onManualDestinatario({ ...manual, municipio })} /><Field disabled={!props.configReady} label="UF" value={manual.uf} onChange={(uf) => props.onManualDestinatario({ ...manual, uf })} /></div><p className="text-xs text-muted-foreground">Este destinatário vale somente para esta geração e não será salvo no cadastro.</p></>}</div><div className="grid gap-3 sm:grid-cols-3"><Field disabled={!props.configReady} label="CFOP do novo modelo" value={props.cfop} onChange={props.onCfop} /><Field disabled={!props.configReady} label="Natureza da operação" value={props.natureza} onChange={props.onNatureza} /><Field disabled={!props.configReady} label="CST" value={props.cst} onChange={props.onCst} /></div><div className="space-y-1.5"><Label>Dados adicionais</Label><Textarea disabled={!props.configReady} rows={5} value={props.dadosAdicionais} onChange={(e) => props.onDadosAdicionais(e.target.value)} /></div></div><DialogFooter className="gap-2 sm:justify-between"><Button variant="outline" onClick={props.onClose}>Cancelar</Button><div className="flex flex-col-reverse gap-2 sm:flex-row"><Button variant="secondary" onClick={props.onSaveDefault} disabled={!props.configReady || props.savingDefault || !canSaveRft006Default(props.destinatarioId)} title={!props.destinatarioId ? "Para salvar como padrão, selecione um destinatário cadastrado." : undefined}><Save className="mr-1 h-4 w-4" />{props.savingDefault ? "Salvando..." : "Salvar como padrão"}</Button><Button onClick={props.onGenerate} disabled={!props.configReady}>Abrir prévia</Button></div></DialogFooter></DialogContent></Dialog>;
}

function Field({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function FilterValueInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} inputMode="decimal" placeholder="0,00" value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function StatusBadge({ status }: { status: Rft006NotaGroup["situacao"] }) {
  const config = RFT006_SITUACOES[status];
  const className = config.tone === "success" ? "bg-success text-success-foreground" : config.tone === "warning" ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground";
  return <Badge className={className}>{config.label}</Badge>;
}

function Info({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" | "error" }) {
  const color = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "error" ? "text-destructive" : "";
  return <div className="rounded-md border bg-muted/30 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className={`break-words font-semibold ${color}`}>{value}</div></div>;
}

function NotaDetails({ nota, onOpenChange }: { nota: Rft006NotaGroup | null; onOpenChange: (open: boolean) => void }) {
  const cfops = nota ? Array.from(new Set(nota.rows.map((row) => row.cfop || "Inválido"))) : [];
  return <Dialog open={!!nota} onOpenChange={onOpenChange}><DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>Detalhes da Nota {nota?.nota}</DialogTitle><DialogDescription>Dados importados do RFT006 disponíveis somente para consulta.</DialogDescription></DialogHeader>{nota && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Info label="Emitente" value={nota.emitente.razaoSocial || "—"} /><Info label="CPF/CNPJ" value={nota.emitente.cnpj || "—"} /><Info label="IE" value={nota.emitente.ie || "—"} /><Info label="CFOPs de origem" value={cfops.join(", ")} /></div><div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>NCM</TableHead><TableHead>Un.</TableHead><TableHead className="text-right">Quantidade</TableHead><TableHead className="text-right">Valor unitário</TableHead><TableHead className="text-right">Valor bruto</TableHead><TableHead className="text-right">Desconto</TableHead><TableHead className="text-right">Valor líquido</TableHead></TableRow></TableHeader><TableBody>{nota.items.map((item, index) => <TableRow key={`${nota.nota}-${index}`}><TableCell>{item.descricao || "—"}</TableCell><TableCell>{item.ncm || "—"}</TableCell><TableCell>{item.unidade || "—"}</TableCell><TableCell className="text-right">{item.quantidade == null ? "—" : number.format(item.quantidade)}</TableCell><TableCell className="text-right">{item.valorUnitario == null ? "—" : currency.format(item.valorUnitario)}</TableCell><TableCell className="text-right">{item.valorTotal == null ? "—" : currency.format(item.valorTotal)}</TableCell><TableCell className="text-right">{item.valorDesconto == null ? "—" : currency.format(item.valorDesconto)}</TableCell><TableCell className="text-right">{item.valorLiquido == null ? "—" : currency.format(item.valorLiquido)}</TableCell></TableRow>)}</TableBody></Table></div><div><h3 className="mb-2 text-sm font-semibold">Diagnósticos da Nota</h3>{nota.diagnostics.length ? <ul className="space-y-1 text-sm text-muted-foreground">{nota.diagnostics.map((diagnostic, index) => <li key={`${diagnostic.code}-${index}`} className="rounded-md border bg-muted/30 p-2">{diagnostic.message}</li>)}</ul> : <p className="text-sm text-muted-foreground">Nenhuma inconsistência identificada.</p>}</div></div>}<DialogFooter><Button onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter></DialogContent></Dialog>;
}
