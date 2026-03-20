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
      absence_requests: {
        Row: {
          attachment_url: string | null
          created_at: string
          end_date: string
          id: string
          parent_id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          start_date: string
          status: string
          student_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          end_date: string
          id?: string
          parent_id: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          start_date: string
          status?: string
          student_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          end_date?: string
          id?: string
          parent_id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          start_date?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_requests_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_2fa_codes: {
        Row: {
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          used: boolean
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          used?: boolean
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
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
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
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
      admin_direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_direct_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_login_history: {
        Row: {
          admin_user_id: string
          device_label: string | null
          id: string
          ip_address: string | null
          logged_in_at: string
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          device_label?: string | null
          id?: string
          ip_address?: string | null
          logged_in_at?: string
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          device_label?: string | null
          id?: string
          ip_address?: string | null
          logged_in_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_login_history_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_admin_user_id_fkey"
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
          region_scope: string
          role: Database["public"]["Enums"]["app_role"]
          theme_preference: string | null
          two_fa_channel: string
          two_fa_enabled: boolean
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
          region_scope?: string
          role?: Database["public"]["Enums"]["app_role"]
          theme_preference?: string | null
          two_fa_channel?: string
          two_fa_enabled?: boolean
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
          region_scope?: string
          role?: Database["public"]["Enums"]["app_role"]
          theme_preference?: string | null
          two_fa_channel?: string
          two_fa_enabled?: boolean
          user_id?: string
        }
        Relationships: []
      }
      application_status_history: {
        Row: {
          application_id: string
          changed_at: string
          changed_by: string | null
          id: string
          new_status: string
          old_status: string
          reason: string | null
        }
        Insert: {
          application_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: string
          old_status: string
          reason?: string | null
        }
        Update: {
          application_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: string
          old_status?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          academic_importance: string
          cohort_id: string | null
          country: string
          created_at: string
          date_of_birth: string
          deleted_at: string | null
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
          social_banner_url: string | null
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
          deleted_at?: string | null
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
          social_banner_url?: string | null
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
          deleted_at?: string | null
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
          social_banner_url?: string | null
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
      attendance_events: {
        Row: {
          created_at: string
          event_date: string
          event_type: string
          id: string
          marked_by: string | null
          method: string
          notes: string | null
          role: Database["public"]["Enums"]["school_user_role"]
          school_id: string
          status: string
          timestamp: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          marked_by?: string | null
          method?: string
          notes?: string | null
          role: Database["public"]["Enums"]["school_user_role"]
          school_id: string
          status?: string
          timestamp?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          marked_by?: string | null
          method?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["school_user_role"]
          school_id?: string
          status?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_events_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "school_users"
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
          author_phone: string | null
          author_province: string
          author_school: string
          category: string
          content: string
          created_at: string
          deleted_at: string | null
          featured_image_url: string | null
          id: string
          is_featured: boolean
          meta_description: string | null
          reading_time_minutes: number | null
          reference_number: string | null
          slug: string | null
          status: string
          submitted_at: string
          summary: string
          tags: string[] | null
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
          author_phone?: string | null
          author_province: string
          author_school: string
          category?: string
          content: string
          created_at?: string
          deleted_at?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean
          meta_description?: string | null
          reading_time_minutes?: number | null
          reference_number?: string | null
          slug?: string | null
          status?: string
          submitted_at?: string
          summary: string
          tags?: string[] | null
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
          author_phone?: string | null
          author_province?: string
          author_school?: string
          category?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean
          meta_description?: string | null
          reading_time_minutes?: number | null
          reference_number?: string | null
          slug?: string | null
          status?: string
          submitted_at?: string
          summary?: string
          tags?: string[] | null
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
      class_students: {
        Row: {
          class_id: string
          created_at: string
          id: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: number
          class_teacher_id: string | null
          created_at: string
          grade: string
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          academic_year?: number
          class_teacher_id?: string | null
          created_at?: string
          grade: string
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: number
          class_teacher_id?: string | null
          created_at?: string
          grade?: string
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_class_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
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
      curricula: {
        Row: {
          code: string
          country: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      dashboard_announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_pinned: boolean
          priority: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          priority?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          priority?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          error_message: string | null
          id: string
          recipient_email: string
          related_record_id: string | null
          related_table: string | null
          resend_id: string | null
          sent_at: string
          status: string
          subject: string
          template_key: string | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          recipient_email: string
          related_record_id?: string | null
          related_table?: string | null
          resend_id?: string | null
          sent_at?: string
          status?: string
          subject: string
          template_key?: string | null
        }
        Update: {
          error_message?: string | null
          id?: string
          recipient_email?: string
          related_record_id?: string | null
          related_table?: string | null
          resend_id?: string | null
          sent_at?: string
          status?: string
          subject?: string
          template_key?: string | null
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
      marketplace_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_claims: {
        Row: {
          claimed_at: string
          id: string
          product_id: string
          school_user_id: string | null
          status: string
          user_email: string
          user_id: string
          user_name: string
          user_role: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          product_id: string
          school_user_id?: string | null
          status?: string
          user_email: string
          user_id: string
          user_name: string
          user_role: string
        }
        Update: {
          claimed_at?: string
          id?: string
          product_id?: string
          school_user_id?: string | null
          status?: string
          user_email?: string
          user_id?: string
          user_name?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_claims_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_claims_school_user_id_fkey"
            columns: ["school_user_id"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          created_at: string
          currency: string
          id: string
          notes: string | null
          payment_status: string
          product_id: string
          quantity: number
          school_user_id: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          total_amount: number
          unit_price: number
          updated_at: string
          user_email: string
          user_id: string
          user_name: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_status?: string
          product_id: string
          quantity?: number
          school_user_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          total_amount: number
          unit_price: number
          updated_at?: string
          user_email: string
          user_id: string
          user_name: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_status?: string
          product_id?: string
          quantity?: number
          school_user_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          total_amount?: number
          unit_price?: number
          updated_at?: string
          user_email?: string
          user_id?: string
          user_name?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_school_user_id_fkey"
            columns: ["school_user_id"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "marketplace_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_products: {
        Row: {
          category_id: string | null
          coupon_code: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string
          discount_percentage: number | null
          discounted_price: number | null
          eligibility: string[] | null
          expires_at: string | null
          external_url: string | null
          gallery_urls: string[] | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          original_price: number
          product_type: string
          quantity_claimed: number
          quantity_limit: number | null
          seller_logo_url: string | null
          seller_name: string | null
          short_description: string | null
          starts_at: string | null
          tags: string[] | null
          terms_conditions: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          coupon_code?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description: string
          discount_percentage?: number | null
          discounted_price?: number | null
          eligibility?: string[] | null
          expires_at?: string | null
          external_url?: string | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          original_price: number
          product_type?: string
          quantity_claimed?: number
          quantity_limit?: number | null
          seller_logo_url?: string | null
          seller_name?: string | null
          short_description?: string | null
          starts_at?: string | null
          tags?: string[] | null
          terms_conditions?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          coupon_code?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          discount_percentage?: number | null
          discounted_price?: number | null
          eligibility?: string[] | null
          expires_at?: string | null
          external_url?: string | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          original_price?: number
          product_type?: string
          quantity_claimed?: number
          quantity_limit?: number | null
          seller_logo_url?: string | null
          seller_name?: string | null
          short_description?: string | null
          starts_at?: string | null
          tags?: string[] | null
          terms_conditions?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marketplace_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_approved: boolean
          product_id: string
          rating: number
          user_id: string
          user_name: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id: string
          rating: number
          user_id: string
          user_name: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id?: string
          rating?: number
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_variants: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          name: string
          price_adjustment: number | null
          product_id: string
          stock_quantity: number | null
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          name: string
          price_adjustment?: number | null
          product_id: string
          stock_quantity?: number | null
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          name?: string
          price_adjustment?: number | null
          product_id?: string
          stock_quantity?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
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
      misconduct_report_audit: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          report_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          report_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          report_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "misconduct_report_audit_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "misconduct_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      misconduct_reports: {
        Row: {
          assigned_to: string | null
          attachment_urls: string[] | null
          created_at: string
          description: string
          id: string
          is_anonymous: boolean
          is_emergency: boolean
          is_trending: boolean
          location: string | null
          priority: string
          report_type: string
          reporter_name: string | null
          reporter_role: string
          reporter_user_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          school_id: string | null
          status: string
          updated_at: string
          victim_names: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachment_urls?: string[] | null
          created_at?: string
          description: string
          id?: string
          is_anonymous?: boolean
          is_emergency?: boolean
          is_trending?: boolean
          location?: string | null
          priority?: string
          report_type?: string
          reporter_name?: string | null
          reporter_role?: string
          reporter_user_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          school_id?: string | null
          status?: string
          updated_at?: string
          victim_names?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachment_urls?: string[] | null
          created_at?: string
          description?: string
          id?: string
          is_anonymous?: boolean
          is_emergency?: boolean
          is_trending?: boolean
          location?: string | null
          priority?: string
          report_type?: string
          reporter_name?: string | null
          reporter_role?: string
          reporter_user_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          school_id?: string | null
          status?: string
          updated_at?: string
          victim_names?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "misconduct_reports_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "misconduct_reports_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
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
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
        }
        Relationships: []
      }
      parent_link_requests: {
        Row: {
          created_at: string
          id: string
          matched_student_id: string | null
          parent_approved: boolean | null
          parent_user_id: string
          relationship: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          status: string
          student_approved: boolean | null
          student_id_number: string | null
          student_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          matched_student_id?: string | null
          parent_approved?: boolean | null
          parent_user_id: string
          relationship?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          status?: string
          student_approved?: boolean | null
          student_id_number?: string | null
          student_name: string
        }
        Update: {
          created_at?: string
          id?: string
          matched_student_id?: string | null
          parent_approved?: boolean | null
          parent_user_id?: string
          relationship?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          status?: string
          student_approved?: boolean | null
          student_id_number?: string | null
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_link_requests_matched_student_id_fkey"
            columns: ["matched_student_id"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_link_requests_parent_user_id_fkey"
            columns: ["parent_user_id"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_link_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_link_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      period_attendance: {
        Row: {
          created_at: string
          event_date: string
          id: string
          marked_by: string | null
          notes: string | null
          school_id: string
          status: string
          student_id: string
          timetable_entry_id: string
        }
        Insert: {
          created_at?: string
          event_date?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          school_id: string
          status?: string
          student_id: string
          timetable_entry_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          school_id?: string
          status?: string
          student_id?: string
          timetable_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_attendance_timetable_entry_id_fkey"
            columns: ["timetable_entry_id"]
            isOneToOne: false
            referencedRelation: "timetable_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_registration_requests: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          id_passport_number: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: string
          school_id: string | null
          status: string
          student_id_number: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          id_passport_number?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role: string
          school_id?: string | null
          status?: string
          student_id_number?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          id_passport_number?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string
          school_id?: string | null
          status?: string
          student_id_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_registration_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_registration_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          endpoint: string
          id: string
          ip_address: string
          request_count: number
          window_start: string
        }
        Insert: {
          endpoint: string
          id?: string
          ip_address: string
          request_count?: number
          window_start?: string
        }
        Update: {
          endpoint?: string
          id?: string
          ip_address?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      school_2fa_codes: {
        Row: {
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          used: boolean
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          used?: boolean
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      school_calendar_events: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          end_time: string | null
          event_type: string
          id: string
          is_all_day: boolean
          school_id: string
          start_date: string
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          end_time?: string | null
          event_type?: string
          id?: string
          is_all_day?: boolean
          school_id: string
          start_date: string
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          end_time?: string | null
          event_type?: string
          id?: string
          is_all_day?: boolean
          school_id?: string
          start_date?: string
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_calendar_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_chat_conversations: {
        Row: {
          admin_last_reply_at: string | null
          ai_paused: boolean
          created_at: string
          id: string
          last_message_at: string | null
          school_id: string
          session_id: string
          status: string
          visitor_name: string | null
          visitor_role: string
        }
        Insert: {
          admin_last_reply_at?: string | null
          ai_paused?: boolean
          created_at?: string
          id?: string
          last_message_at?: string | null
          school_id: string
          session_id: string
          status?: string
          visitor_name?: string | null
          visitor_role?: string
        }
        Update: {
          admin_last_reply_at?: string | null
          ai_paused?: boolean
          created_at?: string
          id?: string
          last_message_at?: string | null
          school_id?: string
          session_id?: string
          status?: string
          visitor_name?: string | null
          visitor_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_chat_conversations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_chat_knowledge: {
        Row: {
          category: string
          content: string
          content_type: string
          created_at: string
          created_by: string | null
          document_name: string | null
          document_size: number | null
          document_url: string | null
          id: string
          is_active: boolean
          school_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          document_name?: string | null
          document_size?: number | null
          document_url?: string | null
          id?: string
          is_active?: boolean
          school_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          document_name?: string | null
          document_size?: number | null
          document_url?: string | null
          id?: string
          is_active?: boolean
          school_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_chat_knowledge_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_chat_knowledge_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_ai_response: boolean
          sender_name: string | null
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_ai_response?: boolean
          sender_name?: string | null
          sender_type?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_ai_response?: boolean
          sender_name?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "school_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_terms: {
        Row: {
          academic_year: number
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          name: string
          school_id: string
          start_date: string
          term_number: number
          updated_at: string
        }
        Insert: {
          academic_year?: number
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          name: string
          school_id: string
          start_date: string
          term_number: number
          updated_at?: string
        }
        Update: {
          academic_year?: number
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          name?: string
          school_id?: string
          start_date?: string
          term_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_terms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_terms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          id_passport_number: string | null
          is_active: boolean
          phone: string | null
          profile_picture_url: string | null
          role: Database["public"]["Enums"]["school_user_role"]
          school_id: string | null
          student_id_number: string | null
          two_fa_channel: string
          two_fa_enabled: boolean
          updated_at: string
          user_code: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          id_passport_number?: string | null
          is_active?: boolean
          phone?: string | null
          profile_picture_url?: string | null
          role: Database["public"]["Enums"]["school_user_role"]
          school_id?: string | null
          student_id_number?: string | null
          two_fa_channel?: string
          two_fa_enabled?: boolean
          updated_at?: string
          user_code?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          id_passport_number?: string | null
          is_active?: boolean
          phone?: string | null
          profile_picture_url?: string | null
          role?: Database["public"]["Enums"]["school_user_role"]
          school_id?: string | null
          student_id_number?: string | null
          two_fa_channel?: string
          two_fa_enabled?: boolean
          updated_at?: string
          user_code?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_users_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          country: string
          created_at: string
          email: string | null
          emis_number: string | null
          id: string
          is_verified: boolean
          logo_url: string | null
          name: string
          phone: string | null
          province: string | null
          school_code: string
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          address?: string | null
          country?: string
          created_at?: string
          email?: string | null
          emis_number?: string | null
          id?: string
          is_verified?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          province?: string | null
          school_code: string
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          address?: string | null
          country?: string
          created_at?: string
          email?: string | null
          emis_number?: string | null
          id?: string
          is_verified?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          province?: string | null
          school_code?: string
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: []
      }
      schools_directory: {
        Row: {
          address: string | null
          created_at: string
          district: string | null
          emis_number: string
          id: string
          level: string | null
          name: string
          province: string
          sector: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          district?: string | null
          emis_number: string
          id?: string
          level?: string | null
          name: string
          province?: string
          sector?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          district?: string | null
          emis_number?: string
          id?: string
          level?: string | null
          name?: string
          province?: string
          sector?: string | null
        }
        Relationships: []
      }
      student_parent_links: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          parent_user_id: string
          relationship: string
          student_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_user_id: string
          relationship?: string
          student_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_user_id?: string
          relationship?: string
          student_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parent_links_parent_user_id_fkey"
            columns: ["parent_user_id"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parent_links_student_user_id_fkey"
            columns: ["student_user_id"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_subjects: {
        Row: {
          created_at: string
          id: string
          student_id: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          subject_id: string
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subjects_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          curriculum_id: string | null
          grade: string | null
          id: string
          is_active: boolean
          name: string
          school_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          curriculum_id?: string | null
          grade?: string | null
          id?: string
          is_active?: boolean
          name: string
          school_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          curriculum_id?: string | null
          grade?: string | null
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
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
      testimonials: {
        Row: {
          created_at: string
          id: string
          is_published: boolean
          name: string
          province: string
          quote: string
          role: string
          school: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_published?: boolean
          name: string
          province: string
          quote: string
          role: string
          school: string
        }
        Update: {
          created_at?: string
          id?: string
          is_published?: boolean
          name?: string
          province?: string
          quote?: string
          role?: string
          school?: string
        }
        Relationships: []
      }
      timetable_entries: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          period_label: string | null
          school_id: string
          start_time: string
          subject_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          period_label?: string | null
          school_id: string
          start_time: string
          subject_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          period_label?: string | null
          school_id?: string
          start_time?: string
          subject_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "school_users"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          events: string[]
          failure_count: number
          id: string
          is_active: boolean
          last_triggered_at: string | null
          secret: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          secret: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          secret?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          _endpoint: string
          _ip: string
          _max_requests: number
          _window_minutes: number
        }
        Returns: boolean
      }
      generate_user_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_school_role: {
        Args: {
          _role: Database["public"]["Enums"]["school_user_role"]
          _school_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_school_member: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      is_school_staff: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "viewer" | "reviewer" | "admin" | "super_admin"
      school_user_role:
        | "school_admin"
        | "hr"
        | "educator"
        | "class_teacher"
        | "subject_teacher"
        | "parent"
        | "student"
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
      app_role: ["viewer", "reviewer", "admin", "super_admin"],
      school_user_role: [
        "school_admin",
        "hr",
        "educator",
        "class_teacher",
        "subject_teacher",
        "parent",
        "student",
      ],
    },
  },
} as const
