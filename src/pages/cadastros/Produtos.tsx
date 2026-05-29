import { Layout } from "@/components/Layout";
import { CrudPage, AtivoBadge, type FieldDef, type ColumnDef } from "@/components/cadastro/CrudPage";
import { useProdutos, useSaveProduto, useDeleteProduto } from "@/lib/db";
import type { Produto } from "@/lib/types";

const fields: FieldDef[] = [
  { name: "codigo_produto", label: "Código do Produto (COD.ITEM)", helper: "Deve corresponder à coluna COD.ITEM do GRL019." },
  { name: "unidade", label: "Unidade", placeholder: "KG" },
  { name: "descricao", label: "Descrição", full: true },
  { name: "ncm", label: "NCM" },
  { name: "cst_icms", label: "CST ICMS" },
  { name: "ativo", label: "Ativo", type: "switch" },
];

const columns: ColumnDef<Produto>[] = [
  { key: "codigo_produto", label: "Código" },
  { key: "descricao", label: "Descrição" },
  { key: "ncm", label: "NCM" },
  { key: "cst_icms", label: "CST" },
  { key: "ativo", label: "Status", render: (r) => <AtivoBadge ativo={r.ativo} /> },
];

export default function Produtos() {
  const { data = [], isLoading } = useProdutos();
  const save = useSaveProduto();
  const del = useDeleteProduto();
  return (
    <Layout>
      <CrudPage
        title="Produtos"
        description="Produtos com NCM e CST, vinculados pelo código COD.ITEM do GRL019."
        data={data}
        loading={isLoading}
        fields={fields}
        columns={columns}
        empty={{ ativo: true, unidade: "KG" }}
        searchKeys={["codigo_produto", "descricao", "ncm"]}
        onSave={(r) => save.mutateAsync(r)}
        onDelete={(id) => del.mutateAsync(id)}
      />
    </Layout>
  );
}
