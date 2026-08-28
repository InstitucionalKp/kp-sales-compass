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
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      leads: {
        Row: {
          campanha: string | null
          cargo: string | null
          conjunto: string | null
          contato: string | null
          criativo: string | null
          email: string | null
          empresa: string | null
          id: string
          is_mql: boolean
          lead_at: string | null
          lead_date: string | null
          lead_time: string | null
          mql_flag: boolean
          nome: string | null
          origem: string | null
          qualificacao: string | null
          raw: Json | null
          sold: boolean
          sold_at: string | null
          status_reuniao: string | null
          synced_at: string
        }
        Insert: {
          campanha?: string | null
          cargo?: string | null
          conjunto?: string | null
          contato?: string | null
          criativo?: string | null
          email?: string | null
          empresa?: string | null
          id: string
          is_mql?: boolean
          lead_at?: string | null
          lead_date?: string | null
          lead_time?: string | null
          mql_flag?: boolean
          nome?: string | null
          origem?: string | null
          qualificacao?: string | null
          raw?: Json | null
          sold?: boolean
          sold_at?: string | null
          status_reuniao?: string | null
          synced_at?: string
        }
        Update: {
          campanha?: string | null
          cargo?: string | null
          conjunto?: string | null
          contato?: string | null
          criativo?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          is_mql?: boolean
          lead_at?: string | null
          lead_date?: string | null
          lead_time?: string | null
          mql_flag?: boolean
          nome?: string | null
          origem?: string | null
          qualificacao?: string | null
          raw?: Json | null
          sold?: boolean
          sold_at?: string | null
          status_reuniao?: string | null
          synced_at?: string
        }
        Relationships: []
      }
      meta_insights: {
        Row: {
          account_id: string | null
          campanha: string | null
          clicks: number
          conjunto: string | null
          criativo: string | null
          id: string
          impressions: number
          insight_date: string
          leads: number
          spend: number
          synced_at: string
        }
        Insert: {
          account_id?: string | null
          campanha?: string | null
          clicks?: number
          conjunto?: string | null
          criativo?: string | null
          id: string
          impressions?: number
          insight_date: string
          leads?: number
          spend?: number
          synced_at?: string
        }
        Update: {
          account_id?: string | null
          campanha?: string | null
          clicks?: number
          conjunto?: string | null
          criativo?: string | null
          id?: string
          impressions?: number
          insight_date?: string
          leads?: number
          spend?: number
          synced_at?: string
        }
        Relationships: []
      }
      sync_status: {
        Row: {
          last_run_at: string | null
          message: string | null
          rows: number
          source: string
          status: string | null
        }
        Insert: {
          last_run_at?: string | null
          message?: string | null
          rows?: number
          source: string
          status?: string | null
        }
        Update: {
          last_run_at?: string | null
          message?: string | null
          rows?: number
          source?: string
          status?: string | null
        }
        Relationships: []
      }
      secret_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      set_secret: {
        Args: { secret_key: string; secret_value: string }
        Returns: undefined
      }
      secret_is_set: {
        Args: { secret_key: string }
        Returns: boolean
      }
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
