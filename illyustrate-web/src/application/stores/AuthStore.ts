import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@infrastructure/storage/SupabaseClient';
import type { User } from '@shared/types';

interface AuthState {
  user: User | null;
  session: unknown | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: unknown | null) => void;
  setLoading: (loading: boolean) => void;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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

        if (error) {
          throw error;
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, isAuthenticated: false });
      },

      checkSession: async () => {
        set({ isLoading: true });
        
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            throw error;
          }

          if (session?.user) {
            // Fetch user profile from our database
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single() as { data: Record<string, unknown> | null; error: Error | null };

            if (userError && (userError as Error & { code?: string }).code !== 'PGRST116') {
              console.error('Error fetching user:', userError);
            }

            if (userData) {
              const user: User = {
                id: String(userData.id),
                email: String(userData.email),
                name: String(userData.name),
                avatarUrl: userData.avatar_url ? String(userData.avatar_url) : undefined,
                plan: userData.plan as 'free' | 'pro' | 'team',
                createdAt: new Date(String(userData.created_at)),
                updatedAt: new Date(String(userData.updated_at)),
              };
              set({
                user,
                session,
                isAuthenticated: true,
              });
            } else {
              // Create new user record
              const newUserData = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
                avatar_url: session.user.user_metadata?.avatar_url,
                plan: 'free' as const,
              };

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: createdUser, error: createError } = await supabase
                .from('users')
                .insert(newUserData)
                .select()
                .single() as { data: Record<string, unknown> | null; error: Error | null };

              if (createError) {
                console.error('Error creating user:', createError);
              } else if (createdUser) {
                const user: User = {
                  id: String(createdUser.id),
                  email: String(createdUser.email),
                  name: String(createdUser.name),
                  avatarUrl: createdUser.avatar_url ? String(createdUser.avatar_url) : undefined,
                  plan: createdUser.plan as 'free' | 'pro' | 'team',
                  createdAt: new Date(String(createdUser.created_at)),
                  updatedAt: new Date(String(createdUser.updated_at)),
                };
                set({
                  user,
                  session,
                  isAuthenticated: true,
                });
              }
            }
          } else {
            set({ user: null, session: null, isAuthenticated: false });
          }
        } catch (error) {
          console.error('Session check error:', error);
          set({ user: null, session: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
