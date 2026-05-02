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
      attempt_answers: {
        Row: {
          attempt_id: string
          id: string
          marked_for_review: boolean | null
          question_id: string
          selected_option: string | null
        }
        Insert: {
          attempt_id: string
          id?: string
          marked_for_review?: boolean | null
          question_id: string
          selected_option?: string | null
        }
        Update: {
          attempt_id?: string
          id?: string
          marked_for_review?: boolean | null
          question_id?: string
          selected_option?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          id: string
          score: number | null
          status: string | null
          student_id: string
          submitted_at: string | null
          test_id: string
          time_taken: number | null
          total_marks: number | null
        }
        Insert: {
          id?: string
          score?: number | null
          status?: string | null
          student_id: string
          submitted_at?: string | null
          test_id: string
          time_taken?: number | null
          total_marks?: number | null
        }
        Update: {
          id?: string
          score?: number | null
          status?: string | null
          student_id?: string
          submitted_at?: string | null
          test_id?: string
          time_taken?: number | null
          total_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active_status: boolean | null
          address: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          active_status?: boolean | null
          address?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          active_status?: boolean | null
          address?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          email: string
          id: string
          name: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          client_id: string
          correct_answer: string
          created_at: string | null
          difficulty: string | null
          id: string
          marks: number | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          correct_answer: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          marks?: number | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          correct_answer?: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          marks?: number | null
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          id: string
          question_id: string
          test_id: string
        }
        Insert: {
          id?: string
          question_id: string
          test_id: string
        }
        Update: {
          id?: string
          question_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          active: boolean | null
          allow_review: boolean | null
          attempts_allowed: number | null
          client_id: string
          created_at: string | null
          id: string
          negative_marking: boolean | null
          negative_marks: number | null
          public_link_enabled: boolean | null
          restrict_navigation: boolean | null
          share_code: string | null
          shuffle: boolean | null
          test_name: string
          timer: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          allow_review?: boolean | null
          attempts_allowed?: number | null
          client_id: string
          created_at?: string | null
          id?: string
          negative_marking?: boolean | null
          negative_marks?: number | null
          public_link_enabled?: boolean | null
          restrict_navigation?: boolean | null
          share_code?: string | null
          shuffle?: boolean | null
          test_name: string
          timer: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          allow_review?: boolean | null
          attempts_allowed?: number | null
          client_id?: string
          created_at?: string | null
          id?: string
          negative_marking?: boolean | null
          negative_marks?: number | null
          public_link_enabled?: boolean | null
          restrict_navigation?: boolean | null
          share_code?: string | null
          shuffle?: boolean | null
          test_name?: string
          timer?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          client_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          client_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          client_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_student: {
        Args: { _student_id: string }
        Returns: undefined
      }
      get_test_questions_for_student: {
        Args: { _student_id: string; _test_id: string }
        Returns: {
          difficulty: string
          id: string
          marks: number
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
        }[]
      }
      get_user_client_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superadmin" | "clientadmin" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[keyof Database]

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
