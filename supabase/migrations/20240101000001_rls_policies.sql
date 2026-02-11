-- Row Level Security (RLS) Policies for WorkLunch
-- Enable RLS on all tables

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Users can view all profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (though this is handled by trigger)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Spaces policies
-- All authenticated users can view companies/offices
CREATE POLICY "Spaces are viewable by authenticated users"
  ON spaces FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only company/office admins can update spaces
CREATE POLICY "Space admins can update spaces"
  ON spaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM space_memberships
      WHERE space_id = spaces.id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Authenticated users can create companies/offices
CREATE POLICY "Authenticated users can create spaces"
  ON spaces FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only space admins can delete their space
CREATE POLICY "Space admins can delete spaces"
  ON spaces FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM space_memberships
      WHERE space_id = spaces.id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Space memberships policies (no self-reference to avoid RLS recursion)
-- Users can view only their own membership rows
CREATE POLICY "Users can view own memberships"
  ON space_memberships FOR SELECT
  USING (user_id = auth.uid());

-- Employees can join companies/offices (insert their own membership)
CREATE POLICY "Users can join spaces"
  ON space_memberships FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own membership row (e.g. department, floor, desk)
CREATE POLICY "Users can update own membership"
  ON space_memberships FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Posts policies
-- Employees can view lunch posts in companies/offices they belong to
CREATE POLICY "Users can view posts in their spaces"
  ON posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM space_memberships
      WHERE space_id = posts.space_id
      AND user_id = auth.uid()
    )
  );

-- Employees can create lunch posts in companies/offices they belong to
CREATE POLICY "Users can create posts in their spaces"
  ON posts FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM space_memberships
      WHERE space_id = posts.space_id
      AND user_id = auth.uid()
    )
  );

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (user_id = auth.uid());

-- Proposals policies
-- Employees can view lunch swap proposals on posts in their companies/offices
CREATE POLICY "Users can view proposals in their spaces"
  ON proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN space_memberships sm ON sm.space_id = p.space_id
      WHERE p.id = proposals.post_id
      AND sm.user_id = auth.uid()
    )
  );

-- Employees can create lunch swap proposals on posts in their companies/offices (but not their own posts)
CREATE POLICY "Users can create proposals"
  ON proposals FOR INSERT
  WITH CHECK (
    proposer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM posts p
      JOIN space_memberships sm ON sm.space_id = p.space_id
      WHERE p.id = proposals.post_id
      AND sm.user_id = auth.uid()
      AND p.user_id != auth.uid()
    )
  );

-- Lunch post owners can update proposal status
CREATE POLICY "Post owners can update proposal status"
  ON proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE id = proposals.post_id
      AND user_id = auth.uid()
    )
  );

-- Proposers can update their own proposals (before acceptance)
CREATE POLICY "Proposers can update own proposals"
  ON proposals FOR UPDATE
  USING (
    proposer_id = auth.uid()
    AND status = 'pending'
  );

-- Conversations policies
-- Employees can view conversations they participate in about lunch swaps
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (
    participant1_id = auth.uid()
    OR participant2_id = auth.uid()
  );

-- Conversations are created automatically via proposals, so no insert policy needed
-- Employees can update conversations they participate in
CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (
    participant1_id = auth.uid()
    OR participant2_id = auth.uid()
  );

-- Messages policies
-- Employees can view messages in conversations they participate in
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );

-- Employees can send messages in conversations they participate in
CREATE POLICY "Users can send messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );

-- Employees can update their own messages (mark as read, etc.)
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );

-- Meetups policies
-- Employees can view lunch swap meetups for conversations they participate in
CREATE POLICY "Users can view meetups in own conversations"
  ON meetups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = meetups.conversation_id
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );

-- Employees can create lunch swap meetups for conversations they participate in
CREATE POLICY "Users can create meetups in own conversations"
  ON meetups FOR INSERT
  WITH CHECK (
    proposed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE id = meetups.conversation_id
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );

-- Employees can update meetups they proposed or are participants in
CREATE POLICY "Users can update meetups in own conversations"
  ON meetups FOR UPDATE
  USING (
    proposed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversations
      WHERE id = meetups.conversation_id
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );

-- Trades policies
-- Employees can view lunch swaps they are involved in
CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  USING (
    lunch_owner_id = auth.uid()
    OR lunch_swapper_id = auth.uid()
  );

-- Lunch swaps are typically created by system/triggers, but allow users to create them
CREATE POLICY "Users can create trades"
  ON trades FOR INSERT
  WITH CHECK (
    lunch_owner_id = auth.uid()
    OR lunch_swapper_id = auth.uid()
  );
