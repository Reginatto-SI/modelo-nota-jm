import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Cooperativa, Armazem, Produto, ModeloNota, TipoContrato, Grl019Report, Grl019Row } from "./types";

type TableName = "cooperativas" | "armazens" | "produtos" | "modelos_nota" | "tipos_contrato";

function useList<T>(table: TableName, orderBy = "created_at") {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order(orderBy, { ascending: false });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

function useUpsert<T extends { id?: string }>(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Partial<T>) => {
      if ((record as { id?: string }).id) {
        const { id, ...rest } = record as Record<string, unknown>;
        const { error } = await supabase.from(table).update(rest as never).eq("id", id as string);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(record as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      toast.success("Registro salvo.");
    },
    onError: (e: Error) => toast.error("Erro ao salvar: " + e.message),
  });
}

function useRemove(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      toast.success("Registro excluído.");
    },
    onError: (e: Error) => toast.error("Erro ao excluir: " + e.message),
  });
}

function normalizeCpfCnpj(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function isBlank(value: string | null | undefined) {
  return !String(value ?? "").trim();
}

type ArmazemPreCadastro = Pick<
  Armazem,
  "razao_social" | "cnpj_cpf" | "inscricao_estadual" | "endereco" | "municipio" | "uf"
>;

function mergeIfBlank<T extends Record<string, string | null | undefined>>(base: T, next: Partial<T>) {
  const merged = { ...base };
  (Object.keys(next) as (keyof T)[]).forEach((key) => {
    if (isBlank(merged[key]) && !isBlank(next[key])) merged[key] = next[key];
  });
  return merged;
}

function rowToPreCadastro(row: Grl019Row): ArmazemPreCadastro {
  return {
    razao_social: row.nomeRazaoSocial,
    cnpj_cpf: row.cpfCnpj,
    inscricao_estadual: row.ie,
    endereco: row.endereco,
    municipio: row.municipio,
    uf: row.estado,
  };
}

export interface SyncArmazensFromGrl019Result {
  encontrados: number;
  criados: number;
  atualizados: number;
  protegidos: number;
  inalterados: number;
  ignorados: number;
}

export async function syncArmazensFromGrl019(report: Grl019Report): Promise<SyncArmazensFromGrl019Result> {
  const result: SyncArmazensFromGrl019Result = {
    encontrados: 0,
    criados: 0,
    atualizados: 0,
    protegidos: 0,
    inalterados: 0,
    ignorados: 0,
  };
  const candidates = new Map<string, ArmazemPreCadastro>();

  report.rows.forEach((row) => {
    const isExpedicao = row.tpFaturamento.toUpperCase().includes("EXPED");
    const cpfCnpjNormalizado = normalizeCpfCnpj(row.cpfCnpj);
    if (!isExpedicao) return;
    if (!cpfCnpjNormalizado || isBlank(row.nomeRazaoSocial)) {
      result.ignorados += 1;
      return;
    }

    const current = candidates.get(cpfCnpjNormalizado);
    const next = rowToPreCadastro(row);
    candidates.set(cpfCnpjNormalizado, current ? mergeIfBlank(current, next) : next);
  });

  result.encontrados = candidates.size;
  if (candidates.size === 0) return result;

  const { data, error } = await supabase.from("armazens").select("*");
  if (error) throw error;

  const existingByCpfCnpj = new Map<string, Armazem>();
  (data ?? []).forEach((armazem) => {
    const cpfCnpjNormalizado = normalizeCpfCnpj(armazem.cnpj_cpf);
    if (cpfCnpjNormalizado && !existingByCpfCnpj.has(cpfCnpjNormalizado)) {
      existingByCpfCnpj.set(cpfCnpjNormalizado, armazem as Armazem);
    }
  });

  const syncedAt = new Date().toISOString();

  for (const [cpfCnpjNormalizado, candidate] of candidates) {
    const existing = existingByCpfCnpj.get(cpfCnpjNormalizado);

    if (!existing) {
      const { error: insertError } = await supabase.from("armazens").insert({
        ...candidate,
        tipo: "outro",
        ativo: true,
        origem_cadastro: "grl019",
        ultima_sincronizacao_grl019: syncedAt,
      });
      if (insertError) throw insertError;
      result.criados += 1;
      continue;
    }

    // Cadastro validado/manual não deve ser enriquecido por novas importações sem confirmação do usuário.
    if (existing.origem_cadastro !== "grl019") {
      result.protegidos += 1;
      continue;
    }

    const patch: Record<string, string | null | undefined> = {};
    const fields: (keyof ArmazemPreCadastro)[] = [
      "razao_social",
      "cnpj_cpf",
      "inscricao_estadual",
      "endereco",
      "municipio",
      "uf",
    ];

    fields.forEach((field) => {
      if (isBlank(existing[field]) && !isBlank(candidate[field])) {
        patch[field] = candidate[field];
      }
    });

    if (Object.keys(patch).length === 0) {
      result.inalterados += 1;
      continue;
    }

    patch.ultima_sincronizacao_grl019 = syncedAt;
    const { error: updateError } = await supabase.from("armazens").update(patch as never).eq("id", existing.id);
    if (updateError) throw updateError;
    result.atualizados += 1;
  }

  return result;
}

export const useCooperativas = () => useList<Cooperativa>("cooperativas", "razao_social");
export const useSaveCooperativa = () => useUpsert<Cooperativa>("cooperativas");
export const useDeleteCooperativa = () => useRemove("cooperativas");

export const useArmazens = () => useList<Armazem>("armazens", "razao_social");
export const useSaveArmazem = () => useUpsert<Armazem>("armazens");
export const useDeleteArmazem = () => useRemove("armazens");

export const useProdutos = () => useList<Produto>("produtos", "descricao");
export const useSaveProduto = () => useUpsert<Produto>("produtos");
export const useDeleteProduto = () => useRemove("produtos");


function normalizePositiveDecimal(value: unknown): number | null {
  if (value == null || value === "") return null;
  const numberValue = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

// Modelos de Nota: a liberação por cooperativa é N:N (tabela modelo_nota_cooperativas).
// Carregamos os modelos e anexamos as cooperativas liberadas de cada um em memória.
export const useModelos = () =>
  useQuery({
    queryKey: ["modelos_nota"],
    queryFn: async () => {
      const [{ data: modelos, error }, { data: vinculos, error: vincError }] = await Promise.all([
        supabase.from("modelos_nota").select("*").order("created_at", { ascending: false }),
        supabase.from("modelo_nota_cooperativas").select("modelo_nota_id, cooperativa_id"),
      ]);
      if (error) throw error;
      if (vincError) throw vincError;

      const porModelo = new Map<string, string[]>();
      (vinculos ?? []).forEach((v) => {
        const list = porModelo.get(v.modelo_nota_id) ?? [];
        list.push(v.cooperativa_id);
        porModelo.set(v.modelo_nota_id, list);
      });

      return (modelos ?? []).map((m) => ({
        ...(m as ModeloNota),
        quantidade_padrao: normalizePositiveDecimal((m as { quantidade_padrao?: unknown }).quantidade_padrao),
        valor_unitario_padrao: normalizePositiveDecimal((m as { valor_unitario_padrao?: unknown }).valor_unitario_padrao),
        valor_total_padrao: normalizePositiveDecimal((m as { valor_total_padrao?: unknown }).valor_total_padrao),
        fator_conversao_dolar: normalizePositiveDecimal((m as { fator_conversao_dolar?: unknown }).fator_conversao_dolar),
        // Fallback ao legado cooperativa_id quando não houver vínculos migrados.
        cooperativa_ids:
          porModelo.get(m.id) ?? (m.cooperativa_id ? [m.cooperativa_id] : []),
      })) as ModeloNota[];
    },
  });

// Salva o modelo e sincroniza as cooperativas liberadas na tabela N:N.
export const useSaveModelo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Partial<ModeloNota>) => {
      const { cooperativa_ids, ...modeloFields } = record as Partial<ModeloNota> & {
        cooperativa_ids?: string[];
      };
      const liberadas = cooperativa_ids ?? [];
      // Mantém o campo legado coerente com a primeira cooperativa liberada (compatibilidade).
      const payload = {
        ...modeloFields,
        quantidade_padrao: normalizePositiveDecimal(modeloFields.quantidade_padrao),
        valor_unitario_padrao: normalizePositiveDecimal(modeloFields.valor_unitario_padrao),
        valor_total_padrao: normalizePositiveDecimal(modeloFields.valor_total_padrao),
        fator_conversao_dolar: normalizePositiveDecimal(modeloFields.fator_conversao_dolar),
        cooperativa_id: liberadas[0] ?? null,
      };

      let modeloId = (record as { id?: string }).id;
      if (modeloId) {
        const { id, ...rest } = payload as Record<string, unknown>;
        const { error } = await supabase.from("modelos_nota").update(rest as never).eq("id", modeloId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("modelos_nota")
          .insert(payload as never)
          .select("id")
          .single();
        if (error) throw error;
        modeloId = (data as { id: string }).id;
      }

      // Sincroniza vínculos: remove os antigos e insere os selecionados.
      const { error: delError } = await supabase
        .from("modelo_nota_cooperativas")
        .delete()
        .eq("modelo_nota_id", modeloId);
      if (delError) throw delError;

      if (liberadas.length > 0) {
        const { error: insError } = await supabase
          .from("modelo_nota_cooperativas")
          .insert(liberadas.map((cooperativa_id) => ({ modelo_nota_id: modeloId, cooperativa_id })));
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modelos_nota"] });
      toast.success("Registro salvo.");
    },
    onError: (e: Error) => toast.error("Erro ao salvar: " + e.message),
  });
};

export const useDeleteModelo = () => useRemove("modelos_nota");

export const useTiposContrato = () => useList<TipoContrato>("tipos_contrato");
export const useSaveTipoContrato = () => useUpsert<TipoContrato>("tipos_contrato");
export const useDeleteTipoContrato = () => useRemove("tipos_contrato");
