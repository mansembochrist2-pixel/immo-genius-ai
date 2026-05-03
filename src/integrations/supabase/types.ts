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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      actions_recommandees: {
        Row: {
          action_attendue: string | null
          client_id: string | null
          created_at: string
          date_suggeree: string | null
          donnees_contexte: Json | null
          id: string
          justification_report: string | null
          objectif: string | null
          priorite: string
          risque_si_ignore: string | null
          score_pertinence: number | null
          source_module: string | null
          statut: string
          titre: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_attendue?: string | null
          client_id?: string | null
          created_at?: string
          date_suggeree?: string | null
          donnees_contexte?: Json | null
          id?: string
          justification_report?: string | null
          objectif?: string | null
          priorite?: string
          risque_si_ignore?: string | null
          score_pertinence?: number | null
          source_module?: string | null
          statut?: string
          titre: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_attendue?: string | null
          client_id?: string | null
          created_at?: string
          date_suggeree?: string | null
          donnees_contexte?: Json | null
          id?: string
          justification_report?: string | null
          objectif?: string | null
          priorite?: string
          risque_si_ignore?: string | null
          score_pertinence?: number | null
          source_module?: string | null
          statut?: string
          titre?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_recommandees_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      analyses_zone: {
        Row: {
          adresse: string
          created_at: string
          id: string
          resultat: Json | null
          secteur: string | null
          sources_utilisees: string[] | null
          user_id: string
        }
        Insert: {
          adresse: string
          created_at?: string
          id?: string
          resultat?: Json | null
          secteur?: string | null
          sources_utilisees?: string[] | null
          user_id: string
        }
        Update: {
          adresse?: string
          created_at?: string
          id?: string
          resultat?: Json | null
          secteur?: string | null
          sources_utilisees?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      annonces: {
        Row: {
          adresse: string
          contenu_genere: Json | null
          created_at: string
          description: string | null
          id: string
          prix: number | null
          surface: number | null
          user_id: string
        }
        Insert: {
          adresse: string
          contenu_genere?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          prix?: number | null
          surface?: number | null
          user_id: string
        }
        Update: {
          adresse?: string
          contenu_genere?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          prix?: number | null
          surface?: number | null
          user_id?: string
        }
        Relationships: []
      }
      api_connections: {
        Row: {
          config: Json | null
          created_at: string
          derniere_sync: string | null
          id: string
          service: string
          statut: string | null
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          derniere_sync?: string | null
          id?: string
          service: string
          statut?: string | null
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          derniere_sync?: string | null
          id?: string
          service?: string
          statut?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          assistant_type: string
          created_at: string
          id: string
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          assistant_type?: string
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          assistant_type?: string
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          client_id: string | null
          created_at: string
          date_debut: string
          date_fin: string | null
          description: string | null
          id: string
          lieu: string | null
          source_module: string | null
          statut: string
          titre: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          date_debut: string
          date_fin?: string | null
          description?: string | null
          id?: string
          lieu?: string | null
          source_module?: string | null
          statut?: string
          titre: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          description?: string | null
          id?: string
          lieu?: string | null
          source_module?: string | null
          statut?: string
          titre?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_messages: {
        Row: {
          analyse_ia: Json | null
          archived_at: string | null
          canal: string
          client_id: string | null
          contenu: string
          created_at: string
          direction: string
          id: string
          intention: string | null
          lu: boolean | null
          repondu: boolean | null
          reponses_suggerees: Json | null
          source_externe_id: string | null
          sujet: string | null
          updated_at: string
          urgence: number | null
          user_id: string
        }
        Insert: {
          analyse_ia?: Json | null
          archived_at?: string | null
          canal?: string
          client_id?: string | null
          contenu: string
          created_at?: string
          direction?: string
          id?: string
          intention?: string | null
          lu?: boolean | null
          repondu?: boolean | null
          reponses_suggerees?: Json | null
          source_externe_id?: string | null
          sujet?: string | null
          updated_at?: string
          urgence?: number | null
          user_id: string
        }
        Update: {
          analyse_ia?: Json | null
          archived_at?: string | null
          canal?: string
          client_id?: string | null
          contenu?: string
          created_at?: string
          direction?: string
          id?: string
          intention?: string | null
          lu?: boolean | null
          repondu?: boolean | null
          reponses_suggerees?: Json | null
          source_externe_id?: string | null
          sujet?: string | null
          updated_at?: string
          urgence?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunites: {
        Row: {
          created_at: string
          description: string | null
          donnees: Json | null
          id: string
          score: number | null
          sources: Json | null
          statut: string | null
          titre: string
          type: string
          updated_at: string
          user_id: string
          zone: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          donnees?: Json | null
          id?: string
          score?: number | null
          sources?: Json | null
          statut?: string | null
          titre: string
          type?: string
          updated_at?: string
          user_id: string
          zone?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          donnees?: Json | null
          id?: string
          score?: number | null
          sources?: Json | null
          statut?: string | null
          titre?: string
          type?: string
          updated_at?: string
          user_id?: string
          zone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agency_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          logo_url: string | null
          objectif_ca: number | null
          onboarding_completed: boolean
          phone: string | null
          plan: string
          preferred_language: string
          trial_ends_at: string
          zone_principale: string | null
        }
        Insert: {
          agency_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          logo_url?: string | null
          objectif_ca?: number | null
          onboarding_completed?: boolean
          phone?: string | null
          plan?: string
          preferred_language?: string
          trial_ends_at?: string
          zone_principale?: string | null
        }
        Update: {
          agency_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          logo_url?: string | null
          objectif_ca?: number | null
          onboarding_completed?: boolean
          phone?: string | null
          plan?: string
          preferred_language?: string
          trial_ends_at?: string
          zone_principale?: string | null
        }
        Relationships: []
      }
      prospects: {
        Row: {
          biens_proposes: string | null
          budget_max: number | null
          budget_min: number | null
          canal_prefere: string | null
          created_at: string
          delai_projet: string | null
          derniere_interaction: string | null
          email: string | null
          freins: string | null
          id: string
          motivation: string | null
          nom: string
          notes: string | null
          prochain_rappel: string | null
          prochain_rappel_note: string | null
          provenance: string | null
          resume_ia: string | null
          score_ia: number | null
          score_urgence: number | null
          secteur_recherche: string | null
          situation: string | null
          source: string | null
          statut: Database["public"]["Enums"]["prospect_statut"]
          strategie_adaptee: string | null
          tags: string[] | null
          taux_signature: number | null
          telephone: string | null
          type_bien_recherche: string | null
          type_projet: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          biens_proposes?: string | null
          budget_max?: number | null
          budget_min?: number | null
          canal_prefere?: string | null
          created_at?: string
          delai_projet?: string | null
          derniere_interaction?: string | null
          email?: string | null
          freins?: string | null
          id?: string
          motivation?: string | null
          nom: string
          notes?: string | null
          prochain_rappel?: string | null
          prochain_rappel_note?: string | null
          provenance?: string | null
          resume_ia?: string | null
          score_ia?: number | null
          score_urgence?: number | null
          secteur_recherche?: string | null
          situation?: string | null
          source?: string | null
          statut?: Database["public"]["Enums"]["prospect_statut"]
          strategie_adaptee?: string | null
          tags?: string[] | null
          taux_signature?: number | null
          telephone?: string | null
          type_bien_recherche?: string | null
          type_projet?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          biens_proposes?: string | null
          budget_max?: number | null
          budget_min?: number | null
          canal_prefere?: string | null
          created_at?: string
          delai_projet?: string | null
          derniere_interaction?: string | null
          email?: string | null
          freins?: string | null
          id?: string
          motivation?: string | null
          nom?: string
          notes?: string | null
          prochain_rappel?: string | null
          prochain_rappel_note?: string | null
          provenance?: string | null
          resume_ia?: string | null
          score_ia?: number | null
          score_urgence?: number | null
          secteur_recherche?: string | null
          situation?: string | null
          source?: string | null
          statut?: Database["public"]["Enums"]["prospect_statut"]
          strategie_adaptee?: string | null
          tags?: string[] | null
          taux_signature?: number | null
          telephone?: string | null
          type_bien_recherche?: string | null
          type_projet?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          date_vente: string
          description: string | null
          id: string
          montant: number
          prospect_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date_vente?: string
          description?: string | null
          id?: string
          montant?: number
          prospect_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date_vente?: string
          description?: string | null
          id?: string
          montant?: number
          prospect_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          done: boolean
          due_date: string | null
          id: string
          priorite: Database["public"]["Enums"]["task_priorite"]
          prospect_id: string | null
          source: Database["public"]["Enums"]["task_source"]
          titre: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          done?: boolean
          due_date?: string | null
          id?: string
          priorite?: Database["public"]["Enums"]["task_priorite"]
          prospect_id?: string | null
          source?: Database["public"]["Enums"]["task_source"]
          titre: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          done?: boolean
          due_date?: string | null
          id?: string
          priorite?: Database["public"]["Enums"]["task_priorite"]
          prospect_id?: string | null
          source?: Database["public"]["Enums"]["task_source"]
          titre?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_integrations: {
        Row: {
          access_token: string | null
          created_at: string
          email: string | null
          expires_at: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          provider: string
          refresh_token: string | null
          scope: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          provider: string
          refresh_token?: string | null
          scope?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          actif: boolean | null
          actions: Json | null
          created_at: string
          declencheur: string
          derniere_execution: string | null
          executions: number | null
          id: string
          nom: string
          user_id: string
        }
        Insert: {
          actif?: boolean | null
          actions?: Json | null
          created_at?: string
          declencheur: string
          derniere_execution?: string | null
          executions?: number | null
          id?: string
          nom: string
          user_id: string
        }
        Update: {
          actif?: boolean | null
          actions?: Json | null
          created_at?: string
          declencheur?: string
          derniere_execution?: string | null
          executions?: number | null
          id?: string
          nom?: string
          user_id?: string
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
      prospect_statut:
        | "nouveau"
        | "contacte"
        | "visite"
        | "offre"
        | "signe"
        | "perdu"
      task_priorite: "basse" | "moyenne" | "haute" | "urgente"
      task_source: "manual" | "ia"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      prospect_statut: [
        "nouveau",
        "contacte",
        "visite",
        "offre",
        "signe",
        "perdu",
      ],
      task_priorite: ["basse", "moyenne", "haute", "urgente"],
      task_source: ["manual", "ia"],
    },
  },
} as const
