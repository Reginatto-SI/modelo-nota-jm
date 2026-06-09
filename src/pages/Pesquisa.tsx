import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, FileText, AlertTriangle } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useReport } from "@/context/ReportContext";
import {
  useCooperativas, useArmazens, useProdutos, useModelos, useTiposContrato,
} from "@/lib/db";
import { resolveContrato, type CadastrosBundle, type ResolveResult } from "@/lib/resolve";
import { buildNota, type CfopModelo, type Nota } from "@/lib/nota";
import type { Grl019Row } from "@/lib/types";
import { toast } from "sonner";

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function digits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

// Busca principal operacional: mantém a pesquisa focada nos campos usados para localizar o contrato.
function smartSearchMatches(row: Grl019Row, term: string) {
  if (!term.trim()) return true;
  const normalizedTerm = normalize(term);
  const digitTerm = digits(term);
  const searchable = [
    row.contrato,
    row.contratoVinculado,
    row.nomeRazaoSocial,
    row.cpfCnpj,
    row.descItem,
  ];

  return searchable.some((value) => normalize(value).includes(normalizedTerm)) ||
    Boolean(digitTerm && digits(row.cpfCnpj).includes(digitTerm));
}

export default function Pesquisa() {
  const navigate = useNavigate();
  const { report } = useReport();
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<ResolveResult | null>(null);

  const { data: cooperativas = [] } = useCooperativas();
  const { data: armazens = [] } = useArmazens();
  const { data: produtos = [] } = useProdutos();
  const { data: modelos = [] } = useModelos();
  const { data: tipos = [] } = useTiposContrato();
  const cad: CadastrosBundle = useMemo(
    () => ({ cooperativas, armazens, produtos, modelos, tipos }),
    [cooperativas, armazens, produtos, modelos, tipos],
  );

  const visibleRows = useMemo(() => {
    if (!report) return [];
    return report.rows
      .filter((row) => smartSearchMatches(row, q))
      .slice(0, 50);
  }, [report, q]);

  const resolvedRows = useMemo(() => {
    if (!report) return [];
    // Resolve apenas os registros que serão renderizados para evitar cálculos repetidos na filtragem e no JSX.
    return visibleRows.map((row) => ({ row, res: resolveContrato(report, row, cad) }));
  }, [cad, report, visibleRows]);

  if (!report) {
    return (
      <Layout>
        <EmptyState onGo={() => navigate("/importar")} />
      </Layout>
    );
  }

  const orientarRecebimento = (res: ResolveResult) => {
    const contrato = res.contratoRecebimentoVinculado ?? res.recebimentoRow?.contrato ?? res.searchedRow.contratoVinculado;
    if (res.parametrizacaoSuspeitaExpedicao5923) {
      toast.warning(
        "Parametrização suspeita: o CFOP 5923 deve ser gerado pela operação casada 5118 + 5923, não diretamente pela expedição.",
      );
    }
    toast(
      `Este contrato de expedição é usado apenas como vínculo para montar o modelo CFOP 5923. Gere o modelo pelo contrato de recebimento vinculado: ${contrato || "não localizado"}.`,
    );
    if (contrato) setQ(contrato);
  };

  const onGerar = (res: ResolveResult) => {
    // EXPEDIÇÃO vinculada não gera nota diretamente; ela só alimenta o destinatário do 5923.
    if (res.expedicaoVinculadaRecebimento) {
      orientarRecebimento(res);
      return;
    }
    if (res.errors.length > 0) {
      res.errors.forEach((e) => toast.error(e));
      return;
    }
    if (!res.podeGerar) {
      res.warnings.forEach((w) => toast.warning(w));
      if (!res.modelo) return;
    }
    if (res.ofereceCasada) {
      setDialog(res);
    } else {
      generate(res, [res.cfop === "5132" ? "5132" : (res.cfop as CfopModelo)]);
    }
  };

  const generate = (res: ResolveResult, which: CfopModelo[]) => {
    const notas: Nota[] = [];
    for (const w of which) {
      const modelo = w === "5923" ? res.modelo5923 : res.modelo;
      if (!modelo) {
        const cooperativa = res.cooperativa?.nome_grl019 ?? res.cooperativa?.razao_social ?? "cooperativa";
        toast.error(
          `Modelo CFOP ${w} não encontrado para a cooperativa ${cooperativa}. Verifique se existe um Modelo de Nota ativo com CFOP ${w} vinculado à mesma cooperativa do GRL019.`,
        );
        continue;
      }
      notas.push(buildNota(res, w, modelo));
    }
    if (notas.length === 0) return;
    setDialog(null);
    navigate("/preview", { state: { notas, warnings: res.warnings } });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          {/* Título alinhado à finalidade real da tela: localizar contrato e gerar o modelo. */}
          <h1 className="text-2xl font-bold">Gerar Modelo de Nota</h1>
          <p className="text-sm text-muted-foreground">
            Localize o contrato por número, produtor, CPF/CNPJ ou produto e gere o modelo de nota.
          </p>
        </div>

        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar contrato, agricultor ou CPF/CNPJ..."
            className="pl-9"
          />
        </div>

        <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Agricultor / Razão Social</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resolvedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum contrato encontrado.</TableCell>
                </TableRow>
              ) : resolvedRows.map(({ row: r, res }, i) => (
                <TableRow key={r.contrato + i}>
                  <TableCell className="font-semibold">{r.contrato}</TableCell>
                  <TableCell className="max-w-[260px] truncate">{r.nomeRazaoSocial}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{r.descItem}</TableCell>
                  <TableCell>
                    <ModeloBadge res={res} />
                  </TableCell>
                  <TableCell className="text-right">
                    {res.expedicaoVinculadaRecebimento ? (
                      <Button size="sm" variant="outline" onClick={() => orientarRecebimento(res)}>
                        Ver recebimento
                      </Button>
                    ) : (
                      <Button size="sm" variant={res.podeGerar ? "default" : "outline"} onClick={() => onGerar(res)}>
                        <FileText className="mr-1 h-4 w-4" /> Gerar Modelo
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Operação casada (5118 + 5923)</AlertDialogTitle>
            <AlertDialogDescription>
              Neste contrato o modelo 5923 (remessa) sempre acompanha a venda 5118 — por isso não há opção de gerar o
              5923 sozinho. Você pode gerar apenas o 5118 ou os dois modelos juntos (5118 + 5923).
              {dialog && !dialog.modelo5923 && (
                <span className="mt-2 flex items-center gap-1 text-warning">
                  <AlertTriangle className="h-4 w-4" /> Modelo 5923 não cadastrado ou inativo para esta cooperativa.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button variant="secondary" onClick={() => dialog && generate(dialog, ["5118"])}>Gerar apenas 5118</Button>
            <Button disabled={!dialog?.modelo5923} onClick={() => dialog && generate(dialog, ["5118", "5923"])}>
              Gerar 5118 + 5923
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function ModeloBadge({ res }: { res: ResolveResult }) {
  if (res.errors.length > 0) return <Badge variant="destructive">Erro param.</Badge>;
  if (res.expedicaoComoVinculo5923) return <Badge variant="secondary">Vínculo do 5923</Badge>;
  if (res.expedicaoVinculadaRecebimento) return <Badge variant="secondary">Ver recebimento</Badge>;
  if (res.ofereceCasada) return <Badge>5118 + 5923</Badge>;
  if (res.cfop) return <Badge>{res.cfop}</Badge>;
  return <Badge variant="secondary">Sem param.</Badge>;
}

function EmptyState({ onGo }: { onGo: () => void }) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertTriangle className="h-10 w-10 text-warning" />
        <p className="font-medium">Nenhum relatório GRL019 importado.</p>
        <Button onClick={onGo}>Importar relatório</Button>
      </CardContent>
    </Card>
  );
}
