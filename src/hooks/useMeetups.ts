import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Meetup, TradeWithDetails, MeetupStatus } from '@/types/database';

// Get meetup for a conversation
export function useMeetup(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['meetup', conversationId],
    queryFn: async (): Promise<Meetup | null> => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from('meetups')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No meetup found
        throw error;
      }

      return data;
    },
    enabled: !!conversationId,
  });
}

// Create a meetup
export function useCreateMeetup() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      conversationId,
      location,
      scheduledAt,
      notes,
    }: {
      conversationId: string;
      location: string;
      scheduledAt: Date;
      notes?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('meetups')
        .insert({
          conversation_id: conversationId,
          proposed_by: user.id,
          location,
          scheduled_at: scheduledAt.toISOString(),
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meetup', variables.conversationId] });
    },
  });
}

// Update meetup
export function useUpdateMeetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meetupId,
      location,
      scheduledAt,
      notes,
      status,
    }: {
      meetupId: string;
      location?: string;
      scheduledAt?: Date;
      notes?: string;
      status?: MeetupStatus;
    }) => {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (location) updates.location = location;
      if (scheduledAt) updates.scheduled_at = scheduledAt.toISOString();
      if (notes !== undefined) updates.notes = notes;
      if (status) updates.status = status;

      const { data, error } = await supabase
        .from('meetups')
        .update(updates)
        .eq('id', meetupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetup', data.conversation_id] });
    },
  });
}

// Confirm meetup attendance
export function useConfirmMeetup() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      meetupId,
      conversationId,
      isParticipant1,
    }: {
      meetupId: string;
      conversationId: string;
      isParticipant1: boolean;
    }) => {
      if (!user) throw new Error('Must be logged in');

      const updates = isParticipant1
        ? { confirmed_by_participant1: true }
        : { confirmed_by_participant2: true };

      // Get current meetup to check if both have confirmed
      const { data: currentMeetup } = await supabase
        .from('meetups')
        .select('confirmed_by_participant1, confirmed_by_participant2')
        .eq('id', meetupId)
        .single();

      const willBothConfirm = isParticipant1
        ? currentMeetup?.confirmed_by_participant2
        : currentMeetup?.confirmed_by_participant1;

      if (willBothConfirm) {
        Object.assign(updates, { status: 'confirmed' });
      }

      const { data, error } = await supabase
        .from('meetups')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', meetupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meetup', variables.conversationId] });
    },
  });
}

// Complete trade
export function useCompleteTrade() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      meetupId,
      conversationId,
      postId,
      lunchOwnerId,
      lunchSwapperId,
    }: {
      meetupId: string;
      conversationId: string;
      postId: string;
      lunchOwnerId: string;
      lunchSwapperId: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      // Update meetup status
      await supabase
        .from('meetups')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', meetupId);

      // Create trade record
      const { data, error } = await supabase
        .from('trades')
        .insert({
          meetup_id: meetupId,
          post_id: postId,
          lunch_owner_id: lunchOwnerId,
          lunch_swapper_id: lunchSwapperId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meetup', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });
}

// Get user's trade history
export function useTradeHistory() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['trades', user?.id],
    queryFn: async (): Promise<TradeWithDetails[]> => {
      if (!user) return [];

      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .or(`lunch_owner_id.eq.${user.id},lunch_swapper_id.eq.${user.id}`)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      if (!trades || trades.length === 0) return [];

      // Get post details
      const postIds = trades.map((t) => t.post_id);
      const { data: posts } = await supabase
        .from('posts')
        .select('id, title, photo_url')
        .in('id', postIds);

      // Get user profiles
      const userIds = [...new Set([...trades.map((t) => t.lunch_owner_id), ...trades.map((t) => t.lunch_swapper_id)])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, username')
        .in('id', userIds);

      return trades.map((trade) => ({
        ...trade,
        post: posts?.find((p) => p.id === trade.post_id) || { id: '', title: 'Unknown', photo_url: '' },
        lunch_owner: profiles?.find((p) => p.id === trade.lunch_owner_id) || { name: 'Unknown', username: null },
        lunch_swapper: profiles?.find((p) => p.id === trade.lunch_swapper_id) || { name: 'Unknown', username: null },
      })) as TradeWithDetails[];
    },
    enabled: !!user,
  });
}
