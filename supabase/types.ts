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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_notes_fts: {
        Args: {
          search_query: string
          search_language: string
          min_rank?: number
          result_limit?: number
          result_offset?: number
          search_user_id: string
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
}
