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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bids: {
        Row: {
          amount: number
          id: string
          placed_at: string
          player_id: string
          round_id: string
          status: Database["public"]["Enums"]["bid_status"]
          team_id: string
        }
        Insert: {
          amount: number
          id?: string
          placed_at?: string
          player_id: string
          round_id: string
          status?: Database["public"]["Enums"]["bid_status"]
          team_id: string
        }
        Update: {
          amount?: number
          id?: string
          placed_at?: string
          player_id?: string
          round_id?: string
          status?: Database["public"]["Enums"]["bid_status"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "market_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "bids_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          id: string
          invite_code: string | null
          is_default: boolean
          max_copies_per_player: number
          max_squad_size: number
          name: string
          season_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string | null
          is_default?: boolean
          max_copies_per_player?: number
          max_squad_size?: number
          name: string
          season_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string | null
          is_default?: boolean
          max_copies_per_player?: number
          max_squad_size?: number
          name?: string
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leagues_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      lineup_slots: {
        Row: {
          player_id: string
          slot: Database["public"]["Enums"]["lineup_slot"]
          slot_index: number
          team_id: string
        }
        Insert: {
          player_id: string
          slot: Database["public"]["Enums"]["lineup_slot"]
          slot_index: number
          team_id: string
        }
        Update: {
          player_id?: string
          slot?: Database["public"]["Enums"]["lineup_slot"]
          slot_index?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lineup_slots_team_id_player_id_fkey"
            columns: ["team_id", "player_id"]
            isOneToOne: false
            referencedRelation: "squad_players"
            referencedColumns: ["team_id", "player_id"]
          },
        ]
      }
      market_rounds: {
        Row: {
          closes_at: string
          created_at: string
          id: string
          league_id: string
          opens_at: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["market_round_status"]
        }
        Insert: {
          closes_at: string
          created_at?: string
          id?: string
          league_id: string
          opens_at?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["market_round_status"]
        }
        Update: {
          closes_at?: string
          created_at?: string
          id?: string
          league_id?: string
          opens_at?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["market_round_status"]
        }
        Relationships: [
          {
            foreignKeyName: "market_rounds_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          is_home: boolean
          lock_at: string
          opponent: string
          played_at: string
          round_number: number
          season_id: string
          status: Database["public"]["Enums"]["match_status"]
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_home?: boolean
          lock_at: string
          opponent: string
          played_at: string
          round_number: number
          season_id: string
          status?: Database["public"]["Enums"]["match_status"]
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_home?: boolean
          lock_at?: string
          opponent?: string
          played_at?: string
          round_number?: number
          season_id?: string
          status?: Database["public"]["Enums"]["match_status"]
        }
        Relationships: [
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      player_match_scores: {
        Row: {
          avg_grade: number
          match_id: string
          player_id: string
          points: number
          ratings_count: number
        }
        Insert: {
          avg_grade: number
          match_id: string
          player_id: string
          points: number
          ratings_count: number
        }
        Update: {
          avg_grade?: number
          match_id?: string
          player_id?: string
          points?: number
          ratings_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_match_scores_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          photo_url: string | null
          position: Database["public"]["Enums"]["player_position"]
          profile_id: string | null
          shirt_number: number | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          photo_url?: string | null
          position: Database["public"]["Enums"]["player_position"]
          profile_id?: string | null
          shirt_number?: number | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          photo_url?: string | null
          position?: Database["public"]["Enums"]["player_position"]
          profile_id?: string | null
          shirt_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          created_at: string
          id: number
          match_id: string | null
          new_price: number
          old_price: number
          player_id: string
          season_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          match_id?: string | null
          new_price: number
          old_price: number
          player_id: string
          season_id: string
        }
        Update: {
          created_at?: string
          id?: never
          match_id?: string | null
          new_price?: number
          old_price?: number
          player_id?: string
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      ratings: {
        Row: {
          coach_id: string
          grade: number
          match_id: string
          player_id: string
          updated_at: string
        }
        Insert: {
          coach_id?: string
          grade: number
          match_id: string
          player_id: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          grade?: number
          match_id?: string
          player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      season_players: {
        Row: {
          current_price: number
          initial_price: number
          player_id: string
          season_id: string
        }
        Insert: {
          current_price: number
          initial_price: number
          player_id: string
          season_id: string
        }
        Update: {
          current_price?: number
          initial_price?: number
          player_id?: string
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_players_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          default_player_price: number
          id: string
          initial_budget: number
          is_active: boolean
          name: string
          price_max_delta: number
          price_min: number
          price_ref_grade: number
          price_step: number
        }
        Insert: {
          created_at?: string
          default_player_price?: number
          id?: string
          initial_budget?: number
          is_active?: boolean
          name: string
          price_max_delta?: number
          price_min?: number
          price_ref_grade?: number
          price_step?: number
        }
        Update: {
          created_at?: string
          default_player_price?: number
          id?: string
          initial_budget?: number
          is_active?: boolean
          name?: string
          price_max_delta?: number
          price_min?: number
          price_ref_grade?: number
          price_step?: number
        }
        Relationships: []
      }
      squad_players: {
        Row: {
          acquired_at: string
          player_id: string
          purchase_price: number
          team_id: string
        }
        Insert: {
          acquired_at?: string
          player_id: string
          purchase_price: number
          team_id: string
        }
        Update: {
          acquired_at?: string
          player_id?: string
          purchase_price?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "squad_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_match_lineup: {
        Row: {
          match_id: string
          player_id: string
          points: number
          slot: Database["public"]["Enums"]["lineup_slot"]
          team_id: string
        }
        Insert: {
          match_id: string
          player_id: string
          points?: number
          slot: Database["public"]["Enums"]["lineup_slot"]
          team_id: string
        }
        Update: {
          match_id?: string
          player_id?: string
          points?: number
          slot?: Database["public"]["Enums"]["lineup_slot"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_match_lineup_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_match_lineup_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_match_lineup_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_match_lineup_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_match_points: {
        Row: {
          match_id: string
          points: number
          team_id: string
        }
        Insert: {
          match_id: string
          points?: number
          team_id: string
        }
        Update: {
          match_id?: string
          points?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_match_points_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_match_points_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_match_points_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          balance: number
          created_at: string
          id: string
          league_id: string
          name: string
          user_id: string
        }
        Insert: {
          balance: number
          created_at?: string
          id?: string
          league_id: string
          name: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          league_id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: number
          player_id: string | null
          team_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: never
          player_id?: string | null
          team_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: never
          player_id?: string | null
          team_id?: string
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      standings: {
        Row: {
          league_id: string | null
          matches_scored: number | null
          team_id: string | null
          team_name: string | null
          total_points: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_add_player: {
        Args: {
          p_full_name: string
          p_position: Database["public"]["Enums"]["player_position"]
          p_shirt_number?: number
        }
        Returns: string
      }
      admin_set_price: {
        Args: { p_player_id: string; p_price: number; p_season_id: string }
        Returns: undefined
      }
      cancel_bid: { Args: { p_bid_id: string }; Returns: undefined }
      close_match: { Args: { p_match_id: string }; Returns: undefined }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_coach: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      join_league: { Args: { p_team_name: string }; Returns: string }
      market_is_open: { Args: { p_season_id: string }; Returns: boolean }
      place_bid: {
        Args: { p_amount: number; p_player_id: string; p_round_id: string }
        Returns: string
      }
      resolve_market_round: { Args: { p_round_id: string }; Returns: undefined }
      sell_player: {
        Args: { p_player_id: string; p_team_id: string }
        Returns: number
      }
      set_lineup: {
        Args: {
          p_attack: string[]
          p_defense: string[]
          p_goalkeeper_id: string
          p_team_id: string
        }
        Returns: undefined
      }
      set_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      bid_status: "pending" | "won" | "lost"
      lineup_slot: "goalkeeper" | "attack" | "defense"
      market_round_status: "open" | "resolved"
      match_status: "scheduled" | "closed"
      player_position: "portero" | "extremo" | "primera_linea" | "pivote"
      transaction_type: "initial" | "auction_win" | "sale" | "adjustment"
      user_role: "manager" | "coach" | "admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      bid_status: ["pending", "won", "lost"],
      lineup_slot: ["goalkeeper", "attack", "defense"],
      market_round_status: ["open", "resolved"],
      match_status: ["scheduled", "closed"],
      player_position: ["portero", "extremo", "primera_linea", "pivote"],
      transaction_type: ["initial", "auction_win", "sale", "adjustment"],
      user_role: ["manager", "coach", "admin"],
    },
  },
} as const
