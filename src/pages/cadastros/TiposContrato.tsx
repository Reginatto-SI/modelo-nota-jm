import { Layout } from "@/components/Layout";
import { CrudPage, AtivoBadge, type FieldDef, type ColumnDef } from "@/components/cadastro/CrudPage";
import {
  useTiposContrato,
  useSaveTipoContrato,
  useDeleteTipoContrato,
  useCooperativas,
  useModelos,
} from "@/lib/db";
import type { TipoContrato } from "@/lib/types";

export default function TiposContrato() {
  const { data: coops = [] } = useCooperativas();
  const { data: modelos = [] } = useModelos();
  const { data = [], isLoading } = useTiposContrato();
  const save = useSaveTipoContrato();
  const del = useDeleteTipoContrato();

  const fields: FieldDef[] = [
    {
      name: "cooperativa_id",
      label: "Cooperativa",
      type: "select",
      full: true,
      options: coops.map((c) => ({ value: c.id, label: c.razao_social })),
    },
    { name: "codigo_contrato", label: "Código do Contrato (COD.CONTRATO)" },
    { name: "descricao_contrato", label: "Descrição do Contrato" },
    {
      name: "tp_faturamento",
      label: "TP Faturamento",
      type: "select",
      options: [
        { value: "RECEBIMENTO", label: "RECEBIMENTO" },
        { value: "EXPEDIÇÃO", label: "EXPEDIÇÃO" },
      ],
    },
    { name: "cfop", label: "CFOP (informativo)", helper: "O CFOP oficial vem do modelo vinculado." },
    {
      name: "modelo_nota_id",
      label: "Modelo de Nota",
      type: "select",
      full: true,
      options: modelos.map((m) => ({ value: m.id, label: `CFOP ${m.cfop} — ${m.nome_modelo}` })),
    },
    { name: "exige_contrato_vinculado", label: "Exige contrato vinculado", type: "switch" },
    { name: "gera_operacao_casada", label: "Gera operação casada", type: "switch" },
    { name: "ativo", label: "Ativo", type: "switch" },
  ];

  const coopName = (id: string) => coops.find((c) => c.id === id)?.razao_social ?? "-";
  const modeloLabel = (id: string | null) => {
    const m = modelos.find((x) => x.id === id);
    return m ? `CFOP ${m.cfop}` : "—";
  };

  const columns: ColumnDef<TipoContrato>[] = [
    { key: "codigo_contrato", label: "Código" },
    { key: "descricao_contrato", label: "Descrição" },
    { key: "cooperativa_id", label: "Cooperativa", render: (r) => coopName(r.cooperativa_id) },
    { key: "modelo_nota_id", label: "Modelo", render: (r) => modeloLabel(r.modelo_nota_id) },
    { key: "ativo", label: "Status", render: (r) => <AtivoBadge ativo={r.ativo} /> },
  ];

  return (
    <Layout>
      <CrudPage
        title="Tipos de Contrato"
        description="Parametrização por cooperativa. O CFOP correto é definido aqui, não pela descrição do GRL019."
        data={data}
        loading={isLoading}
        fields={fields}
        columns={columns}
        empty={{ ativo: true, exige_contrato_vinculado: false, gera_operacao_casada: false }}
        searchKeys={["codigo_contrato", "descricao_contrato"]}
        onSave={(r) => save.mutateAsync(r)}
        onDelete={(id) => del.mutateAsync(id)}
      />
    </Layout>
  );
}
