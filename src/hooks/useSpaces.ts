import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Space } from '@/types/database';

// Generate a random 6-character join code
function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface UserSpaceMembership {
  id: string;
  department: string | null;
  floor: string | null;
  desk_number: string | null;
  role: 'employee' | 'admin';
  space: Space;
}

// Get all spaces the current user is a member of
export function useUserSpaces() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['spaces', user?.id],
    queryFn: async (): Promise<UserSpaceMembership[]> => {
      if (!user) return [];

      // First get memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('space_memberships')
        .select('id, department, floor, desk_number, role, space_id')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;
      if (!memberships || memberships.length === 0) return [];

      // Then get the spaces
      const spaceIds = memberships.map((m) => m.space_id);
      const { data: spaces, error: spacesError } = await supabase
        .from('spaces')
        .select('*')
        .in('id', spaceIds);

      if (spacesError) throw spacesError;

      // Combine the data
      return memberships.map((membership) => ({
        id: membership.id,
        department: membership.department,
        floor: membership.floor,
        desk_number: membership.desk_number,
        role: membership.role as 'employee' | 'admin',
        space: spaces?.find((s) => s.id === membership.space_id) as Space,
      }));
    },
    enabled: !!user,
  });
}

// Create a new space
export function useCreateSpace() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      name,
      address,
      city,
      state,
      zip,
      department,
      floor,
      deskNumber,
      photoUrl,
    }: {
      name: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      department?: string | null;
      floor?: string | null;
      deskNumber?: string | null;
      photoUrl?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      // Ensure profile exists first (trigger will insert into space_memberships which references profiles)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      if (!existingProfile) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: user.id,
          name: user.user_metadata?.name ?? 'User',
          username: user.user_metadata?.username ?? null,
          phone: user.user_metadata?.phone ?? '',
        });
        if (profileError) {
          console.error('Profile ensure failed:', profileError);
          throw new Error('Account setup incomplete. Please sign out and sign in again.');
        }
      }

      // Create the space (created_by triggers DB to add creator as admin)
      const { data: space, error: spaceError } = await supabase
        .from('spaces')
        .insert({
          name,
          address,
          city,
          state,
          zip,
          join_code: generateJoinCode(),
          photo_url: photoUrl || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (spaceError) {
        if (spaceError.code === '23505') {
          throw new Error('A community already exists at this address. Try joining it instead.');
        }
        throw spaceError;
      }

      // Trigger set_space_creator_as_admin already added us as admin. Update optional fields.
      const { data: membership, error: memberError } = await supabase
        .from('space_memberships')
        .update({
          department: department || null,
          floor: floor || null,
          desk_number: deskNumber || null,
        })
        .eq('space_id', space.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (memberError) throw memberError;

      return { space, membership };
    },
    onSuccess: (data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
    },
  });
}

// Join result type
export interface JoinSpaceResult {
  space: Space;
  status: 'joined' | 'pending_approval';
}

// Join an existing space with a code
export function useJoinSpace() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      joinCode,
      department,
      floor,
      deskNumber,
    }: {
      joinCode: string;
      department?: string | null;
      floor?: string | null;
      deskNumber?: string | null;
    }): Promise<JoinSpaceResult> => {
      if (!user) throw new Error('Must be logged in');

      // Find the space by join code
      const { data: space, error: spaceError } = await supabase
        .from('spaces')
        .select()
        .eq('join_code', joinCode.toUpperCase())
        .single();

      if (spaceError) {
        if (spaceError.code === 'PGRST116') {
          throw new Error('Invalid join code. Please check and try again.');
        }
        throw spaceError;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('space_memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('space_id', space.id)
        .single();

      if (existing) {
        throw new Error('You are already a member of this community.');
      }

      // Check if this space requires admin approval
      // For demo purposes, spaces with "Corp" in the name require approval
      const requiresApproval = space.name.toLowerCase().includes('corp');

      if (requiresApproval) {
        // In a real app, this would create a pending membership request
        // For the demo, we'll simulate the pending state
        const { error: memberError } = await supabase
          .from('space_memberships')
          .insert({
            user_id: user.id,
            space_id: space.id,
            department: department || null,
            floor: floor || null,
            desk_number: deskNumber || null,
            role: 'employee',
          });

        if (memberError) throw memberError;

        return { space, status: 'pending_approval' };
      }

      // Join the space immediately
      const { error: memberError } = await supabase
        .from('space_memberships')
        .insert({
          user_id: user.id,
          space_id: space.id,
          department: department || null,
          floor: floor || null,
          desk_number: deskNumber || null,
          role: 'employee',
        });

      if (memberError) throw memberError;

      return { space, status: 'joined' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
    },
  });
}

// Update a space (admin only)
export function useUpdateSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      spaceId,
      name,
      address,
      city,
      state,
      zip,
      photoUrl,
    }: {
      spaceId: string;
      name: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      photoUrl?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('spaces')
        .update({
          name,
          address,
          city,
          state,
          zip,
          photo_url: photoUrl,
        })
        .eq('id', spaceId)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('A community already exists at this address.');
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
    },
  });
}

// Delete a space (admin only). Prefer delete_space RPC; fallback to direct DELETE if RPC not yet deployed.
export function useDeleteSpace() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (spaceId: string) => {
      const { error: rpcError } = await supabase.rpc('delete_space', { space_id: spaceId });

      if (rpcError) {
        const fnMissing =
          rpcError.code === '42883' ||
          rpcError.message?.includes('does not exist') ||
          rpcError.message?.toLowerCase().includes('function');
        if (fnMissing) {
          const { data, error: deleteError } = await supabase
            .from('spaces')
            .delete()
            .eq('id', spaceId)
            .select('id');
          if (deleteError) throw deleteError;
          if (!data || data.length === 0) {
            throw new Error('Unable to delete community. You may not have admin permissions. Run the Supabase migration that adds delete_space to fix this.');
          }
          return;
        }
        throw new Error(rpcError.message || 'Unable to delete community. You may not have admin permissions.');
      }
    },
    onSuccess: (_data, spaceId) => {
      const queryKey = ['spaces', user?.id] as const;
      queryClient.setQueryData<UserSpaceMembership[]>(queryKey, (prev) => {
        if (!prev || !Array.isArray(prev)) return prev;
        return prev.filter((m) => m.space.id !== spaceId);
      });
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      void queryClient.refetchQueries({ queryKey: ['spaces'] });
    },
  });
}
