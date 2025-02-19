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
      chat: {
        Row: {
          created_at: string
          id: string
          title: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at: string
          id?: string
          title: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_user_id_user_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      document: {
        Row: {
          content: string | null
          created_at: string
          id: string
          kind: string
          title: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at: string
          id?: string
          kind?: string
          title: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          kind?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_user_id_user_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      message: {
        Row: {
          chat_id: string
          content: Json
          created_at: string
          id: string
          role: string
        }
        Insert: {
          chat_id: string
          content: Json
          created_at: string
          id?: string
          role: string
        }
        Update: {
          chat_id?: string
          content?: Json
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_chat_id_chat_id_fk"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chat"
            referencedColumns: ["id"]
          },
        ]
      }
      pglog: {
        Row: {
          application_name: string | null
          backend_type: string | null
          command_tag: string | null
          connection_from: string | null
          context: string | null
          database_name: string | null
          detail: string | null
          error_severity: string | null
          hint: string | null
          internal_query: string | null
          internal_query_pos: number | null
          leader_pid: number | null
          location: string | null
          log_time: string | null
          message: string | null
          process_id: number | null
          query: string | null
          query_id: number | null
          query_pos: number | null
          session_id: string | null
          session_line_num: number | null
          session_start_time: string | null
          sql_state_code: string | null
          transaction_id: number | null
          user_name: string | null
          virtual_transaction_id: string | null
        }
        Insert: {
          application_name?: string | null
          backend_type?: string | null
          command_tag?: string | null
          connection_from?: string | null
          context?: string | null
          database_name?: string | null
          detail?: string | null
          error_severity?: string | null
          hint?: string | null
          internal_query?: string | null
          internal_query_pos?: number | null
          leader_pid?: number | null
          location?: string | null
          log_time?: string | null
          message?: string | null
          process_id?: number | null
          query?: string | null
          query_id?: number | null
          query_pos?: number | null
          session_id?: string | null
          session_line_num?: number | null
          session_start_time?: string | null
          sql_state_code?: string | null
          transaction_id?: number | null
          user_name?: string | null
          virtual_transaction_id?: string | null
        }
        Update: {
          application_name?: string | null
          backend_type?: string | null
          command_tag?: string | null
          connection_from?: string | null
          context?: string | null
          database_name?: string | null
          detail?: string | null
          error_severity?: string | null
          hint?: string | null
          internal_query?: string | null
          internal_query_pos?: number | null
          leader_pid?: number | null
          location?: string | null
          log_time?: string | null
          message?: string | null
          process_id?: number | null
          query?: string | null
          query_id?: number | null
          query_pos?: number | null
          session_id?: string | null
          session_line_num?: number | null
          session_start_time?: string | null
          sql_state_code?: string | null
          transaction_id?: number | null
          user_name?: string | null
          virtual_transaction_id?: string | null
        }
        Relationships: []
      }
      suggestion: {
        Row: {
          created_at: string
          description: string | null
          document_created_at: string
          document_id: string
          id: string
          is_resolved: boolean
          original_text: string
          suggested_text: string
          user_id: string
        }
        Insert: {
          created_at: string
          description?: string | null
          document_created_at: string
          document_id: string
          id?: string
          is_resolved?: boolean
          original_text: string
          suggested_text: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_created_at?: string
          document_id?: string
          id?: string
          is_resolved?: boolean
          original_text?: string
          suggested_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_document_id_document_created_at_document_id_created_"
            columns: ["document_id", "document_created_at"]
            isOneToOne: false
            referencedRelation: "document"
            referencedColumns: ["id", "created_at"]
          },
          {
            foreignKeyName: "suggestion_user_id_user_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      user: {
        Row: {
          email: string
          id: string
          password: string | null
        }
        Insert: {
          email: string
          id?: string
          password?: string | null
        }
        Update: {
          email?: string
          id?: string
          password?: string | null
        }
        Relationships: []
      }
      vote: {
        Row: {
          chat_id: string
          is_upvoted: boolean
          message_id: string
        }
        Insert: {
          chat_id: string
          is_upvoted: boolean
          message_id: string
        }
        Update: {
          chat_id?: string
          is_upvoted?: boolean
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vote_chat_id_chat_id_fk"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_message_id_message_id_fk"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "message"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      file_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

