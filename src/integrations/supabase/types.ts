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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ad_campaigns: {
        Row: {
          brand_name: string
          clicks: number
          created_at: string
          daily_budget_cents: number
          destination_url: string
          end_date: string | null
          id: string
          image_url: string
          impressions: number
          placements: Database["public"]["Enums"]["ad_placement"][]
          spent_cents: number
          start_date: string | null
          status: Database["public"]["Enums"]["ad_status"]
          stripe_payment_id: string | null
          targeting_tags: string[] | null
          title: string
          total_budget_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_name: string
          clicks?: number
          created_at?: string
          daily_budget_cents?: number
          destination_url: string
          end_date?: string | null
          id?: string
          image_url: string
          impressions?: number
          placements?: Database["public"]["Enums"]["ad_placement"][]
          spent_cents?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          stripe_payment_id?: string | null
          targeting_tags?: string[] | null
          title: string
          total_budget_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_name?: string
          clicks?: number
          created_at?: string
          daily_budget_cents?: number
          destination_url?: string
          end_date?: string | null
          id?: string
          image_url?: string
          impressions?: number
          placements?: Database["public"]["Enums"]["ad_placement"][]
          spent_cents?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          stripe_payment_id?: string | null
          targeting_tags?: string[] | null
          title?: string
          total_budget_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      characters: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          training_images: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          training_images?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          training_images?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      collection_images: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          image_prompt: string | null
          image_url: string
          sort_order: number | null
          title: string | null
          user_id: string
          video_prompt: string | null
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          image_prompt?: string | null
          image_url: string
          sort_order?: number | null
          title?: string | null
          user_id: string
          video_prompt?: string | null
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          image_prompt?: string | null
          image_url?: string
          sort_order?: number | null
          title?: string | null
          user_id?: string
          video_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_images_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          community_id: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          community_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          community_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ebook_pages: {
        Row: {
          content: string | null
          created_at: string
          ebook_id: string
          elements: Json | null
          id: string
          locked: boolean | null
          page_index: number
          page_type: string
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          ebook_id: string
          elements?: Json | null
          id?: string
          locked?: boolean | null
          page_index?: number
          page_type?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          ebook_id?: string
          elements?: Json | null
          id?: string
          locked?: boolean | null
          page_index?: number
          page_type?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ebook_pages_ebook_id_fkey"
            columns: ["ebook_id"]
            isOneToOne: false
            referencedRelation: "ebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      ebooks: {
        Row: {
          chapters: number | null
          cover_color: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          id: string
          language: string | null
          model: string | null
          outline: Json | null
          progress: number | null
          prompt: string | null
          status: string
          tags: string[] | null
          title: string
          tone: string | null
          updated_at: string
          user_id: string
          words: number | null
        }
        Insert: {
          chapters?: number | null
          cover_color?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          language?: string | null
          model?: string | null
          outline?: Json | null
          progress?: number | null
          prompt?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          tone?: string | null
          updated_at?: string
          user_id: string
          words?: number | null
        }
        Update: {
          chapters?: number | null
          cover_color?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          language?: string | null
          model?: string | null
          outline?: Json | null
          progress?: number | null
          prompt?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          tone?: string | null
          updated_at?: string
          user_id?: string
          words?: number | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          followed_creator_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followed_creator_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followed_creator_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          location: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          location?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          location?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
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
      ad_placement: "explore_feed" | "search_results" | "image_sidebar"
      ad_status:
        | "draft"
        | "pending"
        | "active"
        | "paused"
        | "completed"
        | "rejected"
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
      ad_placement: ["explore_feed", "search_results", "image_sidebar"],
      ad_status: [
        "draft",
        "pending",
        "active",
        "paused",
        "completed",
        "rejected",
      ],
    },
  },
} as const
