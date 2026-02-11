import { Component, type ReactNode } from 'react';
import { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useSpaceStore } from '@/stores/spaceStore';
import { initializeLaunchDarkly, closeLDClient } from '@/lib/launchdarkly';
import {
  getSessionStartedAt,
  isSessionExpired,
  setSessionStartedAt,
  clearSessionStartedAt,
} from '@/lib/sessionExpiry';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#111827',
  },
  title: { color: '#f9fafb', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  message: { color: '#9ca3af', fontSize: 14 },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { setSession, setUser, setIsLoading } = useAuthStore();
  const setCurrentSpace = useSpaceStore((s) => s.setCurrentSpace);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        // Handle invalid refresh token or other auth errors
        console.log('Session error:', error.message);
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
        await clearSessionStartedAt();
      } else if (session) {
        // Require re-login after session has been active for a long time
        const expired = await isSessionExpired();
        if (expired) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          await clearSessionStartedAt();
          closeLDClient();
        } else {
          // Only set started-at if missing (e.g. first open after sign-in or legacy session)
          if ((await getSessionStartedAt()) == null) await setSessionStartedAt();
          setSession(session);
          setUser(session.user);
          queryClient.invalidateQueries({ queryKey: ['spaces'] });

          if (session.user) {
            try {
              await initializeLaunchDarkly(
                session.user.id,
                session.user.email ?? undefined,
                session.user.user_metadata?.name ?? undefined
              );
            } catch (err) {
              console.log('LaunchDarkly initialization error:', err);
            }
          }
        }
      } else {
        await clearSessionStartedAt();
        setSession(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        closeLDClient();
        clearSessionStartedAt();
      } else {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN') {
          setSessionStartedAt();
          setCurrentSpace(null);
          queryClient.invalidateQueries({ queryKey: ['spaces'] });
          if (session?.user) {
            try {
              await initializeLaunchDarkly(
                session.user.id,
                session.user.email ?? undefined,
                session.user.user_metadata?.name ?? undefined
              );
            } catch (err) {
              console.log('LaunchDarkly initialization error:', err);
            }
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUser, setIsLoading]);

  return <>{children}</>;
}

const MOBILE_VIEWPORT_WIDTH = 390;
const MOBILE_VIEWPORT_MAX_HEIGHT = 844;
const MOBILE_BORDER_RADIUS = 44;

function MobileViewportWrapper({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }
  const { height } = Dimensions.get('window');
  const mobileHeight = Math.min(height * 0.88, MOBILE_VIEWPORT_MAX_HEIGHT);
  return (
    <View style={[mobileViewportStyles.outer, { minHeight: height }]}>
      <View style={[mobileViewportStyles.inner, { height: mobileHeight }]}>
        {children}
      </View>
    </View>
  );
}

const mobileViewportStyles = StyleSheet.create({
  outer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MOBILE_VIEWPORT_WIDTH,
    backgroundColor: '#111827',
    overflow: 'hidden',
    borderRadius: MOBILE_BORDER_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    // Device-like shadow: boxShadow on web (shadow* deprecated), shadow* on native
    ...Platform.select({
      web: { boxShadow: '0px 12px 24px 0px rgba(0,0,0,0.35)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 24,
      },
    }),
  },
});

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MobileViewportWrapper>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="spaces" />
              <Stack.Screen name="posts" />
              <Stack.Screen name="proposals" />
              <Stack.Screen name="messages" />
              <Stack.Screen name="trades" />
            </Stack>
            <StatusBar style="auto" />
          </MobileViewportWrapper>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
