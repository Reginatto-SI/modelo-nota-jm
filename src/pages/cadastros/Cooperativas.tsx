import { Layout } from "@/components/Layout";
import { CrudPage, AtivoBadge, type FieldDef, type ColumnDef } from "@/components/cadastro/CrudPage";
import { useCooperativas, useSaveCooperativa, useDeleteCooperativa } from "@/lib/db";
import type { Cooperativa } from "@/lib/types";

const fields: FieldDef[] = [
  { name: "nome_grl019", label: "Nome no GRL019 (coluna EMPRESA)", full: true, helper: "Deve ser idêntico ao texto da coluna EMPRESA no relatório." },
  { name: "razao_social", label: "Razão Social", full: true },
  { name: "cnpj", label: "CNPJ" },
  { name: "inscricao_estadual", label: "Inscrição Estadual" },
  { name: "endereco", label: "Endereço", full: true },
  { name: "bairro", label: "Bairro" },
  { name: "cep", label: "CEP" },
  { name: "municipio", label: "Município" },
  { name: "uf", label: "UF" },
  { name: "telefone", label: "Telefone" },
  { name: "email", label: "E-mail" },
  { name: "ativo", label: "Ativo", type: "switch" },
];

const columns: ColumnDef<Cooperativa>[] = [
  { key: "nome_grl019", label: "Nome GRL019" },
  { key: "razao_social", label: "Razão Social" },
  { key: "cnpj", label: "CNPJ" },
  { key: "ativo", label: "Status", render: (r) => <AtivoBadge ativo={r.ativo} /> },
];

export default function Cooperativas() {
  const { data = [], isLoading } = useCooperativas();
  const save = useSaveCooperativa();
  const del = useDeleteCooperativa();
  return (
    <Layout>
      <CrudPage
        title="Cooperativas"
        description="Cadastro das cooperativas identificadas pela coluna EMPRESA do GRL019."
        data={data}
        loading={isLoading}
        fields={fields}
        columns={columns}
        empty={{ ativo: true }}
        searchKeys={["nome_grl019", "razao_social", "cnpj"]}
        onSave={(r) => save.mutateAsync(r)}
        onDelete={(id) => del.mutateAsync(id)}
      />
    </Layout>
  );
}
