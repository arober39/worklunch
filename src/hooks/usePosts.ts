import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Post, PostCategory, PostWithUser } from '@/types/database';

// Get all active posts in a space
export function usePosts(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['posts', spaceId],
    queryFn: async (): Promise<PostWithUser[]> => {
      if (!spaceId) return [];

      // Get posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('space_id', spaceId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      if (!posts || posts.length === 0) return [];

      // Get user names
      const userIds = [...new Set(posts.map((p) => p.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine data
      return posts.map((post) => ({
        ...post,
        user: profiles?.find((p) => p.id === post.user_id) || { name: 'Unknown' },
      })) as PostWithUser[];
    },
    enabled: !!spaceId,
  });
}

// Get user's own posts
export function useMyPosts(spaceId: string | undefined) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['my-posts', spaceId, user?.id],
    queryFn: async (): Promise<Post[]> => {
      if (!spaceId || !user) return [];

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('space_id', spaceId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!spaceId && !!user,
  });
}

// Get a single post
export function usePost(postId: string | undefined) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: async (): Promise<PostWithUser | null> => {
      if (!postId) return null;

      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      // Get user name
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', post.user_id)
        .single();

      return {
        ...post,
        user: profile || { name: 'Unknown' },
      } as PostWithUser;
    },
    enabled: !!postId,
  });
}

// Create a new post
export function useCreatePost() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      spaceId,
      title,
      description,
      category,
      photoUrl,
    }: {
      spaceId: string;
      title: string;
      description: string;
      category: PostCategory;
      photoUrl: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('posts')
        .insert({
          space_id: spaceId,
          user_id: user.id,
          title,
          description,
          category,
          photo_url: photoUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts', variables.spaceId] });
      queryClient.invalidateQueries({ queryKey: ['my-posts'] });
    },
  });
}

// Update post status
export function useUpdatePostStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      status,
    }: {
      postId: string;
      status: 'active' | 'traded' | 'withdrawn';
    }) => {
      const { data, error } = await supabase
        .from('posts')
        .update({ status })
        .eq('id', postId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['posts', data.space_id] });
      queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', data.id] });
    },
  });
}

// Category labels for display
export const CATEGORY_LABELS: Record<PostCategory, string> = {
  sandwich: 'Sandwich',
  salad: 'Salad',
  pasta: 'Pasta',
  soup: 'Soup',
  pizza: 'Pizza',
  asian: 'Asian',
  mexican: 'Mexican',
  mediterranean: 'Mediterranean',
  other: 'Other',
};

export const CATEGORIES: PostCategory[] = [
  'sandwich',
  'salad',
  'pasta',
  'soup',
  'pizza',
  'asian',
  'mexican',
  'mediterranean',
  'other',
];
