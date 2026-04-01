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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievement_definitions: {
        Row: {
          badge_color: string | null
          category: string
          created_at: string | null
          criteria: Json
          description: string
          icon: string
          id: string
          name: string
          reward_points: number | null
        }
        Insert: {
          badge_color?: string | null
          category: string
          created_at?: string | null
          criteria: Json
          description: string
          icon: string
          id: string
          name: string
          reward_points?: number | null
        }
        Update: {
          badge_color?: string | null
          category?: string
          created_at?: string | null
          criteria?: Json
          description?: string
          icon?: string
          id?: string
          name?: string
          reward_points?: number | null
        }
        Relationships: []
      }
      competency_criteria: {
        Row: {
          competency_name: string
          created_at: string | null
          criterion_description: string
          criterion_key: string
          criterion_name: string
          evaluation_guide: string | null
          id: string
          weight: number | null
        }
        Insert: {
          competency_name: string
          created_at?: string | null
          criterion_description: string
          criterion_key: string
          criterion_name: string
          evaluation_guide?: string | null
          id?: string
          weight?: number | null
        }
        Update: {
          competency_name?: string
          created_at?: string | null
          criterion_description?: string
          criterion_key?: string
          criterion_name?: string
          evaluation_guide?: string | null
          id?: string
          weight?: number | null
        }
        Relationships: []
      }
      competency_scores: {
        Row: {
          ai_suggestions: Json | null
          competency_name: string
          created_at: string | null
          criterion_approvals: Json | null
          feedback: string | null
          id: string
          organization_id: string | null
          score: number
          session_id: string
          spin_category: string | null
          sub_scores: Json | null
          sub_scores_feedback: Json | null
        }
        Insert: {
          ai_suggestions?: Json | null
          competency_name: string
          created_at?: string | null
          criterion_approvals?: Json | null
          feedback?: string | null
          id?: string
          organization_id?: string | null
          score: number
          session_id: string
          spin_category?: string | null
          sub_scores?: Json | null
          sub_scores_feedback?: Json | null
        }
        Update: {
          ai_suggestions?: Json | null
          competency_name?: string
          created_at?: string | null
          criterion_approvals?: Json | null
          feedback?: string | null
          id?: string
          organization_id?: string | null
          score?: number
          session_id?: string
          spin_category?: string | null
          sub_scores?: Json | null
          sub_scores_feedback?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "competency_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "roleplay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          company_config: Json | null
          created_at: string | null
          custom_domain: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          company_config?: Json | null
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          company_config?: Json | null
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      personas: {
        Row: {
          automation_context: Json | null
          avatar_url: string | null
          buying_signals: Json | null
          company: string
          created_at: string | null
          description: string | null
          difficulty: string
          elevenlabs_voice_id: string | null
          id: string
          name: string
          objection_patterns: Json | null
          organization_id: string | null
          pain_points: Json | null
          personality_traits: Json | null
          role: string
          sector: string
          voice_provider: string | null
        }
        Insert: {
          automation_context?: Json | null
          avatar_url?: string | null
          buying_signals?: Json | null
          company: string
          created_at?: string | null
          description?: string | null
          difficulty: string
          elevenlabs_voice_id?: string | null
          id?: string
          name: string
          objection_patterns?: Json | null
          organization_id?: string | null
          pain_points?: Json | null
          personality_traits?: Json | null
          role: string
          sector: string
          voice_provider?: string | null
        }
        Update: {
          automation_context?: Json | null
          avatar_url?: string | null
          buying_signals?: Json | null
          company?: string
          created_at?: string | null
          description?: string | null
          difficulty?: string
          elevenlabs_voice_id?: string | null
          id?: string
          name?: string
          objection_patterns?: Json | null
          organization_id?: string | null
          pain_points?: Json | null
          personality_traits?: Json | null
          role?: string
          sector?: string
          voice_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      roleplay_sessions: {
        Row: {
          completed_at: string | null
          duration_seconds: number | null
          executive_summary: string | null
          highlights: string[] | null
          id: string
          meeting_type: string
          method: string
          organization_id: string | null
          overall_score: number | null
          persona_id: string
          recommendations: string[] | null
          started_at: string | null
          status: string | null
          user_id: string
          voice_metrics: Json | null
        }
        Insert: {
          completed_at?: string | null
          duration_seconds?: number | null
          executive_summary?: string | null
          highlights?: string[] | null
          id?: string
          meeting_type: string
          method: string
          organization_id?: string | null
          overall_score?: number | null
          persona_id: string
          recommendations?: string[] | null
          started_at?: string | null
          status?: string | null
          user_id: string
          voice_metrics?: Json | null
        }
        Update: {
          completed_at?: string | null
          duration_seconds?: number | null
          executive_summary?: string | null
          highlights?: string[] | null
          id?: string
          meeting_type?: string
          method?: string
          organization_id?: string | null
          overall_score?: number | null
          persona_id?: string
          recommendations?: string[] | null
          started_at?: string | null
          status?: string | null
          user_id?: string
          voice_metrics?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "roleplay_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roleplay_sessions_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      session_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          organization_id: string | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "roleplay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_quality_metrics: {
        Row: {
          audio_system_used: string | null
          avg_latency_ms: number | null
          buffer_health_avg: string | null
          created_at: string
          id: string
          session_id: string
          total_errors: number | null
          total_gaps: number | null
        }
        Insert: {
          audio_system_used?: string | null
          avg_latency_ms?: number | null
          buffer_health_avg?: string | null
          created_at?: string
          id?: string
          session_id: string
          total_errors?: number | null
          total_gaps?: number | null
        }
        Update: {
          audio_system_used?: string | null
          avg_latency_ms?: number | null
          buffer_health_avg?: string | null
          created_at?: string
          id?: string
          session_id?: string
          total_errors?: number | null
          total_gaps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_quality_metrics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "roleplay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_recommendations: {
        Row: {
          action_items: Json
          created_at: string | null
          description: string
          expected_impact: string | null
          id: string
          priority: string
          recommendation_type: string
          related_competency: string | null
          session_id: string
          time_to_implement: string | null
          title: string
        }
        Insert: {
          action_items?: Json
          created_at?: string | null
          description: string
          expected_impact?: string | null
          id?: string
          priority: string
          recommendation_type: string
          related_competency?: string | null
          session_id: string
          time_to_implement?: string | null
          title: string
        }
        Update: {
          action_items?: Json
          created_at?: string | null
          description?: string
          expected_impact?: string | null
          id?: string
          priority?: string
          recommendation_type?: string
          related_competency?: string | null
          session_id?: string
          time_to_implement?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_recommendations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "roleplay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string | null
          user_id: string | null
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string | null
          user_id?: string | null
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advanced_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_insights: {
        Row: {
          analysis: Json
          generated_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          analysis: Json
          generated_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          analysis?: Json
          generated_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advanced_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_users_view: {
        Row: {
          avatar_url: string | null
          avg_score: number | null
          created_at: string | null
          full_name: string | null
          id: string | null
          last_activity: string | null
          roles: Json | null
          total_sessions: number | null
        }
        Relationships: []
      }
      advanced_rankings: {
        Row: {
          achievements_count: number | null
          avatar_url: string | null
          avg_implication: number | null
          avg_need_payoff: number | null
          avg_problem: number | null
          avg_score: number | null
          avg_situation: number | null
          best_score: number | null
          full_name: string | null
          id: string | null
          last_activity: string | null
          rank: number | null
          total_sessions: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_and_unlock_achievements: {
        Args: { _session_id: string; _user_id: string }
        Returns: undefined
      }
      cleanup_abandoned_sessions: { Args: never; Returns: undefined }
      cleanup_abandoned_voice_sessions: { Args: never; Returns: undefined }
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
      has_org_role: {
        Args: { _org_id: string; _role: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
