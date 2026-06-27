export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      armazens: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cnpj_cpf: string | null
          created_at: string
          endereco: string | null
          id: string
          inscricao_estadual: string | null
          municipio: string | null
          origem_cadastro: string
          razao_social: string
          telefone: string | null
          tipo: string
          uf: string | null
          ultima_sincronizacao_grl019: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cnpj_cpf?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          municipio?: string | null
          origem_cadastro?: string
          razao_social: string
          telefone?: string | null
          tipo?: string
          uf?: string | null
          ultima_sincronizacao_grl019?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cnpj_cpf?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          municipio?: string | null
          origem_cadastro?: string
          razao_social?: string
          telefone?: string | null
          tipo?: string
          uf?: string | null
          ultima_sincronizacao_grl019?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cooperativas: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          inscricao_estadual: string | null
          municipio: string | null
          nome_grl019: string
          razao_social: string
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          municipio?: string | null
          nome_grl019: string
          razao_social: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          municipio?: string | null
          nome_grl019?: string
          razao_social?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      modelo_nota_cooperativas: {
        Row: {
          cooperativa_id: string
          created_at: string
          id: string
          modelo_nota_id: string
        }
        Insert: {
          cooperativa_id: string
          created_at?: string
          id?: string
          modelo_nota_id: string
        }
        Update: {
          cooperativa_id?: string
          created_at?: string
          id?: string
          modelo_nota_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelo_nota_cooperativas_cooperativa_id_fkey"
            columns: ["cooperativa_id"]
            isOneToOne: false
            referencedRelation: "cooperativas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_nota_cooperativas_modelo_nota_id_fkey"
            columns: ["modelo_nota_id"]
            isOneToOne: false
            referencedRelation: "modelos_nota"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_nota: {
        Row: {
          ativo: boolean
          cfop: string
          cooperativa_id: string | null
          created_at: string
          cst_icms_padrao: string | null
          dados_adicionais_template: string | null
          fator_conversao_dolar: number | null
          id: string
          natureza_operacao: string | null
          nome_modelo: string
          quantidade_padrao: number | null
          tipo_destinatario: string
          valor_total_padrao: number | null
          valor_unitario_padrao: number | null
          tipo_frete_padrao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cfop: string
          cooperativa_id?: string | null
          created_at?: string
          cst_icms_padrao?: string | null
          dados_adicionais_template?: string | null
          fator_conversao_dolar?: number | null
          id?: string
          natureza_operacao?: string | null
          nome_modelo: string
          quantidade_padrao?: number | null
          tipo_destinatario?: string
          valor_total_padrao?: number | null
          valor_unitario_padrao?: number | null
          tipo_frete_padrao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cfop?: string
          cooperativa_id?: string | null
          created_at?: string
          cst_icms_padrao?: string | null
          dados_adicionais_template?: string | null
          fator_conversao_dolar?: number | null
          id?: string
          natureza_operacao?: string | null
          nome_modelo?: string
          quantidade_padrao?: number | null
          tipo_destinatario?: string
          valor_total_padrao?: number | null
          valor_unitario_padrao?: number | null
          tipo_frete_padrao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelos_nota_cooperativa_id_fkey"
            columns: ["cooperativa_id"]
            isOneToOne: false
            referencedRelation: "cooperativas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          codigo_produto: string
          created_at: string
          cst_icms: string | null
          descricao: string
          id: string
          ncm: string | null
          unidade: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_produto: string
          created_at?: string
          cst_icms?: string | null
          descricao: string
          id?: string
          ncm?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_produto?: string
          created_at?: string
          cst_icms?: string | null
          descricao?: string
          id?: string
          ncm?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tipos_contrato: {
        Row: {
          ativo: boolean
          cfop: string | null
          codigo_contrato: string
          cooperativa_id: string
          created_at: string
          descricao_contrato: string | null
          exige_contrato_vinculado: boolean
          gera_operacao_casada: boolean
          id: string
          modelo_nota_id: string | null
          tp_faturamento: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cfop?: string | null
          codigo_contrato: string
          cooperativa_id: string
          created_at?: string
          descricao_contrato?: string | null
          exige_contrato_vinculado?: boolean
          gera_operacao_casada?: boolean
          id?: string
          modelo_nota_id?: string | null
          tp_faturamento?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cfop?: string | null
          codigo_contrato?: string
          cooperativa_id?: string
          created_at?: string
          descricao_contrato?: string | null
          exige_contrato_vinculado?: boolean
          gera_operacao_casada?: boolean
          id?: string
          modelo_nota_id?: string | null
          tp_faturamento?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipos_contrato_cooperativa_id_fkey"
            columns: ["cooperativa_id"]
            isOneToOne: false
            referencedRelation: "cooperativas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipos_contrato_modelo_nota_id_fkey"
            columns: ["modelo_nota_id"]
            isOneToOne: false
            referencedRelation: "modelos_nota"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
