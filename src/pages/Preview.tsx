import { useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Download, Search } from "lucide-react";
import type { Nota, NotaRft006Item } from "@/lib/nota";
import type { Armazem, Cooperativa } from "@/lib/types";
import { buildNotaPdfFileName, createManualCloneFromPreview, syncPlacaCavaloPlaceholder, type NotaParty } from "@/lib/nota";
import { generatePdf } from "@/lib/pdf";
import { TIPO_FRETE_OPTIONS, normalizePreviewTipoFrete, normalizeTipoFrete } from "@/lib/tipoFrete";
import { toast } from "sonner";
import { useArmazens, useCooperativas } from "@/lib/db";
import { formatCurrencyBR, formatUnitValueBR, parseCurrencyBR, parseDecimalBR } from "@/lib/numberFormat";
import { generateValidatedRft006Pdf, getPreviewReturnPath, updateRft006Nota } from "@/lib/rft006Nota";

export default function Preview() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { notas: Nota[]; warnings: string[] } | null;
  const [notas, setNotas] = useState<Nota[]>(() =>
    (state?.notas ?? []).map((nota) => ({ ...nota, tpFrete: normalizePreviewTipoFrete(nota.sourceType, nota.tpFrete) })),
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [cadastroSearchIdx, setCadastroSearchIdx] = useState<number | null>(null);
  const isCadastroSearchOpen = cadastroSearchIdx !== null;
  const { data: cooperativas = [], isLoading: loadingCooperativas } = useCooperativas(isCadastroSearchOpen);
  const { data: armazens = [], isLoading: loadingArmazens } = useArmazens(isCadastroSearchOpen);

  if (!state || notas.length === 0) return <Navigate to="/pesquisa" replace />;

  const isManualNota = (nota: Nota) => nota.isManualClone || nota.sourceType === "manual_clone";
  const isManualClone = notas.some(isManualNota);
  const isRft006 = notas.some((nota) => nota.sourceType === "rft006");

  const update = (idx: number, patch: Partial<Nota>, recalc: "unitario" | "total" | "none" = "none") => {
    setNotas((prev) => prev.map((n, i) => {
      if (i !== idx) return n;
      const merged = { ...n, ...patch };
      if (patch.placaVeiculo != null) {
        // Sincroniza apenas o placeholder imediato da placa; nunca substitui o restante da linha.
        merged.dadosAdicionais = syncPlacaCavaloPlaceholder(merged.dadosAdicionais, patch.placaVeiculo);
      }
      if (recalc === "none") {
        return merged;
      }
      if (recalc === "total") {
        if (merged.quantidade > 0) merged.valorUnitario = merged.valorTotal / merged.quantidade;
      } else {
        merged.valorTotal = merged.quantidade * merged.valorUnitario;
      }
      return merged;
    }));
  };

  const setDraft = (idx: number, field: "valorUnitario" | "valorTotal", value: string) => {
    setDrafts((prev) => ({ ...prev, [`${idx}.${field}`]: value }));
  };

  const clearDraft = (idx: number, field: "valorUnitario" | "valorTotal") => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[`${idx}.${field}`];
      return next;
    });
  };


  const duplicarComoAvulso = () => {
    if (isManualClone) return;
    setNotas((prev) => prev.map((nota) => createManualCloneFromPreview(nota)));
    toast.success("Modelo duplicado como avulso. A partir de agora, os campos são editáveis e o PDF será gerado com as informações digitadas pelo usuário.");
  };

  const hasPendingPlaceholders = (nota: Nota) => /{{[^}]+}}/.test(nota.dadosAdicionais);

  const isBlank = (value: string | undefined | null) => !value?.trim();

  const hasMissingOptionalManualInfo = (nota: Nota) =>
    isManualNota(nota) && (
      isBlank(nota.emitente.cpfCnpj) ||
      isBlank(nota.emitente.ie) ||
      isBlank(nota.emitente.municipio) ||
      isBlank(nota.emitente.uf) ||
      isBlank(nota.destinatario.cpfCnpj) ||
      isBlank(nota.destinatario.ie) ||
      isBlank(nota.destinatario.municipio) ||
      isBlank(nota.destinatario.uf)
    );

  const gerarPdfs = () => {
    // Cada aba/modelo vira um PDF próprio; não une CFOPs diferentes no mesmo arquivo.
    notas.forEach((nota) => {
      if (nota.sourceType === "rft006") generateValidatedRft006Pdf(nota, generatePdf);
      else generatePdf([nota], buildNotaPdfFileName(nota));
    });
    toast.success(notas.length > 1 ? "PDFs gerados separadamente." : "PDF gerado.");
  };

  const gerarPdfConfirmado = () => {
    // O RFT006 possui validação multi-item própria e não passa pelas premissas singulares do GRL019.
    const primeiraRft006Invalida = notas
      .filter((nota) => nota.sourceType === "rft006")
      .map((nota) => generateValidatedRft006Pdf(nota, () => undefined))
      .find(Boolean);
    if (primeiraRft006Invalida) return toast.error(primeiraRft006Invalida);
    if (notas.every((nota) => nota.sourceType === "rft006")) return gerarPdfs();
    const primeiraNotaComPlaceholder = notas.find((n) => isManualNota(n) && hasPendingPlaceholders(n));
    if (primeiraNotaComPlaceholder) {
      toast.warning("Há placeholders pendentes nos dados adicionais. Revise antes de usar o PDF orientativo.");
    }
    const primeiraNotaComCadastroIncompleto = notas.find(hasMissingOptionalManualInfo);
    if (primeiraNotaComCadastroIncompleto) {
      toast.warning("Há CPF/CNPJ, IE, município ou UF em branco no modo avulso. Revise se essas informações devem aparecer no PDF.");
    }
    const primeiraNotaSemCfop = notas.find((n) => !n.cfop?.trim());
    if (primeiraNotaSemCfop) {
      return toast.error("Modelo sem CFOP parametrizado. Revise o cadastro de Modelos de Nota antes de gerar o PDF.");
    }
    const primeiraNotaSemNatureza = notas.find((n) => !n.naturezaOperacao?.trim());
    if (primeiraNotaSemNatureza) {
      return toast.error(`Modelo CFOP ${primeiraNotaSemNatureza.cfop}: informe a natureza da operação no cadastro do modelo antes de gerar o PDF.`);
    }
    const primeiraNotaSemQuantidade = notas.find((n) => n.quantidade <= 0);
    if (primeiraNotaSemQuantidade) {
      return toast.error(`Modelo CFOP ${primeiraNotaSemQuantidade.cfop}: quantidade deve ser maior que zero.`);
    }
    const primeiraNotaSemValorUnitario = notas.find((n) => n.valorUnitario <= 0);
    if (primeiraNotaSemValorUnitario) {
      return toast.error(`Modelo CFOP ${primeiraNotaSemValorUnitario.cfop}: informe valor unitário válido antes de gerar o PDF.`);
    }
    const primeiraNotaSemValorTotal = notas.find((n) => n.valorTotal <= 0);
    if (primeiraNotaSemValorTotal) {
      return toast.error(`Modelo CFOP ${primeiraNotaSemValorTotal.cfop}: informe valor total válido antes de gerar o PDF.`);
    }
    const primeiraNotaSemPartes = notas.find((n) => isManualNota(n) && (isBlank(n.emitente.nome) || isBlank(n.destinatario.nome) || isBlank(n.produto.descricao)));
    if (primeiraNotaSemPartes) {
      return toast.error(`Modelo CFOP ${primeiraNotaSemPartes.cfop || "sem CFOP"}: informe emitente, destinatário e produto antes de gerar o PDF.`);
    }
    const primeiraNotaSemProdutoFiscal = notas.find((n) => !n.produto.ncm?.trim() || !n.produto.cst?.trim());
    if (primeiraNotaSemProdutoFiscal) {
      return toast.error(`Modelo CFOP ${primeiraNotaSemProdutoFiscal.cfop}: produto/modelo sem NCM ou CST. Revise o cadastro antes de gerar o PDF.`);
    }

    gerarPdfs();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Prévia dos Modelos</h1>
            <p className="text-sm text-muted-foreground">Edite os campos antes de gerar o PDF orientativo.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(getPreviewReturnPath(notas))}>Voltar</Button>
            {!isManualClone && !isRft006 && (
              <Button variant="secondary" onClick={duplicarComoAvulso}>
                <Copy className="mr-1 h-4 w-4" /> Duplicar como avulso
              </Button>
            )}
            <Button onClick={gerarPdfConfirmado}><Download className="mr-1 h-4 w-4" /> Gerar PDF</Button>
          </div>
        </div>

        {isManualClone && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Modo avulso/manual: revise os dados antes de gerar o PDF. O sistema usará as informações digitadas nesta tela.
          </div>
        )}
        {isRft006 && <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Prévia RFT006 multi-item. As alterações ficam somente nesta geração e serão usadas no PDF orientativo.</div>}

        <Tabs defaultValue="0">
          <TabsList>
            {notas.map((n, i) => (
              <TabsTrigger key={i} value={String(i)}>Modelo CFOP {n.cfop}</TabsTrigger>
            ))}
          </TabsList>
          {notas.map((n, i) => n.sourceType === "rft006" ? (
            <Rft006Preview key={i} nota={n} onChange={(patch, manualDadosAdicionais) => update(i, updateRft006Nota(n, patch, manualDadosAdicionais), "none")} />
          ) : (
            <TabsContent key={i} value={String(i)} className="space-y-4">
              <Card className="shadow-card">
                <CardHeader><CardTitle className="text-base">{n.nomeModelo} — {n.naturezaOperacao}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {isManualNota(n) && (
                    <>
                      <F label="Modelo" value={n.nomeModelo} onChange={(v) => update(i, { nomeModelo: v }, "none")} />
                      <F label="CFOP" value={n.cfop} onChange={(v) => update(i, { cfop: v }, "none")} />
                      <F label="Natureza da operação" value={n.naturezaOperacao} onChange={(v) => update(i, { naturezaOperacao: v }, "none")} />
                    </>
                  )}
                  <F label="Data emissão" type="date" value={n.dataEmissao} onChange={(v) => update(i, { dataEmissao: v })} />
                  <F label="Data saída" type="date" value={n.dataSaida} onChange={(v) => update(i, { dataSaida: v })} />
                  <F label="Hora saída" value={n.horaSaida} onChange={(v) => update(i, { horaSaida: v })} />
                  <F label="Quantidade (KG)" type="number" value={String(n.quantidade)} onChange={(v) => update(i, { quantidade: Number(v) }, "unitario")} />
                  <MoneyField
                    label="Valor unitário (R$/KG)"
                    placeholder="Ex.: 0,633333"
                    value={drafts[`${i}.valorUnitario`] ?? formatUnitValueBR(n.valorUnitario)}
                    onChange={(v) => {
                      setDraft(i, "valorUnitario", v);
                      const parsed = parseDecimalBR(v);
                      if (parsed != null) update(i, { valorUnitario: parsed }, "unitario");
                    }}
                    onBlur={() => clearDraft(i, "valorUnitario")}
                  />
                  <MoneyField
                    label="Valor total"
                    placeholder="Ex.: R$ 22.500,00"
                    value={drafts[`${i}.valorTotal`] ?? formatCurrencyBR(n.valorTotal)}
                    onChange={(v) => {
                      setDraft(i, "valorTotal", v);
                      const parsed = parseCurrencyBR(v);
                      if (parsed == null) return;
                      if (n.quantidade <= 0) {
                        toast.error("Informe uma quantidade maior que zero para calcular o valor unitário.");
                        return;
                      }
                      update(i, { valorTotal: parsed }, isManualNota(n) ? "none" : "total");
                    }}
                    onBlur={() => clearDraft(i, "valorTotal")}
                  />
                  <TipoFreteSelect value={n.tpFrete} onChange={(v) => update(i, { tpFrete: v })} />
                  <F label="Placa do veículo" value={n.placaVeiculo} onChange={(v) => update(i, { placaVeiculo: v })} />
                  <F label="Transportador" value={n.transportador} onChange={(v) => update(i, { transportador: v })} />
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader><CardTitle className="text-base">Emitente / Destinatário</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {isManualNota(n) ? (
                    <>
                      <PartyFields title="Emitente (Produtor)" party={n.emitente} onChange={(emitente) => update(i, { emitente }, "none")} />
                      <PartyFields
                        title="Destinatário"
                        party={n.destinatario}
                        action={
                          <Button type="button" variant="outline" size="sm" onClick={() => setCadastroSearchIdx(i)}>
                            <Search className="mr-1 h-3.5 w-3.5" /> Buscar cadastro
                          </Button>
                        }
                        onChange={(destinatario) => update(i, { destinatario }, "none")}
                      />
                    </>
                  ) : (
                    <>
                      <div className="rounded-md border p-3 text-sm">
                        <div className="mb-1 font-semibold text-primary">Emitente (Produtor)</div>
                        <div>{n.emitente.nome}</div>
                        <div className="text-muted-foreground">{n.emitente.cpfCnpj} · IE {n.emitente.ie || "-"}</div>
                        <div className="text-muted-foreground">{n.emitente.municipio}/{n.emitente.uf}</div>
                      </div>
                      <div className="rounded-md border p-3 text-sm">
                        <div className="mb-1 font-semibold text-primary">Destinatário</div>
                        <div>{n.destinatario.nome}</div>
                        <div className="text-muted-foreground">{n.destinatario.cpfCnpj} · IE {n.destinatario.ie || "-"}</div>
                        <div className="text-muted-foreground">{n.destinatario.municipio}/{n.destinatario.uf}</div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {isManualNota(n) && (
                <Card className="shadow-card">
                  <CardHeader><CardTitle className="text-base">Produto</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <F label="Código do produto" value={n.produto.codigo} onChange={(v) => update(i, { produto: { ...n.produto, codigo: v } }, "none")} />
                    <F label="Descrição" value={n.produto.descricao} onChange={(v) => update(i, { produto: { ...n.produto, descricao: v } }, "none")} />
                    <F label="NCM" value={n.produto.ncm} onChange={(v) => update(i, { produto: { ...n.produto, ncm: v } }, "none")} />
                    <F label="CST" value={n.produto.cst} onChange={(v) => update(i, { produto: { ...n.produto, cst: v } }, "none")} />
                    <F label="Unidade" value={n.produto.unidade} onChange={(v) => update(i, { produto: { ...n.produto, unidade: v } }, "none")} />
                  </CardContent>
                </Card>
              )}

              <Card className="shadow-card">
                <CardHeader><CardTitle className="text-base">Dados adicionais</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Textarea rows={6} value={n.dadosAdicionais} onChange={(e) => update(i, { dadosAdicionais: e.target.value })} />
                  <div className="space-y-1.5">
                    <Label>Observação</Label>
                    <Textarea rows={2} value={n.observacao} onChange={(e) => update(i, { observacao: e.target.value })} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <CadastroDestinatarioDialog
        open={isCadastroSearchOpen}
        cooperativas={cooperativas}
        armazens={armazens}
        loading={loadingCooperativas || loadingArmazens}
        onOpenChange={(open) => {
          if (!open) setCadastroSearchIdx(null);
        }}
        onSelect={(party) => {
          if (cadastroSearchIdx == null) return;
          update(cadastroSearchIdx, { destinatario: party }, "none");
          setCadastroSearchIdx(null);
          toast.success("Destinatário preenchido com os dados do cadastro selecionado.");
        }}
      />
    </Layout>
  );
}

function Rft006Preview({ nota, onChange }: { nota: Nota; onChange: (patch: Partial<Nota>, manualDadosAdicionais?: boolean) => void }) {
  const itens = nota.itens ?? [];
  const updateItem = (index: number, field: keyof NotaRft006Item, value: string) => {
    // No RFT006 cada valor financeiro é deliberadamente independente; não há recálculo fiscal implícito.
    const numeric = ["quantidade", "valorUnitario", "valorBruto", "desconto", "valorLiquido"].includes(field);
    const next = itens.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: numeric ? Number(value) : value } : item);
    onChange({ itens: next });
  };
  const partyField = (target: "emitente" | "destinatario", field: keyof NotaParty, value: string) => onChange({ [target]: { ...nota[target], [field]: value } });
  return <TabsContent value="0" className="space-y-4">
    <Card className="shadow-card"><CardHeader><CardTitle className="text-base">Referência e dados fiscais</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><F label="Nota de referência" value={nota.notaReferencia ?? ""} onChange={(value) => onChange({ notaReferencia: value })} /><F label="CFOP" value={nota.cfop} onChange={(value) => onChange({ cfop: value })} /><F label="CST" value={nota.cst ?? ""} onChange={(value) => onChange({ cst: value, produto: { ...nota.produto, cst: value } })} /><F label="Natureza da operação" value={nota.naturezaOperacao} onChange={(value) => onChange({ naturezaOperacao: value })} /></CardContent></Card>
    <Card className="shadow-card"><CardHeader><CardTitle className="text-base">Emitente / Destinatário</CardTitle></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2"><div className="rounded-md border p-3"><h3 className="mb-3 font-semibold text-primary">Emitente</h3><div className="grid gap-3 sm:grid-cols-2"><F label="Razão social" value={nota.emitente.nome} onChange={(v) => partyField("emitente", "nome", v)} /><F label="CPF/CNPJ" value={nota.emitente.cpfCnpj} onChange={(v) => partyField("emitente", "cpfCnpj", v)} /><F label="IE (opcional)" value={nota.emitente.ie} onChange={(v) => partyField("emitente", "ie", v)} /></div></div><PartyFields title="Destinatário" party={nota.destinatario} onChange={(destinatario) => onChange({ destinatario })} /></CardContent></Card>
    <Card className="shadow-card"><CardHeader><CardTitle className="text-base">Itens ({itens.length})</CardTitle></CardHeader><CardContent className="overflow-x-auto p-0"><Table className="min-w-[1100px]"><TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>NCM</TableHead><TableHead>Un.</TableHead><TableHead>Quantidade</TableHead><TableHead>Valor unitário</TableHead><TableHead>Valor bruto</TableHead><TableHead>Desconto</TableHead><TableHead>Valor líquido</TableHead></TableRow></TableHeader><TableBody>{itens.map((item, index) => <TableRow key={index}><EditCell value={item.descricao} onChange={(v) => updateItem(index, "descricao", v)} /><EditCell value={item.ncm} onChange={(v) => updateItem(index, "ncm", v)} /><EditCell value={item.unidade} onChange={(v) => updateItem(index, "unidade", v)} /><EditCell type="number" value={String(item.quantidade)} onChange={(v) => updateItem(index, "quantidade", v)} /><EditCell type="number" value={String(item.valorUnitario)} onChange={(v) => updateItem(index, "valorUnitario", v)} /><EditCell type="number" value={String(item.valorBruto)} onChange={(v) => updateItem(index, "valorBruto", v)} /><EditCell type="number" value={String(item.desconto)} onChange={(v) => updateItem(index, "desconto", v)} /><EditCell type="number" value={String(item.valorLiquido)} onChange={(v) => updateItem(index, "valorLiquido", v)} /></TableRow>)}</TableBody></Table><div className="flex justify-end gap-5 border-t p-3 text-sm"><span>Bruto: <strong>{formatCurrencyBR(nota.valorTotal)}</strong></span><span>Desconto: <strong>{formatCurrencyBR(nota.valorDesconto ?? 0)}</strong></span><span>Líquido: <strong>{formatCurrencyBR(nota.valorLiquido ?? 0)}</strong></span></div></CardContent></Card>
    <Card className="shadow-card"><CardHeader><CardTitle className="text-base">Dados adicionais</CardTitle></CardHeader><CardContent><Textarea rows={6} value={nota.dadosAdicionais} onChange={(event) => onChange({ dadosAdicionais: event.target.value }, true)} /></CardContent></Card>
  </TabsContent>;
}

function EditCell({ value, onChange, type = "text" }: { value: string; onChange: (value: string) => void; type?: string }) {
  return <TableCell className="p-2"><Input className="min-w-24" type={type} step={type === "number" ? "any" : undefined} value={value} onChange={(event) => onChange(event.target.value)} /></TableCell>;
}

function PartyFields({ title, party, action, onChange }: { title: string; party: NotaParty; action?: ReactNode; onChange: (party: NotaParty) => void }) {
  const setField = (field: keyof NotaParty, value: string) => onChange({ ...party, [field]: value });

  return (
    <div className="rounded-md border p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-primary">{title}</div>
        {action}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <F label="Nome/Razão social" value={party.nome} onChange={(v) => setField("nome", v)} />
        <F label="CPF/CNPJ" value={party.cpfCnpj} onChange={(v) => setField("cpfCnpj", v)} />
        <F label="Inscrição estadual" value={party.ie} onChange={(v) => setField("ie", v)} />
        <F label="Endereço" value={party.endereco} onChange={(v) => setField("endereco", v)} />
        <F label="Bairro" value={party.bairro} onChange={(v) => setField("bairro", v)} />
        <F label="CEP" value={party.cep} onChange={(v) => setField("cep", v)} />
        <F label="Município" value={party.municipio} onChange={(v) => setField("municipio", v)} />
        <F label="UF" value={party.uf} onChange={(v) => setField("uf", v)} />
      </div>
    </div>
  );
}

type CadastroDestinatarioRow = {
  id: string;
  nome: string;
  cpfCnpj: string;
  municipio: string;
  uf: string;
  origem: "Cooperativa" | "Armazém/Destinatário";
  party: NotaParty;
  searchText: string;
};

const normalizeSearch = (value: string | null | undefined) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

function partyFromCadastro(row: Cooperativa | Armazem, origem: CadastroDestinatarioRow["origem"]): NotaParty {
  if (origem === "Cooperativa") {
    const cooperativa = row as Cooperativa;
    return {
      nome: cooperativa.razao_social || cooperativa.nome_grl019 || "",
      cpfCnpj: cooperativa.cnpj ?? "",
      ie: cooperativa.inscricao_estadual ?? "",
      endereco: cooperativa.endereco ?? "",
      bairro: cooperativa.bairro ?? "",
      cep: cooperativa.cep ?? "",
      municipio: cooperativa.municipio ?? "",
      uf: cooperativa.uf ?? "",
    };
  }

  const armazem = row as Armazem;
  return {
    nome: armazem.razao_social ?? "",
    cpfCnpj: armazem.cnpj_cpf ?? "",
    ie: armazem.inscricao_estadual ?? "",
    endereco: armazem.endereco ?? "",
    bairro: armazem.bairro ?? "",
    cep: armazem.cep ?? "",
    municipio: armazem.municipio ?? "",
    uf: armazem.uf ?? "",
  };
}

function CadastroDestinatarioDialog({
  open,
  cooperativas,
  armazens,
  loading,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  cooperativas: Cooperativa[];
  armazens: Armazem[];
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (party: NotaParty) => void;
}) {
  const [q, setQ] = useState("");

  const rows = useMemo<CadastroDestinatarioRow[]>(() => {
    const cooperativaRows = cooperativas
      .filter((cooperativa) => cooperativa.ativo !== false)
      .map((cooperativa) => {
        const party = partyFromCadastro(cooperativa, "Cooperativa");
        return {
          id: `cooperativa-${cooperativa.id}`,
          nome: party.nome,
          cpfCnpj: party.cpfCnpj,
          municipio: party.municipio,
          uf: party.uf,
          origem: "Cooperativa" as const,
          party,
          searchText: [cooperativa.razao_social, cooperativa.nome_grl019, cooperativa.cnpj, cooperativa.municipio, cooperativa.uf]
            .map(normalizeSearch)
            .join(""),
        };
      });

    const armazemRows = armazens
      .filter((armazem) => armazem.ativo !== false)
      .map((armazem) => {
        const party = partyFromCadastro(armazem, "Armazém/Destinatário");
        return {
          id: `armazem-${armazem.id}`,
          nome: party.nome,
          cpfCnpj: party.cpfCnpj,
          municipio: party.municipio,
          uf: party.uf,
          origem: "Armazém/Destinatário" as const,
          party,
          searchText: [armazem.razao_social, armazem.cnpj_cpf, armazem.municipio, armazem.uf]
            .map(normalizeSearch)
            .join(""),
        };
      });

    return [...cooperativaRows, ...armazemRows].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  }, [armazens, cooperativas]);

  const filtered = useMemo(() => {
    const term = normalizeSearch(q).trim();
    if (!term) return rows;
    return rows.filter((row) => row.searchText.includes(term));
  }, [q, rows]);

  const select = (party: NotaParty) => {
    onSelect(party);
    setQ("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Buscar cadastro do destinatário</DialogTitle>
          <DialogDescription>
            Selecione um cadastro para preencher o destinatário da nota avulsa. Os campos continuarão editáveis após a seleção.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, CPF/CNPJ, município ou UF..."
              className="pl-9"
            />
          </div>
          <div className="max-h-[420px] overflow-auto rounded-md border">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead>Município/UF</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="w-24 text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum cadastro encontrado.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.nome || "-"}</TableCell>
                      <TableCell>{row.cpfCnpj || "-"}</TableCell>
                      <TableCell>{[row.municipio, row.uf].filter(Boolean).join("/") || "-"}</TableCell>
                      <TableCell>{row.origem}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" size="sm" variant="outline" onClick={() => select(row.party)}>
                          Selecionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TipoFreteSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>Tipo de frete</Label>
      <Select value={normalizeTipoFrete(value)} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIPO_FRETE_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MoneyField({
  label,
  value,
  placeholder,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input inputMode="decimal" placeholder={placeholder} value={value} onBlur={onBlur} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function F({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
