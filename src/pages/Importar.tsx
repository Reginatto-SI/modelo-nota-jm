import { useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, RefreshCw, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useReport } from "@/context/ReportContext";
import { parseGrl019, summarize } from "@/lib/grl019";
import { useCooperativas } from "@/lib/db";
import { toast } from "sonner";

export default function Importar() {
  const { report, setReport, removeReport } = useReport();
  const { data: coops = [] } = useCooperativas();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    const res = await parseGrl019(file);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    if (res.missingColumns.length) {
      return toast.error("Arquivo inválido. Colunas ausentes: " + res.missingColumns.join(", "));
    }
    if (res.report) {
      await setReport(res.report);
      toast.success(`Relatório importado: ${res.report.rows.length} linhas.`);
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
        <div>
          <h1 className="text-2xl font-bold">Importar GRL019</h1>
          <p className="text-sm text-muted-foreground">
            O relatório é salvo apenas no seu navegador (IndexedDB). Nunca é enviado ao banco de dados.
          </p>
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
                <Button variant="outline" onClick={() => removeReport()}>
                  <Trash2 className="mr-1 h-4 w-4" /> Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {report && summary && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Resumo do relatório atual</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Arquivo" value={report.fileName} />
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
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

function Info({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1 font-semibold">
        {ok && <CheckCircle2 className="h-4 w-4 text-success" />}
        {warn && <AlertTriangle className="h-4 w-4 text-warning" />}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}
