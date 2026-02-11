-- WorkLunch Database Schema Migration
-- This migration creates all tables, enums, indexes, and RLS policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom enums
CREATE TYPE post_category AS ENUM (
  'sandwich',
  'salad',
  'pasta',
  'soup',
  'pizza',
  'asian',
  'mexican',
  'mediterranean',
  'other'
);

CREATE TYPE post_status AS ENUM (
  'active',
  'traded',
  'withdrawn'
);

CREATE TYPE proposal_status AS ENUM (
  'pending',
  'accepted',
  'rejected'
);

CREATE TYPE meetup_status AS ENUM (
  'pending',
  'confirmed',
  'completed',
  'cancelled'
);

CREATE TYPE user_role AS ENUM (
  'employee',
  'admin'
);

-- Create profiles table
-- This table stores user profile information linked to Supabase auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  phone TEXT NOT NULL,
  dietary_preferences TEXT,
  allergies TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create spaces table
-- Represents companies/offices where employees work
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create space_memberships table
-- Links employees to companies/offices with their department/floor/desk info
CREATE TABLE space_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  department TEXT,
  floor TEXT,
  desk_number TEXT,
  role user_role NOT NULL DEFAULT 'employee',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, space_id)
);

-- Create posts table
-- Lunches that employees are offering to swap within a company/office
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category post_category NOT NULL,
  photo_url TEXT NOT NULL,
  dietary_info TEXT,
  expires_at TIMESTAMPTZ,
  status post_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create proposals table
-- Lunch swap proposals made on posts
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  proposer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status proposal_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create conversations table
-- Chat conversations between employees about lunch swaps
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  participant1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (participant1_id != participant2_id)
);

-- Create messages table
-- Individual messages within conversations
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create meetups table
-- Scheduled meetups for completing lunch swaps (office cafeteria, break room, etc.)
CREATE TABLE meetups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  status meetup_status NOT NULL DEFAULT 'pending',
  confirmed_by_participant1 BOOLEAN NOT NULL DEFAULT false,
  confirmed_by_participant2 BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trades table
-- Completed lunch swaps
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meetup_id UUID REFERENCES meetups(id) ON DELETE SET NULL,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  lunch_owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lunch_swapper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (lunch_owner_id != lunch_swapper_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_space_memberships_user_id ON space_memberships(user_id);
CREATE INDEX idx_space_memberships_space_id ON space_memberships(space_id);
CREATE INDEX idx_posts_space_id ON posts(space_id);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_proposals_post_id ON proposals(post_id);
CREATE INDEX idx_proposals_proposer_id ON proposals(proposer_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_conversations_participant1_id ON conversations(participant1_id);
CREATE INDEX idx_conversations_participant2_id ON conversations(participant2_id);
CREATE INDEX idx_conversations_post_id ON conversations(post_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_meetups_conversation_id ON meetups(conversation_id);
CREATE INDEX idx_meetups_proposed_by ON meetups(proposed_by);
CREATE INDEX idx_trades_post_id ON trades(post_id);
CREATE INDEX idx_trades_lunch_owner_id ON trades(lunch_owner_id);
CREATE INDEX idx_trades_lunch_swapper_id ON trades(lunch_swapper_id);
CREATE INDEX idx_posts_expires_at ON posts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetups_updated_at
  BEFORE UPDATE ON meetups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique join codes for spaces
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a 6-character alphanumeric code
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 6));
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM spaces WHERE join_code = code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, dietary_preferences, allergies)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.raw_user_meta_data->>'dietary_preferences',
    NEW.raw_user_meta_data->>'allergies'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to auto-generate join code for spaces if not provided
CREATE OR REPLACE FUNCTION generate_space_join_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if join_code is not provided or is empty
  IF NEW.join_code IS NULL OR NEW.join_code = '' THEN
    NEW.join_code := generate_join_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate join code on space creation
CREATE TRIGGER generate_join_code_on_space_insert
  BEFORE INSERT ON spaces
  FOR EACH ROW
  EXECUTE FUNCTION generate_space_join_code();
