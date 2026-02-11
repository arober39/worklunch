// This file will be auto-generated using: npx supabase gen types typescript
// For now, we define manually based on our schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PostCategory =
  | 'sandwich'
  | 'salad'
  | 'pasta'
  | 'soup'
  | 'pizza'
  | 'asian'
  | 'mexican'
  | 'mediterranean'
  | 'other';

export type PostStatus = 'active' | 'traded' | 'withdrawn';

export type ProposalStatus = 'pending' | 'accepted' | 'rejected';

export type MeetupStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          username: string | null;
          phone: string;
          dietary_preferences: string | null;
          allergies: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          username?: string;
          phone: string;
          dietary_preferences?: string | null;
          allergies?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          username?: string;
          phone?: string;
          dietary_preferences?: string | null;
          allergies?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      spaces: {
        Row: {
          id: string;
          name: string;
          address: string;
          city: string;
          state: string;
          zip: string;
          join_code: string;
          photo_url: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address: string;
          city: string;
          state: string;
          zip: string;
          join_code: string;
          photo_url?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string;
          city?: string;
          state?: string;
          zip?: string;
          join_code?: string;
          photo_url?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      space_memberships: {
        Row: {
          id: string;
          user_id: string;
          space_id: string;
          department: string | null;
          floor: string | null;
          desk_number: string | null;
          role: 'employee' | 'admin';
          joined_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          space_id: string;
          department?: string | null;
          floor?: string | null;
          desk_number?: string | null;
          role?: 'employee' | 'admin';
          joined_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          space_id?: string;
          department?: string | null;
          floor?: string | null;
          desk_number?: string | null;
          role?: 'employee' | 'admin';
          joined_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          space_id: string;
          user_id: string;
          title: string;
          description: string;
          category: PostCategory;
          photo_url: string;
          dietary_info: string | null;
          expires_at: string | null;
          status: PostStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          user_id: string;
          title: string;
          description: string;
          category: PostCategory;
          photo_url: string;
          dietary_info?: string | null;
          expires_at?: string | null;
          status?: PostStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          space_id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          category?: PostCategory;
          photo_url?: string;
          dietary_info?: string | null;
          expires_at?: string | null;
          status?: PostStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      proposals: {
        Row: {
          id: string;
          post_id: string;
          proposer_id: string;
          message: string;
          status: ProposalStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          proposer_id: string;
          message: string;
          status?: ProposalStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          proposer_id?: string;
          message?: string;
          status?: ProposalStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          proposal_id: string;
          post_id: string;
          participant1_id: string;
          participant2_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          proposal_id: string;
          post_id: string;
          participant1_id: string;
          participant2_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          proposal_id?: string;
          post_id?: string;
          participant1_id?: string;
          participant2_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          read_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      meetups: {
        Row: {
          id: string;
          conversation_id: string;
          proposed_by: string;
          location: string;
          scheduled_at: string;
          notes: string | null;
          status: MeetupStatus;
          confirmed_by_participant1: boolean;
          confirmed_by_participant2: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          proposed_by: string;
          location: string;
          scheduled_at: string;
          notes?: string;
          status?: MeetupStatus;
          confirmed_by_participant1?: boolean;
          confirmed_by_participant2?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          proposed_by?: string;
          location?: string;
          scheduled_at?: string;
          notes?: string;
          status?: MeetupStatus;
          confirmed_by_participant1?: boolean;
          confirmed_by_participant2?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trades: {
        Row: {
          id: string;
          meetup_id: string | null;
          post_id: string;
          lunch_owner_id: string;
          lunch_swapper_id: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          meetup_id?: string;
          post_id: string;
          lunch_owner_id: string;
          lunch_swapper_id: string;
          completed_at?: string;
        };
        Update: {
          id?: string;
          meetup_id?: string;
          post_id?: string;
          lunch_owner_id?: string;
          lunch_swapper_id?: string;
          completed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Space = Database['public']['Tables']['spaces']['Row'];
export type SpaceMembership = Database['public']['Tables']['space_memberships']['Row'];
export type Post = Database['public']['Tables']['posts']['Row'];
export type Proposal = Database['public']['Tables']['proposals']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Meetup = Database['public']['Tables']['meetups']['Row'];
export type Trade = Database['public']['Tables']['trades']['Row'];

export interface PostWithUser extends Post {
  user: Pick<Profile, 'name'>;
}

export interface ProposalWithProposer extends Proposal {
  proposer: Pick<Profile, 'name' | 'username'>;
}

export interface ProposalWithPost extends Proposal {
  post: Pick<Post, 'id' | 'title' | 'photo_url'>;
  post_owner: Pick<Profile, 'name' | 'username'>;
}

export interface ConversationWithDetails extends Conversation {
  otherUser: Pick<Profile, 'id' | 'name' | 'username'>;
  post: Pick<Post, 'id' | 'title' | 'photo_url'>;
  lastMessage?: Pick<Message, 'content' | 'created_at' | 'sender_id'>;
  unreadCount: number;
}

export interface MessageWithSender extends Message {
  sender: Pick<Profile, 'name' | 'username'>;
}

export interface MeetupWithDetails extends Meetup {
  proposer: Pick<Profile, 'name' | 'username'>;
  conversation: Conversation;
}

export interface TradeWithDetails extends Trade {
  post: Pick<Post, 'id' | 'title' | 'photo_url'>;
  lunch_owner: Pick<Profile, 'name' | 'username'>;
  lunch_swapper: Pick<Profile, 'name' | 'username'>;
}
