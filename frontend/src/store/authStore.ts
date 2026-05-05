import { create } from 'zustand';

import type { CurrentUser } from '@/api/schemas';

interface AuthState {
  user: CurrentUser | null;
  setUser: (user: CurrentUser | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clear: () => set({ user: null }),
}));
