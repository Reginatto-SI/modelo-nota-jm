import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Upload,
  FileSpreadsheet,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  HelpCircle,
} from "lucide-react";
import { useReport } from "@/context/ReportContext";
import { parseGrl019, summarize, type ImportDiagnostics } from "@/lib/grl019";
import { syncArmazensFromGrl019, useCooperativas, type SyncArmazensFromGrl019Result } from "@/lib/db";
import type { Grl019Report } from "@/lib/types";
import { toast } from "sonner";

type PendingImport = {
  report: Grl019Report;
  missingRecommendedColumns: string[];
};

type LastSyncResult = SyncArmazensFromGrl019Result & {
  fileName: string;
};

export default function Importar() {
  const { report, setReport, removeReport } = useReport();
  const queryClient = useQueryClient();
  const { data: coops = [] } = useCooperativas();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [diagnostics, setDiagnostics] = useState<ImportDiagnostics | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [lastSync, setLastSync] = useState<LastSyncResult | null>(null);

  const saveParsedReport = async (nextReport: Grl019Report, missingRecommendedColumns: string[]) => {
    await setReport(nextReport);

    let syncMessage = "";
    try {
      // Cria/atualiza apenas o cadastro global resumido dos destinatários de EXPEDIÇÃO; o GRL019 completo continua no navegador.
      const sync = await syncArmazensFromGrl019(nextReport);
      setLastSync({ ...sync, fileName: nextReport.fileName });
      await queryClient.invalidateQueries({ queryKey: ["armazens"] });
      const touched = sync.criados + sync.atualizados;
      syncMessage = touched
        ? ` Pré-cadastro: ${sync.criados} criado(s), ${sync.atualizados} atualizado(s).`
        : " Nenhum novo destinatário para pré-cadastrar.";
    } catch (error) {
      setLastSync(null);
      const message = error instanceof Error ? error.message : "erro desconhecido";
      toast.error(`Relatório importado, mas o pré-cadastro de destinatários falhou: ${message}`);
    }

    const warning = missingRecommendedColumns.length
      ? ` Atenção: colunas recomendadas ausentes: ${missingRecommendedColumns.join(", ")}.`
      : "";
    toast.success(`Relatório importado: ${nextReport.rows.length} linhas.${warning}${syncMessage}`);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    const res = await parseGrl019(file);
    setBusy(false);

    if (res.error) {
      setDiagnostics(res.diagnostics);
      toast.error("Falha ao ler o arquivo. Veja o diagnóstico da importação.");
      return;
    }

    if (res.missingColumns.length) {
      // Erro crítico precisa ficar persistente: o toast some rápido e não comporta o diagnóstico do GRL019.
      setDiagnostics(res.diagnostics);
      toast.error("Arquivo inválido. Veja o diagnóstico da importação.");
      return;
    }

    if (res.report) {
      if (report) {
        // Substituir o GRL019 salvo muda toda a base local usada nas pesquisas; por isso exige confirmação.
        setPendingImport({ report: res.report, missingRecommendedColumns: res.missingRecommendedColumns });
        return;
      }

      await saveParsedReport(res.report, res.missingRecommendedColumns);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const summary = report ? summarize(report) : null;
  const empresa = report?.empresas[0];
  const coopCadastrada = empresa
    ? coops.find((c) => c.nome_grl019.trim().toLowerCase() === empresa.trim().toLowerCase())
    : undefined;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Importar GRL019</h1>
            <p className="text-sm text-muted-foreground">
              O relatório é salvo apenas no seu navegador (IndexedDB). Nunca é enviado ao banco de dados.
            </p>
          </div>

          {/* Apoio visual antes da importação, sem interferir na leitura ou validação do GRL019. */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <HelpCircle className="mr-1 h-4 w-4" />
                Ver exemplo de filtros
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Exemplo de filtros do GRL019</DialogTitle>
                <DialogDescription>
                  Use este modelo como referência ao gerar o relatório GRL019 no sistema.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-md border bg-muted/30 p-2">
                <img
                  src="/GRL019_Tutorial.png"
                  alt="Exemplo de filtros para gerar o relatório GRL019"
                  className="max-h-[70vh] w-full max-w-full rounded object-contain"
                />
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button">Fechar</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={onPick} />

        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <FileSpreadsheet className="h-12 w-12 text-primary" />
            <div>
              <p className="font-medium">Selecione o arquivo Excel do relatório GRL019</p>
              <p className="text-sm text-muted-foreground">Formatos aceitos: .xlsx, .xls</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => inputRef.current?.click()} disabled={busy}>
                {report ? <RefreshCw className="mr-1 h-4 w-4" /> : <Upload className="mr-1 h-4 w-4" />}
                {busy ? "Lendo..." : report ? "Substituir relatório" : "Importar arquivo"}
              </Button>
              {report && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    await removeReport();
                    setLastSync(null);
                  }}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {lastSync && (
          <Card className="border-primary/20 shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Resultado do pré-cadastro de destinatários</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              <Info label="Arquivo" value={lastSync.fileName} />
              <Info label="Destinatários encontrados" value={String(lastSync.encontrados)} ok={lastSync.encontrados > 0} />
              <Info label="Criados" value={String(lastSync.criados)} ok={lastSync.criados > 0} />
              <Info label="Atualizados" value={String(lastSync.atualizados)} ok={lastSync.atualizados > 0} />
              <Info label="Protegidos" value={String(lastSync.protegidos)} warn={lastSync.protegidos > 0} />
              <Info label="Inalterados" value={String(lastSync.inalterados)} />
              <Info label="Ignorados" value={String(lastSync.ignorados)} warn={lastSync.ignorados > 0} />
            </CardContent>
          </Card>
        )}

        {report && summary && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Resumo do relatório atual</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Arquivo" value={report.fileName} />
              <Info label="Aba lida" value={report.sheetName ?? "-"} />
              <Info label="Linha do cabeçalho" value={report.headerRow ? String(report.headerRow) : "-"} ok={!!report.headerRow} />
              <Info label="Importado em" value={new Date(report.importedAt).toLocaleString("pt-BR")} />
              <Info label="Linhas" value={String(summary.totalLinhas)} />
              <Info label="Cooperativa (EMPRESA)" value={empresa ?? "-"} />
              <Info
                label="Status do cadastro"
                value={coopCadastrada ? "Cadastrada" : "Não cadastrada"}
                ok={!!coopCadastrada}
                warn={!coopCadastrada}
              />
              <Info label="Contratos recebimento" value={String(summary.recebimento)} />
              <Info label="Contratos expedição" value={String(summary.expedicao)} />
              <Info label="Vínculos localizados" value={String(summary.vinculoLocalizado)} ok />
              <Info label="Vínculos ausentes" value={String(summary.vinculoAusente)} warn={summary.vinculoAusente > 0} />
              {report.missingRecommendedColumns?.length ? (
                <Info
                  label="Colunas recomendadas ausentes"
                  value={report.missingRecommendedColumns.join(", ")}
                  warn
                />
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>

      <ImportDiagnosticsDialog diagnostics={diagnostics} onOpenChange={(open) => !open && setDiagnostics(null)} />

      <AlertDialog open={!!pendingImport} onOpenChange={(open) => !open && setPendingImport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir relatório GRL019?</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um GRL019 importado neste navegador. Deseja substituir pelo novo relatório?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingImport) return;
                const nextImport = pendingImport;
                setPendingImport(null);
                await saveParsedReport(nextImport.report, nextImport.missingRecommendedColumns);
              }}
            >
              Substituir relatório
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function ImportDiagnosticsDialog({
  diagnostics,
  onOpenChange,
}: {
  diagnostics: ImportDiagnostics | null;
  onOpenChange: (open: boolean) => void;
}) {
  const copyDiagnostics = async () => {
    if (!diagnostics) return;

    const text = [
      "Diagnóstico de importação GRL019",
      `Arquivo: ${diagnostics.fileName}`,
      `Aba lida: ${diagnostics.sheetName}`,
      `Linha de cabeçalho detectada: ${diagnostics.headerRow ?? "não identificada"}`,
      `Quantidade de colunas encontradas: ${diagnostics.foundColumnCount}`,
      `Colunas encontradas no arquivo: ${diagnostics.foundColumns.join(", ") || "nenhuma"}`,
      `Colunas reconhecidas pelo sistema: ${diagnostics.recognizedColumns.join(", ") || "nenhuma"}`,
      `Colunas obrigatórias ausentes: ${diagnostics.missingColumns.join(", ") || "nenhuma"}`,
      `Colunas recomendadas ausentes: ${diagnostics.missingRecommendedColumns.join(", ") || "nenhuma"}`,
      `Erro: ${diagnostics.errorMessage ?? "-"}`,
    ].join("\n");

    await navigator.clipboard.writeText(text);
    toast.success("Diagnóstico copiado.");
  };

  return (
    <Dialog open={!!diagnostics} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Não foi possível importar o GRL019</DialogTitle>
          <DialogDescription>
            O sistema não encontrou todas as colunas obrigatórias do GRL019. Verifique se o arquivo importado é o
            relatório correto e se o cabeçalho está na linha esperada.
          </DialogDescription>
        </DialogHeader>

        {diagnostics && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-3">
              <Info label="Arquivo selecionado" value={diagnostics.fileName} />
              <Info label="Aba lida" value={diagnostics.sheetName} />
              <Info
                label="Linha do cabeçalho"
                value={diagnostics.headerRow ? String(diagnostics.headerRow) : "Não identificada"}
                warn={!diagnostics.headerRow}
              />
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Colunas obrigatórias esperadas</h3>
              <ColumnList columns={diagnostics.requiredColumns} />
            </div>

            {diagnostics.errorMessage && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
                <p className="font-semibold text-destructive">Erro</p>
                <p className="text-muted-foreground">{diagnostics.errorMessage}</p>
              </div>
            )}

            <div>
              <h3 className="mb-2 font-semibold">Colunas encontradas no arquivo ({diagnostics.foundColumnCount})</h3>
              <ColumnList columns={diagnostics.foundColumns} empty="Nenhuma coluna encontrada na linha de cabeçalho." />
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Colunas reconhecidas pelo sistema ({diagnostics.recognizedColumnCount})</h3>
              <ColumnList columns={diagnostics.recognizedColumns} empty="Nenhuma coluna do GRL019 foi reconhecida." />
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-destructive">Colunas obrigatórias ausentes</h3>
              <ColumnList columns={diagnostics.missingColumns} empty="Nenhuma coluna obrigatória ausente." />
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-warning">Colunas recomendadas ausentes</h3>
              <ColumnList columns={diagnostics.missingRecommendedColumns} empty="Nenhuma coluna recomendada ausente." />
            </div>

            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              <p className="font-semibold">Como corrigir</p>
              <p className="text-muted-foreground">
                Gere novamente o GRL019 ou ajuste a planilha para manter o cabeçalho original do relatório. O cabeçalho
                normalmente fica na linha 6, mas o sistema tenta localizar automaticamente a linha correta.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={copyDiagnostics} disabled={!diagnostics}>
            <Copy className="mr-1 h-4 w-4" /> Copiar diagnóstico
          </Button>
          <Button onClick={() => onOpenChange(false)}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ColumnList({ columns, empty }: { columns: string[]; empty?: string }) {
  if (columns.length === 0) {
    return <p className="rounded-md border bg-muted/30 p-3 text-muted-foreground">{empty ?? "Nenhuma coluna."}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {columns.map((column) => (
        <span key={column} className="rounded-full border bg-background px-3 py-1 text-xs font-medium">
          {column}
        </span>
      ))}
    </div>
  );
}

function Info({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1 font-semibold">
        {ok && <CheckCircle2 className="h-4 w-4 text-success" />}
        {warn && <AlertTriangle className="h-4 w-4 text-warning" />}
        <span className="truncate" title={value}>{value}</span>
      </div>
    </div>
  );
}
