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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      admin_backup_codes: {
        Row: {
          admin_user_id: string
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
        }
        Insert: {
          admin_user_id: string
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
        }
        Update: {
          admin_user_id?: string
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_backup_codes_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          country: string | null
          created_at: string | null
          created_by: string | null
          email: string
          email_digest_enabled: boolean
          full_name: string | null
          id: string
          notify_admin_changes: boolean
          notify_applications: boolean
          notify_blogs: boolean
          notify_critical_alerts: boolean
          notify_performance_reports: boolean
          phone: string | null
          position: string | null
          profile_picture_url: string | null
          province: string | null
          role: Database["public"]["Enums"]["app_role"]
          theme_preference: string | null
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          email_digest_enabled?: boolean
          full_name?: string | null
          id?: string
          notify_admin_changes?: boolean
          notify_applications?: boolean
          notify_blogs?: boolean
          notify_critical_alerts?: boolean
          notify_performance_reports?: boolean
          phone?: string | null
          position?: string | null
          profile_picture_url?: string | null
          province?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          theme_preference?: string | null
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          email_digest_enabled?: boolean
          full_name?: string | null
          id?: string
          notify_admin_changes?: boolean
          notify_applications?: boolean
          notify_blogs?: boolean
          notify_critical_alerts?: boolean
          notify_performance_reports?: boolean
          phone?: string | null
          position?: string | null
          profile_picture_url?: string | null
          province?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          theme_preference?: string | null
          user_id?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          academic_importance: string
          cohort_id: string | null
          country: string
          created_at: string
          date_of_birth: string
          formally_nominated: boolean
          full_name: string
          gender: string | null
          grade: string
          has_device_access: boolean
          id: string
          is_learner_leader: boolean
          leader_roles: string | null
          leadership_meaning: string
          learner_photo_url: string | null
          learner_signature: string
          learner_signature_date: string
          manage_schoolwork: string
          nominating_teacher: string
          parent_consent: boolean
          parent_email: string
          parent_name: string
          parent_phone: string
          parent_relationship: string
          parent_signature: string
          parent_signature_date: string
          parent_signature_name: string
          project_benefit: string
          project_idea: string
          project_problem: string
          project_team: string
          province: string
          reference_number: string | null
          school_activities: string
          school_address: string
          school_challenge: string
          school_contact: string
          school_email: string
          school_name: string
          status: string
          student_email: string
          student_phone: string
          supporting_doc_url: string | null
          teacher_position: string
          video_link: string | null
          why_edlead: string
          willing_to_commit: boolean
        }
        Insert: {
          academic_importance: string
          cohort_id?: string | null
          country?: string
          created_at?: string
          date_of_birth: string
          formally_nominated?: boolean
          full_name: string
          gender?: string | null
          grade: string
          has_device_access?: boolean
          id?: string
          is_learner_leader?: boolean
          leader_roles?: string | null
          leadership_meaning: string
          learner_photo_url?: string | null
          learner_signature: string
          learner_signature_date: string
          manage_schoolwork: string
          nominating_teacher: string
          parent_consent?: boolean
          parent_email: string
          parent_name: string
          parent_phone: string
          parent_relationship: string
          parent_signature: string
          parent_signature_date: string
          parent_signature_name: string
          project_benefit: string
          project_idea: string
          project_problem: string
          project_team: string
          province: string
          reference_number?: string | null
          school_activities: string
          school_address: string
          school_challenge: string
          school_contact: string
          school_email: string
          school_name: string
          status?: string
          student_email: string
          student_phone: string
          supporting_doc_url?: string | null
          teacher_position: string
          video_link?: string | null
          why_edlead: string
          willing_to_commit?: boolean
        }
        Update: {
          academic_importance?: string
          cohort_id?: string | null
          country?: string
          created_at?: string
          date_of_birth?: string
          formally_nominated?: boolean
          full_name?: string
          gender?: string | null
          grade?: string
          has_device_access?: boolean
          id?: string
          is_learner_leader?: boolean
          leader_roles?: string | null
          leadership_meaning?: string
          learner_photo_url?: string | null
          learner_signature?: string
          learner_signature_date?: string
          manage_schoolwork?: string
          nominating_teacher?: string
          parent_consent?: boolean
          parent_email?: string
          parent_name?: string
          parent_phone?: string
          parent_relationship?: string
          parent_signature?: string
          parent_signature_date?: string
          parent_signature_name?: string
          project_benefit?: string
          project_idea?: string
          project_problem?: string
          project_team?: string
          province?: string
          reference_number?: string | null
          school_activities?: string
          school_address?: string
          school_challenge?: string
          school_contact?: string
          school_email?: string
          school_name?: string
          status?: string
          student_email?: string
          student_phone?: string
          supporting_doc_url?: string | null
          teacher_position?: string
          video_link?: string | null
          why_edlead?: string
          willing_to_commit?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "applications_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_comments: {
        Row: {
          author_name: string
          blog_post_id: string
          content: string
          created_at: string
          id: string
          is_approved: boolean
        }
        Insert: {
          author_name: string
          blog_post_id: string
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean
        }
        Update: {
          author_name?: string
          blog_post_id?: string
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_likes: {
        Row: {
          blog_post_id: string
          created_at: string
          id: string
          session_id: string
        }
        Insert: {
          blog_post_id: string
          created_at?: string
          id?: string
          session_id: string
        }
        Update: {
          blog_post_id?: string
          created_at?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_likes_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          author_country: string | null
          author_email: string
          author_name: string
          author_province: string
          author_school: string
          category: string
          content: string
          created_at: string
          featured_image_url: string | null
          id: string
          is_featured: boolean
          reference_number: string | null
          slug: string | null
          status: string
          submitted_at: string
          summary: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          author_country?: string | null
          author_email: string
          author_name: string
          author_province: string
          author_school: string
          category?: string
          content: string
          created_at?: string
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean
          reference_number?: string | null
          slug?: string | null
          status?: string
          submitted_at?: string
          summary: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          author_country?: string | null
          author_email?: string
          author_name?: string
          author_province?: string
          author_school?: string
          category?: string
          content?: string
          created_at?: string
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean
          reference_number?: string | null
          slug?: string | null
          status?: string
          submitted_at?: string
          summary?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      certificate_recipients: {
        Row: {
          application_id: string
          certificate_downloaded: boolean | null
          certificate_downloaded_at: string | null
          certificate_url: string | null
          cohort_id: string
          created_at: string
          download_count: number | null
          email_opened: boolean | null
          email_opened_at: string | null
          email_sent: boolean
          email_sent_at: string | null
          id: string
          issued_at: string | null
          issued_by: string | null
          open_count: number | null
          template_id: string
          tracking_id: string | null
        }
        Insert: {
          application_id: string
          certificate_downloaded?: boolean | null
          certificate_downloaded_at?: string | null
          certificate_url?: string | null
          cohort_id: string
          created_at?: string
          download_count?: number | null
          email_opened?: boolean | null
          email_opened_at?: string | null
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          open_count?: number | null
          template_id: string
          tracking_id?: string | null
        }
        Update: {
          application_id?: string
          certificate_downloaded?: boolean | null
          certificate_downloaded_at?: string | null
          certificate_url?: string | null
          cohort_id?: string
          created_at?: string
          download_count?: number | null
          email_opened?: boolean | null
          email_opened_at?: string | null
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          open_count?: number | null
          template_id?: string
          tracking_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_recipients_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_recipients_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_recipients_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          available_fields: Json
          created_at: string
          created_by: string | null
          design_settings: Json | null
          html_template: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          available_fields?: Json
          created_at?: string
          created_by?: string | null
          design_settings?: Json | null
          html_template: string
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          available_fields?: Json
          created_at?: string
          created_by?: string | null
          design_settings?: Json | null
          html_template?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          assigned_to: string | null
          chat_topic: string | null
          created_at: string
          escalated_to_whatsapp: boolean | null
          id: string
          last_message_at: string | null
          session_id: string
          status: string
          updated_at: string
          visitor_country: string | null
          visitor_email: string | null
          visitor_name: string | null
          visitor_phone: string | null
          visitor_province: string | null
        }
        Insert: {
          assigned_to?: string | null
          chat_topic?: string | null
          created_at?: string
          escalated_to_whatsapp?: boolean | null
          id?: string
          last_message_at?: string | null
          session_id: string
          status?: string
          updated_at?: string
          visitor_country?: string | null
          visitor_email?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
          visitor_province?: string | null
        }
        Update: {
          assigned_to?: string | null
          chat_topic?: string | null
          created_at?: string
          escalated_to_whatsapp?: boolean | null
          id?: string
          last_message_at?: string | null
          session_id?: string
          status?: string
          updated_at?: string
          visitor_country?: string | null
          visitor_email?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
          visitor_province?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_ai_response: boolean | null
          is_read: boolean
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_ai_response?: boolean | null
          is_read?: boolean
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_ai_response?: boolean | null
          is_read?: boolean
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          cohort_number: number
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
          updated_at: string
          year: number
        }
        Insert: {
          cohort_number: number
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          updated_at?: string
          year: number
        }
        Update: {
          cohort_number?: number
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      email_template_history: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by: string | null
          html_content: string
          id: string
          subject: string
          template_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          html_content: string
          id?: string
          subject: string
          template_id: string
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          html_content?: string
          id?: string
          subject?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_template_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string
          created_at: string
          html_content: string
          id: string
          is_active: boolean
          name: string
          subject: string
          template_key: string
          updated_at: string
          updated_by: string | null
          variables: Json
        }
        Insert: {
          category: string
          created_at?: string
          html_content: string
          id?: string
          is_active?: boolean
          name: string
          subject: string
          template_key: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Update: {
          category?: string
          created_at?: string
          html_content?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Relationships: []
      }
      message_logs: {
        Row: {
          application_id: string | null
          channel: string
          created_at: string
          error_message: string | null
          id: string
          message_content: string
          recipient_phone: string
          recipient_type: string
          sent_by: string | null
          status: string
          template_key: string | null
          twilio_sid: string | null
        }
        Insert: {
          application_id?: string | null
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_content: string
          recipient_phone: string
          recipient_type: string
          sent_by?: string | null
          status?: string
          template_key?: string | null
          twilio_sid?: string | null
        }
        Update: {
          application_id?: string | null
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_content?: string
          recipient_phone?: string
          recipient_type?: string
          sent_by?: string | null
          status?: string
          template_key?: string | null
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      message_template_history: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by: string | null
          id: string
          message_content: string
          template_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          message_content: string
          template_id: string
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          message_content?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_template_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          category: string
          channel: string
          created_at: string
          id: string
          is_active: boolean
          message_content: string
          name: string
          template_key: string
          updated_at: string
          updated_by: string | null
          variables: Json
        }
        Insert: {
          category: string
          channel: string
          created_at?: string
          id?: string
          is_active?: boolean
          message_content: string
          name: string
          template_key: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Update: {
          category?: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          message_content?: string
          name?: string
          template_key?: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Relationships: []
      }
      module_permissions: {
        Row: {
          allowed_roles: Database["public"]["Enums"]["app_role"][]
          created_at: string
          id: string
          module_key: string
          module_name: string
          updated_at: string
        }
        Insert: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          created_at?: string
          id?: string
          module_key: string
          module_name: string
          updated_at?: string
        }
        Update: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          created_at?: string
          id?: string
          module_key?: string
          module_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "viewer" | "reviewer" | "admin"
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
      app_role: ["viewer", "reviewer", "admin"],
    },
  },
} as const
