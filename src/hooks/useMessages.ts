import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { ConversationWithDetails, MessageWithSender, Message } from '@/types/database';

// Get all conversations for the current user
export function useConversations() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async (): Promise<ConversationWithDetails[]> => {
      if (!user) return [];

      // Get conversations where user is a participant
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (!conversations || conversations.length === 0) return [];

      // Get all unique user IDs (other participants)
      const otherUserIds = conversations.map((c) =>
        c.participant1_id === user.id ? c.participant2_id : c.participant1_id
      );

      // Get all post IDs
      const postIds = conversations.map((c) => c.post_id);

      // Fetch profiles, posts, and last messages in parallel
      const [profilesResult, postsResult, messagesResult] = await Promise.all([
        supabase.from('profiles').select('id, name, username').in('id', otherUserIds),
        supabase.from('posts').select('id, title, photo_url').in('id', postIds),
        // Get last message for each conversation
        Promise.all(
          conversations.map((c) =>
            supabase
              .from('messages')
              .select('content, created_at, sender_id')
              .eq('conversation_id', c.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
          )
        ),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (postsResult.error) throw postsResult.error;

      // Get unread counts
      const unreadCounts = await Promise.all(
        conversations.map(async (c) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', c.id)
            .neq('sender_id', user.id)
            .is('read_at', null);
          return count || 0;
        })
      );

      return conversations.map((conversation, index) => {
        const otherUserId =
          conversation.participant1_id === user.id
            ? conversation.participant2_id
            : conversation.participant1_id;

        return {
          ...conversation,
          otherUser: profilesResult.data?.find((p) => p.id === otherUserId) || {
            id: otherUserId,
            name: 'Unknown',
            username: null,
          },
          post: postsResult.data?.find((p) => p.id === conversation.post_id) || {
            id: conversation.post_id,
            title: 'Unknown',
            photo_url: '',
          },
          lastMessage: messagesResult[index]?.data || undefined,
          unreadCount: unreadCounts[index],
        };
      }) as ConversationWithDetails[];
    },
    enabled: !!user,
  });
}

// Get messages for a conversation with real-time updates
export function useMessages(conversationId: string | undefined) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);

  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async (): Promise<MessageWithSender[]> => {
      if (!conversationId) return [];

      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!messages || messages.length === 0) return [];

      // Get sender profiles
      const senderIds = [...new Set(messages.map((m) => m.sender_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, username')
        .in('id', senderIds);

      if (profilesError) throw profilesError;

      return messages.map((message) => ({
        ...message,
        sender: profiles?.find((p) => p.id === message.sender_id) || {
          name: 'Unknown',
          username: null,
        },
      })) as MessageWithSender[];
    },
    enabled: !!conversationId,
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Invalidate and refetch to get the full message with sender info
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (!conversationId || !user || !query.data) return;

    const unreadMessages = query.data.filter(
      (m) => m.sender_id !== user.id && !m.read_at
    );

    if (unreadMessages.length > 0) {
      supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        });
    }
  }, [conversationId, user, query.data, queryClient]);

  return query;
}

// Send a message
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Create a conversation when a proposal is accepted
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      postId,
      postOwnerId,
      proposerId,
    }: {
      proposalId: string;
      postId: string;
      postOwnerId: string;
      proposerId: string;
    }) => {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('proposal_id', proposalId)
        .single();

      if (existing) {
        return existing;
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          proposal_id: proposalId,
          post_id: postId,
          participant1_id: postOwnerId,
          participant2_id: proposerId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
