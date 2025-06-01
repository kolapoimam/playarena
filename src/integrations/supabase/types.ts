export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      cycling_events: {
        Row: {
          id: string
          slug: string
          title: string
          event_date: string
          start_time: string
          event_start_time: string | null
          event_end_time: string | null
          max_attendees: number
          host_id: string
          host_name: string
          host_phone: string
          supercode: string
          is_free: boolean
          price: number | null
          cancellation_status: boolean
          status: string
          start_landmark_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          event_date: string
          start_time: string
          event_start_time?: string | null
          event_end_time?: string | null
          max_attendees: number
          host_id: string
          host_name: string
          host_phone: string
          supercode: string
          is_free: boolean
          price?: number | null
          cancellation_status?: boolean
          status?: string
          start_landmark_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          event_date?: string
          start_time?: string
          event_start_time?: string | null
          event_end_time?: string | null
          max_attendees?: number
          host_id?: string
          host_name?: string
          host_phone?: string
          supercode?: string
          is_free?: boolean
          price?: number | null
          cancellation_status?: boolean
          status?: string
          start_landmark_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      cycling_attendees: {
        Row: {
          id_uuid: string
          event_id: string
          attendee_name: string
          attendee_phone: string
          attendee_status: string
          confirmation_code: string
          details: Json | null
          number_of_slots: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id_uuid?: string
          event_id: string
          attendee_name: string
          attendee_phone: string
          attendee_status?: string
          confirmation_code: string
          details?: Json | null
          number_of_slots?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_uuid?: string
          event_id?: string
          attendee_name?: string
          attendee_phone?: string
          attendee_status?: string
          confirmation_code?: string
          details?: Json | null
          number_of_slots?: number
          created_at?: string
          updated_at?: string
        }
      }
      cashouts: {
        Row: {
          id: string
          cycling_event_id_uuid: string
          match_id: string | null
          super_code: string
          amount: number
          bank_account_number: string
          bank_name: string
          account_name: string
          status: "Review" | "Processed" | "Failed" | "Successful"
          temp_identifier: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cycling_event_id_uuid: string
          match_id?: string | null
          super_code: string
          amount: number
          bank_account_number: string
          bank_name: string
          account_name: string
          status?: "Review" | "Processed" | "Failed" | "Successful"
          temp_identifier?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cycling_event_id_uuid?: string
          match_id?: string | null
          super_code?: string
          amount?: number
          bank_account_number?: string
          bank_name?: string
          account_name?: string
          status?: "Review" | "Processed" | "Failed" | "Successful"
          temp_identifier?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      wallets: {
        Row: {
          id: string
          organizer_id: string
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organizer_id: string
          balance: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organizer_id?: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      landmarks: {
        Row: {
          id: string
          name: string
          state: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          state?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          state?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      cycling_events_view: {
        Row: {
          id: string
          slug: string
          title: string
          event_date: string
          start_time: string
          event_start_time: string | null
          event_end_time: string | null
          max_attendees: number
          host_id: string
          host_name: string
          host_phone: string
          supercode: string
          is_free: boolean
          price: number | null
          cancellation_status: boolean
          status: string
          start_landmark_id: string
          start_landmark: {
            name: string | null
            state: string | null
          } | null
          created_at: string
          updated_at: string
        }
      }
    }
    Functions: {
      update_wallet_balance: {
        Args: {
          p_organizer_id: string
          p_amount: number
          p_operation: "add" | "subtract"
        }
        Returns: void
      }
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
