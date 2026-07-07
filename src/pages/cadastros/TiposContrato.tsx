import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const normalizeContractCode = (value: unknown) => String(value ?? "").trim().toUpperCase();
const normalizeText = (value: unknown) => String(value ?? "").trim().toUpperCase();

export function hasDuplicateTipoContrato(data: TipoContrato[], record: Partial<TipoContrato>) {
  // Permite regras fiscais alternativas para o mesmo contrato/TP quando o modelo muda.
  // A geração continua bloqueando múltiplas regras ativas para não escolher modelo errado silenciosamente.
  return data.some((item) => {
    const mesmoRegistro = record.id && item.id === record.id;
    return (
      !mesmoRegistro &&
      item.cooperativa_id === record.cooperativa_id &&
      normalizeContractCode(item.codigo_contrato) === normalizeContractCode(record.codigo_contrato) &&
      normalizeText(item.tp_faturamento) === normalizeText(record.tp_faturamento) &&
      item.modelo_nota_id === (record.modelo_nota_id ?? null)
    );
  });
}

export default function TiposContrato() {
  const { data: coops = [] } = useCooperativas();
  const { data: modelos = [] } = useModelos();
  const { data = [], isLoading } = useTiposContrato();
  const save = useSaveTipoContrato();
  const del = useDeleteTipoContrato();
  const [coopFilter, setCoopFilter] = useState("todas");
  const [contractFilter, setContractFilter] = useState("");
  const [tpFilter, setTpFilter] = useState("todos");

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

  const filteredData = useMemo(() => {
    const term = normalizeContractCode(contractFilter);

    return data.filter((item) => {
      const matchesCoop = coopFilter === "todas" || item.cooperativa_id === coopFilter;
      const matchesTp = tpFilter === "todos" || normalizeText(item.tp_faturamento) === tpFilter;
      const matchesContract =
        !term ||
        normalizeContractCode(item.codigo_contrato).includes(term) ||
        normalizeText(item.descricao_contrato).includes(term);

      return matchesCoop && matchesTp && matchesContract;
    });
  }, [contractFilter, coopFilter, data, tpFilter]);

  const clearFilters = () => {
    setCoopFilter("todas");
    setContractFilter("");
    setTpFilter("todos");
  };

  const saveTipoContrato = async (record: Partial<TipoContrato>) => {
    if (!record.cooperativa_id) {
      toast.error("Selecione a cooperativa de destino.");
      throw new Error("Cooperativa de destino não selecionada.");
    }

    const duplicado = hasDuplicateTipoContrato(data, record);

    if (duplicado) {
      toast.error("Já existe uma regra cadastrada para esta cooperativa, código, tipo de faturamento e modelo de nota.");
      throw new Error("Regra duplicada para cooperativa, código, tipo de faturamento e modelo de nota.");
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
        data={filteredData}
        loading={isLoading}
        fields={fields}
        columns={columns}
        empty={{ ativo: true, exige_contrato_vinculado: false, gera_operacao_casada: false }}
        searchKeys={["codigo_contrato", "descricao_contrato"]}
        showSearch={false}
        filterControls={
          <div className="rounded-lg border bg-card p-4 shadow-card">
            <div className="grid gap-3 md:grid-cols-[minmax(220px,1.4fr)_minmax(180px,1fr)_minmax(160px,0.7fr)_auto] md:items-end">
              <div className="space-y-1.5">
                <Label>Cooperativa</Label>
                <Select value={coopFilter} onValueChange={setCoopFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as cooperativas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as cooperativas</SelectItem>
                    {coops.map((coop) => (
                      <SelectItem key={coop.id} value={coop.id}>
                        {coop.razao_social || coop.nome_grl019 || coop.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de contrato</Label>
                <Input
                  value={contractFilter}
                  onChange={(event) => setContractFilter(event.target.value)}
                  placeholder="Buscar código ou descrição"
                />
              </div>

              <div className="space-y-1.5">
                <Label>TP Faturamento</Label>
                <Select value={tpFilter} onValueChange={setTpFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="RECEBIMENTO">RECEBIMENTO</SelectItem>
                    <SelectItem value="EXPEDIÇÃO">EXPEDIÇÃO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="button" variant="outline" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          </div>
        }
        onSave={saveTipoContrato}
        onDelete={(id) => del.mutateAsync(id)}
        onDuplicate={duplicateTipoContrato}
        duplicateTitle="Criar regra a partir desta"
      />
    </Layout>
  );
}
