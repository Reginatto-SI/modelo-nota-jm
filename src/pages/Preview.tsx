import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download } from "lucide-react";
import type { Nota } from "@/lib/nota";
import { buildNotaPdfFileName, createManualCloneFromPreview, syncPlacaCavaloPlaceholder, type NotaParty } from "@/lib/nota";
import { generatePdf } from "@/lib/pdf";
import { TIPO_FRETE_OPTIONS, normalizeTipoFrete } from "@/lib/tipoFrete";
import { toast } from "sonner";
import { formatCurrencyBR, formatUnitValueBR, parseCurrencyBR, parseDecimalBR } from "@/lib/numberFormat";

export default function Preview() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { notas: Nota[]; warnings: string[] } | null;
  const [notas, setNotas] = useState<Nota[]>(() =>
    (state?.notas ?? []).map((nota) => ({ ...nota, tpFrete: normalizeTipoFrete(nota.tpFrete) })),
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (!state || notas.length === 0) return <Navigate to="/pesquisa" replace />;

  const isManualClone = notas.some((nota) => nota.isManualClone || nota.sourceType === "manual_clone");

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
    nota.isManualClone && (
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
    notas.forEach((nota) => generatePdf([nota], buildNotaPdfFileName(nota)));
    toast.success(notas.length > 1 ? "PDFs gerados separadamente." : "PDF gerado.");
  };

  const gerarPdfConfirmado = () => {
    const primeiraNotaComPlaceholder = notas.find((n) => n.isManualClone && hasPendingPlaceholders(n));
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
    const primeiraNotaSemPartes = notas.find((n) => n.isManualClone && (isBlank(n.emitente.nome) || isBlank(n.destinatario.nome) || isBlank(n.produto.descricao)));
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
            <Button variant="outline" onClick={() => navigate("/pesquisa")}>Voltar</Button>
            {!isManualClone && (
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

        <Tabs defaultValue="0">
          <TabsList>
            {notas.map((n, i) => (
              <TabsTrigger key={i} value={String(i)}>Modelo CFOP {n.cfop}</TabsTrigger>
            ))}
          </TabsList>
          {notas.map((n, i) => (
            <TabsContent key={i} value={String(i)} className="space-y-4">
              <Card className="shadow-card">
                <CardHeader><CardTitle className="text-base">{n.nomeModelo} — {n.naturezaOperacao}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {n.isManualClone && (
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
                      update(i, { valorTotal: parsed }, n.isManualClone ? "none" : "total");
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
                  {n.isManualClone ? (
                    <>
                      <PartyFields title="Emitente (Produtor)" party={n.emitente} onChange={(emitente) => update(i, { emitente }, "none")} />
                      <PartyFields title="Destinatário" party={n.destinatario} onChange={(destinatario) => update(i, { destinatario }, "none")} />
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

              {n.isManualClone && (
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

    </Layout>
  );
}

function PartyFields({ title, party, onChange }: { title: string; party: NotaParty; onChange: (party: NotaParty) => void }) {
  const setField = (field: keyof NotaParty, value: string) => onChange({ ...party, [field]: value });

  return (
    <div className="rounded-md border p-3">
      <div className="mb-3 font-semibold text-primary">{title}</div>
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
