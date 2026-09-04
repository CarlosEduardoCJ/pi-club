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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          room_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          room_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          club_id: string | null
          created_at: string
          icon: string | null
          id: string
          last_message: string | null
          last_message_time: string | null
          name: string
          type: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          last_message?: string | null
          last_message_time?: string | null
          name: string
          type: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          last_message?: string | null
          last_message_time?: string | null
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          id: string
          joined_at: string
          profile_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string
          profile_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          school: string
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          school?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          school?: string
        }
        Relationships: []
      }
      competition_registrations: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: []
      }
      competitions: {
        Row: {
          club_id: string | null
          created_at: string
          date: string
          description: string
          id: string
          location: string
          name: string
          registrants_count: number
          registration_deadline: string | null
          scope: string
          status: string
          time: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          date: string
          description?: string
          id?: string
          location?: string
          name: string
          registrants_count?: number
          registration_deadline?: string | null
          scope?: string
          status?: string
          time?: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          location?: string
          name?: string
          registrants_count?: number
          registration_deadline?: string | null
          scope?: string
          status?: string
          time?: string
        }
        Relationships: []
      }
      dev_master_attempts: {
        Row: {
          attempts: number
          blocked_until: string | null
          client_key: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          blocked_until?: string | null
          client_key: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          blocked_until?: string | null
          client_key?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          deleted: boolean
          id: string
          reactions: Json
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted?: boolean
          id?: string
          reactions?: Json
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted?: boolean
          id?: string
          reactions?: Json
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          created_at: string
          event_id: string
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendees_count: number | null
          audience: string
          club_id: string | null
          created_at: string
          date: string
          description: string
          id: string
          location: string
          school: string | null
          target_classes: string[] | null
          time: string
          title: string
        }
        Insert: {
          attendees_count?: number | null
          audience?: string
          club_id?: string | null
          created_at?: string
          date: string
          description: string
          id?: string
          location: string
          school?: string | null
          target_classes?: string[] | null
          time: string
          title: string
        }
        Update: {
          attendees_count?: number | null
          audience?: string
          club_id?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          location?: string
          school?: string | null
          target_classes?: string[] | null
          time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      global_announcements: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          message: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          from_avatar: string | null
          from_profile_id: string | null
          from_user: string
          id: string
          is_read: boolean | null
          message: string
          profile_id: string
          type: string
        }
        Insert: {
          created_at?: string
          from_avatar?: string | null
          from_profile_id?: string | null
          from_user: string
          id?: string
          is_read?: boolean | null
          message: string
          profile_id: string
          type: string
        }
        Update: {
          created_at?: string
          from_avatar?: string | null
          from_profile_id?: string | null
          from_user?: string
          id?: string
          is_read?: boolean | null
          message?: string
          profile_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          profile_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          profile_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          club_id: string | null
          comments_count: number | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          likes_count: number | null
          school: string | null
        }
        Insert: {
          author_id: string
          club_id?: string | null
          comments_count?: number | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number | null
          school?: string | null
        }
        Update: {
          author_id?: string
          club_id?: string | null
          comments_count?: number | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number | null
          school?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          bio: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          developer: boolean
          followers_count: number | null
          following_count: number | null
          grade: string | null
          id: string
          is_teacher: boolean
          name: string
          posts_count: number | null
          school: string
          user_id: string | null
          username: string
        }
        Insert: {
          avatar?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          developer?: boolean
          followers_count?: number | null
          following_count?: number | null
          grade?: string | null
          id?: string
          is_teacher?: boolean
          name: string
          posts_count?: number | null
          school?: string
          user_id?: string | null
          username: string
        }
        Update: {
          avatar?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          developer?: boolean
          followers_count?: number | null
          following_count?: number | null
          grade?: string | null
          id?: string
          is_teacher?: boolean
          name?: string
          posts_count?: number | null
          school?: string
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          attempts: number
          created_at: string
          endpoint: string
          id: string
          ip: string | null
          reset_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          endpoint: string
          id?: string
          ip?: string | null
          reset_at: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          endpoint?: string
          id?: string
          ip?: string | null
          reset_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ban_user_by_admin: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      ban_user_temp_by_dev: {
        Args: { days: number; target_user_id: string }
        Returns: undefined
      }
      broadcast_global_announcement: {
        Args: { _expires_at: string; _message: string; _title: string }
        Returns: string
      }
      current_user_school: { Args: never; Returns: string }
      delete_user_by_admin: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      hard_delete_user_by_dev: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      profile_belongs_to_auth: {
        Args: { _profile_id: string }
        Returns: boolean
      }
      restore_user_by_dev: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      set_admin_role_by_dev: {
        Args: { make_admin: boolean; target_user_id: string }
        Returns: undefined
      }
      unban_user_by_admin: {
        Args: { target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "developer"
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
    Enums: {
      app_role: ["admin", "moderator", "user", "developer"],
    },
  },
} as const
