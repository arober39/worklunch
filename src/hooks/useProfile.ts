import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Profile } from '@/types/database';

export function useProfile() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // Profile might not exist yet
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    },
    enabled: !!user,
  });
}
