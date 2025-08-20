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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      communication_logs: {
        Row: {
          ai_generated: boolean | null
          created_at: string
          delivered_at: string | null
          direction: string
          email_html: string | null
          email_subject: string | null
          email_type: string | null
          external_review_id: string | null
          feedback_id: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          message_content: string
          message_type: string
          read_at: string | null
          recipient_email: string | null
          room_number: string | null
          sent: boolean | null
          sent_at: string | null
          status: string
          workflow_id: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          created_at?: string
          delivered_at?: string | null
          direction: string
          email_html?: string | null
          email_subject?: string | null
          email_type?: string | null
          external_review_id?: string | null
          feedback_id?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          message_content: string
          message_type: string
          read_at?: string | null
          recipient_email?: string | null
          room_number?: string | null
          sent?: boolean | null
          sent_at?: string | null
          status?: string
          workflow_id?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          created_at?: string
          delivered_at?: string | null
          direction?: string
          email_html?: string | null
          email_subject?: string | null
          email_type?: string | null
          external_review_id?: string | null
          feedback_id?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          message_content?: string
          message_type?: string
          read_at?: string | null
          recipient_email?: string | null
          room_number?: string | null
          sent?: boolean | null
          sent_at?: string | null
          status?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_external_review_id_fkey"
            columns: ["external_review_id"]
            isOneToOne: false
            referencedRelation: "external_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_external_review_id_fkey"
            columns: ["external_review_id"]
            isOneToOne: false
            referencedRelation: "recent_external_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      external_reviews: {
        Row: {
          assigned_to: string | null
          author_name: string | null
          created_at: string | null
          google_maps_place_id: string | null
          id: string
          last_checked: string | null
          manager_notes: string | null
          original_rating: string | null
          place_address: string | null
          place_name: string
          place_url: string | null
          priority: string | null
          provider: string
          responded_at: string | null
          response_required: boolean | null
          review_date: string
          review_id: string
          review_images: Json | null
          review_rating: number
          review_responses: Json | null
          review_text: string
          review_title: string | null
          review_url: string | null
          reviewer_location: string | null
          scraped_at: string | null
          sentiment: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          author_name?: string | null
          created_at?: string | null
          google_maps_place_id?: string | null
          id?: string
          last_checked?: string | null
          manager_notes?: string | null
          original_rating?: string | null
          place_address?: string | null
          place_name: string
          place_url?: string | null
          priority?: string | null
          provider: string
          responded_at?: string | null
          response_required?: boolean | null
          review_date: string
          review_id: string
          review_images?: Json | null
          review_rating: number
          review_responses?: Json | null
          review_text: string
          review_title?: string | null
          review_url?: string | null
          reviewer_location?: string | null
          scraped_at?: string | null
          sentiment?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          author_name?: string | null
          created_at?: string | null
          google_maps_place_id?: string | null
          id?: string
          last_checked?: string | null
          manager_notes?: string | null
          original_rating?: string | null
          place_address?: string | null
          place_name?: string
          place_url?: string | null
          priority?: string | null
          provider?: string
          responded_at?: string | null
          response_required?: boolean | null
          review_date?: string
          review_id?: string
          review_images?: Json | null
          review_rating?: number
          review_responses?: Json | null
          review_text?: string
          review_title?: string | null
          review_url?: string | null
          reviewer_location?: string | null
          scraped_at?: string | null
          sentiment?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          check_in_date: string | null
          check_out_date: string | null
          created_at: string | null
          feedback_text: string
          guest_email: string | null
          guest_name: string | null
          id: string
          ip_address: unknown | null
          issue_category: string
          manager_notes: string | null
          rating: number
          resolved_at: string | null
          resolved_by: string | null
          room_number: string | null
          source: string | null
          status: string | null
          updated_at: string | null
          user_agent: string | null
          would_recommend: boolean | null
        }
        Insert: {
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string | null
          feedback_text: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          ip_address?: unknown | null
          issue_category: string
          manager_notes?: string | null
          rating: number
          resolved_at?: string | null
          resolved_by?: string | null
          room_number?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string | null
          feedback_text?: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          ip_address?: unknown | null
          issue_category?: string
          manager_notes?: string | null
          rating?: number
          resolved_at?: string | null
          resolved_by?: string | null
          room_number?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
          would_recommend?: boolean | null
        }
        Relationships: []
      }
      hotel_locations: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          google_maps_place_id: string
          google_maps_url: string | null
          hotel_code: string | null
          hotel_name: string
          id: string
          last_monitored: string | null
          location_city: string
          location_country: string | null
          location_region: string | null
          monitor_airbnb: boolean | null
          monitor_booking: boolean | null
          monitor_expedia: boolean | null
          monitor_google_maps: boolean | null
          monitor_hotels_com: boolean | null
          monitor_tripadvisor: boolean | null
          monitor_yelp: boolean | null
          monitoring_enabled: boolean | null
          monitoring_frequency: string | null
          notes: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          google_maps_place_id: string
          google_maps_url?: string | null
          hotel_code?: string | null
          hotel_name: string
          id?: string
          last_monitored?: string | null
          location_city: string
          location_country?: string | null
          location_region?: string | null
          monitor_airbnb?: boolean | null
          monitor_booking?: boolean | null
          monitor_expedia?: boolean | null
          monitor_google_maps?: boolean | null
          monitor_hotels_com?: boolean | null
          monitor_tripadvisor?: boolean | null
          monitor_yelp?: boolean | null
          monitoring_enabled?: boolean | null
          monitoring_frequency?: string | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          google_maps_place_id?: string
          google_maps_url?: string | null
          hotel_code?: string | null
          hotel_name?: string
          id?: string
          last_monitored?: string | null
          location_city?: string
          location_country?: string | null
          location_region?: string | null
          monitor_airbnb?: boolean | null
          monitor_booking?: boolean | null
          monitor_expedia?: boolean | null
          monitor_google_maps?: boolean | null
          monitor_hotels_com?: boolean | null
          monitor_tripadvisor?: boolean | null
          monitor_yelp?: boolean | null
          monitoring_enabled?: boolean | null
          monitoring_frequency?: string | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          application_date: string | null
          application_notes: string | null
          created_at: string | null
          customized_cover_letter: string | null
          customized_cv: string | null
          follow_up_date: string | null
          id: string
          interview_date: string | null
          interview_notes: string | null
          job_id: string | null
          offer_details: Json | null
          rejection_reason: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          application_date?: string | null
          application_notes?: string | null
          created_at?: string | null
          customized_cover_letter?: string | null
          customized_cv?: string | null
          follow_up_date?: string | null
          id?: string
          interview_date?: string | null
          interview_notes?: string | null
          job_id?: string | null
          offer_details?: Json | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          application_date?: string | null
          application_notes?: string | null
          created_at?: string | null
          customized_cover_letter?: string | null
          customized_cv?: string | null
          follow_up_date?: string | null
          id?: string
          interview_date?: string | null
          interview_notes?: string | null
          job_id?: string | null
          offer_details?: Json | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_listings: {
        Row: {
          ai_match_score: number | null
          application_url: string | null
          benefits: string | null
          company: string
          created_at: string | null
          description: string | null
          experience_level: string | null
          expires_date: string | null
          external_id: string | null
          id: string
          is_hybrid: boolean | null
          is_remote: boolean | null
          job_type: string | null
          keywords: string[] | null
          location: string | null
          posted_date: string | null
          requirements: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          scraped_at: string | null
          source: string
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_match_score?: number | null
          application_url?: string | null
          benefits?: string | null
          company: string
          created_at?: string | null
          description?: string | null
          experience_level?: string | null
          expires_date?: string | null
          external_id?: string | null
          id?: string
          is_hybrid?: boolean | null
          is_remote?: boolean | null
          job_type?: string | null
          keywords?: string[] | null
          location?: string | null
          posted_date?: string | null
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          scraped_at?: string | null
          source: string
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_match_score?: number | null
          application_url?: string | null
          benefits?: string | null
          company?: string
          created_at?: string | null
          description?: string | null
          experience_level?: string | null
          expires_date?: string | null
          external_id?: string | null
          id?: string
          is_hybrid?: boolean | null
          is_remote?: boolean | null
          job_type?: string | null
          keywords?: string[] | null
          location?: string | null
          posted_date?: string | null
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          scraped_at?: string | null
          source?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pms_webhook_logs: {
        Row: {
          created_at: string
          event_type: string
          guest_data: Json
          id: string
          processed: boolean
          processed_at: string | null
          room_data: Json | null
          workflow_triggered: boolean
        }
        Insert: {
          created_at?: string
          event_type: string
          guest_data: Json
          id?: string
          processed?: boolean
          processed_at?: string | null
          room_data?: Json | null
          workflow_triggered?: boolean
        }
        Update: {
          created_at?: string
          event_type?: string
          guest_data?: Json
          id?: string
          processed?: boolean
          processed_at?: string | null
          room_data?: Json | null
          workflow_triggered?: boolean
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          ip_address: unknown
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address: unknown
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: unknown
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      review_responses: {
        Row: {
          ai_model_used: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          external_review_id: string
          id: string
          manager_notes: string | null
          n8n_workflow_id: string | null
          platform_response_id: string | null
          posted_at: string | null
          rejected_at: string | null
          rejection_reason: string | null
          response_text: string
          response_version: number | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_model_used?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          external_review_id: string
          id?: string
          manager_notes?: string | null
          n8n_workflow_id?: string | null
          platform_response_id?: string | null
          posted_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          response_text: string
          response_version?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_model_used?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          external_review_id?: string
          id?: string
          manager_notes?: string | null
          n8n_workflow_id?: string | null
          platform_response_id?: string | null
          posted_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          response_text?: string
          response_version?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_review_responses_external_review"
            columns: ["external_review_id"]
            isOneToOne: false
            referencedRelation: "external_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_review_responses_external_review"
            columns: ["external_review_id"]
            isOneToOne: false
            referencedRelation: "recent_external_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          resource: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      staff_assignments: {
        Row: {
          created_at: string
          department: string
          id: string
          is_active: boolean
          notification_preferences: Json
          staff_email: string | null
          staff_name: string
          staff_phone: string | null
        }
        Insert: {
          created_at?: string
          department: string
          id?: string
          is_active?: boolean
          notification_preferences?: Json
          staff_email?: string | null
          staff_name: string
          staff_phone?: string | null
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          is_active?: boolean
          notification_preferences?: Json
          staff_email?: string | null
          staff_name?: string
          staff_phone?: string | null
        }
        Relationships: []
      }
      trustpilot_redirects: {
        Row: {
          check_in_date: string | null
          created_at: string | null
          guest_name: string | null
          id: string
          ip_address: unknown | null
          rating: number
          redirect_successful: boolean | null
          room_number: string | null
          source: string | null
          trustpilot_url: string
          user_agent: string | null
        }
        Insert: {
          check_in_date?: string | null
          created_at?: string | null
          guest_name?: string | null
          id?: string
          ip_address?: unknown | null
          rating: number
          redirect_successful?: boolean | null
          room_number?: string | null
          source?: string | null
          trustpilot_url: string
          user_agent?: string | null
        }
        Update: {
          check_in_date?: string | null
          created_at?: string | null
          guest_name?: string | null
          id?: string
          ip_address?: unknown | null
          rating?: number
          redirect_successful?: boolean | null
          room_number?: string | null
          source?: string | null
          trustpilot_url?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          cover_letter_template: string | null
          created_at: string | null
          cv_content: string | null
          email: string
          experience_years: number | null
          full_name: string
          id: string
          linkedin_url: string | null
          location: string | null
          phone: string | null
          salary_max: number | null
          salary_min: number | null
          skills: string[] | null
          specialization: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          cover_letter_template?: string | null
          created_at?: string | null
          cv_content?: string | null
          email: string
          experience_years?: number | null
          full_name: string
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          salary_max?: number | null
          salary_min?: number | null
          skills?: string[] | null
          specialization?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          cover_letter_template?: string | null
          created_at?: string | null
          cv_content?: string | null
          email?: string
          experience_years?: number | null
          full_name?: string
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          salary_max?: number | null
          salary_min?: number | null
          skills?: string[] | null
          specialization?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_insights_reports: {
        Row: {
          ai_insights: string | null
          average_rating: number | null
          created_at: string
          email_sent: boolean | null
          id: string
          negative_reviews: number | null
          positive_reviews: number | null
          recipients: Json | null
          report_date: string
          top_issues: Json | null
          total_reviews: number | null
          urgent_issues: number | null
          week_end: string
          week_start: string
        }
        Insert: {
          ai_insights?: string | null
          average_rating?: number | null
          created_at?: string
          email_sent?: boolean | null
          id?: string
          negative_reviews?: number | null
          positive_reviews?: number | null
          recipients?: Json | null
          report_date: string
          top_issues?: Json | null
          total_reviews?: number | null
          urgent_issues?: number | null
          week_end: string
          week_start: string
        }
        Update: {
          ai_insights?: string | null
          average_rating?: number | null
          created_at?: string
          email_sent?: boolean | null
          id?: string
          negative_reviews?: number | null
          positive_reviews?: number | null
          recipients?: Json | null
          report_date?: string
          top_issues?: Json | null
          total_reviews?: number | null
          urgent_issues?: number | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          ai_insights: string | null
          ai_recommendations: string | null
          analytics_data: Json | null
          average_rating: number | null
          created_at: string
          email_sent: boolean | null
          email_sent_at: string | null
          generated_by: string | null
          id: string
          negative_count: number | null
          neutral_count: number | null
          notes: string | null
          platform_breakdown: Json | null
          positive_count: number | null
          rating_1_count: number | null
          rating_2_count: number | null
          rating_3_count: number | null
          rating_4_count: number | null
          rating_5_count: number | null
          recent_negative_count: number | null
          recipients: Json | null
          report_date: string
          report_id: string
          status: string | null
          top_issues: Json | null
          total_external_reviews: number | null
          total_feedback: number | null
          total_reviews: number | null
          updated_at: string
          urgent_reviews_count: number | null
          week_end: string
          week_start: string
        }
        Insert: {
          ai_insights?: string | null
          ai_recommendations?: string | null
          analytics_data?: Json | null
          average_rating?: number | null
          created_at?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          generated_by?: string | null
          id?: string
          negative_count?: number | null
          neutral_count?: number | null
          notes?: string | null
          platform_breakdown?: Json | null
          positive_count?: number | null
          rating_1_count?: number | null
          rating_2_count?: number | null
          rating_3_count?: number | null
          rating_4_count?: number | null
          rating_5_count?: number | null
          recent_negative_count?: number | null
          recipients?: Json | null
          report_date?: string
          report_id?: string
          status?: string | null
          top_issues?: Json | null
          total_external_reviews?: number | null
          total_feedback?: number | null
          total_reviews?: number | null
          updated_at?: string
          urgent_reviews_count?: number | null
          week_end: string
          week_start: string
        }
        Update: {
          ai_insights?: string | null
          ai_recommendations?: string | null
          analytics_data?: Json | null
          average_rating?: number | null
          created_at?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          generated_by?: string | null
          id?: string
          negative_count?: number | null
          neutral_count?: number | null
          notes?: string | null
          platform_breakdown?: Json | null
          positive_count?: number | null
          rating_1_count?: number | null
          rating_2_count?: number | null
          rating_3_count?: number | null
          rating_4_count?: number | null
          rating_5_count?: number | null
          recent_negative_count?: number | null
          recipients?: Json | null
          report_date?: string
          report_id?: string
          status?: string | null
          top_issues?: Json | null
          total_external_reviews?: number | null
          total_feedback?: number | null
          total_reviews?: number | null
          updated_at?: string
          urgent_reviews_count?: number | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          current_step: number
          error_message: string | null
          guest_name: string | null
          id: string
          room_number: string | null
          started_at: string
          status: string
          trigger_data: Json | null
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          current_step?: number
          error_message?: string | null
          guest_name?: string | null
          id?: string
          room_number?: string | null
          started_at?: string
          status?: string
          trigger_data?: Json | null
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          current_step?: number
          error_message?: string | null
          guest_name?: string | null
          id?: string
          room_number?: string | null
          started_at?: string
          status?: string
          trigger_data?: Json | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          created_at: string
          delay_minutes: number | null
          id: string
          step_config: Json
          step_order: number
          step_type: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          delay_minutes?: number | null
          id?: string
          step_config?: Json
          step_order: number
          step_type: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          delay_minutes?: number | null
          id?: string
          step_config?: Json
          step_order?: number
          step_type?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          trigger_event: string
          updated_at: string
          workflow_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          trigger_event: string
          updated_at?: string
          workflow_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trigger_event?: string
          updated_at?: string
          workflow_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      recent_external_reviews: {
        Row: {
          author_name: string | null
          id: string | null
          place_name: string | null
          priority: string | null
          provider: string | null
          response_required: boolean | null
          review_date: string | null
          review_preview: string | null
          review_rating: number | null
          review_title: string | null
          review_url: string | null
          sentiment: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_external_reviews_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_platforms: number
          average_external_rating: number
          high_external_ratings: number
          low_external_ratings: number
          negative_reviews: number
          neutral_reviews: number
          positive_reviews: number
          responded_reviews: number
          reviews_needing_response: number
          total_external_reviews: number
        }[]
      }
      get_feedback_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          average_rating: number
          high_ratings: number
          low_ratings: number
          resolved_count: number
          total_feedback: number
          would_recommend_count: number
        }[]
      }
      get_recent_feedback: {
        Args: { limit_count?: number }
        Returns: {
          created_at: string
          feedback_preview: string
          guest_name: string
          id: string
          issue_category: string
          rating: number
          room_number: string
          status: string
          would_recommend: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "staff" | "user"
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
    Enums: {
      app_role: ["admin", "manager", "staff", "user"],
    },
  },
} as const
