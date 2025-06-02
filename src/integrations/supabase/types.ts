export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      access_pins: {
        Row: {
          created_at: string | null
          id: string
          pin: string
          updated_at: string | null
          user_id: string | null
          venue_id: string
          verified: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pin: string
          updated_at?: string | null
          user_id?: string | null
          venue_id: string
          verified: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pin?: string
          updated_at?: string | null
          user_id?: string | null
          venue_id?: string
          verified?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_pins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_pins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_match_reports: {
        Row: {
          created_at: string | null
          id: string
          report_period_end: string
          report_period_start: string
          report_type: string
          top_organisers: Json | null
          top_players: Json | null
          total_cashout_eligible: number | null
          total_free_matches: number | null
          total_matches: number | null
          total_organisers: number | null
          total_paid_amount: number | null
          total_paid_matches: number | null
          total_players: number | null
          total_refund_eligible: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          report_period_end: string
          report_period_start: string
          report_type: string
          top_organisers?: Json | null
          top_players?: Json | null
          total_cashout_eligible?: number | null
          total_free_matches?: number | null
          total_matches?: number | null
          total_organisers?: number | null
          total_paid_amount?: number | null
          total_paid_matches?: number | null
          total_players?: number | null
          total_refund_eligible?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          report_period_end?: string
          report_period_start?: string
          report_type?: string
          top_organisers?: Json | null
          top_players?: Json | null
          total_cashout_eligible?: number | null
          total_free_matches?: number | null
          total_matches?: number | null
          total_organisers?: number | null
          total_paid_amount?: number | null
          total_paid_matches?: number | null
          total_players?: number | null
          total_refund_eligible?: number | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          created_at: string | null
          description: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description: string
          icon: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      booking_access_codes: {
        Row: {
          booking_id: string | null
          code: string
          created_at: string | null
          end_time: string | null
          expiry_date: string
          id: string
          match_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["code_status"] | null
          venue_id: string | null
        }
        Insert: {
          booking_id?: string | null
          code: string
          created_at?: string | null
          end_time?: string | null
          expiry_date: string
          id?: string
          match_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["code_status"] | null
          venue_id?: string | null
        }
        Update: {
          booking_id?: string | null
          code?: string
          created_at?: string | null
          end_time?: string | null
          expiry_date?: string
          id?: string
          match_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["code_status"] | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_access_codes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_access_codes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_access_codes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_matches_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount: number | null
          created_at: string | null
          end_time: string | null
          id: string
          match_date: string | null
          match_id: string | null
          organizer_name: string | null
          payment_reference: string | null
          payment_status: string | null
          start_time: string | null
          title: string | null
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          match_date?: string | null
          match_id?: string | null
          organizer_name?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          start_time?: string | null
          title?: string | null
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          match_date?: string | null
          match_id?: string | null
          organizer_name?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          start_time?: string | null
          title?: string | null
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      cashout_requests: {
        Row: {
          account_details: Json
          amount: number
          created_at: string | null
          cycling_event_supercode: number | null
          id: string
          match_id: string
          organizer_id: string | null
          status: Database["public"]["Enums"]["cashout_status"]
          super_code: string | null
          temp_identifier: string | null
          updated_at: string | null
        }
        Insert: {
          account_details: Json
          amount: number
          created_at?: string | null
          cycling_event_supercode?: number | null
          id?: string
          match_id: string
          organizer_id?: string | null
          status: Database["public"]["Enums"]["cashout_status"]
          super_code?: string | null
          temp_identifier?: string | null
          updated_at?: string | null
        }
        Update: {
          account_details?: Json
          amount?: number
          created_at?: string | null
          cycling_event_supercode?: number | null
          id?: string
          match_id?: string
          organizer_id?: string | null
          status?: Database["public"]["Enums"]["cashout_status"]
          super_code?: string | null
          temp_identifier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashout_requests_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      cashouts: {
        Row: {
          account_name: string
          bank_account_number: string
          bank_name: string
          created_at: string | null
          cycling_event_id_uuid: string | null
          cycling_event_supercode: number | null
          id: string
          match_id: string | null
          organizer_id: string | null
          organizer_phone: string | null
          status: Database["public"]["Enums"]["cashout_status"]
          super_code: string
          temp_identifier: string | null
          total_amount_paid: number | null
          total_amount_refund: number | null
          total_cashout_eligible: number | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          bank_account_number: string
          bank_name: string
          created_at?: string | null
          cycling_event_id_uuid?: string | null
          cycling_event_supercode?: number | null
          id?: string
          match_id?: string | null
          organizer_id?: string | null
          organizer_phone?: string | null
          status: Database["public"]["Enums"]["cashout_status"]
          super_code: string
          temp_identifier?: string | null
          total_amount_paid?: number | null
          total_amount_refund?: number | null
          total_cashout_eligible?: number | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          bank_account_number?: string
          bank_name?: string
          created_at?: string | null
          cycling_event_id_uuid?: string | null
          cycling_event_supercode?: number | null
          id?: string
          match_id?: string | null
          organizer_id?: string | null
          organizer_phone?: string | null
          status?: Database["public"]["Enums"]["cashout_status"]
          super_code?: string
          temp_identifier?: string | null
          total_amount_paid?: number | null
          total_amount_refund?: number | null
          total_cashout_eligible?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashouts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cashouts_cycling_event"
            columns: ["cycling_event_id_uuid"]
            isOneToOne: false
            referencedRelation: "cycling_events"
            referencedColumns: ["id_uuid"]
          },
          {
            foreignKeyName: "fk_cashouts_cycling_event"
            columns: ["cycling_event_id_uuid"]
            isOneToOne: false
            referencedRelation: "cycling_events_api"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cashouts_cycling_event"
            columns: ["cycling_event_id_uuid"]
            isOneToOne: false
            referencedRelation: "cycling_events_view"
            referencedColumns: ["id_uuid"]
          },
        ]
      }
      cycling_attendees: {
        Row: {
          attendee_name: string
          attendee_phone: string
          attendee_status: string | null
          confirmation_code: string
          created_at: string | null
          cycling_event_id: number | null
          cycling_event_id_uuid: string
          id_uuid: string
          is_own_bike: boolean | null
          is_rental_bike: boolean | null
          number_of_slots: number
          payment_status: boolean | null
          status: Database["public"]["Enums"]["attendee_status_enum"] | null
          updated_at: string | null
        }
        Insert: {
          attendee_name: string
          attendee_phone: string
          attendee_status?: string | null
          confirmation_code: string
          created_at?: string | null
          cycling_event_id?: number | null
          cycling_event_id_uuid: string
          id_uuid?: string
          is_own_bike?: boolean | null
          is_rental_bike?: boolean | null
          number_of_slots?: number
          payment_status?: boolean | null
          status?: Database["public"]["Enums"]["attendee_status_enum"] | null
          updated_at?: string | null
        }
        Update: {
          attendee_name?: string
          attendee_phone?: string
          attendee_status?: string | null
          confirmation_code?: string
          created_at?: string | null
          cycling_event_id?: number | null
          cycling_event_id_uuid?: string
          id_uuid?: string
          is_own_bike?: boolean | null
          is_rental_bike?: boolean | null
          number_of_slots?: number
          payment_status?: boolean | null
          status?: Database["public"]["Enums"]["attendee_status_enum"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cycling_attendees_cycling_event_id_fkey"
            columns: ["cycling_event_id"]
            isOneToOne: false
            referencedRelation: "cycling_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycling_attendees_cycling_event_id_uuid_fkey"
            columns: ["cycling_event_id_uuid"]
            isOneToOne: false
            referencedRelation: "cycling_events"
            referencedColumns: ["id_uuid"]
          },
          {
            foreignKeyName: "cycling_attendees_cycling_event_id_uuid_fkey"
            columns: ["cycling_event_id_uuid"]
            isOneToOne: false
            referencedRelation: "cycling_events_api"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycling_attendees_cycling_event_id_uuid_fkey"
            columns: ["cycling_event_id_uuid"]
            isOneToOne: false
            referencedRelation: "cycling_events_view"
            referencedColumns: ["id_uuid"]
          },
        ]
      }
      cycling_events: {
        Row: {
          created_at: string | null
          distance_km: number | null
          duration_type: string
          duration_value: number
          end_landmark_id: string | null
          end_time: string | null
          event_date: string
          host_id: string
          host_name: string
          host_phone: string
          id: number
          id_uuid: string
          is_free: boolean
          is_own_bike: boolean
          is_rental_available: boolean
          max_attendees: number
          notes: string | null
          price: number | null
          registration_deadline: string | null
          slug: string
          start_landmark_id: string
          start_time: string
          status: Database["public"]["Enums"]["event_status"]
          supercode: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          distance_km?: number | null
          duration_type: string
          duration_value: number
          end_landmark_id?: string | null
          end_time?: string | null
          event_date: string
          host_id?: string
          host_name: string
          host_phone: string
          id?: never
          id_uuid?: string
          is_free?: boolean
          is_own_bike?: boolean
          is_rental_available?: boolean
          max_attendees: number
          notes?: string | null
          price?: number | null
          registration_deadline?: string | null
          slug: string
          start_landmark_id: string
          start_time: string
          status: Database["public"]["Enums"]["event_status"]
          supercode: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          distance_km?: number | null
          duration_type?: string
          duration_value?: number
          end_landmark_id?: string | null
          end_time?: string | null
          event_date?: string
          host_id?: string
          host_name?: string
          host_phone?: string
          id?: never
          id_uuid?: string
          is_free?: boolean
          is_own_bike?: boolean
          is_rental_available?: boolean
          max_attendees?: number
          notes?: string | null
          price?: number | null
          registration_deadline?: string | null
          slug?: string
          start_landmark_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["event_status"]
          supercode?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cycling_events_end_landmark_id_fkey"
            columns: ["end_landmark_id"]
            isOneToOne: false
            referencedRelation: "landmarks"
            referencedColumns: ["id_uuid"]
          },
          {
            foreignKeyName: "cycling_events_start_landmark_id_fkey"
            columns: ["start_landmark_id"]
            isOneToOne: false
            referencedRelation: "landmarks"
            referencedColumns: ["id_uuid"]
          },
        ]
      }
      feedback: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string
          match_id: string
          match_organization: number | null
          player_id: string
          referee_performance: number | null
          venue_quality: number | null
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string
          match_id: string
          match_organization?: number | null
          player_id: string
          referee_performance?: number | null
          venue_quality?: number | null
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string
          match_id?: string
          match_organization?: number | null
          player_id?: string
          referee_performance?: number | null
          venue_quality?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_summaries: {
        Row: {
          created_at: string | null
          id: string
          match_id: string
          summary: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id: string
          summary: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "feedback_summaries_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      landmarks: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          id_uuid: string
          map_link: string | null
          name: string
          slug: string
          state: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: never
          id_uuid?: string
          map_link?: string | null
          name: string
          slug: string
          state: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: never
          id_uuid?: string
          map_link?: string | null
          name?: string
          slug?: string
          state?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      match_events: {
        Row: {
          created_at: string | null
          description: string
          id: string
          match_id: string
          minute: number
          player_id: string | null
          team_name: string
          type: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          match_id: string
          minute: number
          player_id?: string | null
          team_name: string
          type: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          match_id?: string
          minute?: number
          player_id?: string | null
          team_name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_match"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_player"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          access_password: string | null
          allow_bulk_tickets: boolean | null
          analytics: Json | null
          cancellation_status: boolean | null
          created_at: string
          disclose_phone: boolean | null
          end_time: string
          gender: string | null
          id: string
          is_paid: boolean
          is_private: boolean | null
          is_public: boolean | null
          match_date: string
          match_end_time: string | null
          match_start_time: string | null
          match_time: string
          match_type: string | null
          max_tickets: number | null
          notes: string | null
          organizer_id: string | null
          organizer_name: string
          organizer_phone: string | null
          player_number_required: boolean | null
          price: number | null
          required_fields: Json | null
          scorea: number | null
          scoreb: number | null
          sell_tickets: boolean | null
          skill_level: string | null
          slug: string
          start_time: string
          status: string
          super_code: string | null
          teama: Json | null
          teamb: Json | null
          ticket_price: number | null
          title: string
          total_amount_paid: number | null
          total_checked_in_players: number | null
          total_confirmed_players: number | null
          total_registered_players: number | null
          total_slots: number
          total_tickets_available: number | null
          updated_at: string | null
          venue: string | null
          venue_id: string
        }
        Insert: {
          access_password?: string | null
          allow_bulk_tickets?: boolean | null
          analytics?: Json | null
          cancellation_status?: boolean | null
          created_at?: string
          disclose_phone?: boolean | null
          end_time?: string
          gender?: string | null
          id?: string
          is_paid?: boolean
          is_private?: boolean | null
          is_public?: boolean | null
          match_date: string
          match_end_time?: string | null
          match_start_time?: string | null
          match_time: string
          match_type?: string | null
          max_tickets?: number | null
          notes?: string | null
          organizer_id?: string | null
          organizer_name: string
          organizer_phone?: string | null
          player_number_required?: boolean | null
          price?: number | null
          required_fields?: Json | null
          scorea?: number | null
          scoreb?: number | null
          sell_tickets?: boolean | null
          skill_level?: string | null
          slug: string
          start_time?: string
          status?: string
          super_code?: string | null
          teama?: Json | null
          teamb?: Json | null
          ticket_price?: number | null
          title: string
          total_amount_paid?: number | null
          total_checked_in_players?: number | null
          total_confirmed_players?: number | null
          total_registered_players?: number | null
          total_slots: number
          total_tickets_available?: number | null
          updated_at?: string | null
          venue?: string | null
          venue_id: string
        }
        Update: {
          access_password?: string | null
          allow_bulk_tickets?: boolean | null
          analytics?: Json | null
          cancellation_status?: boolean | null
          created_at?: string
          disclose_phone?: boolean | null
          end_time?: string
          gender?: string | null
          id?: string
          is_paid?: boolean
          is_private?: boolean | null
          is_public?: boolean | null
          match_date?: string
          match_end_time?: string | null
          match_start_time?: string | null
          match_time?: string
          match_type?: string | null
          max_tickets?: number | null
          notes?: string | null
          organizer_id?: string | null
          organizer_name?: string
          organizer_phone?: string | null
          player_number_required?: boolean | null
          price?: number | null
          required_fields?: Json | null
          scorea?: number | null
          scoreb?: number | null
          sell_tickets?: boolean | null
          skill_level?: string | null
          slug?: string
          start_time?: string
          status?: string
          super_code?: string | null
          teama?: Json | null
          teamb?: Json | null
          ticket_price?: number | null
          title?: string
          total_amount_paid?: number | null
          total_checked_in_players?: number | null
          total_confirmed_players?: number | null
          total_registered_players?: number | null
          total_slots?: number
          total_tickets_available?: number | null
          updated_at?: string | null
          venue?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      organizers: {
        Row: {
          id: string
          is_verified: boolean | null
          name: string
          phone: string | null
        }
        Insert: {
          id?: string
          is_verified?: boolean | null
          name: string
          phone?: string | null
        }
        Update: {
          id?: string
          is_verified?: boolean | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      pending_status_updates: {
        Row: {
          created_at: string | null
          id: number
          match_id: string
          player_id: string
          processed: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          match_id: string
          player_id: string
          processed?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: number
          match_id?: string
          player_id?: string
          processed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_status_updates_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_status_updates_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_transactions: {
        Row: {
          amount: number
          created_at: string | null
          email: string | null
          event_id: string | null
          id: string
          metadata: Json | null
          reference: string | null
          resource_id: string
          resource_type: string
          slug: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          email?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          reference?: string | null
          resource_id: string
          resource_type: string
          slug: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          email?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          reference?: string | null
          resource_id?: string
          resource_type?: string
          slug?: string
          status?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          cancellation_status: boolean | null
          confirmation_code: string | null
          created_at: string
          details: Json | null
          eligible_for_refund: string | null
          id: string
          match_id: string
          number_of_slots: number | null
          payment_status: string | null
          player_name: string
          player_status: Database["public"]["Enums"]["player_status"]
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cancellation_status?: boolean | null
          confirmation_code?: string | null
          created_at?: string
          details?: Json | null
          eligible_for_refund?: string | null
          id?: string
          match_id: string
          number_of_slots?: number | null
          payment_status?: string | null
          player_name: string
          player_status?: Database["public"]["Enums"]["player_status"]
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cancellation_status?: boolean | null
          confirmation_code?: string | null
          created_at?: string
          details?: Json | null
          eligible_for_refund?: string | null
          id?: string
          match_id?: string
          number_of_slots?: number | null
          payment_status?: string | null
          player_name?: string
          player_status?: Database["public"]["Enums"]["player_status"]
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string
          gender: string | null
          id: string
          is_initial_setup: boolean | null
          last_email_change: string | null
          last_name: string
          nickname: string | null
          phone_number: string | null
          skill_level: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          id: string
          is_initial_setup?: boolean | null
          last_email_change?: string | null
          last_name: string
          nickname?: string | null
          phone_number?: string | null
          skill_level?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          is_initial_setup?: boolean | null
          last_email_change?: string | null
          last_name?: string
          nickname?: string | null
          phone_number?: string | null
          skill_level?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      team_assignments: {
        Row: {
          created_at: string | null
          id: string
          is_public: boolean
          match_id: string
          super_code: string
          teams: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_public?: boolean
          match_id: string
          super_code: string
          teams?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_public?: boolean
          match_id?: string
          super_code?: string
          teams?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_match"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_super_code"
            columns: ["super_code"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["super_code"]
          },
        ]
      }
      tickets: {
        Row: {
          buyer_id: string | null
          buyer_name: string
          buyer_phone: string
          checked_in: boolean | null
          created_at: string | null
          id: string
          match_id: string
          match_title: string | null
          number_of_tickets: number
          purchase_date: string | null
          ticket_code: string
          total_price: number
          updated_at: string | null
        }
        Insert: {
          buyer_id?: string | null
          buyer_name: string
          buyer_phone: string
          checked_in?: boolean | null
          created_at?: string | null
          id?: string
          match_id: string
          match_title?: string | null
          number_of_tickets: number
          purchase_date?: string | null
          ticket_code: string
          total_price: number
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string | null
          buyer_name?: string
          buyer_phone?: string
          checked_in?: boolean | null
          created_at?: string | null
          id?: string
          match_id?: string
          match_title?: string | null
          number_of_tickets?: number
          purchase_date?: string | null
          ticket_code?: string
          total_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string | null
          earned_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          badge_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          badge_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_joined_matches: {
        Row: {
          created_at: string | null
          id: string
          match_id: string | null
          player_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id?: string | null
          player_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string | null
          player_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_joined_matches_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_joined_matches_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string | null
          cycling_event_id: number | null
          cycling_event_id_uuid: string
          event_type: Database["public"]["Enums"]["notification_event"]
          frequency: Database["public"]["Enums"]["notification_frequency"]
          id: string
          is_enabled: boolean
          notification_type: Database["public"]["Enums"]["notification_type"]
          subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cycling_event_id?: number | null
          cycling_event_id_uuid: string
          event_type: Database["public"]["Enums"]["notification_event"]
          frequency?: Database["public"]["Enums"]["notification_frequency"]
          id?: string
          is_enabled?: boolean
          notification_type?: Database["public"]["Enums"]["notification_type"]
          subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cycling_event_id?: number | null
          cycling_event_id_uuid?: string
          event_type?: Database["public"]["Enums"]["notification_event"]
          frequency?: Database["public"]["Enums"]["notification_frequency"]
          id?: string
          is_enabled?: boolean
          notification_type?: Database["public"]["Enums"]["notification_type"]
          subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_cycling_event_id_fkey"
            columns: ["cycling_event_id"]
            isOneToOne: false
            referencedRelation: "cycling_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_cycling_event_id_uuid_fkey"
            columns: ["cycling_event_id_uuid"]
            isOneToOne: false
            referencedRelation: "cycling_events"
            referencedColumns: ["id_uuid"]
          },
          {
            foreignKeyName: "user_notifications_cycling_event_id_uuid_fkey"
            columns: ["cycling_event_id_uuid"]
            isOneToOne: false
            referencedRelation: "cycling_events_api"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_cycling_event_id_uuid_fkey"
            columns: ["cycling_event_id_uuid"]
            isOneToOne: false
            referencedRelation: "cycling_events_view"
            referencedColumns: ["id_uuid"]
          },
        ]
      }
      user_organized_matches: {
        Row: {
          created_at: string | null
          id: string
          match_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_organized_matches_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          match_id: string | null
          transaction_type: string
          user_id: string | null
          venue_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          match_id?: string | null
          transaction_type: string
          user_id?: string | null
          venue_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          match_id?: string | null
          transaction_type?: string
          user_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_transactions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_transactions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_venue_favourites: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_venue_favourites_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_access_codes: {
        Row: {
          amount: number | null
          booking_id: string | null
          code: string
          created_at: string | null
          created_by: string | null
          end_time: string
          expiry_date: string | null
          id: string
          match_date: string
          start_time: string
          status: Database["public"]["Enums"]["code_status"] | null
          venue_id: string
        }
        Insert: {
          amount?: number | null
          booking_id?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          end_time: string
          expiry_date?: string | null
          id?: string
          match_date: string
          start_time: string
          status?: Database["public"]["Enums"]["code_status"] | null
          venue_id: string
        }
        Update: {
          amount?: number | null
          booking_id?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          end_time?: string
          expiry_date?: string | null
          id?: string
          match_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["code_status"] | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_access_codes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_access_codes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_access_codes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_matches_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_access_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_access_codes_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_booking_cashout: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          amount: number
          bank_name: string | null
          created_at: string | null
          id: string
          status: string | null
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          amount: number
          bank_name?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          amount?: number
          bank_name?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_booking_cashout_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          venue_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          venue_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_images_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_matches: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string
          match_id: string
          venue_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          match_id: string
          venue_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          match_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_matches_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string
          aggregated_rating: number | null
          booking_fee: number | null
          city: string
          created_at: string
          description: string | null
          email: string | null
          facilities: string | null
          id: string
          image_urls: string[] | null
          is_verified: boolean | null
          last_rating_update: string | null
          map_link: string | null
          name: string
          opening_hours: string | null
          price_per_hour: number | null
          pricing: string | null
          slug: string | null
          state: string
          updated_at: string | null
          user_id: string | null
          venue_phone: string | null
          verified_status:
            | Database["public"]["Enums"]["venue_verified_status"]
            | null
        }
        Insert: {
          address: string
          aggregated_rating?: number | null
          booking_fee?: number | null
          city: string
          created_at?: string
          description?: string | null
          email?: string | null
          facilities?: string | null
          id?: string
          image_urls?: string[] | null
          is_verified?: boolean | null
          last_rating_update?: string | null
          map_link?: string | null
          name: string
          opening_hours?: string | null
          price_per_hour?: number | null
          pricing?: string | null
          slug?: string | null
          state: string
          updated_at?: string | null
          user_id?: string | null
          venue_phone?: string | null
          verified_status?:
            | Database["public"]["Enums"]["venue_verified_status"]
            | null
        }
        Update: {
          address?: string
          aggregated_rating?: number | null
          booking_fee?: number | null
          city?: string
          created_at?: string
          description?: string | null
          email?: string | null
          facilities?: string | null
          id?: string
          image_urls?: string[] | null
          is_verified?: boolean | null
          last_rating_update?: string | null
          map_link?: string | null
          name?: string
          opening_hours?: string | null
          price_per_hour?: number | null
          pricing?: string | null
          slug?: string | null
          state?: string
          updated_at?: string | null
          user_id?: string | null
          venue_phone?: string | null
          verified_status?:
            | Database["public"]["Enums"]["venue_verified_status"]
            | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          organizer_id: string | null
          organizer_phone: string | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          organizer_id?: string | null
          organizer_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          organizer_id?: string | null
          organizer_phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      bookings_with_matches: {
        Row: {
          amount: number | null
          booking_match_date: string | null
          created_at: string | null
          end_time: string | null
          id: string | null
          match_date: string | null
          match_id: string | null
          match_start_time: string | null
          match_title: string | null
          organizer_name: string | null
          payment_reference: string | null
          payment_status: string | null
          start_time: string | null
          title: string | null
          updated_at: string | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings_with_matches_v2: {
        Row: {
          amount: number | null
          booking_match_date: string | null
          created_at: string | null
          end_time: string | null
          id: string | null
          match_id: string | null
          match_title: string | null
          organizer_id: string | null
          organizer_name: string | null
          payment_reference: string | null
          payment_status: string | null
          slug: string | null
          start_time: string | null
          updated_at: string | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      cashouts_view: {
        Row: {
          account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string | null
          cycling_event_supercode: number | null
          id: string | null
          match_id: string | null
          organizer_id: string | null
          organizer_phone: string | null
          status: Database["public"]["Enums"]["cashout_status"] | null
          super_code: string | null
          temp_identifier: string | null
          total_amount_paid: number | null
          total_amount_refund: number | null
          total_cashout_eligible: number | null
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          cycling_event_supercode?: never
          id?: string | null
          match_id?: string | null
          organizer_id?: string | null
          organizer_phone?: string | null
          status?: Database["public"]["Enums"]["cashout_status"] | null
          super_code?: string | null
          temp_identifier?: string | null
          total_amount_paid?: number | null
          total_amount_refund?: number | null
          total_cashout_eligible?: number | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          cycling_event_supercode?: never
          id?: string | null
          match_id?: string | null
          organizer_id?: string | null
          organizer_phone?: string | null
          status?: Database["public"]["Enums"]["cashout_status"] | null
          super_code?: string | null
          temp_identifier?: string | null
          total_amount_paid?: number | null
          total_amount_refund?: number | null
          total_cashout_eligible?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashouts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      cycling_attendees_view: {
        Row: {
          attendee_name: string | null
          attendee_phone: string | null
          confirmation_code: string | null
          cycling_event_id: number | null
          details: Json | null
          id_uuid: string | null
          payment_status: boolean | null
          status: string | null
        }
        Insert: {
          attendee_name?: string | null
          attendee_phone?: string | null
          confirmation_code?: string | null
          cycling_event_id?: number | null
          details?: never
          id_uuid?: string | null
          payment_status?: boolean | null
          status?: string | null
        }
        Update: {
          attendee_name?: string | null
          attendee_phone?: string | null
          confirmation_code?: string | null
          cycling_event_id?: number | null
          details?: never
          id_uuid?: string | null
          payment_status?: boolean | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cycling_attendees_cycling_event_id_fkey"
            columns: ["cycling_event_id"]
            isOneToOne: false
            referencedRelation: "cycling_events"
            referencedColumns: ["id"]
          },
        ]
      }
      cycling_events_api: {
        Row: {
          id: string | null
          slug: string | null
        }
        Insert: {
          id?: string | null
          slug?: string | null
        }
        Update: {
          id?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      cycling_events_view: {
        Row: {
          attendees: Json | null
          event_date: string | null
          host_id: string | null
          host_name: string | null
          host_phone: string | null
          id_uuid: string | null
          is_free: boolean | null
          max_attendees: number | null
          price: number | null
          slug: string | null
          start_landmark: string | null
          start_landmark_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["event_status"] | null
          supercode: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cycling_events_start_landmark_id_fkey"
            columns: ["start_landmark_id"]
            isOneToOne: false
            referencedRelation: "landmarks"
            referencedColumns: ["id_uuid"]
          },
        ]
      }
    }
    Functions: {
      generate_random_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_slug: {
        Args: { input_text: string }
        Returns: string
      }
      generate_unique_code: {
        Args: { length: number }
        Returns: string
      }
      generate_unique_confirmation_code: {
        Args: { event_id: string }
        Returns: string
      }
      generate_unique_landmark_slug: {
        Args: { title: string }
        Returns: string
      }
      generate_unique_slug: {
        Args: { p_text_input: string; p_table_name: string; p_id_uuid?: string }
        Returns: string
      }
      generate_unique_supercode: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_bookings_by_venue: {
        Args: { venue_id: string; is_upcoming: boolean; limit_count: number }
        Returns: {
          id: string
          title: string
          match_date: string
          start_time: string
          end_time: string
          organizer_name: string
        }[]
      }
      get_bookings_by_venue_v2: {
        Args: {
          p_venue_id: string
          p_is_upcoming: boolean
          p_limit_count: number
        }
        Returns: {
          booking_id: string
          booking_venue_id: string
          booking_match_id: string
          title: string
          match_date: string
          start_time: string
          end_time: string
          organizer_name: string
        }[]
      }
      get_bookings_by_venue_v3: {
        Args: {
          p_venue_id: string
          p_is_upcoming: boolean
          p_limit_count: number
        }
        Returns: {
          id: string
          venue_id: string
          match_id: string
          title: string
          match_date: string
          start_time: string
          end_time: string
          organizer_name: string
        }[]
      }
      get_bookings_by_venue_v4: {
        Args: {
          p_venue_id: string
          p_is_upcoming: boolean
          p_limit_count: number
        }
        Returns: {
          id: string
          venue_id: string
          match_id: string
          payment_status: string
          amount: number
          created_at: string
          updated_at: string
          payment_reference: string
          match_date: string
          start_time: string
          end_time: string
          title: string
          organizer_name: string
          organizer_id: string
          slug: string
        }[]
      }
      get_match_highlights_by_slug: {
        Args: { p_slug: string }
        Returns: {
          match_id: string
          title: string
          match_date: string
          match_time: string
          teams: Json
          events: Json
        }[]
      }
      get_past_bookings_by_venue: {
        Args: { venue_id: string; limit_count: number }
        Returns: {
          id: string
          title: string
          match_date: string
          start_time: string
          end_time: string
          organizer_name: string
        }[]
      }
      get_upcoming_bookings_by_venue: {
        Args: { venue_id: string; limit_count: number }
        Returns: {
          id: string
          title: string
          match_date: string
          start_time: string
          end_time: string
          organizer_name: string
        }[]
      }
      process_pending_status_updates: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_admin_report: {
        Args: { start_date: string; end_date: string; type: string }
        Returns: undefined
      }
      search_matches: {
        Args: { search_term: string }
        Returns: {
          id: string
          title: string
          match_date: string
          match_time: string
          is_paid: boolean
          price: number
          total_slots: number
          venue: Json
          players: Json
        }[]
      }
      slugify: {
        Args: { value: string }
        Returns: string
      }
      unaccent: {
        Args: { "": string }
        Returns: string
      }
      unaccent_init: {
        Args: { "": unknown }
        Returns: unknown
      }
      update_existing_slugs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      access_code_status: "Pending" | "Active" | "Inactive"
      attendee_status: "Registered" | "Checked In" | "Absent"
      attendee_status_enum: "registered" | "checked_in" | "absent"
      cashout_status: "Review" | "Processed" | "Successful" | "Failed"
      code_status: "pending" | "active" | "inactive"
      event_status: "today" | "tomorrow" | "upcoming" | "passed"
      is_verified: "True" | "False"
      notification_event:
        | "match_playing_time"
        | "match_organizing_registration"
        | "match_organizing_slot_filled"
        | "booking_confirmation"
        | "venue_match_created"
        | "venue_favourite_match"
      notification_frequency: "immediate" | "daily" | "weekly"
      notification_type: "push" | "email" | "both"
      player_status: "Registered" | "Checked In" | "Absent"
      venue_verified_status: "True" | "False"
    }
    CompositeTypes: {
      [_ in never]: never
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
    Enums: {
      access_code_status: ["Pending", "Active", "Inactive"],
      attendee_status: ["Registered", "Checked In", "Absent"],
      attendee_status_enum: ["registered", "checked_in", "absent"],
      cashout_status: ["Review", "Processed", "Successful", "Failed"],
      code_status: ["pending", "active", "inactive"],
      event_status: ["today", "tomorrow", "upcoming", "passed"],
      is_verified: ["True", "False"],
      notification_event: [
        "match_playing_time",
        "match_organizing_registration",
        "match_organizing_slot_filled",
        "booking_confirmation",
        "venue_match_created",
        "venue_favourite_match",
      ],
      notification_frequency: ["immediate", "daily", "weekly"],
      notification_type: ["push", "email", "both"],
      player_status: ["Registered", "Checked In", "Absent"],
      venue_verified_status: ["True", "False"],
    },
  },
} as const
