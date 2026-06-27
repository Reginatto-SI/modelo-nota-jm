import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Copy, Eye, FileText, Search } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
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
  const [details, setDetails] = useState<ResolveResult | null>(null);

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
                <TableHead className="w-12 text-center">Detalhes</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resolvedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum contrato encontrado.</TableCell>
                </TableRow>
              ) : resolvedRows.map(({ row: r, res }, i) => (
                <TableRow key={r.contrato + i}>
                  <TableCell className="font-semibold">{r.contrato}</TableCell>
                  <TableCell className="max-w-[260px] truncate">{r.nomeRazaoSocial}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{r.descItem}</TableCell>
                  <TableCell>
                    <ModeloBadge res={res} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          aria-label="Ver detalhes do contrato"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setDetails(res)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ver detalhes do contrato</TooltipContent>
                    </Tooltip>
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

      <ContractDetailsDialog res={details} onOpenChange={(open) => !open && setDetails(null)} />

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

function ContractDetailsDialog({ res, onOpenChange }: { res: ResolveResult | null; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  if (!res) return null;

  const row = res.searchedRow;
  const linkedRow = findLinkedRow(res);
  const armazemOrigem = getArmazemSource(res, linkedRow);
  const showArmazemOrigem = Boolean(res.ofereceCasada || res.cfop === "5923" || res.modelo5923);
  // Reutiliza as mensagens já produzidas por resolveContrato para não criar uma segunda regra de validação.
  const pendencias = [...res.errors, ...res.warnings];
  const dadosCadastro = buildDadosCadastro(res, linkedRow);
  const atalhosCadastro = buildCadastroShortcuts(pendencias);
  const copyDadosCadastro = async () => {
    try {
      await navigator.clipboard.writeText(dadosCadastro);
      toast.success("Dados do GRL019 copiados para conferência no cadastro.");
    } catch {
      toast.error("Não foi possível copiar as informações automaticamente.");
    }
  };
  const goCadastro = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={!!res} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do contrato {row.contrato || "-"}</DialogTitle>
          <DialogDescription>
            Dados lidos do GRL019 e situação da parametrização atual. Nenhum cadastro é salvo automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-2">
          <DetailBlock title="Dados do contrato">
            <DetailItem label="Contrato" value={row.contrato} />
            <DetailItem label="Contrato vinculado" value={row.contratoVinculado} />
            <DetailItem label="Cooperativa / EMPRESA" value={row.empresa} />
            <DetailItem label="TP FATURAMENTO" value={row.tpFaturamento} />
            <DetailItem label="COD.CONTRATO" value={row.codContrato} />
            <DetailItem label="DESC.CONTRATO" value={row.descContrato} />
            <DetailItem label="Tipo de frete" value={row.tpFrete} />
            <DetailItem label="Observação" value={row.observacao} full />
          </DetailBlock>

          <DetailBlock title="Dados do produtor/agricultor">
            <DetailItem label="Nome/Razão Social" value={row.nomeRazaoSocial} full />
            <DetailItem label="CPF/CNPJ" value={row.cpfCnpj} />
            <DetailItem label="Inscrição Estadual" value={row.ie} />
            <DetailItem label="Endereço" value={row.endereco} full />
            <DetailItem label="Município/UF" value={[row.municipio, row.estado].filter(Boolean).join("/")} />
          </DetailBlock>

          <DetailBlock title="Produto e valores">
            <DetailItem label="Código do produto" value={row.codItem} />
            <DetailItem label="Descrição do produto" value={row.descItem} full />
            <DetailItem label="Preço unitário com ICMS / preço da saca" value={formatCurrency(row.precoUnitIcms)} />
          </DetailBlock>

          <DetailBlock title="Parametrização encontrada">
            <DetailItem label="Cooperativa cadastrada" value={res.cooperativa?.razao_social ?? res.cooperativa?.nome_grl019} />
            <DetailItem label="Tipo de contrato" value={res.tipoContrato?.descricao_contrato ?? res.tipoContrato?.codigo_contrato} />
            <DetailItem label="Modelo identificado" value={res.modelo ? `CFOP ${res.modelo.cfop} — ${res.modelo.nome_modelo}` : undefined} full />
            <DetailItem label="Produto cadastrado" value={res.produto?.descricao} />
            <DetailItem label="Armazém/destinatário" value={res.armazem?.razao_social} />
            <DetailItem label="Situação da parametrização" value={res.errors.length > 0 ? "Erro de parametrização" : res.podeGerar ? "Pronto para gerar" : "Com avisos/pendências"} />
          </DetailBlock>
        </div>

        {row.contratoVinculado && (
          <DetailBlock title="Resumo do contrato vinculado">
            <DetailItem label="Número do contrato vinculado" value={row.contratoVinculado} />
            <DetailItem label="Localizado no GRL019" value={linkedRow ? "Sim" : "Não"} />
            <DetailItem label="TP FATURAMENTO" value={linkedRow?.tpFaturamento} />
            <DetailItem label="Nome/Razão Social" value={linkedRow?.nomeRazaoSocial} />
            <DetailItem label="CPF/CNPJ" value={linkedRow?.cpfCnpj} />
            <DetailItem label="Produto" value={linkedRow?.descItem} />
            <DetailItem label="Município/UF" value={linkedRow ? [linkedRow.municipio, linkedRow.estado].filter(Boolean).join("/") : undefined} />
            {showArmazemOrigem && (
              <>
                <DetailItem label="Usado como base do armazém/destinatário" value={armazemOrigem.row === linkedRow ? "Sim" : "Não"} />
                <DetailItem label="Origem do destinatário final" value={armazemOrigem.label} />
              </>
            )}
          </DetailBlock>
        )}

        <DetailBlock title="Pendências encontradas">
          {pendencias.length > 0 ? (
            <div className="space-y-3">
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {pendencias.map((p, index) => <li key={`${p}-${index}`}>{p}</li>)}
              </ul>
              {atalhosCadastro.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Atalhos úteis para correção conforme a pendência listada acima. Nenhum cadastro será preenchido ou salvo automaticamente.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {atalhosCadastro.map((atalho) => (
                      <Button key={atalho.path} size="sm" variant="outline" onClick={() => goCadastro(atalho.path)}>
                        {atalho.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma pendência de parametrização encontrada para este registro.</p>
          )}
        </DetailBlock>

        {/* Sem pré-preenchimento automático: os dados ficam visíveis para copiar e revisar manualmente no cadastro. */}
        <DetailBlock title="Dados para cadastro">
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{dadosCadastro}</pre>
        </DetailBlock>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={copyDadosCadastro}><Copy className="mr-2 h-4 w-4" /> Copiar informações</Button>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function DetailItem({ label, value, full }: { label: string; value: unknown; full?: boolean }) {
  const display = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">{display}</dd>
    </div>
  );
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildDadosCadastro(res: ResolveResult, linkedRow?: Grl019Row) {
  const row = res.searchedRow;
  const armazemOrigem = getArmazemSource(res, linkedRow);
  const armazem = armazemOrigem.row;
  return [
    `Cooperativa: ${row.empresa || "-"}`,
    `Tipo de contrato: cooperativa=${row.empresa || "-"}; COD.CONTRATO=${row.codContrato || "-"}; DESC.CONTRATO=${row.descContrato || "-"}; TP FATURAMENTO=${row.tpFaturamento || "-"}`,
    `Produto: COD.ITEM=${row.codItem || "-"}; DESC.ITEM=${row.descItem || "-"}`,
    `Armazém/destinatário sugerido: origem=${armazemOrigem.label}; CPF/CNPJ=${armazem.cpfCnpj || "-"}; Nome/Razão Social=${armazem.nomeRazaoSocial || "-"}; IE=${armazem.ie || "-"}; Endereço=${armazem.endereco || "-"}; Município=${armazem.municipio || "-"}; UF=${armazem.estado || "-"}`,
  ].join("\n");
}

function findLinkedRow(res: ResolveResult) {
  const row = res.searchedRow;
  return [res.recebimentoRow, res.expedicaoRow].find(
    (candidate) => candidate && candidate !== row && candidate.contrato === row.contratoVinculado,
  );
}

function getArmazemSource(res: ResolveResult, linkedRow?: Grl019Row) {
  // Só usa destino vinculado quando a regra/linha indica operação com vínculo, evitando sugerir produtor como armazém.
  const shouldUseLinkedDestination = Boolean(
    res.ofereceCasada ||
      res.cfop === "5923" ||
      res.modelo5923 ||
      res.searchedRow.contratoVinculado,
  );

  if (shouldUseLinkedDestination && res.expedicaoRow) {
    return { row: res.expedicaoRow, label: "contrato de expedição vinculado" };
  }
  if (shouldUseLinkedDestination && linkedRow) {
    return { row: linkedRow, label: "contrato vinculado localizado no GRL019" };
  }
  return { row: res.searchedRow, label: "linha atual" };
}

function buildCadastroShortcuts(pendencias: string[]) {
  const text = normalize(pendencias.join(" "));
  const shortcuts = [
    { label: "Cadastrar cooperativa", path: "/cadastros/cooperativas", match: ["cooperativa"] },
    { label: "Cadastrar tipo de contrato", path: "/cadastros/tipos-contrato", match: ["tipo de contrato", "contrato nao parametrizado", "parametrizacao ativa"] },
    { label: "Cadastrar produto", path: "/cadastros/produtos", match: ["produto", "ncm", "cst"] },
    { label: "Cadastrar modelo", path: "/cadastros/modelos-nota", match: ["modelo", "cfop"] },
    { label: "Cadastrar armazém/destinatário", path: "/cadastros/armazens", match: ["armazem", "destinatario", "expedicao vinculada"] },
  ];
  return shortcuts.filter((shortcut) => shortcut.match.some((term) => text.includes(term)));
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
