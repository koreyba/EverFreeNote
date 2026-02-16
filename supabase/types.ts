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
      notes: {
        Row: {
          id: string
          title: string
          description: string
          tags: string[]
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          tags?: string[]
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          tags?: string[]
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wordpress_export_preferences: {
        Row: {
          user_id: string
          remembered_category_ids: number[]
          updated_at: string
        }
        Insert: {
          user_id: string
          remembered_category_ids?: number[]
          updated_at?: string
        }
        Update: {
          user_id?: string
          remembered_category_ids?: number[]
          updated_at?: string
        }
        Relationships: []
      }
      wordpress_integrations: {
        Row: {
          user_id: string
          site_url: string
          wp_username: string
          wp_app_password_encrypted: string
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          site_url: string
          wp_username: string
          wp_app_password_encrypted: string
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          site_url?: string
          wp_username?: string
          wp_app_password_encrypted?: string
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      exec_sql: {
        Args: {
          sql: string
        }
        Returns: Json
      }
      search_notes_fts: {
        Args: {
          search_query: string
          search_language: string
          min_rank?: number
          result_limit?: number
          result_offset?: number
          search_user_id: string
          filter_tag?: string | null
        }
        Returns: FtsSearchResult[]
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

export type Tables<
  Name extends keyof Database['public']['Tables'] = keyof Database['public']['Tables'],
> = Database['public']['Tables'][Name]['Row']

export type TablesInsert<
  Name extends keyof Database['public']['Tables'] = keyof Database['public']['Tables'],
> = Database['public']['Tables'][Name]['Insert']

export type TablesUpdate<
  Name extends keyof Database['public']['Tables'] = keyof Database['public']['Tables'],
> = Database['public']['Tables'][Name]['Update']

export type FtsSearchResult = Tables<'notes'> & {
  rank: number
  headline: string | null
  content?: string | null
}
