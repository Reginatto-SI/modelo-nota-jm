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
import { Download, AlertTriangle } from "lucide-react";
import type { Nota } from "@/lib/nota";
import { hasPendingPlaceholders } from "@/lib/nota";
import { generatePdf } from "@/lib/pdf";
import { toast } from "sonner";

// Opções fixas de frete da NF-e, sem cadastro ou dependência de banco de dados.
const TIPO_FRETE_OPTIONS = [
  "0 - Por conta do Emitente",
  "1 - Por conta do Destinatário/Remetente",
  "2 - Por conta de Terceiros",
  "3 - Transporte próprio por conta do Remetente",
  "4 - Transporte próprio por conta do Destinatário",
  "9 - Sem cobrança de frete",
] as const;

const TIPO_FRETE_DEFAULT = "1 - Por conta do Destinatário/Remetente";

function normalizeTipoFrete(value?: string | null) {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) return TIPO_FRETE_DEFAULT;
  const byCodeOrLabel = TIPO_FRETE_OPTIONS.find(
    (option) => option.startsWith(normalized) || option.toLowerCase() === normalized,
  );
  if (byCodeOrLabel) return byCodeOrLabel;

  if (["não paga frete", "nao paga frete", "sem cobranca de frete", "sem cobrança de frete"].includes(normalized)) {
    return "9 - Sem cobrança de frete";
  }

  return TIPO_FRETE_DEFAULT;
}

export default function Preview() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { notas: Nota[]; warnings: string[] } | null;
  const [notas, setNotas] = useState<Nota[]>(() =>
    (state?.notas ?? []).map((nota) => ({ ...nota, tpFrete: normalizeTipoFrete(nota.tpFrete) })),
  );

  if (!state || notas.length === 0) return <Navigate to="/pesquisa" replace />;

  const update = (idx: number, patch: Partial<Nota>) => {
    setNotas((prev) => prev.map((n, i) => {
      if (i !== idx) return n;
      const merged = { ...n, ...patch };
      merged.valorTotal = merged.quantidade * merged.valorUnitario;
      return merged;
    }));
  };

  const gerarPdf = () => {
    const pend = notas.some((n) => hasPendingPlaceholders(n.dadosAdicionais));
    if (pend) toast.warning("Há placeholders pendentes nos dados adicionais (ex.: ####). Revise antes de enviar.");
    if (notas.some((n) => n.quantidade <= 0 || n.valorUnitario <= 0 || n.valorTotal <= 0)) {
      return toast.error("Quantidade e valores devem ser maiores que zero.");
    }
    generatePdf(notas, `modelo-nota-jm-${notas.map((n) => n.cfop).join("-")}.pdf`);
    toast.success("PDF gerado.");
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
            <Button onClick={gerarPdf}><Download className="mr-1 h-4 w-4" /> Gerar PDF</Button>
          </div>
        </div>

        {state.warnings?.length > 0 && (
          <Card className="border-warning/40 bg-warning/10">
            <CardContent className="space-y-1 py-3 text-sm">
              {state.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-warning-foreground">
                  <AlertTriangle className="h-4 w-4 text-warning" /> {w}
                </div>
              ))}
            </CardContent>
          </Card>
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
                  <F label="Data emissão" type="date" value={n.dataEmissao} onChange={(v) => update(i, { dataEmissao: v })} />
                  <F label="Data saída" type="date" value={n.dataSaida} onChange={(v) => update(i, { dataSaida: v })} />
                  <F label="Hora saída" value={n.horaSaida} onChange={(v) => update(i, { horaSaida: v })} />
                  <F label="Quantidade (KG)" type="number" value={String(n.quantidade)} onChange={(v) => update(i, { quantidade: Number(v) })} />
                  <F label="Valor unitário (R$/KG)" type="number" value={String(n.valorUnitario)} onChange={(v) => update(i, { valorUnitario: Number(v) })} />
                  <div className="space-y-1.5">
                    <Label>Valor total</Label>
                    <Input readOnly value={n.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                  </div>
                  <TipoFreteSelect value={n.tpFrete} onChange={(v) => update(i, { tpFrete: v })} />
                  <F label="Placa do veículo" value={n.placaVeiculo} onChange={(v) => update(i, { placaVeiculo: v })} />
                  <F label="Transportador" value={n.transportador} onChange={(v) => update(i, { transportador: v })} />
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader><CardTitle className="text-base">Emitente / Destinatário</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                </CardContent>
              </Card>

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

function F({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
