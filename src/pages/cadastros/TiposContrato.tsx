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
import { toast } from "sonner";

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
    { key: "cooperativa_id", label: "Cooperativa", render: (r) => coopName(r.cooperativa_id) },
    { key: "codigo_contrato", label: "Código" },
    { key: "descricao_contrato", label: "Descrição" },
    { key: "modelo_nota_id", label: "Modelo", render: (r) => modeloLabel(r.modelo_nota_id) },
    { key: "ativo", label: "Status", render: (r) => <AtivoBadge ativo={r.ativo} /> },
  ];

  const normalize = (value: unknown) => String(value ?? "").trim().toUpperCase();

  const saveTipoContrato = async (record: Partial<TipoContrato>) => {
    if (!record.cooperativa_id) {
      toast.error("Selecione a cooperativa de destino.");
      throw new Error("Cooperativa de destino não selecionada.");
    }

    const duplicado = data.some((item) => {
      const mesmoRegistro = record.id && item.id === record.id;
      return (
        !mesmoRegistro &&
        item.cooperativa_id === record.cooperativa_id &&
        normalize(item.codigo_contrato) === normalize(record.codigo_contrato) &&
        item.modelo_nota_id === record.modelo_nota_id
      );
    });

    if (duplicado) {
      toast.error("Já existe uma regra cadastrada para esta cooperativa, código e modelo.");
      throw new Error("Regra duplicada para cooperativa, código e modelo.");
    }

    await save.mutateAsync(record);
  };

  const duplicateTipoContrato = (row: TipoContrato): Partial<TipoContrato> => {
    // A cooperativa fica vazia na duplicação para forçar a escolha consciente do destino.
    return {
      codigo_contrato: row.codigo_contrato,
      descricao_contrato: row.descricao_contrato,
      tp_faturamento: row.tp_faturamento,
      cfop: row.cfop,
      modelo_nota_id: row.modelo_nota_id,
      exige_contrato_vinculado: row.exige_contrato_vinculado,
      gera_operacao_casada: row.gera_operacao_casada,
      ativo: row.ativo,
    };
  };

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
        onSave={saveTipoContrato}
        onDelete={(id) => del.mutateAsync(id)}
        onDuplicate={duplicateTipoContrato}
        duplicateTitle="Criar regra a partir desta"
      />
    </Layout>
  );
}
