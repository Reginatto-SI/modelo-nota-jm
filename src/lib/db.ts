import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

import type { Cooperativa, Armazem, Produto, ModeloNota, TipoContrato } from "./types";

export const useCooperativas = () => useList<Cooperativa>("cooperativas", "razao_social");
export const useSaveCooperativa = () => useUpsert<Cooperativa>("cooperativas");
export const useDeleteCooperativa = () => useRemove("cooperativas");

export const useArmazens = () => useList<Armazem>("armazens", "razao_social");
export const useSaveArmazem = () => useUpsert<Armazem>("armazens");
export const useDeleteArmazem = () => useRemove("armazens");

export const useProdutos = () => useList<Produto>("produtos", "descricao");
export const useSaveProduto = () => useUpsert<Produto>("produtos");
export const useDeleteProduto = () => useRemove("produtos");

export const useModelos = () => useList<ModeloNota>("modelos_nota");
export const useSaveModelo = () => useUpsert<ModeloNota>("modelos_nota");
export const useDeleteModelo = () => useRemove("modelos_nota");

export const useTiposContrato = () => useList<TipoContrato>("tipos_contrato");
export const useSaveTipoContrato = () => useUpsert<TipoContrato>("tipos_contrato");
export const useDeleteTipoContrato = () => useRemove("tipos_contrato");
