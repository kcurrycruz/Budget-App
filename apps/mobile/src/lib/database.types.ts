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
      budget_months: {
        Row: {
          created_at: string
          expected_income: number
          fixed_costs: number
          id: string
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expected_income?: number
          fixed_costs?: number
          id?: string
          month: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          expected_income?: number
          fixed_costs?: number
          id?: string
          month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_months_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          archived_at: string | null
          color: string
          created_at: string
          icon: string
          id: string
          monthly_limit: number
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          color?: string
          created_at?: string
          icon?: string
          id?: string
          monthly_limit?: number
          name: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          color?: string
          created_at?: string
          icon?: string
          id?: string
          monthly_limit?: number
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          account_type: string
          available_balance: number | null
          connection_status: string
          created_at: string
          currency_code: string
          current_balance: number | null
          disconnected_at: string | null
          display_name: string
          id: string
          institution_name: string | null
          last_synced_at: string | null
          mask: string | null
          plaid_account_id: string | null
          plaid_item_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type: string
          available_balance?: number | null
          connection_status?: string
          created_at?: string
          currency_code?: string
          current_balance?: number | null
          disconnected_at?: string | null
          display_name: string
          id?: string
          institution_name?: string | null
          last_synced_at?: string | null
          mask?: string | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_type?: string
          available_balance?: number | null
          connection_status?: string
          created_at?: string
          currency_code?: string
          current_balance?: number | null
          disconnected_at?: string | null
          display_name?: string
          id?: string
          institution_name?: string | null
          last_synced_at?: string | null
          mask?: string | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_plaid_item_id_fkey"
            columns: ["plaid_item_id"]
            isOneToOne: false
            referencedRelation: "plaid_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_rules: {
        Row: {
          active: boolean
          category_id: string
          created_at: string
          id: string
          merchant_key: string
          merchant_name: string
          subcategory_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          category_id: string
          created_at?: string
          id?: string
          merchant_key: string
          merchant_name: string
          subcategory_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          active?: boolean
          category_id?: string
          created_at?: string
          id?: string
          merchant_key?: string
          merchant_name?: string
          subcategory_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_rules_category_owner_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "merchant_rules_subcategory_owner_fkey"
            columns: ["subcategory_id", "category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id", "category_id", "user_id"]
          },
          {
            foreignKeyName: "merchant_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_expenses: {
        Row: {
          amount: number
          category_id: string | null
          covered_at: string | null
          created_at: string
          id: string
          name: string
          target_month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          covered_at?: string | null
          created_at?: string
          id?: string
          name: string
          target_month: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          covered_at?: string | null
          created_at?: string
          id?: string
          name?: string
          target_month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_expenses_category_owner_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "planned_expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plaid_items: {
        Row: {
          access_token_ciphertext: string
          created_at: string
          id: string
          institution_id: string | null
          institution_name: string | null
          plaid_item_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_ciphertext: string
          created_at?: string
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          plaid_item_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_ciphertext?: string
          created_at?: string
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          plaid_item_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plaid_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plaid_sync_state: {
        Row: {
          last_error: string | null
          last_synced_at: string | null
          next_cursor: string | null
          plaid_item_id: string
          updated_at: string
        }
        Insert: {
          last_error?: string | null
          last_synced_at?: string | null
          next_cursor?: string | null
          plaid_item_id: string
          updated_at?: string
        }
        Update: {
          last_error?: string | null
          last_synced_at?: string | null
          next_cursor?: string | null
          plaid_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plaid_sync_state_plaid_item_id_fkey"
            columns: ["plaid_item_id"]
            isOneToOne: true
            referencedRelation: "plaid_items"
            referencedColumns: ["id"]
          },
        ]
      }
      plaid_webhook_events: {
        Row: {
          attempts: number
          body_sha256: string
          claimed_at: string | null
          id: string
          last_error: string | null
          next_attempt_at: string | null
          payload: Json
          plaid_item_id: string | null
          processed_at: string | null
          received_at: string
          status: string
          updated_at: string
          webhook_code: string
          webhook_type: string
        }
        Insert: {
          attempts?: number
          body_sha256: string
          claimed_at?: string | null
          id?: string
          last_error?: string | null
          next_attempt_at?: string | null
          payload: Json
          plaid_item_id?: string | null
          processed_at?: string | null
          received_at?: string
          status?: string
          updated_at?: string
          webhook_code: string
          webhook_type: string
        }
        Update: {
          attempts?: number
          body_sha256?: string
          claimed_at?: string | null
          id?: string
          last_error?: string | null
          next_attempt_at?: string | null
          payload?: Json
          plaid_item_id?: string | null
          processed_at?: string | null
          received_at?: string
          status?: string
          updated_at?: string
          webhook_code?: string
          webhook_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_bill_payments: {
        Row: {
          created_at: string
          id: string
          month: string
          paid_at: string
          recurring_bill_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          paid_at?: string
          recurring_bill_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          paid_at?: string
          recurring_bill_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_bill_payments_bill_owner_fkey"
            columns: ["recurring_bill_id", "user_id"]
            isOneToOne: false
            referencedRelation: "recurring_bills"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "recurring_bill_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_bills: {
        Row: {
          active: boolean
          amount: number
          category_id: string | null
          created_at: string
          due_day: number
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          amount: number
          category_id?: string | null
          created_at?: string
          due_day: number
          id?: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          active?: boolean
          amount?: number
          category_id?: string | null
          created_at?: string
          due_day?: number
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_bills_category_owner_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "recurring_bills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          archived_at: string | null
          category_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_owner_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "subcategories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          direction: string
          financial_account_id: string | null
          id: string
          merchant_name: string
          needs_review: boolean
          note: string | null
          pending: boolean
          plaid_category_detailed: string | null
          plaid_category_primary: string | null
          plaid_transaction_id: string | null
          source: string
          subcategory_id: string | null
          transaction_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          direction?: string
          financial_account_id?: string | null
          id?: string
          merchant_name: string
          needs_review?: boolean
          note?: string | null
          pending?: boolean
          plaid_category_detailed?: string | null
          plaid_category_primary?: string | null
          plaid_transaction_id?: string | null
          source?: string
          subcategory_id?: string | null
          transaction_date?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          direction?: string
          financial_account_id?: string | null
          id?: string
          merchant_name?: string
          needs_review?: boolean
          note?: string | null
          pending?: boolean
          plaid_category_detailed?: string | null
          plaid_category_primary?: string | null
          plaid_transaction_id?: string | null
          source?: string
          subcategory_id?: string | null
          transaction_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_owner_fkey"
            columns: ["financial_account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transactions_category_owner_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transactions_subcategory_owner_fkey"
            columns: ["subcategory_id", "category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id", "category_id", "user_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authorize_plaid_webhook_retry: {
        Args: { p_secret: string }
        Returns: boolean
      }
      categorize_transaction: {
        Args: {
          p_category_id: string
          p_remember_merchant?: boolean
          p_subcategory_id?: string
          p_transaction_id: string
        }
        Returns: undefined
      }
      claim_plaid_webhook_events: {
        Args: { p_batch_size?: number }
        Returns: {
          attempts: number
          id: string
          payload: Json
        }[]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
