import { supabase } from '@/lib/supabase';

export function useAuth() {
  const signUp = async (
    email: string,
    password: string,
    name: string,
    username: string,
    phone: string
  ) => {
    // First check if user already exists
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password: 'check-if-exists',
      });

    // COMMENTED OUT: Email confirmation check (disabled)
    // If we get "Invalid login credentials", user might exist
    // If we get nothing or success, something's wrong
    // if (signInError?.message?.includes('Email not confirmed')) {
    //   throw new Error(
    //     'Account already exists. Please check your email to confirm your account.'
    //   );
    // }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          username,
          phone,
        },
      },
    });

    if (error) {
      if (error.message?.includes('already registered')) {
        throw new Error('An account with this email already exists.');
      }
      throw error;
    }

    // Check if user was actually created or already exists
    if (data.user?.identities?.length === 0) {
      throw new Error('An account with this email already exists.');
    }

    // Create profile - email confirmation is disabled so session should be available
    if (data.user && data.session) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        name,
        username,
        phone,
      });

      if (profileError) {
        // Profile might already exist or RLS error
        if (profileError.message?.includes('row-level security')) {
          console.log('Profile creation failed - RLS policy issue');
        } else if (profileError.message?.includes('duplicate key')) {
          console.log('Profile already exists');
        } else {
          throw profileError;
        }
      }
    }

    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // COMMENTED OUT: Email confirmation check (disabled)
      // if (error.message?.includes('Email not confirmed')) {
      //   throw new Error('Please check your email and confirm your account before signing in.');
      // }
      if (error.message?.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password.');
      }
      throw error;
    }

    // Create profile if it doesn't exist
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (!profile) {
        const metadata = data.user.user_metadata;
        await supabase.from('profiles').insert({
          id: data.user.id,
          name: metadata?.name || 'User',
          username: metadata?.username || '',
          phone: metadata?.phone || '',
        });
      }
    }

    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return { signUp, signIn, signOut };
}
