import { Layout } from "@/components/Layout";
import { CrudPage, AtivoBadge, type FieldDef, type ColumnDef } from "@/components/cadastro/CrudPage";
import { useProdutos, useSaveProduto, useDeleteProduto } from "@/lib/db";
import type { Produto } from "@/lib/types";
import { toast } from "sonner";

const fields: FieldDef[] = [
  { name: "codigo_produto", label: "Código do Produto (COD.ITEM)", helper: "Deve corresponder à coluna COD.ITEM do GRL019." },
  { name: "unidade", label: "Unidade", placeholder: "KG" },
  { name: "descricao", label: "Descrição", full: true },
  { name: "ncm", label: "NCM" },
  { name: "cst_icms", label: "CST ICMS" },
  { name: "ativo", label: "Ativo", type: "switch" },
];

const normalizeCodigoProduto = (value?: string | null) => String(value ?? "").trim().toLowerCase();

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

  const validateAndSave = (record: Partial<Produto>) => {
    const codigo = normalizeCodigoProduto(record.codigo_produto);
    if (!codigo) {
      toast.error("Informe um código de produto antes de salvar.");
      return Promise.reject(new Error("Código do produto obrigatório."));
    }

    // Normaliza os códigos existentes para evitar quebra com registros legados sem codigo_produto.
    const duplicated = data.some(
      (produto) => produto.id !== record.id && normalizeCodigoProduto(produto.codigo_produto) === codigo,
    );
    if (duplicated) {
      toast.error("Já existe um produto cadastrado com este código.");
      return Promise.reject(new Error("Código do produto duplicado."));
    }

    return save.mutateAsync({
      ...record,
      codigo_produto: String(record.codigo_produto ?? "").trim(),
    });
  };

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
        tableDensity="compact"
        actionMode="menu"
        duplicateTitle="Duplicar produto"
        onDuplicate={(row) => ({
          codigo_produto: "",
          descricao: row.descricao,
          ncm: row.ncm,
          cst_icms: row.cst_icms,
          unidade: row.unidade,
          ativo: row.ativo,
        })}
        onSave={validateAndSave}
        onDelete={(id) => del.mutateAsync(id)}
      />
    </Layout>
  );
}
