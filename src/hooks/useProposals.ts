import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { ProposalWithProposer, ProposalWithPost, ProposalStatus } from '@/types/database';

// Get proposals for a specific post (for post owner)
export function usePostProposals(postId: string | undefined) {
  return useQuery({
    queryKey: ['proposals', 'post', postId],
    queryFn: async (): Promise<ProposalWithProposer[]> => {
      if (!postId) return [];

      const { data: proposals, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!proposals || proposals.length === 0) return [];

      // Get proposer profiles
      const proposerIds = proposals.map((p) => p.proposer_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, username')
        .in('id', proposerIds);

      if (profilesError) throw profilesError;

      return proposals.map((proposal) => ({
        ...proposal,
        proposer: profiles?.find((p) => p.id === proposal.proposer_id) || { name: 'Unknown', username: null },
      })) as ProposalWithProposer[];
    },
    enabled: !!postId,
  });
}

// Get proposals sent by the current user
export function useMyProposals() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['proposals', 'my', user?.id],
    queryFn: async (): Promise<ProposalWithPost[]> => {
      if (!user) return [];

      const { data: proposals, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('proposer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!proposals || proposals.length === 0) return [];

      // Get post details
      const postIds = proposals.map((p) => p.post_id);
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, title, photo_url, user_id')
        .in('id', postIds);

      if (postsError) throw postsError;

      // Get post owner profiles
      const ownerIds = posts?.map((p) => p.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, username')
        .in('id', ownerIds);

      if (profilesError) throw profilesError;

      return proposals.map((proposal) => {
        const post = posts?.find((p) => p.id === proposal.post_id);
        const owner = profiles?.find((p) => p.id === post?.user_id);
        return {
          ...proposal,
          post: post || { id: '', title: 'Unknown', photo_url: '' },
          post_owner: owner || { name: 'Unknown', username: null },
        };
      }) as ProposalWithPost[];
    },
    enabled: !!user,
  });
}

// Get incoming proposals (proposals on user's posts)
export function useIncomingProposals() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['proposals', 'incoming', user?.id],
    queryFn: async (): Promise<(ProposalWithProposer & { post: { id: string; title: string; photo_url: string } })[]> => {
      if (!user) return [];

      // First get user's posts
      const { data: userPosts, error: postsError } = await supabase
        .from('posts')
        .select('id, title, photo_url')
        .eq('user_id', user.id);

      if (postsError) throw postsError;
      if (!userPosts || userPosts.length === 0) return [];

      const postIds = userPosts.map((p) => p.id);

      // Get proposals on those posts
      const { data: proposals, error } = await supabase
        .from('proposals')
        .select('*')
        .in('post_id', postIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!proposals || proposals.length === 0) return [];

      // Get proposer profiles
      const proposerIds = proposals.map((p) => p.proposer_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, username')
        .in('id', proposerIds);

      if (profilesError) throw profilesError;

      return proposals.map((proposal) => ({
        ...proposal,
        proposer: profiles?.find((p) => p.id === proposal.proposer_id) || { name: 'Unknown', username: null },
        post: userPosts.find((p) => p.id === proposal.post_id) || { id: '', title: 'Unknown', photo_url: '' },
      }));
    },
    enabled: !!user,
  });
}

// Create a new proposal
export function useCreateProposal() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      postId,
      message,
    }: {
      postId: string;
      message: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      // Check if user already has a pending proposal on this post
      const { data: existing } = await supabase
        .from('proposals')
        .select('id')
        .eq('post_id', postId)
        .eq('proposer_id', user.id)
        .eq('status', 'pending')
        .single();

      if (existing) {
        throw new Error('You already have a pending proposal on this lunch');
      }

      const { data, error } = await supabase
        .from('proposals')
        .insert({
          post_id: postId,
          proposer_id: user.id,
          message,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposals', 'post', variables.postId] });
    },
  });
}

// Update proposal status (accept/reject)
export function useUpdateProposalStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      status,
    }: {
      proposalId: string;
      status: ProposalStatus;
    }) => {
      const { data, error } = await supabase
        .from('proposals')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', proposalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}
