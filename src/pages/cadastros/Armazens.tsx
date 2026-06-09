import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CrudPage, AtivoBadge, type FieldDef, type ColumnDef } from "@/components/cadastro/CrudPage";
import { useArmazens, useSaveArmazem, useDeleteArmazem } from "@/lib/db";
import type { Armazem } from "@/lib/types";

const fields: FieldDef[] = [
  { name: "razao_social", label: "Razão Social", full: true },
  { name: "cnpj_cpf", label: "CNPJ / CPF", helper: "Chave principal para evitar duplicidade; o sistema compara apenas números." },
  { name: "inscricao_estadual", label: "Inscrição Estadual" },
  {
    name: "tipo",
    label: "Tipo",
    type: "select",
    options: [
      { value: "armazem", label: "Armazém" },
      { value: "industria", label: "Indústria" },
      { value: "destinatario_final", label: "Destinatário Final" },
      { value: "outro", label: "Outro / pendente" },
    ],
    helper: "Pré-cadastros do GRL019 podem ficar como Outro / pendente até validação manual.",
  },
  { name: "endereco", label: "Endereço", full: true },
  { name: "bairro", label: "Bairro", helper: "Campo normalmente pendente quando o registro vem do GRL019." },
  { name: "cep", label: "CEP", helper: "Campo normalmente pendente quando o registro vem do GRL019." },
  { name: "municipio", label: "Município" },
  { name: "uf", label: "UF" },
  { name: "telefone", label: "Telefone", helper: "Campo normalmente pendente quando o registro vem do GRL019." },
  { name: "ativo", label: "Ativo", type: "switch" },
];

function formatTipo(tipo: string | null | undefined) {
  const labels: Record<string, string> = {
    armazem: "Armazém",
    industria: "Indústria",
    destinatario_final: "Destinatário final",
    outro: "Outro / pendente",
  };
  return labels[tipo ?? ""] ?? tipo ?? "-";
}

function origemBadge(armazem: Armazem) {
  return armazem.origem_cadastro === "grl019" ? <Badge variant="secondary">GRL019</Badge> : <Badge variant="outline">Manual</Badge>;
}

function dadosCompletos(armazem: Armazem) {
  // A situação visual usa os campos do próprio cadastro; não consulta nem persiste o GRL019 completo.
  return Boolean(
    armazem.razao_social?.trim() &&
      armazem.cnpj_cpf?.trim() &&
      armazem.inscricao_estadual?.trim() &&
      armazem.endereco?.trim() &&
      armazem.municipio?.trim() &&
      armazem.uf?.trim() &&
      armazem.bairro?.trim() &&
      armazem.cep?.trim() &&
      armazem.telefone?.trim() &&
      armazem.tipo &&
      armazem.tipo !== "outro",
  );
}

const columns: ColumnDef<Armazem>[] = [
  { key: "razao_social", label: "Razão Social", className: "max-w-[220px] truncate" },
  { key: "cnpj_cpf", label: "CNPJ/CPF" },
  { key: "tipo", label: "Tipo", render: (r) => formatTipo(r.tipo) },
  { key: "municipio", label: "Município/UF", render: (r) => [r.municipio, r.uf].filter(Boolean).join("/") || "-" },
  { key: "origem_cadastro", label: "Origem", render: origemBadge },
  {
    key: "dados_completos",
    label: "Situação dos dados",
    render: (r) => dadosCompletos(r) ? <Badge>Completo</Badge> : <Badge variant="secondary">Dados pendentes</Badge>,
  },
  { key: "ativo", label: "Status", render: (r) => <AtivoBadge ativo={r.ativo} /> },
];

export default function Armazens() {
  const { data = [], isLoading } = useArmazens();
  const save = useSaveArmazem();
  const del = useDeleteArmazem();
  const total = data.length;
  const importadosGrl019 = data.filter((armazem) => armazem.origem_cadastro === "grl019").length;
  const completos = data.filter(dadosCompletos).length;
  const pendentes = total - completos;

  return (
    <Layout>
      <div className="space-y-4">
        <Card className="shadow-card">
          <CardContent className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-4">
            <Resumo label="Total" value={total} />
            <Resumo label="Via GRL019" value={importadosGrl019} />
            <Resumo label="Pendentes" value={pendentes} warn={pendentes > 0} />
            <Resumo label="Completos" value={completos} ok={completos > 0} />
          </CardContent>
        </Card>

        <CrudPage
          title="Armazéns / Destinatários"
          description="Base global usada nos modelos de nota, com pré-cadastro automático a partir do GRL019."
          data={data}
          loading={isLoading}
          fields={fields}
          columns={columns}
          empty={{ ativo: true, tipo: "armazem", origem_cadastro: "manual" }}
          searchKeys={["razao_social", "cnpj_cpf", "municipio", "uf"]}
          tableDensity="compact"
          // Qualquer edição no CRUD passa a ser considerada validação manual e fica protegida de enriquecimento automático.
          onSave={(r) => save.mutateAsync({ ...r, origem_cadastro: "manual" })}
          onDelete={(id) => del.mutateAsync(id)}
        />
      </div>
    </Layout>
  );
}

function Resumo({ label, value, ok, warn }: { label: string; value: number; ok?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={ok ? "text-lg font-semibold text-success" : warn ? "text-lg font-semibold text-warning" : "text-lg font-semibold"}>
        {value}
      </div>
    </div>
  );
}
