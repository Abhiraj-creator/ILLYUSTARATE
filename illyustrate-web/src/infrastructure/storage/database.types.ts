export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          plan: 'free' | 'pro' | 'team';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          avatar_url?: string | null;
          plan?: 'free' | 'pro' | 'team';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar_url?: string | null;
          plan?: 'free' | 'pro' | 'team';
          created_at?: string;
          updated_at?: string;
        };
      };
      repositories: {
        Row: {
          id: string;
          owner: string;
          name: string;
          full_name: string;
          description: string | null;
          url: string;
          language: string | null;
          stars: number;
          is_private: boolean;
          default_branch: string;
          size: number;
          analyzed_at: string | null;
          status: 'pending' | 'analyzing' | 'completed' | 'failed';
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner: string;
          name: string;
          full_name: string;
          description?: string | null;
          url: string;
          language?: string | null;
          stars?: number;
          is_private: boolean;
          default_branch: string;
          size: number;
          analyzed_at?: string | null;
          status?: 'pending' | 'analyzing' | 'completed' | 'failed';
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner?: string;
          name?: string;
          full_name?: string;
          description?: string | null;
          url?: string;
          language?: string | null;
          stars?: number;
          is_private?: boolean;
          default_branch?: string;
          size?: number;
          analyzed_at?: string | null;
          status?: 'pending' | 'analyzing' | 'completed' | 'failed';
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      graphs: {
        Row: {
          id: string;
          repository_id: string;
          nodes: Json;
          edges: Json;
          layout: 'cose' | 'hierarchical' | 'circle' | 'grid';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          repository_id: string;
          nodes: Json;
          edges: Json;
          layout?: 'cose' | 'hierarchical' | 'circle' | 'grid';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string;
          nodes?: Json;
          edges?: Json;
          layout?: 'cose' | 'hierarchical' | 'circle' | 'grid';
          created_at?: string;
          updated_at?: string;
        };
      };
      documentation: {
        Row: {
          id: string;
          repository_id: string;
          file_path: string;
          content: string;
          summary: string;
          key_functions: string[];
          dependencies: string[];
          generated_at: string;
          confidence: number;
        };
        Insert: {
          id?: string;
          repository_id: string;
          file_path: string;
          content: string;
          summary: string;
          key_functions?: string[];
          dependencies?: string[];
          generated_at?: string;
          confidence?: number;
        };
        Update: {
          id?: string;
          repository_id?: string;
          file_path?: string;
          content?: string;
          summary?: string;
          key_functions?: string[];
          dependencies?: string[];
          generated_at?: string;
          confidence?: number;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          repository_id: string;
          role: 'user' | 'assistant';
          content: string;
          context: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          repository_id: string;
          role: 'user' | 'assistant';
          content: string;
          context?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
          context?: Json | null;
          created_at?: string;
        };
      };
      analysis_jobs: {
        Row: {
          id: string;
          repository_id: string;
          status: 'queued' | 'processing' | 'completed' | 'failed';
          progress: number;
          stage: 'fetching' | 'parsing' | 'analyzing' | 'generating';
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          repository_id: string;
          status?: 'queued' | 'processing' | 'completed' | 'failed';
          progress?: number;
          stage?: 'fetching' | 'parsing' | 'analyzing' | 'generating';
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string;
          status?: 'queued' | 'processing' | 'completed' | 'failed';
          progress?: number;
          stage?: 'fetching' | 'parsing' | 'analyzing' | 'generating';
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Enums: {
      repo_status: 'pending' | 'analyzing' | 'completed' | 'failed';
      analysis_stage: 'fetching' | 'parsing' | 'analyzing' | 'generating';
      graph_layout: 'cose' | 'hierarchical' | 'circle' | 'grid';
    };
  };
}

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
