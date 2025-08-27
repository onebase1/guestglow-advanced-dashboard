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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      tenants: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string
          contact_phone: string | null
          country: string | null
          created_at: string
          domain: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          slug: string
          subscription_status: string | null
          timezone: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string
          brand_voice: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          subscription_status?: string | null
          timezone?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          brand_voice?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          subscription_status?: string | null
          timezone?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          brand_voice?: string | null
        }
        Relationships: []
      }
      external_reviews: {
        Row: {
          ai_analysis: Json | null
          author_name: string | null
          created_at: string
          guest_name: string | null
          id: string
          language: string | null
          platform: string
          platform_review_id: string | null
          provider: string | null
          rating: number | null
          response_date: string | null
          response_required: boolean | null
          response_text: string | null
          review_date: string | null
          review_rating: number | null
          review_text: string | null
          room_type: string | null
          sentiment: string | null
          stay_date: string | null
          tenant_id: string
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          ai_analysis?: Json | null
          author_name?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          language?: string | null
          platform: string
          platform_review_id?: string | null
          provider?: string | null
          rating?: number | null
          response_date?: string | null
          response_required?: boolean | null
          response_text?: string | null
          review_date?: string | null
          review_rating?: number | null
          review_text?: string | null
          room_type?: string | null
          sentiment?: string | null
          stay_date?: string | null
          tenant_id: string
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          ai_analysis?: Json | null
          author_name?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          language?: string | null
          platform?: string
          platform_review_id?: string | null
          provider?: string | null
          rating?: number | null
          response_date?: string | null
          response_required?: boolean | null
          response_text?: string | null
          review_date?: string | null
          review_rating?: number | null
          review_text?: string | null
          room_type?: string | null
          sentiment?: string | null
          stay_date?: string | null
          tenant_id?: string
          updated_at?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "external_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          ai_generated: boolean | null
          attempt_timestamp: string | null
          created_at: string
          deadline_variance_ms: number | null
          delivery_deadline: string | null
          delivery_time_ms: number | null
          direction: string
          email_html: string | null
          email_subject: string | null
          email_type: string | null
          error_details: Json | null
          error_message: string | null
          external_id: string | null
          feedback_id: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          last_retry_at: string | null
          message_content: string | null
          message_type: string
          priority: string | null
          recipient_email: string | null
          retry_count: number | null
          room_number: string | null
          sent_timestamp: string | null
          status: string | null
          tenant_id: string | null
          test_mode: boolean | null
          updated_at: string
          within_deadline: boolean | null
        }
        Insert: {
          ai_generated?: boolean | null
          attempt_timestamp?: string | null
          created_at?: string
          deadline_variance_ms?: number | null
          delivery_deadline?: string | null
          delivery_time_ms?: number | null
          direction: string
          email_html?: string | null
          email_subject?: string | null
          email_type?: string | null
          error_details?: Json | null
          error_message?: string | null
          external_id?: string | null
          feedback_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          last_retry_at?: string | null
          message_content?: string | null
          message_type: string
          priority?: string | null
          recipient_email?: string | null
          retry_count?: number | null
          room_number?: string | null
          sent_timestamp?: string | null
          status?: string | null
          tenant_id?: string | null
          test_mode?: boolean | null
          updated_at?: string
          within_deadline?: boolean | null
        }
        Update: {
          ai_generated?: boolean | null
          attempt_timestamp?: string | null
          created_at?: string
          deadline_variance_ms?: number | null
          delivery_deadline?: string | null
          delivery_time_ms?: number | null
          direction?: string
          email_html?: string | null
          email_subject?: string | null
          email_type?: string | null
          error_details?: Json | null
          error_message?: string | null
          external_id?: string | null
          feedback_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          last_retry_at?: string | null
          message_content?: string | null
          message_type?: string
          priority?: string | null
          recipient_email?: string | null
          retry_count?: number | null
          room_number?: string | null
          sent_timestamp?: string | null
          status?: string | null
          tenant_id?: string | null
          test_mode?: boolean | null
          updated_at?: string
          within_deadline?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      review_responses: {
        Row: {
          ai_model_used: string | null
          approved_at: string | null
          approved_by: string | null
          auto_approved: boolean | null
          created_at: string
          external_review_id: string
          id: string
          manager_notes: string | null
          platform_response_id: string | null
          posted_at: string | null
          priority: string | null
          rejected_at: string | null
          rejection_reason: string | null
          response_text: string
          response_version: number | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ai_model_used?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_approved?: boolean | null
          created_at?: string
          external_review_id: string
          id?: string
          manager_notes?: string | null
          platform_response_id?: string | null
          posted_at?: string | null
          priority?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          response_text: string
          response_version?: number | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ai_model_used?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_approved?: boolean | null
          created_at?: string
          external_review_id?: string
          id?: string
          manager_notes?: string | null
          platform_response_id?: string | null
          posted_at?: string | null
          priority?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          response_text?: string
          response_version?: number | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_responses_external_review_id_fkey"
            columns: ["external_review_id"]
            isOneToOne: false
            referencedRelation: "external_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          ack_due: string | null
          acknowledged_at: string | null
          ai_analysis: Json | null
          assigned_to_user_id: string | null
          auto_response_channels: string[] | null
          auto_response_sent_at: string | null
          category: string | null
          classification_confidence: number | null
          comment: string | null
          created_at: string
          escalated_to_user_id: string | null
          followup_result: string | null
          followup_sent_at: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          issue_category: string | null
          last_escalation_at: string | null
          priority: string | null
          rating: number | null
          resolved_at: string | null
          room_number: string | null
          source: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
          would_recommend: boolean | null
        }
        Insert: {
          ack_due?: string | null
          acknowledged_at?: string | null
          ai_analysis?: Json | null
          assigned_to_user_id?: string | null
          auto_response_channels?: string[] | null
          auto_response_sent_at?: string | null
          category?: string | null
          classification_confidence?: number | null
          comment?: string | null
          created_at?: string
          escalated_to_user_id?: string | null
          followup_result?: string | null
          followup_sent_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          issue_category?: string | null
          last_escalation_at?: string | null
          priority?: string | null
          rating?: number | null
          resolved_at?: string | null
          room_number?: string | null
          source?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          would_recommend?: boolean | null
        }
        Update: {
          ack_due?: string | null
          acknowledged_at?: string | null
          ai_analysis?: Json | null
          assigned_to_user_id?: string | null
          auto_response_channels?: string[] | null
          auto_response_sent_at?: string | null
          category?: string | null
          classification_confidence?: number | null
          comment?: string | null
          created_at?: string
          escalated_to_user_id?: string | null
          followup_result?: string | null
          followup_sent_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          issue_category?: string | null
          last_escalation_at?: string | null
          priority?: string | null
          rating?: number | null
          resolved_at?: string | null
          room_number?: string | null
          source?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
