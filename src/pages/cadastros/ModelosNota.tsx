import { Layout } from "@/components/Layout";
import { CrudPage, AtivoBadge, type FieldDef, type ColumnDef } from "@/components/cadastro/CrudPage";
import { useModelos, useSaveModelo, useDeleteModelo, useCooperativas } from "@/lib/db";
import type { ModeloNota } from "@/lib/types";

const TEMPLATE_EXEMPLO =
  "Contrato: {{contrato}} / Vinculado: {{contrato_vinculado}}\nProdutor: {{produtor_nome}} - CPF/CNPJ: {{produtor_cpf_cnpj}}\nProduto: {{produto}} - NCM: {{ncm}}\nQtd: {{quantidade}} KG x R$ {{valor_unitario}} = R$ {{valor_total}}\nPLACA CAVALO: {{placa_cavalo}}\nCND PRODUTOR NUM: {{cnd_produtor_numero}} COD.AUT: {{cnd_produtor_codigo_autenticacao}} VENC: {{cnd_produtor_vencimento}}";

export default function ModelosNota() {
  const { data: coops = [] } = useCooperativas();
  const { data = [], isLoading } = useModelos();
  const save = useSaveModelo();
  const del = useDeleteModelo();

  const fields: FieldDef[] = [
    {
      name: "cooperativa_id",
      label: "Cooperativa",
      type: "select",
      full: true,
      options: coops.map((c) => ({ value: c.id, label: c.razao_social })),
    },
    { name: "cfop", label: "CFOP", type: "select", options: [
      { value: "5118", label: "5118" },
      { value: "5923", label: "5923" },
      { value: "5132", label: "5132" },
    ] },
    {
      name: "tipo_destinatario",
      label: "Tipo de Destinatário",
      type: "select",
      options: [
        { value: "cooperativa", label: "Cooperativa" },
        { value: "armazem_destinatario", label: "Armazém / Destinatário" },
      ],
    },
    { name: "nome_modelo", label: "Nome do Modelo", full: true },
    { name: "natureza_operacao", label: "Natureza da Operação", full: true },
    { name: "dados_adicionais_template", label: "Template de Dados Adicionais", type: "textarea", helper: "Use variáveis como {{produtor_nome}}, {{produto}}, {{valor_total}}, {{placa_cavalo}}..." },
    { name: "ativo", label: "Ativo", type: "switch" },
  ];

  const coopName = (id: string) => coops.find((c) => c.id === id)?.razao_social ?? "-";

  const columns: ColumnDef<ModeloNota>[] = [
    { key: "cfop", label: "CFOP" },
    { key: "nome_modelo", label: "Modelo" },
    { key: "cooperativa_id", label: "Cooperativa", render: (r) => coopName(r.cooperativa_id) },
    { key: "tipo_destinatario", label: "Destinatário" },
    { key: "ativo", label: "Status", render: (r) => <AtivoBadge ativo={r.ativo} /> },
  ];

  return (
    <Layout>
      <CrudPage
        title="Modelos de Nota"
        description="Modelos CFOP 5118, 5923 e 5132 por cooperativa, com template de dados adicionais."
        data={data}
        loading={isLoading}
        fields={fields}
        columns={columns}
        empty={{ ativo: true, tipo_destinatario: "cooperativa", cfop: "5118", dados_adicionais_template: TEMPLATE_EXEMPLO }}
        searchKeys={["cfop", "nome_modelo"]}
        onSave={(r) => save.mutateAsync(r)}
        onDelete={(id) => del.mutateAsync(id)}
      />
    </Layout>
  );
}
