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
  const cad: CadastrosBundle = { cooperativas, armazens, produtos, modelos, tipos };

  const rows = useMemo(() => {
    if (!report) return [];
    if (!q.trim()) return report.rows.slice(0, 50);
    const t = q.toLowerCase();
    return report.rows.filter((r) =>
      [r.contrato, r.contratoVinculado, r.nomeRazaoSocial, r.cpfCnpj, r.descItem, r.empresa, r.tpFaturamento, r.codContrato, r.descContrato]
        .some((v) => String(v).toLowerCase().includes(t)),
    );
  }, [report, q]);

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

  const onGerar = (row: Grl019Row) => {
    const res = resolveContrato(report, row, cad);
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
            Localize o contrato (por número, produtor, CPF/CNPJ, produto ou cooperativa) e gere o modelo de nota.
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar contrato..." className="pl-9" />
        </div>

        <div className="rounded-lg border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Vínculo</TableHead>
                <TableHead>TP Fat.</TableHead>
                <TableHead>Nome / Razão Social</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Preço Saca</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">Nenhum contrato encontrado.</TableCell>
                </TableRow>
              ) : rows.map((r, i) => {
                const res = resolveContrato(report, r, cad);
                return (
                  <TableRow key={r.contrato + i}>
                    <TableCell className="font-semibold">{r.contrato}</TableCell>
                    <TableCell>{r.contratoVinculado || "—"}</TableCell>
                    <TableCell>{r.tpFaturamento}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{r.nomeRazaoSocial}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{r.descItem}</TableCell>
                    <TableCell>{r.precoUnitIcms.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                    <TableCell>
                      {res.errors.length > 0 ? (
                        <Badge variant="destructive">Erro param.</Badge>
                      ) : res.expedicaoComoVinculo5923 ? (
                        <Badge variant="secondary">Vínculo do 5923</Badge>
                      ) : res.expedicaoVinculadaRecebimento ? (
                        <Badge variant="secondary">Ver recebimento</Badge>
                      ) : res.ofereceCasada ? (
                        // Sem "CFOP" no badge para não sugerir dependência/obrigatoriedade confusa.
                        <Badge>5118 + 5923</Badge>
                      ) : res.cfop ? (
                        <Badge>{res.cfop}</Badge>
                      ) : (
                        <Badge variant="secondary">Sem param.</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {res.expedicaoVinculadaRecebimento ? (
                        <Button size="sm" variant="outline" onClick={() => orientarRecebimento(res)}>
                          Ver recebimento
                        </Button>
                      ) : (
                        <Button size="sm" variant={res.podeGerar ? "default" : "outline"} onClick={() => onGerar(r)}>
                          <FileText className="mr-1 h-4 w-4" /> Gerar Modelo
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
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
