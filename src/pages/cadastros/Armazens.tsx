import { Layout } from "@/components/Layout";
import { CrudPage, AtivoBadge, type FieldDef, type ColumnDef } from "@/components/cadastro/CrudPage";
import { useArmazens, useSaveArmazem, useDeleteArmazem } from "@/lib/db";
import type { Armazem } from "@/lib/types";

const fields: FieldDef[] = [
  { name: "razao_social", label: "Razão Social", full: true },
  { name: "cnpj_cpf", label: "CNPJ / CPF", helper: "Usado para identificar pelo CPF/CNPJ da linha de expedição." },
  { name: "inscricao_estadual", label: "Inscrição Estadual" },
  {
    name: "tipo",
    label: "Tipo",
    type: "select",
    options: [
      { value: "armazem", label: "Armazém" },
      { value: "industria", label: "Indústria" },
      { value: "destinatario_final", label: "Destinatário Final" },
      { value: "outro", label: "Outro" },
    ],
  },
  { name: "endereco", label: "Endereço", full: true },
  { name: "bairro", label: "Bairro" },
  { name: "cep", label: "CEP" },
  { name: "municipio", label: "Município" },
  { name: "uf", label: "UF" },
  { name: "telefone", label: "Telefone" },
  { name: "ativo", label: "Ativo", type: "switch" },
];

const columns: ColumnDef<Armazem>[] = [
  { key: "razao_social", label: "Razão Social" },
  { key: "cnpj_cpf", label: "CNPJ/CPF" },
  { key: "tipo", label: "Tipo" },
  { key: "municipio", label: "Município" },
  { key: "ativo", label: "Status", render: (r) => <AtivoBadge ativo={r.ativo} /> },
];

export default function Armazens() {
  const { data = [], isLoading } = useArmazens();
  const save = useSaveArmazem();
  const del = useDeleteArmazem();
  return (
    <Layout>
      <CrudPage
        title="Armazéns / Destinatários"
        description="Destinatários da operação casada (CFOP 5923), identificados pelo CPF/CNPJ da expedição."
        data={data}
        loading={isLoading}
        fields={fields}
        columns={columns}
        empty={{ ativo: true, tipo: "armazem" }}
        searchKeys={["razao_social", "cnpj_cpf", "municipio"]}
        onSave={(r) => save.mutateAsync(r)}
        onDelete={(id) => del.mutateAsync(id)}
      />
    </Layout>
  );
}
