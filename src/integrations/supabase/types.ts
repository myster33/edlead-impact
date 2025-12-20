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
      applications: {
        Row: {
          academic_importance: string
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
        Relationships: []
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
