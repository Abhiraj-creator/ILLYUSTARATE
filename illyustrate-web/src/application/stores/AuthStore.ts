import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@infrastructure/storage/SupabaseClient';
import type { User } from '@shared/types';

interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: any | null) => void;
  setLoading: (loading: boolean) => void;
  signInWithGitHub: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
  updateProfile: (updates: { name?: string; avatarUrl?: string; bio?: string; experience?: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
  initializeAuth: () => () => void;
}

// Helper to ensure user record exists in database and update store
const syncUserProfile = async (supabase: any, set: any, session: any, authUser: any, name?: string) => {
  if (!authUser) return;

  try {
    const newUserData = {
      id: authUser.id,
      email: authUser.email || '',
      name: name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
      avatar_url: authUser.user_metadata?.avatar_url,
      plan: 'free' as const,
    };

    // Use upsert to handle both creation and updates (like avatar/name changes)
    const { data: userData, error: upsertError } = await supabase
      .from('users')
      .upsert(newUserData, { onConflict: 'id' })
      .select('*')
      .maybeSingle();

    if (upsertError) {
      // Fallback search by email if ID transition happened
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .or(`id.eq.${authUser.id},email.eq.${authUser.email}`)
        .maybeSingle();

      if (existingUser) {
        const user: User = {
          id: String(existingUser.id),
          email: String(existingUser.email),
          name: String(existingUser.name),
          avatarUrl: existingUser.avatar_url ? String(existingUser.avatar_url) : undefined,
          bio: existingUser.bio ? String(existingUser.bio) : undefined,
          experience: existingUser.experience ? String(existingUser.experience) : undefined,
          plan: 'free',
          createdAt: new Date(String(existingUser.created_at)),
          updatedAt: new Date(String(existingUser.updated_at)),
        };
        set({ user, session, isAuthenticated: true, isLoading: false });
        return user;
      }
      console.error('Error syncing user profile:', upsertError);
    }

    if (userData) {
      const user: User = {
        id: String(userData.id),
        email: String(userData.email),
        name: String(userData.name),
        avatarUrl: userData.avatar_url ? String(userData.avatar_url) : undefined,
        bio: userData.bio ? String(userData.bio) : undefined,
        experience: userData.experience ? String(userData.experience) : undefined,
        plan: 'free',
        createdAt: new Date(String(userData.created_at)),
        updatedAt: new Date(String(userData.updated_at)),
      };
      set({ user, session, isAuthenticated: true, isLoading: false });
      return user;
    }
  } catch (err) {
    console.error('Profile sync exception:', err);
  }

  // Final fallback: Use auth data if DB fails
  const fallbackUser: User = {
    id: authUser.id,
    email: authUser.email || '',
    name: name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
    plan: 'free',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  set({ user: fallbackUser, session, isAuthenticated: true, isLoading: false });
  return fallbackUser;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),

      signInWithGitHub: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: {
            redirectTo: `${window.location.origin}/dashboard`,
            scopes: 'repo read:user read:org',
          },
        });

        if (error) throw error;
      },

      signInWithEmail: async (email: string, password: string) => {
        set({ isLoading: true });
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          set({ isLoading: false });
          throw error;
        }

        if (data.user) {
          await syncUserProfile(supabase, set, data.session, data.user);
        }
      },

      signUpWithEmail: async (email: string, password: string, name: string) => {
        set({ isLoading: true });
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

        if (signUpError) {
          set({ isLoading: false });
          throw signUpError;
        }

        let session = signUpData.session;
        let user = signUpData.user;

        if (!session && user) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (!signInError) {
            session = signInData.session;
            user = signInData.user;
          }
        }

        if (user) {
          await syncUserProfile(supabase, set, session, user, name);
        } else {
          set({ isLoading: false });
        }
      },

      signOut: async () => {
        // Clear local state first to ensure immediate UI response
        set({ user: null, session: null, isAuthenticated: false, isLoading: false });

        try {
          // Attempt server-side signOut with a short timeout
          await Promise.race([
            supabase.auth.signOut(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
          ]);
        } catch (error) {
          console.warn('Server-side signout failed or timed out, but local state was cleared:', error);
        }
      },

      checkSession: async () => {
        // Only run check if not already loading or if session is missing
        const state = get();
        if (state.isAuthenticated && state.user && !state.isLoading) return;

        set({ isLoading: true });

        try {
          const { data: { session }, error } = await Promise.race([
            supabase.auth.getSession(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]) as any;

          if (error || !session) {
            set({ user: null, session: null, isAuthenticated: false, isLoading: false });
            return;
          }

          if (session.user) {
            await syncUserProfile(supabase, set, session, session.user);
          }
        } catch (err) {
          set({ isLoading: false });
        }
      },

      updateProfile: async ({ name, avatarUrl, bio, experience }) => {
        const state = get();
        if (!state.user) return;

        const { error } = await supabase
          .from('users')
          .update({
            name: name ?? state.user.name,
            avatar_url: avatarUrl ?? state.user.avatarUrl,
            bio: bio ?? state.user.bio,
            experience: experience ?? state.user.experience,
            updated_at: new Date().toISOString(),
          })
          .eq('id', state.user.id);

        if (error) throw error;

        set((state) => ({
          user: state.user
            ? {
              ...state.user,
              name: name ?? state.user.name,
              avatarUrl: avatarUrl ?? state.user.avatarUrl,
              bio: bio ?? state.user.bio,
              experience: experience ?? state.user.experience,
            }
            : null,
        }));
      },

      deleteAccount: async () => {
        const state = get();
        if (!state.user) return;

        // Note: auth.admin is only available on the server-side with service role keys.
        // For the client-side, we delete the public profile record.
        // In a production app, this would trigger an Edge Function to purge auth.users.
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', state.user.id);

        if (error) throw error;

        // Sign out locally
        set({ user: null, session: null, isAuthenticated: false, isLoading: false });
      },

      initializeAuth: () => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
              if (session?.user) {
                await syncUserProfile(supabase, set, session, session.user);
              }
            } else if (event === 'SIGNED_OUT') {
              set({ user: null, session: null, isAuthenticated: false, isLoading: false });
            }
          }
        );

        return () => subscription.unsubscribe();
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, session: state.session }),
    }
  )
);
