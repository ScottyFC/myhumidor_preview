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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_campaigns: {
        Row: {
          budget_credits: number
          ends_at: string | null
          id: string
          lounge_id: string
          spent_credits: number
          started_at: string
          status: string
        }
        Insert: {
          budget_credits: number
          ends_at?: string | null
          id?: string
          lounge_id: string
          spent_credits?: number
          started_at?: string
          status?: string
        }
        Update: {
          budget_credits?: number
          ends_at?: string | null
          id?: string
          lounge_id?: string
          spent_credits?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["lounge_id"]
          },
          {
            foreignKeyName: "ad_campaigns_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_impressions: {
        Row: {
          ad_id: string | null
          created_at: string
          device_id: string | null
          id: string
          lounge_id: string | null
        }
        Insert: {
          ad_id?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          lounge_id?: string | null
        }
        Update: {
          ad_id?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          lounge_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_impressions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["device_id"]
          },
          {
            foreignKeyName: "ad_impressions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "lounge_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_impressions_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["lounge_id"]
          },
          {
            foreignKeyName: "ad_impressions_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_spots: {
        Row: {
          active: boolean
          advertiser: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          headline: string
          id: string
          image_url: string | null
          lat: number | null
          lng: number | null
          qr_url: string | null
          radius_km: number | null
          starts_at: string | null
          subtext: string | null
          weight: number
        }
        Insert: {
          active?: boolean
          advertiser?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          headline: string
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          qr_url?: string | null
          radius_km?: number | null
          starts_at?: string | null
          subtext?: string | null
          weight?: number
        }
        Update: {
          active?: boolean
          advertiser?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          headline?: string
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          qr_url?: string | null
          radius_km?: number | null
          starts_at?: string | null
          subtext?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_spots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string
          lounge_id: string | null
          meta: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          lounge_id?: string | null
          meta?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          lounge_id?: string | null
          meta?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["lounge_id"]
          },
          {
            foreignKeyName: "audit_events_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_awards: {
        Row: {
          awarded_at: string
          badge_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_awards_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_awards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          aficionado_only: boolean
          criteria: string
          id: string
          image_url: string | null
          lounge_id: string | null
          name: string
          slug: string
          tier: string
        }
        Insert: {
          aficionado_only?: boolean
          criteria: string
          id?: string
          image_url?: string | null
          lounge_id?: string | null
          name: string
          slug: string
          tier?: string
        }
        Update: {
          aficionado_only?: boolean
          criteria?: string
          id?: string
          image_url?: string | null
          lounge_id?: string | null
          name?: string
          slug?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["lounge_id"]
          },
          {
            foreignKeyName: "badges_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          country: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      invites: {
        Row: { token: string; email: string; account_type: string; skip_verification: boolean; accepted: boolean; accepted_by: string | null; created_by: string | null; created_at: string; expires_at: string }
        Insert: { token: string; email: string; account_type?: string; skip_verification?: boolean; accepted?: boolean; accepted_by?: string | null; created_by?: string | null; created_at?: string; expires_at?: string }
        Update: { token?: string; email?: string; account_type?: string; skip_verification?: boolean; accepted?: boolean; accepted_by?: string | null; created_by?: string | null; created_at?: string; expires_at?: string }
        Relationships: []
      }
      device_tokens: {
        Row: { token: string; user_id: string; platform: string | null; updated_at: string }
        Insert: { token: string; user_id: string; platform?: string | null; updated_at?: string }
        Update: { token?: string; user_id?: string; platform?: string | null; updated_at?: string }
        Relationships: []
      }
      brand_images: {
        Row: { brand: string; image_url: string; updated_at: string }
        Insert: { brand: string; image_url: string; updated_at?: string }
        Update: { brand?: string; image_url?: string; updated_at?: string }
        Relationships: []
      }
      catalog_overrides: {
        Row: { slug: string; removed: boolean; brand: string | null; name: string | null; country: string | null; price: number | null; image_url: string | null; buy_url: string | null; updated_at: string }
        Insert: { slug: string; removed?: boolean; brand?: string | null; name?: string | null; country?: string | null; price?: number | null; image_url?: string | null; buy_url?: string | null; updated_at?: string }
        Update: { slug?: string; removed?: boolean; brand?: string | null; name?: string | null; country?: string | null; price?: number | null; image_url?: string | null; buy_url?: string | null; updated_at?: string }
        Relationships: []
      }
      catalog_cigars: {
        Row: {
          brand: string
          country: string | null
          created_at: string
          flavor_tags: string[]
          id: string
          image_url: string | null
          name: string
          price: number | null
          size: string | null
          slug: string
        }
        Insert: {
          brand: string
          country?: string | null
          created_at?: string
          flavor_tags?: string[]
          id?: string
          image_url?: string | null
          name: string
          price?: number | null
          size?: string | null
          slug: string
        }
        Update: {
          brand?: string
          country?: string | null
          created_at?: string
          flavor_tags?: string[]
          id?: string
          image_url?: string | null
          name?: string
          price?: number | null
          size?: string | null
          slug?: string
        }
        Relationships: []
      }
      change_requests: {
        Row: {
          created_at: string
          id: string
          message: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string | null
          target_id: string
          target_name: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          target_id: string
          target_name: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          target_id?: string
          target_name?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          cigar_brand: string | null
          cigar_name: string | null
          cigar_slug: string | null
          created_at: string
          id: string
          lounge_id: string | null
          lounge_name: string | null
          lounge_slug: string | null
          photo_url: string | null
          rating: number | null
          review: string | null
          user_id: string
        }
        Insert: {
          cigar_brand?: string | null
          cigar_name?: string | null
          cigar_slug?: string | null
          created_at?: string
          id?: string
          lounge_id?: string | null
          lounge_name?: string | null
          lounge_slug?: string | null
          photo_url?: string | null
          rating?: number | null
          review?: string | null
          user_id: string
        }
        Update: {
          cigar_brand?: string | null
          cigar_name?: string | null
          cigar_slug?: string | null
          created_at?: string
          id?: string
          lounge_id?: string | null
          lounge_name?: string | null
          lounge_slug?: string | null
          photo_url?: string | null
          rating?: number | null
          review?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["lounge_id"]
          },
          {
            foreignKeyName: "check_ins_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cigar_submissions: {
        Row: {
          brand: string
          catalog_id: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          buy_url: string | null
          photo_url: string | null
          price: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          size: string | null
          slug: string | null
          status: string
          submitted_by: string | null
        }
        Insert: {
          brand: string
          catalog_id?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          buy_url?: string | null
          photo_url?: string | null
          price?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size?: string | null
          slug?: string | null
          status?: string
          submitted_by?: string | null
        }
        Update: {
          brand?: string
          catalog_id?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          buy_url?: string | null
          photo_url?: string | null
          price?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size?: string | null
          slug?: string | null
          status?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cigar_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cigar_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cigars: {
        Row: {
          appearance_avg: number | null
          binder: string | null
          brand_id: string
          burn_avg: number | null
          country_of_origin: string | null
          created_at: string
          filler: string | null
          flavor_avg: number | null
          id: string
          image_url: string | null
          length_in: number
          line_name: string
          msrp: number | null
          overall_avg: number | null
          rating_count: number
          ring_gauge: number
          slug: string
          vitola: string
          wrapper: string
        }
        Insert: {
          appearance_avg?: number | null
          binder?: string | null
          brand_id: string
          burn_avg?: number | null
          country_of_origin?: string | null
          created_at?: string
          filler?: string | null
          flavor_avg?: number | null
          id?: string
          image_url?: string | null
          length_in: number
          line_name: string
          msrp?: number | null
          overall_avg?: number | null
          rating_count?: number
          ring_gauge: number
          slug: string
          vitola: string
          wrapper: string
        }
        Update: {
          appearance_avg?: number | null
          binder?: string | null
          brand_id?: string
          burn_avg?: number | null
          country_of_origin?: string | null
          created_at?: string
          filler?: string | null
          flavor_avg?: number | null
          id?: string
          image_url?: string | null
          length_in?: number
          line_name?: string
          msrp?: number | null
          overall_avg?: number | null
          rating_count?: number
          ring_gauge?: number
          slug?: string
          vitola?: string
          wrapper?: string
        }
        Relationships: [
          {
            foreignKeyName: "cigars_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          delta: number
          device_id: string | null
          id: string
          lounge_id: string
          reason: string
          recorded_at: string
        }
        Insert: {
          delta: number
          device_id?: string | null
          id?: string
          lounge_id: string
          reason: string
          recorded_at?: string
        }
        Update: {
          delta?: number
          device_id?: string | null
          id?: string
          lounge_id?: string
          reason?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["device_id"]
          },
          {
            foreignKeyName: "credit_ledger_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "lounge_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["lounge_id"]
          },
          {
            foreignKeyName: "credit_ledger_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
        ]
      }
      device_credit_daily: {
        Row: {
          credits: number
          day: string
          device_id: string
          lounge_id: string
          seconds: number
        }
        Insert: {
          credits?: number
          day?: string
          device_id: string
          lounge_id: string
          seconds?: number
        }
        Update: {
          credits?: number
          day?: string
          device_id?: string
          lounge_id?: string
          seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "device_credit_daily_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["device_id"]
          },
          {
            foreignKeyName: "device_credit_daily_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "lounge_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_credit_daily_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["lounge_id"]
          },
          {
            foreignKeyName: "device_credit_daily_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          created_at: string
          cue_points: number[] | null
          description: string | null
          duration_sec: number | null
          episode_num: number
          guid: string
          pub_date: string | null
          season_num: number
          series: string
          thumbnail_url: string | null
          title: string
          video_url: string
        }
        Insert: {
          created_at?: string
          cue_points?: number[] | null
          description?: string | null
          duration_sec?: number | null
          episode_num: number
          guid: string
          pub_date?: string | null
          season_num: number
          series: string
          thumbnail_url?: string | null
          title: string
          video_url: string
        }
        Update: {
          created_at?: string
          cue_points?: number[] | null
          description?: string | null
          duration_sec?: number | null
          episode_num?: number
          guid?: string
          pub_date?: string | null
          season_num?: number
          series?: string
          thumbnail_url?: string | null
          title?: string
          video_url?: string
        }
        Relationships: []
      }
      featured_cigars: {
        Row: {
          cigar_id: string
          end_ts_sec: number | null
          episode_guid: string
          id: string
          start_ts_sec: number
        }
        Insert: {
          cigar_id: string
          end_ts_sec?: number | null
          episode_guid: string
          id?: string
          start_ts_sec?: number
        }
        Update: {
          cigar_id?: string
          end_ts_sec?: number | null
          episode_guid?: string
          id?: string
          start_ts_sec?: number
        }
        Relationships: [
          {
            foreignKeyName: "featured_cigars_cigar_id_fkey"
            columns: ["cigar_id"]
            isOneToOne: false
            referencedRelation: "cigars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_cigars_episode_guid_fkey"
            columns: ["episode_guid"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["guid"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      humidor_entries: {
        Row: {
          brand: string | null
          cigar_id: string
          created_at: string
          id: string
          name: string | null
          quantity: number
          size: string | null
          slug: string | null
          status: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          cigar_id: string
          created_at?: string
          id?: string
          name?: string | null
          quantity?: number
          size?: string | null
          slug?: string | null
          status?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          cigar_id?: string
          created_at?: string
          id?: string
          name?: string | null
          quantity?: number
          size?: string | null
          slug?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "humidor_entries_cigar_id_fkey"
            columns: ["cigar_id"]
            isOneToOne: false
            referencedRelation: "catalog_cigars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "humidor_entries_cigar_id_fkey"
            columns: ["cigar_id"]
            isOneToOne: false
            referencedRelation: "cigar_rating_stats"
            referencedColumns: ["cigar_id"]
          },
          {
            foreignKeyName: "humidor_entries_cigar_id_fkey"
            columns: ["cigar_id"]
            isOneToOne: false
            referencedRelation: "cigar_rating_week"
            referencedColumns: ["cigar_id"]
          },
          {
            foreignKeyName: "humidor_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          brand: string | null
          cigar_id: string
          id: string
          in_stock: boolean
          lounge_id: string
          name: string | null
          price: number | null
          published: boolean
          quantity: number
          size: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          cigar_id: string
          id?: string
          in_stock?: boolean
          lounge_id: string
          name?: string | null
          price?: number | null
          published?: boolean
          quantity?: number
          size?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          cigar_id?: string
          id?: string
          in_stock?: boolean
          lounge_id?: string
          name?: string | null
          price?: number | null
          published?: boolean
          quantity?: number
          size?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["lounge_id"]
          },
          {
            foreignKeyName: "inventory_items_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lounge_claims: {
        Row: {
          claimant_name: string | null
          created_at: string
          email: string | null
          id: string
          lounge_id: string | null
          lounge_name: string | null
          lounge_slug: string | null
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_requested: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          claimant_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lounge_id?: string | null
          lounge_name?: string | null
          lounge_slug?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_requested?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          claimant_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lounge_id?: string | null
          lounge_name?: string | null
          lounge_slug?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_requested?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lounge_claims_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["lounge_id"]
          },
          {
            foreignKeyName: "lounge_claims_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lounge_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lounge_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lounge_devices: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          last_seen: string | null
          lat: number | null
          lng: number | null
          lounge_id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          last_seen?: string | null
          lat?: number | null
          lng?: number | null
          lounge_id: string
          name?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          last_seen?: string | null
          lat?: number | null
          lng?: number | null
          lounge_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lounge_devices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lounge_devices_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["lounge_id"]
          },
          {
            foreignKeyName: "lounge_devices_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
        ]
      }
      lounge_follows: {
        Row: {
          created_at: string
          lounge_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          lounge_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          lounge_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lounge_follows_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["lounge_id"]
          },
          {
            foreignKeyName: "lounge_follows_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lounge_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lounge_members: {
        Row: {
          created_at: string
          lounge_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          lounge_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          lounge_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lounge_members_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["lounge_id"]
          },
          {
            foreignKeyName: "lounge_members_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lounge_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lounge_posts: {
        Row: {
          body: string | null
          boost_until: string | null
          cigar_id: string | null
          created_at: string
          event_at: string | null
          id: string
          kind: string
          lounge_id: string
          photo_url: string | null
          promoted: boolean
          title: string
        }
        Insert: {
          body?: string | null
          boost_until?: string | null
          cigar_id?: string | null
          created_at?: string
          event_at?: string | null
          id?: string
          kind: string
          lounge_id: string
          photo_url?: string | null
          promoted?: boolean
          title: string
        }
        Update: {
          body?: string | null
          boost_until?: string | null
          cigar_id?: string | null
          created_at?: string
          event_at?: string | null
          id?: string
          kind?: string
          lounge_id?: string
          photo_url?: string | null
          promoted?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lounge_posts_cigar_id_fkey"
            columns: ["cigar_id"]
            isOneToOne: false
            referencedRelation: "catalog_cigars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lounge_posts_cigar_id_fkey"
            columns: ["cigar_id"]
            isOneToOne: false
            referencedRelation: "cigar_rating_stats"
            referencedColumns: ["cigar_id"]
          },
          {
            foreignKeyName: "lounge_posts_cigar_id_fkey"
            columns: ["cigar_id"]
            isOneToOne: false
            referencedRelation: "cigar_rating_week"
            referencedColumns: ["cigar_id"]
          },
          {
            foreignKeyName: "lounge_posts_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["lounge_id"]
          },
          {
            foreignKeyName: "lounge_posts_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
        ]
      }
      lounge_submissions: {
        Row: {
          address: string | null
          business_license: string | null
          city: string | null
          claims_ownership: boolean
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          kind: string
          lat: number | null
          lng: number | null
          lounge_id: string | null
          name: string
          notes: string | null
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_requested: string | null
          state: string | null
          status: string
          submitted_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          business_license?: string | null
          city?: string | null
          claims_ownership?: boolean
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kind?: string
          lat?: number | null
          lng?: number | null
          lounge_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_requested?: string | null
          state?: string | null
          status?: string
          submitted_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          business_license?: string | null
          city?: string | null
          claims_ownership?: boolean
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kind?: string
          lat?: number | null
          lng?: number | null
          lounge_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_requested?: string | null
          state?: string | null
          status?: string
          submitted_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lounge_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lounge_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lounges: {
        Row: {
          address: string
          boost_until: string | null
          cert_tier: string
          certified: boolean
          hours_json: Json | null
          serves_food: boolean
          menu_url: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan_status: string | null
          plan_renews_at: string | null
          city: string
          created_at: string
          credits: number
          email: string | null
          geo: unknown
          hours: string | null
          id: string
          image_url: string | null
          lat: number | null
          lng: number | null
          location: unknown
          name: string
          owner_id: string | null
          phone: string | null
          postal_code: string | null
          slug: string
          socials: Json | null
          state: string
          tier: string
          venue_type: string
          verified: boolean
          website: string | null
        }
        Insert: {
          address: string
          boost_until?: string | null
          cert_tier?: string
          certified?: boolean
          hours_json?: Json | null
          serves_food?: boolean
          menu_url?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan_status?: string | null
          plan_renews_at?: string | null
          city: string
          created_at?: string
          credits?: number
          email?: string | null
          geo?: unknown
          hours?: string | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          location?: unknown
          name: string
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          slug: string
          socials?: Json | null
          state: string
          tier?: string
          venue_type?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          address?: string
          boost_until?: string | null
          cert_tier?: string
          certified?: boolean
          hours_json?: Json | null
          serves_food?: boolean
          menu_url?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan_status?: string | null
          plan_renews_at?: string | null
          city?: string
          created_at?: string
          credits?: number
          email?: string | null
          geo?: unknown
          hours?: string | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          location?: unknown
          name?: string
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          slug?: string
          socials?: Json | null
          state?: string
          tier?: string
          venue_type?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lounges_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_events: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device: string | null
          duration_ms: number | null
          entity_id: string | null
          entity_type: string | null
          event: string
          id: string
          os: string | null
          path: string
          referrer: string | null
          region: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          event: string
          id?: string
          os?: string | null
          path: string
          referrer?: string | null
          region?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          event?: string
          id?: string
          os?: string | null
          path?: string
          referrer?: string | null
          region?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          aficionado: boolean
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string
          handle: string
          id: string
          notify_comments: boolean
          notify_follows: boolean
          notify_inventory: boolean
          notify_new_lounges: boolean
          notify_daily_top: boolean
          notify_system: boolean
          notify_likes: boolean
          notify_lounges: boolean
          public_id: string
          role: string
          socials: Json | null
          state: string | null
        }
        Insert: {
          account_type?: string
          aficionado?: boolean
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name: string
          handle: string
          id: string
          notify_comments?: boolean
          notify_follows?: boolean
          notify_inventory?: boolean
          notify_new_lounges?: boolean
          notify_daily_top?: boolean
          notify_system?: boolean
          notify_likes?: boolean
          notify_lounges?: boolean
          public_id: string
          role?: string
          socials?: Json | null
          state?: string | null
        }
        Update: {
          account_type?: string
          aficionado?: boolean
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string
          handle?: string
          id?: string
          notify_comments?: boolean
          notify_follows?: boolean
          notify_inventory?: boolean
          notify_new_lounges?: boolean
          notify_daily_top?: boolean
          notify_system?: boolean
          notify_likes?: boolean
          notify_lounges?: boolean
          public_id?: string
          role?: string
          socials?: Json | null
          state?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          appearance_score: number
          brand: string | null
          burn_score: number
          cigar_id: string
          created_at: string
          flavor_score: number
          id: string
          lounge_slug: string | null
          name: string | null
          notes: string | null
          overall: number
          photo_url: string | null
          size: string | null
          slug: string | null
          tasting_notes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          appearance_score: number
          brand?: string | null
          burn_score: number
          cigar_id: string
          created_at?: string
          flavor_score: number
          id?: string
          lounge_slug?: string | null
          name?: string | null
          notes?: string | null
          overall: number
          photo_url?: string | null
          size?: string | null
          slug?: string | null
          tasting_notes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          appearance_score?: number
          brand?: string | null
          burn_score?: number
          cigar_id?: string
          created_at?: string
          flavor_score?: number
          id?: string
          lounge_slug?: string | null
          name?: string | null
          notes?: string | null
          overall?: number
          photo_url?: string | null
          size?: string | null
          slug?: string | null
          tasting_notes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_cigar_id_fkey"
            columns: ["cigar_id"]
            isOneToOne: false
            referencedRelation: "catalog_cigars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_cigar_id_fkey"
            columns: ["cigar_id"]
            isOneToOne: false
            referencedRelation: "cigar_rating_stats"
            referencedColumns: ["cigar_id"]
          },
          {
            foreignKeyName: "ratings_cigar_id_fkey"
            columns: ["cigar_id"]
            isOneToOne: false
            referencedRelation: "cigar_rating_week"
            referencedColumns: ["cigar_id"]
          },
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      tv_devices: {
        Row: {
          created_at: string
          id: string
          last_seen: string | null
          lounge_id: string
          lounge_public_id: string
          paired_at: string | null
          serial: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen?: string | null
          lounge_id: string
          lounge_public_id: string
          paired_at?: string | null
          serial: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen?: string | null
          lounge_id?: string
          lounge_public_id?: string
          paired_at?: string | null
          serial?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_devices_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "active_stream_locations"
            referencedColumns: ["lounge_id"]
          },
          {
            foreignKeyName: "tv_devices_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          user_id?: string
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
      viewership_events: {
        Row: {
          device_id: string
          duration_sec: number
          episode_guid: string | null
          id: string
          lounge_public_id: string
          recorded_at: string
        }
        Insert: {
          device_id: string
          duration_sec: number
          episode_guid?: string | null
          id?: string
          lounge_public_id: string
          recorded_at?: string
        }
        Update: {
          device_id?: string
          duration_sec?: number
          episode_guid?: string | null
          id?: string
          lounge_public_id?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewership_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "tv_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewership_events_episode_guid_fkey"
            columns: ["episode_guid"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["guid"]
          },
        ]
      }
    }
    Views: {
      active_stream_locations: {
        Row: {
          city: string | null
          device_id: string | null
          last_seen: string | null
          lat: number | null
          lng: number | null
          lounge_id: string | null
          name: string | null
          slug: string | null
          state: string | null
        }
        Relationships: []
      }
      analytics_devices: {
        Row: {
          browser: string | null
          device: string | null
          os: string | null
          sessions: number | null
        }
        Relationships: []
      }
      analytics_geo: {
        Row: {
          city: string | null
          country: string | null
          events: number | null
          region: string | null
          sessions: number | null
        }
        Relationships: []
      }
      analytics_top_entities: {
        Row: {
          entity_id: string | null
          entity_type: string | null
          seconds_spent: number | null
          sessions: number | null
          views: number | null
        }
        Relationships: []
      }
      analytics_top_paths: {
        Row: {
          avg_ms: number | null
          path: string | null
          sessions: number | null
          views: number | null
        }
        Relationships: []
      }
      cigar_rating_stats: {
        Row: {
          avg_overall: number | null
          brand: string | null
          cigar_id: string | null
          image_url: string | null
          last_rated: string | null
          name: string | null
          ratings_count: number | null
          size: string | null
          slug: string | null
        }
        Relationships: []
      }
      cigar_rating_week: {
        Row: {
          avg_overall: number | null
          brand: string | null
          cigar_id: string | null
          image_url: string | null
          name: string | null
          ratings_count: number | null
          size: string | null
          slug: string | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      cigar_stock_near: {
        Args: {
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_m?: number
          p_slug: string
        }
        Returns: {
          city: string
          distance_m: number
          in_stock: boolean
          lounge_id: string
          lounge_name: string
          lounge_slug: string
          price: number
          state: string
          stock_updated_at: string
        }[]
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      find_similar_cigars: {
        Args: { q: string; threshold?: number }
        Returns: {
          brand: string
          id: string
          name: string
          similarity: number
          slug: string
        }[]
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      is_lounge_member: { Args: { l: string }; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      lounges_near: {
        Args: {
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_m?: number
        }
        Returns: {
          address: string
          certified: boolean
          city: string
          distance_m: number
          id: string
          image_url: string
          lat: number
          lng: number
          name: string
          slug: string
          state: string
          verified: boolean
        }[]
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      record_stream_heartbeat: {
        Args: {
          p_device: string
          p_lat?: number
          p_lng?: number
          p_seconds: number
        }
        Returns: {
          daily_cap: number
          lounge_credits: number
          today_credits: number
        }[]
      }
      register_lounge_device: {
        Args: {
          p_kind?: string
          p_lat?: number
          p_lng?: number
          p_lounge: string
          p_name: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          last_seen: string | null
          lat: number | null
          lng: number | null
          lounge_id: string
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "lounge_devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_catalog_override: {
        Args: { p_slug: string; p_brand?: string | null; p_name?: string | null; p_country?: string | null; p_price?: number | null; p_image_url?: string | null; p_buy_url?: string | null; p_removed?: boolean }
        Returns: string
      }
      billing_set_tier_by_customer: {
        Args: { p_customer: string; p_tier: string; p_subscription?: string | null; p_status?: string | null; p_renews_at?: string | null }
        Returns: undefined
      }
      update_lounge_details: {
        Args: { p_slug: string; p_hours_json?: Json | null; p_serves_food?: boolean | null; p_menu_url?: string | null }
        Returns: undefined
      }
      admin_set_certified: {
        Args: { p_slug: string; p_on: boolean }
        Returns: undefined
      }
      admin_assign_owner: {
        Args: { p_slug: string; p_handle: string }
        Returns: string
      }
      admin_set_certification: {
        Args: { p_slug: string; p_on: boolean }
        Returns: undefined
      }
      admin_set_lounge_owner: {
        Args: { p_slug: string; p_handle: string }
        Returns: string
      }
      handle_available: {
        Args: { p_handle: string }
        Returns: boolean
      }
      broadcast_notification: {
        Args: { p_title: string }
        Returns: number
      }
      notify_admins: {
        Args: { p_type: string; p_entity_name?: string | null }
        Returns: number
      }
      bulk_set_catalog_override: {
        Args: { p_rows: Json }
        Returns: number
      }
      set_cigar_image: {
        Args: { p_slug: string; p_url: string }
        Returns: number
      }
      set_brand_image: {
        Args: { p_brand: string; p_url: string }
        Returns: string
      }
      set_cert_tier: {
        Args: { p_lounge: string; p_tier: string }
        Returns: string
      }
      set_aficionado: {
        Args: { p_handle: string; p_on: boolean }
        Returns: boolean
      }
      set_venue_type: {
        Args: { p_slug: string; p_type: string }
        Returns: string
      }
      remove_humidor_entry: {
        Args: { p_cigar_id: string }
        Returns: number
      }
      remove_humidor_entry_by_id: {
        Args: { p_id: string }
        Returns: number
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      spend_credits: {
        Args: { p_amount: number; p_lounge: string; p_reason?: string }
        Returns: number
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
    Enums: {},
  },
} as const
