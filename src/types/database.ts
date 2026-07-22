// Auto-generated from live Supabase schema — DO NOT EDIT BY HAND
// Generated: 2026-07-22
// Source: visycgzuszhgvtmqfnbx.supabase.co

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      analytics_branches: {
        Row: {
          id: string;
          name: string;
          code: string;
          region: string | null;
          city: string | null;
          tier: string | null;
          active: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          region?: string | null;
          city?: string | null;
          tier?: string | null;
          active?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          region?: string | null;
          city?: string | null;
          tier?: string | null;
          active?: boolean | null;
          created_at?: string | null;
        };
      };
      analytics_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string | null;
        };
      };
      analytics_periods: {
        Row: {
          id: string;
          label: string;
          year: number;
          month: number;
          quarter: number | null;
          start_date: string | null;
          end_date: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          label: string;
          year: number;
          month: number;
          quarter?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          label?: string;
          year?: number;
          month?: number;
          quarter?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string | null;
        };
      };
      analytics_suppliers: {
        Row: {
          id: string;
          name: string;
          code: string | null;
          city: string | null;
          country: string | null;
          contact_person: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          payment_terms: string | null;
          lead_time_days: number | null;
          notes: string | null;
          active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          code?: string | null;
          city?: string | null;
          country?: string | null;
          contact_person?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          payment_terms?: string | null;
          lead_time_days?: number | null;
          notes?: string | null;
          active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string | null;
          city?: string | null;
          country?: string | null;
          contact_person?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          payment_terms?: string | null;
          lead_time_days?: number | null;
          notes?: string | null;
          active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      analytics_products: {
        Row: {
          id: string;
          name: string;
          stock_code: string | null;
          pack_size: string | null;
          unit_of_measure: string | null;
          category_id: string | null;
          sub_category: string | null;
          sub_category_id: string | null;
          manufacturer_id: string | null;
          default_supplier_id: string | null;
          active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          stock_code?: string | null;
          pack_size?: string | null;
          unit_of_measure?: string | null;
          category_id?: string | null;
          sub_category?: string | null;
          sub_category_id?: string | null;
          manufacturer_id?: string | null;
          default_supplier_id?: string | null;
          active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          stock_code?: string | null;
          pack_size?: string | null;
          unit_of_measure?: string | null;
          category_id?: string | null;
          sub_category?: string | null;
          sub_category_id?: string | null;
          manufacturer_id?: string | null;
          default_supplier_id?: string | null;
          active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      analytics_fact_sales: {
        Row: {
          id: string;
          period_id: string;
          branch_id: string;
          category_id: string;
          sub_category_id: string | null;
          product_id: string;
          supplier_id: string;
          quantity: number;
          total_amount: number;
          unit_price: number | null;
          cost_amount: number | null;
          vat_amount: number | null;
          weight_tonnes: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          period_id: string;
          branch_id: string;
          category_id: string;
          sub_category_id?: string | null;
          product_id: string;
          supplier_id: string;
          quantity: number;
          total_amount: number;
          unit_price?: number | null;
          cost_amount?: number | null;
          vat_amount?: number | null;
          weight_tonnes?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          period_id?: string;
          branch_id?: string;
          category_id?: string;
          sub_category_id?: string | null;
          product_id?: string;
          supplier_id?: string;
          quantity?: number;
          total_amount?: number;
          unit_price?: number | null;
          cost_amount?: number | null;
          vat_amount?: number | null;
          weight_tonnes?: number | null;
          created_at?: string | null;
        };
      };
      analytics_fact_inventory: {
        Row: {
          id: string;
          period_id: string;
          branch_id: string;
          category_id: string;
          product_id: string;
          opening_stock: number | null;
          closing_stock: number | null;
          received: number | null;
          sold: number | null;
          adjustments: number | null;
          stock_value: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          period_id: string;
          branch_id: string;
          category_id: string;
          product_id: string;
          opening_stock?: number | null;
          closing_stock?: number | null;
          received?: number | null;
          sold?: number | null;
          adjustments?: number | null;
          stock_value?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          period_id?: string;
          branch_id?: string;
          category_id?: string;
          product_id?: string;
          opening_stock?: number | null;
          closing_stock?: number | null;
          received?: number | null;
          sold?: number | null;
          adjustments?: number | null;
          stock_value?: number | null;
          created_at?: string | null;
        };
      };
      analytics_fact_pricing: {
        Row: {
          id: string;
          period_id: string;
          branch_id: string;
          category_id: string;
          sub_category_id: string | null;
          product_id: string;
          supplier_id: string;
          selling_price: number | null;
          unit_price: number | null;
          unit_cost: number | null;
          standard_cost: number | null;
          discount_pct: number | null;
          min_quantity: number | null;
          max_quantity: number | null;
          tier: string | null;
          currency: string | null;
          effective_date: string | null;
          weight_tonnes: number | null;
          notes: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          period_id: string;
          branch_id: string;
          category_id: string;
          sub_category_id?: string | null;
          product_id: string;
          supplier_id: string;
          selling_price?: number | null;
          unit_price?: number | null;
          unit_cost?: number | null;
          standard_cost?: number | null;
          discount_pct?: number | null;
          min_quantity?: number | null;
          max_quantity?: number | null;
          tier?: string | null;
          currency?: string | null;
          effective_date?: string | null;
          weight_tonnes?: number | null;
          notes?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          period_id?: string;
          branch_id?: string;
          category_id?: string;
          sub_category_id?: string | null;
          product_id?: string;
          supplier_id?: string;
          selling_price?: number | null;
          unit_price?: number | null;
          unit_cost?: number | null;
          standard_cost?: number | null;
          discount_pct?: number | null;
          min_quantity?: number | null;
          max_quantity?: number | null;
          tier?: string | null;
          currency?: string | null;
          effective_date?: string | null;
          weight_tonnes?: number | null;
          notes?: string | null;
          created_at?: string | null;
        };
      };
      analytics_staging_uploads: {
        Row: {
          id: string;
          filename: string;
          file_type: string;
          total_rows: number | null;
          error_rows: number | null;
          status: string | null;
          branch_id: string;
          period_id: string;
          category_id: string;
          sub_category_id: string | null;
          uploaded_by: string | null;
          metadata: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          filename: string;
          file_type: string;
          total_rows?: number | null;
          error_rows?: number | null;
          status?: string | null;
          branch_id: string;
          period_id: string;
          category_id: string;
          sub_category_id?: string | null;
          uploaded_by?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          filename?: string;
          file_type?: string;
          total_rows?: number | null;
          error_rows?: number | null;
          status?: string | null;
          branch_id?: string;
          period_id?: string;
          category_id?: string;
          sub_category_id?: string | null;
          uploaded_by?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      portal_analytics_sharing: {
        Row: {
          id: string;
          client_id: string;
          branch_id: string | null;
          category_id: string | null;
          period_id: string | null;
          visible: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          branch_id?: string | null;
          category_id?: string | null;
          period_id?: string | null;
          visible?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          branch_id?: string | null;
          category_id?: string | null;
          period_id?: string | null;
          visible?: boolean | null;
          created_at?: string | null;
        };
      };
      clients: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          company_name: string | null;
          email: string | null;
          phone: string | null;
          website: string | null;
          industry: string | null;
          status: string | null;
          assigned_to: string | null;
          linked_supplier_id: string | null;
          notification_prefs: Json | null;
          dashboard_color: string | null;
          metadata: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          company_name?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          industry?: string | null;
          status?: string | null;
          assigned_to?: string | null;
          linked_supplier_id?: string | null;
          notification_prefs?: Json | null;
          dashboard_color?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          company_name?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          industry?: string | null;
          status?: string | null;
          assigned_to?: string | null;
          linked_supplier_id?: string | null;
          notification_prefs?: Json | null;
          dashboard_color?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      documents: {
        Row: {
          id: string;
          client_id: string | null;
          project_id: string | null;
          name: string;
          type: string;
          url: string | null;
          size: number | null;
          cloudinary_public_id: string | null;
          source_report_id: string | null;
          uploaded_by: string | null;
          visible_to_client: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          project_id?: string | null;
          name: string;
          type: string;
          url?: string | null;
          size?: number | null;
          cloudinary_public_id?: string | null;
          source_report_id?: string | null;
          uploaded_by?: string | null;
          visible_to_client?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          project_id?: string | null;
          name?: string;
          type?: string;
          url?: string | null;
          size?: number | null;
          cloudinary_public_id?: string | null;
          source_report_id?: string | null;
          uploaded_by?: string | null;
          visible_to_client?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          client_id: string | null;
          user_id: string | null;
          type: string;
          title: string;
          message: string;
          link: string | null;
          read: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          user_id?: string | null;
          type: string;
          title: string;
          message: string;
          link?: string | null;
          read?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          user_id?: string | null;
          type?: string;
          title?: string;
          message?: string;
          link?: string | null;
          read?: boolean | null;
          created_at?: string | null;
        };
      };
      reports: {
        Row: {
          id: string;
          client_id: string | null;
          project_id: string | null;
          title: string;
          type: string;
          kind: string | null;
          content: Json | null;
          storage_url: string | null;
          source_job_id: string | null;
          visible_to_client: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          project_id?: string | null;
          title: string;
          type: string;
          kind?: string | null;
          content?: Json | null;
          storage_url?: string | null;
          source_job_id?: string | null;
          visible_to_client?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          project_id?: string | null;
          title?: string;
          type?: string;
          kind?: string | null;
          content?: Json | null;
          storage_url?: string | null;
          source_job_id?: string | null;
          visible_to_client?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
