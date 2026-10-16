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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_emails: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          created_at: string
          id: string
          messages: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          booked_at: string | null
          contact_channel: Database["public"]["Enums"]["contact_channel"]
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          driver_id: string
          id: string
          issue: string
          message: string
          note: string
          preferred_slots: string[]
          price_high_sek: number | null
          price_low_sek: number | null
          quote_high_sek: number | null
          quote_low_sek: number | null
          service: string | null
          status: Database["public"]["Enums"]["inquiry_status"]
          updated_at: string
          urgency: string
          vehicle_label: string
          workshop_id: string
        }
        Insert: {
          booked_at?: string | null
          contact_channel?: Database["public"]["Enums"]["contact_channel"]
          contact_email?: string
          contact_name: string
          contact_phone: string
          created_at?: string
          driver_id?: string
          id?: string
          issue: string
          message?: string
          note?: string
          preferred_slots?: string[]
          price_high_sek?: number | null
          price_low_sek?: number | null
          quote_high_sek?: number | null
          quote_low_sek?: number | null
          service?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string
          urgency?: string
          vehicle_label?: string
          workshop_id: string
        }
        Update: {
          booked_at?: string | null
          contact_channel?: Database["public"]["Enums"]["contact_channel"]
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          driver_id?: string
          id?: string
          issue?: string
          message?: string
          note?: string
          preferred_slots?: string[]
          price_high_sek?: number | null
          price_low_sek?: number | null
          quote_high_sek?: number | null
          quote_low_sek?: number | null
          service?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string
          urgency?: string
          vehicle_label?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_vehicles: {
        Row: {
          updated_at: string
          user_id: string
          vehicle: Json
        }
        Insert: {
          updated_at?: string
          user_id: string
          vehicle: Json
        }
        Update: {
          updated_at?: string
          user_id?: string
          vehicle?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workshop_invites: {
        Row: {
          claimed_at: string | null
          created_at: string
          email: string
          workshop_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          email: string
          workshop_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          email?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_invites_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["workshop_role"]
          user_id: string
          workshop_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["workshop_role"]
          user_id: string
          workshop_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["workshop_role"]
          user_id?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_members_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_settings: {
        Row: {
          address: string
          ai_chat_tier: string
          ai_quote_tier: string
          booking_days: number[]
          brand_accent: string
          brand_greeting: string
          brand_logo_url: string
          contact_email: string
          hourly_rate_sek: number
          jackie_context: string
          job_durations: Json
          min_notice_days: number
          opening_hours: string
          phone: string
          price_list: Json
          services: Json
          slot_hours: number[]
          specialties: string
          updated_at: string
          website: string
          workshop_id: string
        }
        Insert: {
          address?: string
          ai_chat_tier?: string
          ai_quote_tier?: string
          booking_days?: number[]
          brand_accent?: string
          brand_greeting?: string
          brand_logo_url?: string
          contact_email?: string
          hourly_rate_sek?: number
          jackie_context?: string
          job_durations?: Json
          min_notice_days?: number
          opening_hours?: string
          phone?: string
          price_list?: Json
          services?: Json
          slot_hours?: number[]
          specialties?: string
          updated_at?: string
          website?: string
          workshop_id: string
        }
        Update: {
          address?: string
          ai_chat_tier?: string
          ai_quote_tier?: string
          booking_days?: number[]
          brand_accent?: string
          brand_greeting?: string
          brand_logo_url?: string
          contact_email?: string
          hourly_rate_sek?: number
          jackie_context?: string
          job_durations?: Json
          min_notice_days?: number
          opening_hours?: string
          phone?: string
          price_list?: Json
          services?: Json
          slot_hours?: number[]
          specialties?: string
          updated_at?: string
          website?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_settings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          city: string
          created_at: string
          created_by: string
          id: string
          name: string
          slug: string | null
          vat_number: string
        }
        Insert: {
          city?: string
          created_at?: string
          created_by?: string
          id?: string
          name: string
          slug?: string | null
          vat_number?: string
        }
        Update: {
          city?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          slug?: string | null
          vat_number?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_onboard_workshop: {
        Args: { _city?: string; _email: string; _name: string }
        Returns: string
      }
      admin_set_workshop_profile: {
        Args: {
          _address: string
          _phone: string
          _vat: string
          _workshop: string
        }
        Returns: undefined
      }
      claim_my_access: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_partner_workshops: {
        Args: never
        Returns: {
          city: string
          id: string
          name: string
        }[]
      }
      workshop_booking_rules: { Args: { _workshop: string }; Returns: Json }
      workshop_jackie_profile: { Args: { _workshop: string }; Returns: Json }
      workshop_public_profile: { Args: { _slug: string }; Returns: Json }
      workshop_role_of: {
        Args: { _user: string; _workshop: string }
        Returns: Database["public"]["Enums"]["workshop_role"]
      }
    }
    Enums: {
      app_role: "admin"
      contact_channel: "email" | "sms" | "whatsapp"
      inquiry_status: "new" | "contacted" | "quoted" | "booked" | "closed"
      workshop_role: "owner" | "staff"
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
      app_role: ["admin"],
      contact_channel: ["email", "sms", "whatsapp"],
      inquiry_status: ["new", "contacted", "quoted", "booked", "closed"],
      workshop_role: ["owner", "staff"],
    },
  },
} as const
